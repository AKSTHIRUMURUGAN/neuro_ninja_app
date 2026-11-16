import { getDatabase, generateUuid } from '../database/database';

export interface FinanceTransaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  paymentMethod: string;
  date: string; // YYYY-MM-DD
  description?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  syncStatus?: 'synced' | 'pending' | 'error';
}

export interface FinanceSalary {
  id: string;
  source: string;
  monthlyAmount: number;
  payDate: number; // day of month (1-31)
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  syncStatus?: 'synced' | 'pending' | 'error';
}

export interface FinanceEmi {
  id: string;
  name: string;
  monthlyAmount: number;
  totalAmount: number;
  remainingAmount: number;
  dueDay: number; // day of month (1-31)
  interestRate?: number;
  createdAt: string;
  updatedAt: string;
  syncStatus?: 'synced' | 'pending' | 'error';
}

export interface FinanceInvestment {
  id: string;
  name: string;
  type: string; // 'stocks' | 'crypto' | 'mutual_funds' | 'gold' | 'real_estate' | 'other'
  investedAmount: number;
  currentValue: number;
  returnsPercent: number;
  createdAt: string;
  updatedAt: string;
  syncStatus?: 'synced' | 'pending' | 'error';
}

export interface FinanceNetWorthItem {
  id: string;
  title: string;
  type: 'asset' | 'liability';
  value: number;
  category: string;
  createdAt: string;
  updatedAt: string;
  syncStatus?: 'synced' | 'pending' | 'error';
}

export interface FinanceProfile {
  id: string;
  currency: string;
  monthlyBudget: number;
  savingsGoal: number;
  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────
// Transactions
// ─────────────────────────────────────────────────────────────

export async function getTransactions(filter?: {
  type?: 'income' | 'expense';
  category?: string;
  month?: string; // YYYY-MM
  limit?: number;
}): Promise<FinanceTransaction[]> {
  const db = await getDatabase();
  const conditions: string[] = [];
  const params: any[] = [];

  if (filter?.type) {
    conditions.push('type = ?');
    params.push(filter.type);
  }
  if (filter?.category && filter.category !== 'All') {
    conditions.push('category = ?');
    params.push(filter.category);
  }
  if (filter?.month) {
    conditions.push('date LIKE ?');
    params.push(`${filter.month}%`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limitClause = filter?.limit ? `LIMIT ${filter.limit}` : 'LIMIT 100';

  const rows = await db.getAllAsync<any>(
    `SELECT * FROM finance_transactions ${whereClause} ORDER BY date DESC, created_at DESC ${limitClause}`,
    ...params
  );

  return rows.map((r) => ({
    id: r.id,
    amount: r.amount,
    type: r.type,
    category: r.category,
    paymentMethod: r.payment_method,
    date: r.date,
    description: r.description ?? undefined,
    tags: JSON.parse(r.tags_json || '[]'),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    syncStatus: r.sync_status || 'synced',
  }));
}

export async function saveTransaction(t: Partial<FinanceTransaction>): Promise<FinanceTransaction> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const id = t.id || generateUuid('txn');
  const amount = t.amount || 0;
  const type = t.type || 'expense';
  const category = t.category || 'General';
  const paymentMethod = t.paymentMethod || 'UPI';
  const date = t.date || now.split('T')[0];
  const tagsJson = JSON.stringify(t.tags || []);

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO finance_transactions (
        id, amount, type, category, payment_method, date, description,
        tags_json, created_at, updated_at, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
      ON CONFLICT(id) DO UPDATE SET
        amount = excluded.amount,
        type = excluded.type,
        category = excluded.category,
        payment_method = excluded.payment_method,
        date = excluded.date,
        description = excluded.description,
        tags_json = excluded.tags_json,
        updated_at = excluded.updated_at,
        sync_status = 'pending'`,
      id,
      amount,
      type,
      category,
      paymentMethod,
      date,
      t.description || null,
      tagsJson,
      t.createdAt || now,
      now
    );

    const payload = {
      id,
      amount,
      type,
      category,
      paymentMethod,
      date,
      description: t.description,
      tags: t.tags || [],
      updatedAt: now,
    };

    await db.runAsync(
      `INSERT INTO sync_outbox (outbox_id, entity_type, entity_id, action, payload_json, created_at, status)
       VALUES (?, 'finance_transaction', ?, 'UPSERT', ?, ?, 'pending')`,
      generateUuid('outbox'),
      id,
      JSON.stringify(payload),
      now
    );
  });

  const saved = (await getTransactions({ limit: 1 })).find((item) => item.id === id);
  if (!saved) throw new Error(`Failed to save transaction ${id}`);
  return saved;
}

export async function deleteTransaction(id: string): Promise<boolean> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM finance_transactions WHERE id = ?', id);
    await db.runAsync(
      `INSERT INTO sync_outbox (outbox_id, entity_type, entity_id, action, payload_json, created_at, status)
       VALUES (?, 'finance_transaction', ?, 'DELETE', ?, ?, 'pending')`,
      generateUuid('outbox'),
      id,
      JSON.stringify({ id }),
      now
    );
  });

  return true;
}

export async function getMonthlyFinancialSummary(monthKey?: string): Promise<{
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
  budgetCap: number;
  categoryBreakdown: Record<string, number>;
}> {
  const targetMonth = monthKey || new Date().toISOString().slice(0, 7); // YYYY-MM
  const txns = await getTransactions({ month: targetMonth, limit: 1000 });
  const profile = await getFinanceProfile();

  let totalIncome = 0;
  let totalExpense = 0;
  const categoryBreakdown: Record<string, number> = {};

  for (const t of txns) {
    if (t.type === 'income') {
      totalIncome += t.amount;
    } else {
      totalExpense += t.amount;
      categoryBreakdown[t.category] = (categoryBreakdown[t.category] || 0) + t.amount;
    }
  }

  return {
    totalIncome,
    totalExpense,
    netSavings: totalIncome - totalExpense,
    budgetCap: profile.monthlyBudget,
    categoryBreakdown,
  };
}

// ─────────────────────────────────────────────────────────────
// Salaries & Recurring Income
// ─────────────────────────────────────────────────────────────

export async function getSalaries(): Promise<FinanceSalary[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>('SELECT * FROM finance_salaries ORDER BY monthly_amount DESC');
  return rows.map((r) => ({
    id: r.id,
    source: r.source,
    monthlyAmount: r.monthly_amount,
    payDate: r.pay_date,
    isActive: r.is_active === 1,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    syncStatus: r.sync_status || 'synced',
  }));
}

export async function saveSalary(salary: Partial<FinanceSalary>): Promise<FinanceSalary> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const id = salary.id || generateUuid('sal');
  const source = salary.source || 'Primary Income';
  const amount = salary.monthlyAmount || 0;
  const payDate = salary.payDate || 1;
  const isActive = salary.isActive !== false ? 1 : 0;

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO finance_salaries (id, source, monthly_amount, pay_date, is_active, created_at, updated_at, sync_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
       ON CONFLICT(id) DO UPDATE SET
         source = excluded.source,
         monthly_amount = excluded.monthly_amount,
         pay_date = excluded.pay_date,
         is_active = excluded.is_active,
         updated_at = excluded.updated_at,
         sync_status = 'pending'`,
      id,
      source,
      amount,
      payDate,
      isActive,
      salary.createdAt || now,
      now
    );

    await db.runAsync(
      `INSERT INTO sync_outbox (outbox_id, entity_type, entity_id, action, payload_json, created_at, status)
       VALUES (?, 'finance_salary', ?, 'UPSERT', ?, ?, 'pending')`,
      generateUuid('outbox'),
      id,
      JSON.stringify({ id, source, monthlyAmount: amount, payDate, isActive: isActive === 1, updatedAt: now }),
      now
    );
  });

  const list = await getSalaries();
  return list.find((s) => s.id === id)!;
}

export async function deleteSalary(id: string): Promise<boolean> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM finance_salaries WHERE id = ?', id);
    await db.runAsync(
      `INSERT INTO sync_outbox (outbox_id, entity_type, entity_id, action, payload_json, created_at, status)
       VALUES (?, 'finance_salary', ?, 'DELETE', ?, ?, 'pending')`,
      generateUuid('outbox'),
      id,
      JSON.stringify({ id }),
      now
    );
  });
  return true;
}

// ─────────────────────────────────────────────────────────────
// EMIs & Debt
// ─────────────────────────────────────────────────────────────

export async function getEmis(): Promise<FinanceEmi[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>('SELECT * FROM finance_emis ORDER BY due_day ASC');
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    monthlyAmount: r.monthly_amount,
    totalAmount: r.total_amount,
    remainingAmount: r.remaining_amount,
    dueDay: r.due_day,
    interestRate: r.interest_rate ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    syncStatus: r.sync_status || 'synced',
  }));
}

export async function saveEmi(emi: Partial<FinanceEmi>): Promise<FinanceEmi> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const id = emi.id || generateUuid('emi');
  const name = emi.name || 'Personal Loan';
  const monthly = emi.monthlyAmount || 0;
  const total = emi.totalAmount || 0;
  const remaining = emi.remainingAmount !== undefined ? emi.remainingAmount : total;
  const dueDay = emi.dueDay || 5;

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO finance_emis (id, name, monthly_amount, total_amount, remaining_amount, due_day, interest_rate, created_at, updated_at, sync_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         monthly_amount = excluded.monthly_amount,
         total_amount = excluded.total_amount,
         remaining_amount = excluded.remaining_amount,
         due_day = excluded.due_day,
         interest_rate = excluded.interest_rate,
         updated_at = excluded.updated_at,
         sync_status = 'pending'`,
      id,
      name,
      monthly,
      total,
      remaining,
      dueDay,
      emi.interestRate ?? null,
      emi.createdAt || now,
      now
    );

    await db.runAsync(
      `INSERT INTO sync_outbox (outbox_id, entity_type, entity_id, action, payload_json, created_at, status)
       VALUES (?, 'finance_emi', ?, 'UPSERT', ?, ?, 'pending')`,
      generateUuid('outbox'),
      id,
      JSON.stringify({ id, name, monthlyAmount: monthly, totalAmount: total, remainingAmount: remaining, dueDay, interestRate: emi.interestRate, updatedAt: now }),
      now
    );
  });

  const list = await getEmis();
  return list.find((e) => e.id === id)!;
}

export async function deleteEmi(id: string): Promise<boolean> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM finance_emis WHERE id = ?', id);
    await db.runAsync(
      `INSERT INTO sync_outbox (outbox_id, entity_type, entity_id, action, payload_json, created_at, status)
       VALUES (?, 'finance_emi', ?, 'DELETE', ?, ?, 'pending')`,
      generateUuid('outbox'),
      id,
      JSON.stringify({ id }),
      now
    );
  });
  return true;
}

// ─────────────────────────────────────────────────────────────
// Investments
// ─────────────────────────────────────────────────────────────

export async function getInvestments(): Promise<FinanceInvestment[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>('SELECT * FROM finance_investments ORDER BY current_value DESC');
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    investedAmount: r.invested_amount,
    currentValue: r.current_value,
    returnsPercent: r.returns_percent,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    syncStatus: r.sync_status || 'synced',
  }));
}

export async function saveInvestment(inv: Partial<FinanceInvestment>): Promise<FinanceInvestment> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const id = inv.id || generateUuid('inv');
  const name = inv.name || 'Mutual Fund Index';
  const type = inv.type || 'stocks';
  const invested = inv.investedAmount || 0;
  const current = inv.currentValue || invested;
  const returns = invested > 0 ? ((current - invested) / invested) * 100 : 0;

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO finance_investments (id, name, type, invested_amount, current_value, returns_percent, created_at, updated_at, sync_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         type = excluded.type,
         invested_amount = excluded.invested_amount,
         current_value = excluded.current_value,
         returns_percent = excluded.returns_percent,
         updated_at = excluded.updated_at,
         sync_status = 'pending'`,
      id,
      name,
      type,
      invested,
      current,
      returns,
      inv.createdAt || now,
      now
    );

    await db.runAsync(
      `INSERT INTO sync_outbox (outbox_id, entity_type, entity_id, action, payload_json, created_at, status)
       VALUES (?, 'finance_investment', ?, 'UPSERT', ?, ?, 'pending')`,
      generateUuid('outbox'),
      id,
      JSON.stringify({ id, name, type, investedAmount: invested, currentValue: current, returnsPercent: returns, updatedAt: now }),
      now
    );
  });

  const list = await getInvestments();
  return list.find((i) => i.id === id)!;
}

export async function deleteInvestment(id: string): Promise<boolean> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM finance_investments WHERE id = ?', id);
    await db.runAsync(
      `INSERT INTO sync_outbox (outbox_id, entity_type, entity_id, action, payload_json, created_at, status)
       VALUES (?, 'finance_investment', ?, 'DELETE', ?, ?, 'pending')`,
      generateUuid('outbox'),
      id,
      JSON.stringify({ id }),
      now
    );
  });
  return true;
}

// ─────────────────────────────────────────────────────────────
// Net Worth & Profile
// ─────────────────────────────────────────────────────────────

export async function getNetWorthItems(): Promise<FinanceNetWorthItem[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>('SELECT * FROM finance_networth ORDER BY value DESC');
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    type: r.type,
    value: r.value,
    category: r.category,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    syncStatus: r.sync_status || 'synced',
  }));
}

export async function saveNetWorthItem(item: Partial<FinanceNetWorthItem>): Promise<FinanceNetWorthItem> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const id = item.id || generateUuid('nw');
  const title = item.title || 'Bank Savings';
  const type = item.type || 'asset';
  const value = item.value || 0;
  const category = item.category || 'Liquid Cash';

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO finance_networth (id, title, type, value, category, created_at, updated_at, sync_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
       ON CONFLICT(id) DO UPDATE SET
         title = excluded.title,
         type = excluded.type,
         value = excluded.value,
         category = excluded.category,
         updated_at = excluded.updated_at,
         sync_status = 'pending'`,
      id,
      title,
      type,
      value,
      category,
      item.createdAt || now,
      now
    );

    await db.runAsync(
      `INSERT INTO sync_outbox (outbox_id, entity_type, entity_id, action, payload_json, created_at, status)
       VALUES (?, 'finance_networth', ?, 'UPSERT', ?, ?, 'pending')`,
      generateUuid('outbox'),
      id,
      JSON.stringify({ id, title, type, value, category, updatedAt: now }),
      now
    );
  });

  const list = await getNetWorthItems();
  return list.find((n) => n.id === id)!;
}

export async function deleteNetWorthItem(id: string): Promise<boolean> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM finance_networth WHERE id = ?', id);
    await db.runAsync(
      `INSERT INTO sync_outbox (outbox_id, entity_type, entity_id, action, payload_json, created_at, status)
       VALUES (?, 'finance_networth', ?, 'DELETE', ?, ?, 'pending')`,
      generateUuid('outbox'),
      id,
      JSON.stringify({ id }),
      now
    );
  });
  return true;
}

export async function getNetWorthSummary(): Promise<{
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
}> {
  const items = await getNetWorthItems();
  const investments = await getInvestments();
  const emis = await getEmis();

  let assets = items.filter((i) => i.type === 'asset').reduce((sum, i) => sum + i.value, 0);
  let liabilities = items.filter((i) => i.type === 'liability').reduce((sum, i) => sum + i.value, 0);

  // Add investments to assets
  assets += investments.reduce((sum, inv) => sum + inv.currentValue, 0);

  // Add remaining EMI balances to liabilities
  liabilities += emis.reduce((sum, emi) => sum + emi.remainingAmount, 0);

  return {
    totalAssets: assets,
    totalLiabilities: liabilities,
    netWorth: assets - liabilities,
  };
}

export async function getFinanceProfile(): Promise<FinanceProfile> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<any>('SELECT * FROM finance_profile LIMIT 1');
  if (!row) {
    return {
      id: 'default_profile',
      currency: '₹',
      monthlyBudget: 25000,
      savingsGoal: 100000,
      updatedAt: new Date().toISOString(),
    };
  }
  return {
    id: row.id,
    currency: row.currency,
    monthlyBudget: row.monthly_budget,
    savingsGoal: row.savings_goal,
    updatedAt: row.updated_at,
  };
}

export async function saveFinanceProfile(profile: Partial<FinanceProfile>): Promise<FinanceProfile> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const currency = profile.currency || '₹';
  const budget = profile.monthlyBudget || 25000;
  const goal = profile.savingsGoal || 100000;

  await db.runAsync(
    `INSERT INTO finance_profile (id, currency, monthly_budget, savings_goal, updated_at)
     VALUES ('default_profile', ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       currency = excluded.currency,
       monthly_budget = excluded.monthly_budget,
       savings_goal = excluded.savings_goal,
       updated_at = excluded.updated_at`,
    currency,
    budget,
    goal,
    now
  );

  return getFinanceProfile();
}
