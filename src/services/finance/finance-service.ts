import { getDatabase, generateUuid } from '../database/database';
import {
  CustomCategory,
  FamilyMember,
  FinanceTransaction,
  SalaryProfile,
  EMIRecord,
  InvestmentRecord,
  AssetItem,
  LiabilityItem,
  FinancialGoal,
  FinancialProfile,
  EMISafetyInfo,
  NetWorthSummary,
  MajorCategoryGroup,
  TransactionType,
  PaymentMethod,
  DEFAULT_CUSTOM_CATEGORIES,
  DEFAULT_FAMILY_MEMBERS,
  InvestmentType,
  AssetCategory,
  LiabilityCategory,
  FinancialGoalCategory,
} from './finance-types';

export * from './finance-types';

// Backward compatibility types for v1 callers
export interface FinanceSalary {
  id: string;
  source: string;
  monthlyAmount: number;
  payDate: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceEmi {
  id: string;
  name: string;
  monthlyAmount: number;
  totalAmount: number;
  remainingAmount: number;
  dueDay: number;
  interestRate?: number;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceInvestment {
  id: string;
  name: string;
  type: string;
  investedAmount: number;
  currentValue: number;
  returnsPercent: number;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceNetWorthItem {
  id: string;
  title: string;
  type: 'asset' | 'liability';
  value: number;
  category: string;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceProfileLegacy {
  id: string;
  currency: string;
  monthlyBudget: number;
  savingsGoal: number;
  updatedAt: string;
}

export type FinanceProfile = FinanceProfileLegacy;

// ─────────────────────────────────────────────────────────────
// 1. Categories Management (with Emoji / Image URL & Groups)
// ─────────────────────────────────────────────────────────────

export async function getCategories(): Promise<CustomCategory[]> {
  const db = await getDatabase();
  try {
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM finance_categories ORDER BY is_system DESC, name ASC'
    );
    if (!rows || rows.length === 0) {
      return DEFAULT_CUSTOM_CATEGORIES;
    }
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      iconType: (r.icon_type as 'emoji' | 'image') || 'emoji',
      iconValue: r.icon_value || '📌',
      group: (r.group_name as MajorCategoryGroup) || 'other',
      color: r.color || '#38BDF8',
      budgetLimit: r.budget_limit !== null ? Number(r.budget_limit) : undefined,
    }));
  } catch (err) {
    console.warn('[FinanceService] Error fetching categories:', err);
    return DEFAULT_CUSTOM_CATEGORIES;
  }
}

export async function saveCategory(cat: Partial<CustomCategory>): Promise<CustomCategory> {
  const db = await getDatabase();
  const id = cat.id || cat.name || generateUuid('cat');
  const now = new Date().toISOString();
  const name = cat.name || 'Unnamed Category';
  const iconType = cat.iconType || 'emoji';
  const iconValue = cat.iconValue || '📌';
  const group = cat.group || 'personal';
  const color = cat.color || '#38BDF8';
  const budgetLimit = cat.budgetLimit ?? null;

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO finance_categories (id, name, icon_type, icon_value, group_name, color, budget_limit, is_system, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         icon_type = excluded.icon_type,
         icon_value = excluded.icon_value,
         group_name = excluded.group_name,
         color = excluded.color,
         budget_limit = excluded.budget_limit`,
      id,
      name,
      iconType,
      iconValue,
      group,
      color,
      budgetLimit,
      now
    );

    await db.runAsync(
      `INSERT INTO sync_outbox (outbox_id, entity_type, entity_id, action, payload_json, created_at, status)
       VALUES (?, 'finance_category', ?, 'UPSERT', ?, ?, 'pending')`,
      generateUuid('outbox'),
      id,
      JSON.stringify({ id, name, iconType, iconValue, group, color, budgetLimit }),
      now
    );
  });

  return {
    id,
    name,
    iconType,
    iconValue,
    group,
    color,
    budgetLimit: budgetLimit ?? undefined,
  };
}

export async function deleteCategory(id: string): Promise<boolean> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM finance_categories WHERE id = ?', id);
    await db.runAsync(
      `INSERT INTO sync_outbox (outbox_id, entity_type, entity_id, action, payload_json, created_at, status)
       VALUES (?, 'finance_category', ?, 'DELETE', ?, ?, 'pending')`,
      generateUuid('outbox'),
      id,
      JSON.stringify({ id }),
      now
    );
  });
  return true;
}

// ─────────────────────────────────────────────────────────────
// 2. Persona / Family Members Management
// ─────────────────────────────────────────────────────────────

export async function getFamilyMembers(): Promise<FamilyMember[]> {
  const db = await getDatabase();
  try {
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM finance_members ORDER BY is_default DESC, name ASC'
    );
    if (!rows || rows.length === 0) {
      return DEFAULT_FAMILY_MEMBERS;
    }
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      relationship: r.relationship,
      avatarEmoji: r.avatar_emoji || '👤',
      avatarType: (r.avatar_type as 'emoji' | 'image' | 'icon') || 'emoji',
      avatarUrl: r.avatar_url || undefined,
      iconName: r.icon_name || undefined,
      color: r.color || '#38BDF8',
      isCustom: Boolean(r.is_custom),
      isDefault: Boolean(r.is_default),
    }));
  } catch (err) {
    console.warn('[FinanceService] Error fetching family members:', err);
    return DEFAULT_FAMILY_MEMBERS;
  }
}

export async function saveFamilyMember(member: Partial<FamilyMember>): Promise<FamilyMember> {
  const db = await getDatabase();
  const id = member.id || generateUuid('member');
  const now = new Date().toISOString();
  const name = member.name || 'Member';
  const relationship = member.relationship || 'other';
  const avatarEmoji = member.avatarEmoji || '👤';
  const avatarType = member.avatarType || 'emoji';
  const avatarUrl = member.avatarUrl || null;
  const iconName = member.iconName || null;
  const color = member.color || '#38BDF8';
  const isCustom = member.isCustom ? 1 : 0;
  const isDefault = member.isDefault ? 1 : 0;

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO finance_members (id, name, relationship, avatar_emoji, avatar_type, avatar_url, icon_name, color, is_custom, is_default, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         relationship = excluded.relationship,
         avatar_emoji = excluded.avatar_emoji,
         avatar_type = excluded.avatar_type,
         avatar_url = excluded.avatar_url,
         icon_name = excluded.icon_name,
         color = excluded.color`,
      id,
      name,
      relationship,
      avatarEmoji,
      avatarType,
      avatarUrl,
      iconName,
      color,
      isCustom,
      isDefault,
      now
    );

    await db.runAsync(
      `INSERT INTO sync_outbox (outbox_id, entity_type, entity_id, action, payload_json, created_at, status)
       VALUES (?, 'finance_member', ?, 'UPSERT', ?, ?, 'pending')`,
      generateUuid('outbox'),
      id,
      JSON.stringify({ id, name, relationship, avatarEmoji, avatarType, avatarUrl, iconName, color }),
      now
    );
  });

  return {
    id,
    name,
    relationship,
    avatarEmoji,
    avatarType,
    avatarUrl: avatarUrl || undefined,
    iconName: iconName || undefined,
    color,
    isCustom: Boolean(isCustom),
    isDefault: Boolean(isDefault),
  };
}

export async function deleteFamilyMember(id: string): Promise<boolean> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM finance_members WHERE id = ?', id);
    await db.runAsync(
      `INSERT INTO sync_outbox (outbox_id, entity_type, entity_id, action, payload_json, created_at, status)
       VALUES (?, 'finance_member', ?, 'DELETE', ?, ?, 'pending')`,
      generateUuid('outbox'),
      id,
      JSON.stringify({ id }),
      now
    );
  });
  return true;
}

// ─────────────────────────────────────────────────────────────
// 3. Transactions V2 Engine (Hierarchical, Spent-On Persona, Methods)
// ─────────────────────────────────────────────────────────────

export async function getTransactionsV2(filter?: {
  type?: TransactionType;
  category?: string;
  categoryGroup?: MajorCategoryGroup;
  spentOn?: string;
  paymentMethod?: PaymentMethod;
  month?: string; // YYYY-MM
  timeRange?: '7d' | '30d' | '90d' | '1y' | 'all';
  limit?: number;
}): Promise<FinanceTransaction[]> {
  const db = await getDatabase();
  const conditions: string[] = [];
  const params: any[] = [];

  if (filter?.type) {
    conditions.push('type = ?');
    params.push(filter.type);
  }
  if (filter?.category) {
    conditions.push('category = ?');
    params.push(filter.category);
  }
  if (filter?.categoryGroup) {
    conditions.push('category_group = ?');
    params.push(filter.categoryGroup);
  }
  if (filter?.spentOn) {
    conditions.push('spent_on = ?');
    params.push(filter.spentOn);
  }
  if (filter?.paymentMethod) {
    conditions.push('payment_method = ?');
    params.push(filter.paymentMethod);
  }
  if (filter?.month) {
    conditions.push("strftime('%Y-%m', date) = ?");
    params.push(filter.month);
  }
  if (filter?.timeRange && filter.timeRange !== 'all') {
    const days = filter.timeRange === '7d' ? 7 : filter.timeRange === '30d' ? 30 : filter.timeRange === '90d' ? 90 : 365;
    conditions.push(`date >= date('now', '-${days} days')`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limitClause = filter?.limit ? `LIMIT ${filter.limit}` : '';

  try {
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM finance_transactions_v2 ${whereClause} ORDER BY date DESC, created_at DESC ${limitClause}`,
      ...params
    );

    return rows.map((r) => ({
      id: r.id,
      amount: Number(r.amount),
      type: r.type as TransactionType,
      category: r.category,
      categoryGroup: (r.category_group as MajorCategoryGroup) || undefined,
      spentOn: r.spent_on || 'personal',
      paymentMethod: (r.payment_method as PaymentMethod) || 'upi',
      date: r.date,
      description: r.description || undefined,
      linkedGoalId: r.linked_goal_id || undefined,
      tags: r.tags_json ? JSON.parse(r.tags_json) : [],
      source: (r.source as any) || 'manual',
      merchantName: r.merchant_name || undefined,
      utrRef: r.utr_ref || undefined,
      receiptUrl: r.receipt_url || undefined,
      confidence: r.confidence !== null && r.confidence !== undefined ? Number(r.confidence) : 1.0,
      isVerified: r.is_verified === undefined || r.is_verified === null ? true : r.is_verified === 1,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      syncStatus: (r.sync_status as 'synced' | 'pending' | 'error') || 'synced',
    }));
  } catch (err) {
    console.warn('[FinanceService] Error fetching v2 transactions:', err);
    return [];
  }
}

export async function saveTransactionV2(t: Partial<FinanceTransaction>): Promise<FinanceTransaction> {
  const db = await getDatabase();
  const id = t.id || generateUuid('tx');
  const now = new Date().toISOString();
  const amount = Number(t.amount) || 0;
  const type: TransactionType = t.type || 'expense';
  const category = t.category || 'Other';
  const categoryGroup = t.categoryGroup || 'other';
  const spentOn = t.spentOn || 'personal';
  const paymentMethod: PaymentMethod = t.paymentMethod || 'upi';
  const date = t.date || now.split('T')[0];
  const description = t.description || null;
  const linkedGoalId = t.linkedGoalId || null;
  const tagsJson = JSON.stringify(t.tags || []);
  const isRecurring = 0;
  const receiptUrl = t.receiptUrl || null;
  const source = t.source || 'manual';
  const merchantName = t.merchantName || null;
  const utrRef = t.utrRef || null;
  const confidence = t.confidence ?? 1.0;
  const isVerified = t.isVerified === false ? 0 : 1;

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO finance_transactions_v2 (
         id, amount, type, category, category_group, spent_on, payment_method,
         date, description, linked_goal_id, tags_json, is_recurring, receipt_url,
         source, merchant_name, utr_ref, confidence, is_verified,
         created_at, updated_at, sync_status
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
       ON CONFLICT(id) DO UPDATE SET
         amount = excluded.amount,
         type = excluded.type,
         category = excluded.category,
         category_group = excluded.category_group,
         spent_on = excluded.spent_on,
         payment_method = excluded.payment_method,
         date = excluded.date,
         description = excluded.description,
         linked_goal_id = excluded.linked_goal_id,
         tags_json = excluded.tags_json,
         receipt_url = COALESCE(excluded.receipt_url, finance_transactions_v2.receipt_url),
         source = excluded.source,
         merchant_name = COALESCE(excluded.merchant_name, finance_transactions_v2.merchant_name),
         utr_ref = COALESCE(excluded.utr_ref, finance_transactions_v2.utr_ref),
         confidence = excluded.confidence,
         is_verified = excluded.is_verified,
         updated_at = excluded.updated_at,
         sync_status = 'pending'`,
      id,
      amount,
      type,
      category,
      categoryGroup,
      spentOn,
      paymentMethod,
      date,
      description,
      linkedGoalId,
      tagsJson,
      isRecurring,
      receiptUrl,
      source,
      merchantName,
      utrRef,
      confidence,
      isVerified,
      t.createdAt || now,
      now
    );

    // Also mirror to legacy table for zero regression with older components
    try {
      await db.runAsync(
        `INSERT INTO finance_transactions (id, amount, type, category, payment_method, date, description, tags_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET amount = excluded.amount, type = excluded.type, category = excluded.category, date = excluded.date`,
        id,
        amount,
        type === 'income' ? 'income' : 'expense',
        category,
        paymentMethod,
        date,
        description,
        tagsJson,
        t.createdAt || now,
        now
      );
    } catch {
      // ignore legacy mirror error
    }

    await db.runAsync(
      `INSERT INTO sync_outbox (outbox_id, entity_type, entity_id, action, payload_json, created_at, status)
       VALUES (?, 'finance_transaction', ?, 'UPSERT', ?, ?, 'pending')`,
      generateUuid('outbox'),
      id,
      JSON.stringify({
        id,
        amount,
        type,
        category,
        categoryGroup,
        spentOn,
        paymentMethod,
        date,
        description,
        linkedGoalId,
      }),
      now
    );
  });

  return {
    id,
    amount,
    type,
    category,
    categoryGroup,
    spentOn,
    paymentMethod,
    date,
    description: description || undefined,
    linkedGoalId: linkedGoalId || undefined,
    tags: t.tags || [],
    createdAt: t.createdAt || now,
    updatedAt: now,
    syncStatus: 'pending',
  };
}

export async function deleteTransactionV2(id: string): Promise<boolean> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM finance_transactions_v2 WHERE id = ?', id);
    try {
      await db.runAsync('DELETE FROM finance_transactions WHERE id = ?', id);
    } catch {
      // ignore
    }
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

// ─────────────────────────────────────────────────────────────
// 4. Multi-Person Salary Manager (Gross, Basic, HRA, PF, PT, TDS)
// ─────────────────────────────────────────────────────────────

export async function getSalariesV2(): Promise<SalaryProfile[]> {
  const db = await getDatabase();
  try {
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM finance_salaries_v2 ORDER BY gross_salary DESC, person_name ASC'
    );
    return rows.map((r) => {
      const gross = Number(r.gross_salary || 0);
      const basic = Number(r.basic_pay || 0);
      const hra = Number(r.hra || 0);
      const deductions = r.deductions_json
        ? JSON.parse(r.deductions_json)
        : { pf: 0, pt: 0, tds: 0, insurance: 0, other: 0 };
      const net = Number(r.net_in_hand || 0);
      const sides = r.side_incomes_json ? JSON.parse(r.side_incomes_json) : [];
      const sideIncomeVal = Array.isArray(sides)
        ? sides.reduce((acc: number, s: any) => acc + (Number(s.monthlyAmount) || 0), 0)
        : 0;

      return {
        id: r.id,
        memberId: r.id,
        memberName: r.person_name,
        relationship: 'self',
        incomeType: 'salary',
        monthlyGross: gross,
        basicPay: basic,
        hra: hra,
        specialAllowance: Number(r.special_allowance || 0),
        deductions,
        inHandSalary: net,
        sideIncome: sideIncomeVal,
        payDate: Number(r.pay_day || 1),
        effectiveDate: new Date().toISOString().substring(0, 7),
        isActive: true,
        createdAt: r.updated_at,
        updatedAt: r.updated_at,
      };
    });
  } catch (err) {
    console.warn('[FinanceService] Error fetching salaries:', err);
    return [];
  }
}

export async function saveSalaryV2(salary: Partial<SalaryProfile>): Promise<SalaryProfile> {
  const db = await getDatabase();
  const id = salary.id || generateUuid('sal');
  const now = new Date().toISOString();
  const personName = salary.memberName || 'Primary Earner';
  const gross = Number(salary.monthlyGross) || 0;
  const basic = Number(salary.basicPay) || Math.round(gross * 0.5);
  const hra = Number(salary.hra) || Math.round(basic * 0.5);
  const specialAllowance = Number(salary.specialAllowance) || Math.max(0, gross - basic - hra);
  const deductions = salary.deductions || { pf: 1800, pt: 200, tds: 0, insurance: 0, other: 0 };
  const totalDeductions =
    (deductions.pf || 0) +
    (deductions.pt || 0) +
    (deductions.tds || 0) +
    (deductions.insurance || 0) +
    (deductions.other || 0);
  const netInHand = Math.max(0, gross - totalDeductions);
  const payDay = Number(salary.payDate) || 1;
  const sideIncomeVal = Number(salary.sideIncome) || 0;
  const sideIncomes = [{ source: 'Side Gig', monthlyAmount: sideIncomeVal }];

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO finance_salaries_v2 (
         id, person_name, gross_salary, basic_pay, hra, special_allowance,
         deductions_json, net_in_hand, pay_day, side_incomes_json, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         person_name = excluded.person_name,
         gross_salary = excluded.gross_salary,
         basic_pay = excluded.basic_pay,
         hra = excluded.hra,
         special_allowance = excluded.special_allowance,
         deductions_json = excluded.deductions_json,
         net_in_hand = excluded.net_in_hand,
         pay_day = excluded.pay_day,
         side_incomes_json = excluded.side_incomes_json,
         updated_at = excluded.updated_at`,
      id,
      personName,
      gross,
      basic,
      hra,
      specialAllowance,
      JSON.stringify(deductions),
      netInHand,
      payDay,
      JSON.stringify(sideIncomes),
      now
    );

    // Legacy mirror
    try {
      await db.runAsync(
        `INSERT INTO finance_salaries (id, source, monthly_amount, pay_date, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, 1, ?, ?)
         ON CONFLICT(id) DO UPDATE SET monthly_amount = excluded.monthly_amount, source = excluded.source`,
        id,
        personName,
        netInHand,
        payDay,
        now,
        now
      );
    } catch {
      // ignore
    }

    await db.runAsync(
      `INSERT INTO sync_outbox (outbox_id, entity_type, entity_id, action, payload_json, created_at, status)
       VALUES (?, 'finance_salary', ?, 'UPSERT', ?, ?, 'pending')`,
      generateUuid('outbox'),
      id,
      JSON.stringify({ id, personName, gross, netInHand, deductions, payDay, sideIncomes }),
      now
    );
  });

  return {
    id,
    memberId: id,
    memberName: personName,
    relationship: salary.relationship || 'self',
    incomeType: salary.incomeType || 'salary',
    monthlyGross: gross,
    basicPay: basic,
    hra,
    specialAllowance,
    deductions,
    inHandSalary: netInHand,
    sideIncome: sideIncomeVal,
    payDate: payDay,
    effectiveDate: salary.effectiveDate || now.substring(0, 7),
    isActive: true,
    createdAt: salary.createdAt || now,
    updatedAt: now,
  };
}

export async function deleteSalaryV2(id: string): Promise<boolean> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM finance_salaries_v2 WHERE id = ?', id);
    try {
      await db.runAsync('DELETE FROM finance_salaries WHERE id = ?', id);
    } catch {
      // ignore
    }
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

export async function getCombinedHouseholdIncome(): Promise<{
  totalGross: number;
  totalInHand: number;
  totalDeductions: number;
  totalSideIncome: number;
  effectiveTotalMonthlyIncome: number;
  profiles: SalaryProfile[];
}> {
  const profiles = await getSalariesV2();
  let totalGross = 0;
  let totalInHand = 0;
  let totalDeductions = 0;
  let totalSideIncome = 0;

  for (const p of profiles) {
    totalGross += p.monthlyGross;
    totalInHand += p.inHandSalary;
    const ded =
      (p.deductions.pf || 0) +
      (p.deductions.pt || 0) +
      (p.deductions.tds || 0) +
      (p.deductions.insurance || 0) +
      (p.deductions.other || 0);
    totalDeductions += ded;
    totalSideIncome += p.sideIncome || 0;
  }

  return {
    totalGross,
    totalInHand,
    totalDeductions,
    totalSideIncome,
    effectiveTotalMonthlyIncome: totalInHand + totalSideIncome,
    profiles,
  };
}

// ─────────────────────────────────────────────────────────────
// 5. Loan & EMI Engine with 40% DTI Safety & Loan Affordability Simulator
// ─────────────────────────────────────────────────────────────

export function calculateEMI(
  principal: number,
  annualRate: number,
  tenureMonths: number
): { monthlyEMI: number; totalInterest: number; totalPayable: number } {
  if (principal <= 0 || tenureMonths <= 0) {
    return { monthlyEMI: 0, totalInterest: 0, totalPayable: 0 };
  }
  if (annualRate <= 0) {
    const monthlyEMI = Math.round(principal / tenureMonths);
    return { monthlyEMI, totalInterest: 0, totalPayable: principal };
  }

  const r = annualRate / 12 / 100;
  const emi = (principal * r * Math.pow(1 + r, tenureMonths)) / (Math.pow(1 + r, tenureMonths) - 1);
  const roundedEMI = Math.round(emi);
  const totalPayable = roundedEMI * tenureMonths;
  const totalInterest = Math.max(0, totalPayable - principal);

  return {
    monthlyEMI: roundedEMI,
    totalInterest,
    totalPayable,
  };
}

export async function getEmisV2(): Promise<EMIRecord[]> {
  const db = await getDatabase();
  try {
    const rows = await db.getAllAsync<any>(
      "SELECT * FROM finance_emis_v2 WHERE status != 'closed' ORDER BY monthly_emi DESC"
    );
    return rows.map((r) => {
      const tenure = Number(r.tenure_months || 12);
      const paid = Number(r.paid_installments || 0);
      const remaining = Math.max(0, tenure - paid);

      return {
        id: r.id,
        loanName: r.name,
        obligationType: r.obligation_type || 'term_loan',
        loanType: r.loan_type || 'personal',
        borrowerMember: r.borrowed_from || 'Self',
        lenderName: r.lender || 'Bank',
        principalAmount: Number(r.principal),
        interestRate: Number(r.interest_rate),
        tenureMonths: tenure,
        emiAmount: Number(r.monthly_emi),
        startDate: r.start_date,
        dueDayOfMonth: Number(r.due_day || 5),
        monthsPaid: paid,
        remainingMonths: remaining,
        outstandingPrincipal: Number(r.current_balance),
        isActive: r.status === 'active',
        createdAt: r.created_at,
        updatedAt: r.created_at,
      };
    });
  } catch (err) {
    console.warn('[FinanceService] Error fetching EMIs:', err);
    return [];
  }
}

export async function saveEmiV2(emi: Partial<EMIRecord>): Promise<EMIRecord> {
  const db = await getDatabase();
  const id = emi.id || generateUuid('emi');
  const now = new Date().toISOString();
  const name = emi.loanName || 'Personal Loan';
  const obligationType = emi.obligationType || 'term_loan';
  const loanType = emi.loanType || 'personal';
  const principal = Number(emi.principalAmount) || 0;
  const currentBalance = Number(emi.outstandingPrincipal ?? principal);
  const interestRate = Number(emi.interestRate) || 10.5;
  const tenureMonths = Number(emi.tenureMonths) || 12;
  const calc = calculateEMI(principal, interestRate, tenureMonths);
  const monthlyEMI = Number(emi.emiAmount) || calc.monthlyEMI;
  const startDate = emi.startDate || now.split('T')[0];
  const paidInstallments = Number(emi.monthsPaid) || 0;
  const dueDay = Number(emi.dueDayOfMonth) || 5;
  const lender = emi.lenderName || 'Bank';
  const borrowedFrom = emi.borrowerMember || null;
  const status = emi.isActive === false ? 'closed' : 'active';

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO finance_emis_v2 (
         id, name, obligation_type, loan_type, principal, current_balance,
         interest_rate, monthly_emi, start_date, end_date, tenure_months,
         paid_installments, due_day, lender, borrowed_from, status, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         obligation_type = excluded.obligation_type,
         loan_type = excluded.loan_type,
         principal = excluded.principal,
         current_balance = excluded.current_balance,
         interest_rate = excluded.interest_rate,
         monthly_emi = excluded.monthly_emi,
         start_date = excluded.start_date,
         end_date = excluded.end_date,
         tenure_months = excluded.tenure_months,
         paid_installments = excluded.paid_installments,
         due_day = excluded.due_day,
         lender = excluded.lender,
         borrowed_from = excluded.borrowed_from,
         status = excluded.status`,
      id,
      name,
      obligationType,
      loanType,
      principal,
      currentBalance,
      interestRate,
      monthlyEMI,
      startDate,
      startDate,
      tenureMonths,
      paidInstallments,
      dueDay,
      lender,
      borrowedFrom,
      status,
      emi.createdAt || now
    );

    // Legacy mirror
    try {
      await db.runAsync(
        `INSERT INTO finance_emis (id, name, monthly_amount, total_amount, remaining_amount, due_day, interest_rate, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET monthly_amount = excluded.monthly_amount, remaining_amount = excluded.remaining_amount`,
        id,
        name,
        monthlyEMI,
        principal,
        currentBalance,
        dueDay,
        interestRate,
        now,
        now
      );
    } catch {
      // ignore
    }

    await db.runAsync(
      `INSERT INTO sync_outbox (outbox_id, entity_type, entity_id, action, payload_json, created_at, status)
       VALUES (?, 'finance_emi', ?, 'UPSERT', ?, ?, 'pending')`,
      generateUuid('outbox'),
      id,
      JSON.stringify({ id, name, obligationType, loanType, principal, monthlyEMI, currentBalance, lender, status }),
      now
    );
  });

  return {
    id,
    loanName: name,
    obligationType,
    loanType,
    borrowerMember: borrowedFrom || 'Self',
    lenderName: lender,
    principalAmount: principal,
    interestRate,
    tenureMonths,
    emiAmount: monthlyEMI,
    startDate,
    dueDayOfMonth: dueDay,
    monthsPaid: paidInstallments,
    remainingMonths: Math.max(0, tenureMonths - paidInstallments),
    outstandingPrincipal: currentBalance,
    isActive: status === 'active',
    createdAt: emi.createdAt || now,
    updatedAt: now,
  };
}

export async function deleteEmiV2(id: string): Promise<boolean> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM finance_emis_v2 WHERE id = ?', id);
    try {
      await db.runAsync('DELETE FROM finance_emis WHERE id = ?', id);
    } catch {
      // ignore
    }
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

export async function getEMISafety(): Promise<EMISafetyInfo> {
  const emis = await getEmisV2();
  const { effectiveTotalMonthlyIncome } = await getCombinedHouseholdIncome();

  const totalMonthlyEMI = emis.reduce((sum, e) => sum + e.emiAmount, 0);
  const monthlyIncome = effectiveTotalMonthlyIncome > 0 ? effectiveTotalMonthlyIncome : 50000;
  const dtiPercentage = (totalMonthlyEMI / monthlyIncome) * 100;
  const maxSafeMonthlyEMI = Math.round(monthlyIncome * 0.4);
  const remainingBorrowingCapacity = Math.max(0, maxSafeMonthlyEMI - totalMonthlyEMI);

  let status: 'safe' | 'moderate' | 'critical' = 'safe';
  if (dtiPercentage > 50) {
    status = 'critical';
  } else if (dtiPercentage > 40) {
    status = 'moderate';
  }

  return {
    maxSafeEMI: maxSafeMonthlyEMI,
    remainingCapacity: remainingBorrowingCapacity,
    status,
    percentage: Math.round(dtiPercentage * 10) / 10,
  };
}

// ─────────────────────────────────────────────────────────────
// 6. Investments Engine (Mutual Funds, SIPs, Stocks, Gold, Crypto)
// ─────────────────────────────────────────────────────────────

export async function getInvestmentsV2(): Promise<InvestmentRecord[]> {
  const db = await getDatabase();
  try {
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM finance_investments_v2 ORDER BY current_value DESC'
    );
    return rows.map((r) => {
      const invested = Number(r.invested_amount || 0);
      const current = Number(r.current_value || 0);
      const returns = invested > 0 ? ((current - invested) / invested) * 100 : 0;

      return {
        id: r.id,
        name: r.name,
        type: (r.type as InvestmentType) || 'mutual_funds',
        investedAmount: invested,
        currentValue: current,
        returnsPercent: Math.round(returns * 10) / 10,
        sipAmount: r.sip_amount !== null ? Number(r.sip_amount) : undefined,
        sipDayOfMonth: r.sip_date !== null ? Number(r.sip_date) : undefined,
        purchaseDate: new Date().toISOString().substring(0, 10),
        notes: r.notes || undefined,
        createdAt: r.updated_at,
        updatedAt: r.updated_at,
      };
    });
  } catch (err) {
    console.warn('[FinanceService] Error fetching investments:', err);
    return [];
  }
}

export async function saveInvestmentV2(inv: Partial<InvestmentRecord>): Promise<InvestmentRecord> {
  const db = await getDatabase();
  const id = inv.id || generateUuid('inv');
  const now = new Date().toISOString();
  const name = inv.name || 'Mutual Fund SIP';
  const type: InvestmentType = inv.type || 'mutual_funds';
  const investedAmount = Number(inv.investedAmount) || 0;
  const currentValue = Number(inv.currentValue ?? investedAmount);
  const sipAmount = inv.sipAmount !== undefined ? Number(inv.sipAmount) : null;
  const sipDate = inv.sipDayOfMonth !== undefined ? Number(inv.sipDayOfMonth) : null;
  const folioOrAccount = inv.platform || null;
  const notes = inv.notes || null;
  const returns = investedAmount > 0 ? ((currentValue - investedAmount) / investedAmount) * 100 : 0;

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO finance_investments_v2 (
         id, name, type, invested_amount, current_value, sip_amount, sip_date, folio_or_account, notes, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         type = excluded.type,
         invested_amount = excluded.invested_amount,
         current_value = excluded.current_value,
         sip_amount = excluded.sip_amount,
         sip_date = excluded.sip_date,
         folio_or_account = excluded.folio_or_account,
         notes = excluded.notes,
         updated_at = excluded.updated_at`,
      id,
      name,
      type,
      investedAmount,
      currentValue,
      sipAmount,
      sipDate,
      folioOrAccount,
      notes,
      now
    );

    // Legacy mirror
    try {
      await db.runAsync(
        `INSERT INTO finance_investments (id, name, type, invested_amount, current_value, returns_percent, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET invested_amount = excluded.invested_amount, current_value = excluded.current_value, returns_percent = excluded.returns_percent`,
        id,
        name,
        type,
        investedAmount,
        currentValue,
        returns,
        now,
        now
      );
    } catch {
      // ignore
    }

    await db.runAsync(
      `INSERT INTO sync_outbox (outbox_id, entity_type, entity_id, action, payload_json, created_at, status)
       VALUES (?, 'finance_investment', ?, 'UPSERT', ?, ?, 'pending')`,
      generateUuid('outbox'),
      id,
      JSON.stringify({ id, name, type, investedAmount, currentValue, sipAmount, sipDate }),
      now
    );
  });

  return {
    id,
    name,
    type,
    investedAmount,
    currentValue,
    returnsPercent: Math.round(returns * 10) / 10,
    sipAmount: sipAmount !== null ? sipAmount : undefined,
    sipDayOfMonth: sipDate !== null ? sipDate : undefined,
    purchaseDate: inv.purchaseDate || now.substring(0, 10),
    notes: notes || undefined,
    createdAt: inv.createdAt || now,
    updatedAt: now,
  };
}

export async function deleteInvestmentV2(id: string): Promise<boolean> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM finance_investments_v2 WHERE id = ?', id);
    try {
      await db.runAsync('DELETE FROM finance_investments WHERE id = ?', id);
    } catch {
      // ignore
    }
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

export async function getInvestmentSummary(): Promise<{
  totalInvested: number;
  totalCurrent: number;
  totalReturns: number;
  returnsPercentage: number;
  sipTotal: number;
  byAssetClass: { type: string; label: string; current: number; percentage: number; color: string }[];
}> {
  const list = await getInvestmentsV2();
  let totalInvested = 0;
  let totalCurrent = 0;
  let sipTotal = 0;

  const typeMap = new Map<string, number>();

  for (const inv of list) {
    totalInvested += inv.investedAmount;
    totalCurrent += inv.currentValue;
    if (inv.sipAmount) {
      sipTotal += inv.sipAmount;
    }
    typeMap.set(inv.type, (typeMap.get(inv.type) || 0) + inv.currentValue);
  }

  const totalReturns = totalCurrent - totalInvested;
  const returnsPercentage = totalInvested > 0 ? (totalReturns / totalInvested) * 100 : 0;

  const colorMap: Record<string, { label: string; color: string }> = {
    mutual_funds: { label: 'Mutual Funds', color: '#10B981' },
    stocks: { label: 'Stocks', color: '#38BDF8' },
    crypto: { label: 'Crypto', color: '#F97316' },
    gold: { label: 'Gold / SGB', color: '#F59E0B' },
    ppf: { label: 'PPF', color: '#8B5CF6' },
    epf: { label: 'EPF', color: '#A855F7' },
    fd: { label: 'FD & RD', color: '#06B6D4' },
    real_estate: { label: 'Real Estate', color: '#EC4899' },
    other: { label: 'Other', color: '#64748B' },
  };

  const byAssetClass = Array.from(typeMap.entries()).map(([type, current]) => {
    const meta = colorMap[type] || { label: type, color: '#64748B' };
    return {
      type,
      label: meta.label,
      current,
      percentage: totalCurrent > 0 ? Math.round((current / totalCurrent) * 1000) / 10 : 0,
      color: meta.color,
    };
  });

  return {
    totalInvested,
    totalCurrent,
    totalReturns,
    returnsPercentage: Math.round(returnsPercentage * 10) / 10,
    sipTotal,
    byAssetClass,
  };
}

// ─────────────────────────────────────────────────────────────
// 7. Net Worth Engine (Itemized Assets & Debts + Automatic Aggregation)
// ─────────────────────────────────────────────────────────────

export async function getNetWorthItemsV2(): Promise<{
  assets: AssetItem[];
  liabilities: LiabilityItem[];
}> {
  const db = await getDatabase();
  try {
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM finance_networth_items_v2 ORDER BY amount DESC'
    );
    const assets: AssetItem[] = [];
    const liabilities: LiabilityItem[] = [];

    for (const r of rows) {
      if (r.item_type === 'asset') {
        assets.push({
          id: r.id,
          name: r.name,
          category: (r.category as AssetCategory) || 'bank_cash',
          value: Number(r.amount),
          owner: 'Self',
          notes: r.notes || undefined,
          createdAt: r.updated_at,
          updatedAt: r.updated_at,
        });
      } else {
        liabilities.push({
          id: r.id,
          name: r.name,
          category: (r.category as LiabilityCategory) || 'personal_loan',
          totalOutstanding: Number(r.amount),
          borrower: 'Self',
          notes: r.notes || undefined,
          createdAt: r.updated_at,
          updatedAt: r.updated_at,
        });
      }
    }
    return { assets, liabilities };
  } catch (err) {
    console.warn('[FinanceService] Error fetching net worth items:', err);
    return { assets: [], liabilities: [] };
  }
}

export async function saveNetWorthItemV2(
  item: {
    id?: string;
    name?: string;
    category?: AssetCategory | LiabilityCategory | string;
    value?: number;
    totalOutstanding?: number;
    notes?: string;
    owner?: string;
    borrower?: string;
  },
  itemType: 'asset' | 'liability'
): Promise<void> {
  const db = await getDatabase();
  const id = item.id || generateUuid('nw');
  const now = new Date().toISOString();
  const name = item.name || 'Net Worth Item';
  const category = item.category || (itemType === 'asset' ? 'bank_cash' : 'personal_loan');
  const amount = Number(item.value ?? item.totalOutstanding ?? 0);
  const notes = item.notes || null;

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO finance_networth_items_v2 (id, item_type, name, category, amount, notes, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         category = excluded.category,
         amount = excluded.amount,
         notes = excluded.notes,
         updated_at = excluded.updated_at`,
      id,
      itemType,
      name,
      category,
      amount,
      notes,
      now
    );

    // Legacy mirror
    try {
      await db.runAsync(
        `INSERT INTO finance_networth (id, title, type, value, category, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET value = excluded.value, title = excluded.title`,
        id,
        name,
        itemType,
        amount,
        category,
        now,
        now
      );
    } catch {
      // ignore
    }

    await db.runAsync(
      `INSERT INTO sync_outbox (outbox_id, entity_type, entity_id, action, payload_json, created_at, status)
       VALUES (?, 'finance_networth', ?, 'UPSERT', ?, ?, 'pending')`,
      generateUuid('outbox'),
      id,
      JSON.stringify({ id, itemType, name, category, amount, notes }),
      now
    );
  });
}

export async function deleteNetWorthItemV2(id: string): Promise<boolean> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM finance_networth_items_v2 WHERE id = ?', id);
    try {
      await db.runAsync('DELETE FROM finance_networth WHERE id = ?', id);
    } catch {
      // ignore
    }
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

export async function getNetWorthSummaryV2(): Promise<NetWorthSummary> {
  const { assets, liabilities } = await getNetWorthItemsV2();
  const investments = await getInvestmentsV2();
  const emis = await getEmisV2();
  const profile = await getProfileV2();

  let totalManualAssets = assets.reduce((sum, a) => sum + a.value, 0);
  let totalInvestmentsValue = investments.reduce((sum, i) => sum + i.currentValue, 0);
  let totalAssets = totalManualAssets + totalInvestmentsValue;

  let totalManualLiabilities = liabilities.reduce((sum, l) => sum + l.totalOutstanding, 0);
  let totalLoanOutstanding = emis.reduce((sum, e) => sum + e.outstandingPrincipal, 0);
  let totalLiabilities = totalManualLiabilities + totalLoanOutstanding;

  let netWorth = totalAssets - totalLiabilities;

  // Liquid cash assets (bank_cash)
  const liquidCash = assets
    .filter((a) => a.category === 'bank_cash')
    .reduce((sum, a) => sum + a.value, 0);

  const monthlyExpenseEstimate = profile.monthlyExpenses > 0 ? profile.monthlyExpenses : (profile.monthlyBudget || 25000);
  const emergencyFundRunwayMonths =
    monthlyExpenseEstimate > 0 ? Math.round((liquidCash / monthlyExpenseEstimate) * 10) / 10 : 0;

  return {
    totalAssets,
    totalLiabilities,
    netWorth,
    liquidCash,
    investmentAssets: totalInvestmentsValue,
    emergencyFundRunwayMonths,
  };
}

// ─────────────────────────────────────────────────────────────
// 8. Financial Goals Engine
// ─────────────────────────────────────────────────────────────

export async function getGoalsV2(): Promise<FinancialGoal[]> {
  const db = await getDatabase();
  try {
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM finance_goals_v2 ORDER BY is_completed ASC, target_date ASC'
    );
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      targetAmount: Number(r.target_amount),
      currentSaved: Number(r.current_amount || 0),
      targetDate: r.target_date,
      category: (r.category as FinancialGoalCategory) || 'other',
      priority: (r.priority as 'high' | 'medium' | 'low') || 'medium',
      createdAt: r.created_at,
      updatedAt: r.created_at,
    }));
  } catch (err) {
    console.warn('[FinanceService] Error fetching goals:', err);
    return [];
  }
}

export async function saveGoalV2(goal: Partial<FinancialGoal>): Promise<FinancialGoal> {
  const db = await getDatabase();
  const id = goal.id || generateUuid('goal');
  const now = new Date().toISOString();
  const name = goal.name || 'New Financial Goal';
  const targetAmount = Number(goal.targetAmount) || 100000;
  const currentAmount = Number(goal.currentSaved) || 0;
  const targetDate = goal.targetDate || now.split('T')[0];
  const category: FinancialGoalCategory = goal.category || 'other';
  const priority = goal.priority || 'medium';
  const isCompleted = currentAmount >= targetAmount ? 1 : 0;

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO finance_goals_v2 (
         id, name, target_amount, current_amount, target_date, category, priority, icon, color, is_completed, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, 'flag', '#00E699', ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         target_amount = excluded.target_amount,
         current_amount = excluded.current_amount,
         target_date = excluded.target_date,
         category = excluded.category,
         priority = excluded.priority,
         is_completed = excluded.is_completed`,
      id,
      name,
      targetAmount,
      currentAmount,
      targetDate,
      category,
      priority,
      isCompleted,
      goal.createdAt || now
    );

    await db.runAsync(
      `INSERT INTO sync_outbox (outbox_id, entity_type, entity_id, action, payload_json, created_at, status)
       VALUES (?, 'finance_goal', ?, 'UPSERT', ?, ?, 'pending')`,
      generateUuid('outbox'),
      id,
      JSON.stringify({ id, name, targetAmount, currentAmount, targetDate, category, isCompleted }),
      now
    );
  });

  return {
    id,
    name,
    targetAmount,
    currentSaved: currentAmount,
    targetDate,
    category,
    priority,
    createdAt: goal.createdAt || now,
    updatedAt: now,
  };
}

export async function deleteGoalV2(id: string): Promise<boolean> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM finance_goals_v2 WHERE id = ?', id);
    await db.runAsync(
      `INSERT INTO sync_outbox (outbox_id, entity_type, entity_id, action, payload_json, created_at, status)
       VALUES (?, 'finance_goal', ?, 'DELETE', ?, ?, 'pending')`,
      generateUuid('outbox'),
      id,
      JSON.stringify({ id }),
      now
    );
  });
  return true;
}

// ─────────────────────────────────────────────────────────────
// 9. Financial Profile V2 (Currency, Emergency Target, FIRE Config)
// ─────────────────────────────────────────────────────────────

export async function getProfileV2(): Promise<FinancialProfile> {
  const db = await getDatabase();
  try {
    const row = await db.getFirstAsync<any>('SELECT * FROM finance_profile_v2 LIMIT 1');
    if (!row) {
      return {
        id: 'current',
        currency: '₹',
        monthlyBudget: 25000,
        savingsGoal: 10000,
        emergencyFundCurrent: 50000,
        emergencyFundTarget: 150000,
        monthlyExpenses: 25000,
        fireTarget: 15000000,
        fireAgeTarget: 45,
        categoryBudgets: {},
        updatedAt: new Date().toISOString(),
      };
    }
    return {
      id: 'current',
      currency: row.currency_symbol || '₹',
      monthlyBudget: Number(row.monthly_budget || 25000),
      savingsGoal: Number(row.monthly_savings_goal || 10000),
      emergencyFundCurrent: 50000,
      emergencyFundTarget: Number(row.emergency_fund_target || 150000),
      monthlyExpenses: Number(row.monthly_budget || 25000),
      fireTarget: Number(row.fire_annual_expense || 600000) * 25,
      fireAgeTarget: 45,
      categoryBudgets: {},
      updatedAt: row.updated_at,
    };
  } catch (err) {
    console.warn('[FinanceService] Error fetching profile:', err);
    return {
      id: 'current',
      currency: '₹',
      monthlyBudget: 25000,
      savingsGoal: 10000,
      emergencyFundCurrent: 50000,
      emergencyFundTarget: 150000,
      monthlyExpenses: 25000,
      fireTarget: 15000000,
      fireAgeTarget: 45,
      categoryBudgets: {},
      updatedAt: new Date().toISOString(),
    };
  }
}

export async function saveProfileV2(p: Partial<FinancialProfile>): Promise<FinancialProfile> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const current = await getProfileV2();
  const updated: FinancialProfile = {
    ...current,
    ...p,
  };

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO finance_profile_v2 (
         id, currency_symbol, monthly_budget, emergency_fund_target, monthly_savings_goal,
         desired_emergency_months, fire_annual_expense, fire_swr_percent, updated_at
       ) VALUES ('current', ?, ?, ?, ?, 6, ?, 4.0, ?)
       ON CONFLICT(id) DO UPDATE SET
         currency_symbol = excluded.currency_symbol,
         monthly_budget = excluded.monthly_budget,
         emergency_fund_target = excluded.emergency_fund_target,
         monthly_savings_goal = excluded.monthly_savings_goal,
         fire_annual_expense = excluded.fire_annual_expense,
         updated_at = excluded.updated_at`,
      updated.currency,
      updated.monthlyBudget,
      updated.emergencyFundTarget,
      updated.savingsGoal,
      Math.round(updated.fireTarget / 25),
      now
    );

    // Legacy mirror
    try {
      await db.runAsync(
        `INSERT INTO finance_profile (id, currency, monthly_budget, savings_goal, updated_at)
         VALUES ('default_profile', ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET currency = excluded.currency, monthly_budget = excluded.monthly_budget`,
        updated.currency,
        updated.monthlyBudget,
        updated.savingsGoal,
        now
      );
    } catch {
      // ignore
    }

    await db.runAsync(
      `INSERT INTO sync_outbox (outbox_id, entity_type, entity_id, action, payload_json, created_at, status)
       VALUES (?, 'finance_profile', 'current', 'UPSERT', ?, ?, 'pending')`,
      generateUuid('outbox'),
      JSON.stringify(updated),
      now
    );
  });

  return updated;
}

// ─────────────────────────────────────────────────────────────
// 10. Deep Analytics & Insights Engines
// ─────────────────────────────────────────────────────────────

export async function getSpendingByPersona(
  timeRange: '7d' | '30d' | '90d' | '1y' | 'all' = '30d'
): Promise<{ persona: FamilyMember; amount: number; percentage: number; count: number }[]> {
  const transactions = await getTransactionsV2({ type: 'expense', timeRange });
  const members = await getFamilyMembers();
  const memberMap = new Map<string, FamilyMember>();
  members.forEach((m) => {
    memberMap.set(m.id, m);
    memberMap.set(m.name.toLowerCase(), m);
  });

  const totals = new Map<string, { amount: number; count: number }>();
  let grandTotal = 0;

  for (const t of transactions) {
    const key = t.spentOn || 'personal';
    const cur = totals.get(key) || { amount: 0, count: 0 };
    cur.amount += t.amount;
    cur.count += 1;
    totals.set(key, cur);
    grandTotal += t.amount;
  }

  const results = Array.from(totals.entries()).map(([key, data]) => {
    const persona =
      memberMap.get(key) ||
      memberMap.get(key.toLowerCase()) || {
        id: key,
        name: key.charAt(0).toUpperCase() + key.slice(1),
        relationship: 'other' as const,
        avatarEmoji: '👤',
        color: '#38BDF8',
      };
    return {
      persona,
      amount: data.amount,
      percentage: grandTotal > 0 ? Math.round((data.amount / grandTotal) * 1000) / 10 : 0,
      count: data.count,
    };
  });

  return results.sort((a, b) => b.amount - a.amount);
}

export async function getSpendingByGroup(
  timeRange: '7d' | '30d' | '90d' | '1y' | 'all' = '30d'
): Promise<{ group: MajorCategoryGroup; label: string; icon: string; color: string; amount: number; percentage: number }[]> {
  const transactions = await getTransactionsV2({ type: 'expense', timeRange });
  const groupMeta: Record<MajorCategoryGroup, { label: string; icon: string; color: string }> = {
    personal: { label: 'Personal', icon: '👤', color: '#38BDF8' },
    office: { label: 'Office / Work', icon: '💼', color: '#A855F7' },
    parents: { label: 'Parents / Elders', icon: '👨‍👩‍👧', color: '#F43F5E' },
    household: { label: 'Household', icon: '🏠', color: '#F59E0B' },
    investments: { label: 'Investments', icon: '📈', color: '#10B981' },
    other: { label: 'Other', icon: '📌', color: '#64748B' },
  };

  const totals: Record<MajorCategoryGroup, number> = {
    personal: 0,
    office: 0,
    parents: 0,
    household: 0,
    investments: 0,
    other: 0,
  };

  let grandTotal = 0;

  for (const t of transactions) {
    const grp = t.categoryGroup || 'other';
    totals[grp] = (totals[grp] || 0) + t.amount;
    grandTotal += t.amount;
  }

  return (Object.keys(totals) as MajorCategoryGroup[])
    .filter((g) => totals[g] > 0)
    .map((g) => ({
      group: g,
      label: groupMeta[g].label,
      icon: groupMeta[g].icon,
      color: groupMeta[g].color,
      amount: totals[g],
      percentage: grandTotal > 0 ? Math.round((totals[g] / grandTotal) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

export async function getDailyCashflowTrend(
  timeRange: '7d' | '30d' | '90d' | '1y' = '30d'
): Promise<{ date: string; displayDate: string; income: number; expense: number; net: number }[]> {
  const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
  const transactions = await getTransactionsV2({ timeRange });

  const map = new Map<string, { income: number; expense: number }>();
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    map.set(key, { income: 0, expense: 0 });
  }

  for (const t of transactions) {
    if (map.has(t.date)) {
      const cur = map.get(t.date)!;
      if (t.type === 'income') {
        cur.income += t.amount;
      } else if (t.type === 'expense') {
        cur.expense += t.amount;
      }
    }
  }

  return Array.from(map.entries()).map(([date, data]) => {
    const parts = date.split('-');
    const displayDate = `${parts[1]}/${parts[2]}`;
    return {
      date,
      displayDate,
      income: data.income,
      expense: data.expense,
      net: data.income - data.expense,
    };
  });
}

export async function getRule50_30_20Breakdown(): Promise<{
  needs: number;
  wants: number;
  savings: number;
  totalSpent: number;
  needsPct: number;
  wantsPct: number;
  savingsPct: number;
  targetNeedsPct: number;
  targetWantsPct: number;
  targetSavingsPct: number;
}> {
  const transactions = await getTransactionsV2({ timeRange: '30d' });
  let needs = 0;
  let wants = 0;
  let savings = 0;

  for (const t of transactions) {
    if (t.type === 'expense') {
      const g = t.categoryGroup;
      if (g === 'household' || g === 'parents') {
        needs += t.amount;
      } else if (g === 'personal' || g === 'office' || g === 'other') {
        wants += t.amount;
      } else if (g === 'investments') {
        savings += t.amount;
      }
    }
  }

  const investments = await getInvestmentsV2();
  const monthlySIP = investments.reduce((sum, inv) => sum + (inv.sipAmount || 0), 0);
  savings += monthlySIP;

  const total = needs + wants + savings;

  return {
    needs,
    wants,
    savings,
    totalSpent: total,
    needsPct: total > 0 ? Math.round((needs / total) * 100) : 0,
    wantsPct: total > 0 ? Math.round((wants / total) * 100) : 0,
    savingsPct: total > 0 ? Math.round((savings / total) * 100) : 0,
    targetNeedsPct: 50,
    targetWantsPct: 30,
    targetSavingsPct: 20,
  };
}

export async function getBurnRateSummary(
  timeRange: '7d' | '30d' | '90d' | '1y' = '30d'
): Promise<{
  dailyBurn: number;
  projectedMonthlyExpense: number;
  highestExpense: { title: string; amount: number; category: string } | null;
  totalSpent: number;
  totalIncome: number;
  netSavingsRate: number;
}> {
  const transactions = await getTransactionsV2({ timeRange });
  const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;

  let totalSpent = 0;
  let totalIncome = 0;
  let highestExpense: { title: string; amount: number; category: string } | null = null;

  for (const t of transactions) {
    if (t.type === 'expense') {
      totalSpent += t.amount;
      if (!highestExpense || t.amount > highestExpense.amount) {
        highestExpense = {
          title: t.description || t.category,
          amount: t.amount,
          category: t.category,
        };
      }
    } else if (t.type === 'income') {
      totalIncome += t.amount;
    }
  }

  const dailyBurn = Math.round(totalSpent / Math.max(1, days));
  const projectedMonthlyExpense = dailyBurn * 30;
  const netSavingsRate =
    totalIncome > 0 ? Math.round(((totalIncome - totalSpent) / totalIncome) * 1000) / 10 : 0;

  return {
    dailyBurn,
    projectedMonthlyExpense,
    highestExpense,
    totalSpent,
    totalIncome,
    netSavingsRate,
  };
}

// ─────────────────────────────────────────────────────────────
// Legacy Compatibility Bridge (Preserving v1 Signatures)
// ─────────────────────────────────────────────────────────────

export async function getTransactions(filter?: {
  type?: 'income' | 'expense';
  category?: string;
  month?: string;
  limit?: number;
}): Promise<FinanceTransaction[]> {
  return getTransactionsV2(filter as any);
}

export async function saveTransaction(t: Partial<FinanceTransaction>): Promise<FinanceTransaction> {
  return saveTransactionV2(t);
}

export async function deleteTransaction(id: string): Promise<boolean> {
  return deleteTransactionV2(id);
}

export async function getSalaries(): Promise<FinanceSalary[]> {
  const v2 = await getSalariesV2();
  return v2.map((s) => ({
    id: s.id,
    source: s.memberName,
    monthlyAmount: s.inHandSalary,
    payDate: s.payDate,
    isActive: true,
    createdAt: s.updatedAt,
    updatedAt: s.updatedAt,
  }));
}

export async function saveSalary(salary: Partial<FinanceSalary>): Promise<FinanceSalary> {
  const v2 = await saveSalaryV2({
    id: salary.id,
    memberName: salary.source || 'Primary Earner',
    monthlyGross: salary.monthlyAmount || 50000,
    inHandSalary: salary.monthlyAmount || 50000,
    payDate: salary.payDate || 1,
  });
  return {
    id: v2.id,
    source: v2.memberName,
    monthlyAmount: v2.inHandSalary,
    payDate: v2.payDate,
    isActive: true,
    createdAt: v2.updatedAt,
    updatedAt: v2.updatedAt,
  };
}

export async function deleteSalary(id: string): Promise<boolean> {
  return deleteSalaryV2(id);
}

export async function getEmis(): Promise<FinanceEmi[]> {
  const v2 = await getEmisV2();
  return v2.map((e) => ({
    id: e.id,
    name: e.loanName,
    monthlyAmount: e.emiAmount,
    totalAmount: e.principalAmount,
    remainingAmount: e.outstandingPrincipal,
    dueDay: e.dueDayOfMonth,
    interestRate: e.interestRate,
    createdAt: e.createdAt,
    updatedAt: e.createdAt,
  }));
}

export async function saveEmi(emi: Partial<FinanceEmi>): Promise<FinanceEmi> {
  const v2 = await saveEmiV2({
    id: emi.id,
    loanName: emi.name || 'Personal Loan',
    principalAmount: emi.totalAmount || 100000,
    outstandingPrincipal: emi.remainingAmount ?? (emi.totalAmount || 100000),
    emiAmount: emi.monthlyAmount || 5000,
    interestRate: emi.interestRate || 10.5,
    dueDayOfMonth: emi.dueDay || 5,
  });
  return {
    id: v2.id,
    name: v2.loanName,
    monthlyAmount: v2.emiAmount,
    totalAmount: v2.principalAmount,
    remainingAmount: v2.outstandingPrincipal,
    dueDay: v2.dueDayOfMonth,
    interestRate: v2.interestRate,
    createdAt: v2.createdAt,
    updatedAt: v2.createdAt,
  };
}

export async function deleteEmi(id: string): Promise<boolean> {
  return deleteEmiV2(id);
}

export async function getInvestments(): Promise<FinanceInvestment[]> {
  const v2 = await getInvestmentsV2();
  return v2.map((i) => ({
    id: i.id,
    name: i.name,
    type: i.type,
    investedAmount: i.investedAmount,
    currentValue: i.currentValue,
    returnsPercent: i.returnsPercent,
    createdAt: i.updatedAt,
    updatedAt: i.updatedAt,
  }));
}

export async function saveInvestment(inv: Partial<FinanceInvestment>): Promise<FinanceInvestment> {
  const v2 = await saveInvestmentV2({
    id: inv.id,
    name: inv.name || 'Investment',
    type: (inv.type as InvestmentType) || 'mutual_funds',
    investedAmount: inv.investedAmount || 10000,
    currentValue: inv.currentValue || 10000,
  });
  return {
    id: v2.id,
    name: v2.name,
    type: v2.type,
    investedAmount: v2.investedAmount,
    currentValue: v2.currentValue,
    returnsPercent: v2.returnsPercent,
    createdAt: v2.updatedAt,
    updatedAt: v2.updatedAt,
  };
}

export async function deleteInvestment(id: string): Promise<boolean> {
  return deleteInvestmentV2(id);
}

export async function getNetWorthItems(): Promise<FinanceNetWorthItem[]> {
  const { assets, liabilities } = await getNetWorthItemsV2();
  const res: FinanceNetWorthItem[] = [];
  assets.forEach((a) =>
    res.push({
      id: a.id,
      title: a.name,
      type: 'asset',
      value: a.value,
      category: a.category,
      createdAt: a.updatedAt,
      updatedAt: a.updatedAt,
    })
  );
  liabilities.forEach((l) =>
    res.push({
      id: l.id,
      title: l.name,
      type: 'liability',
      value: l.totalOutstanding,
      category: l.category,
      createdAt: l.updatedAt,
      updatedAt: l.updatedAt,
    })
  );
  return res;
}

export async function saveNetWorthItem(
  item: Partial<FinanceNetWorthItem>
): Promise<FinanceNetWorthItem> {
  const id = item.id || generateUuid('nw');
  const type = item.type || 'asset';
  await saveNetWorthItemV2(
    {
      id,
      name: item.title || 'Item',
      category: (item.category as any) || (type === 'asset' ? 'bank_cash' : 'personal_loan'),
      value: item.value || 0,
      totalOutstanding: item.value || 0,
    },
    type
  );
  return {
    id,
    title: item.title || 'Item',
    type,
    value: item.value || 0,
    category: item.category || 'bank_cash',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function deleteNetWorthItem(id: string): Promise<boolean> {
  return deleteNetWorthItemV2(id);
}

export async function getNetWorthSummary(): Promise<{
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
}> {
  const summary = await getNetWorthSummaryV2();
  return {
    totalAssets: summary.totalAssets,
    totalLiabilities: summary.totalLiabilities,
    netWorth: summary.netWorth,
  };
}

export async function getFinanceProfile(): Promise<FinanceProfileLegacy> {
  const v2 = await getProfileV2();
  return {
    id: 'current',
    currency: v2.currency,
    monthlyBudget: v2.monthlyBudget,
    savingsGoal: v2.savingsGoal,
    updatedAt: new Date().toISOString(),
  };
}

export async function saveFinanceProfile(profile: Partial<FinanceProfileLegacy>): Promise<FinanceProfileLegacy> {
  const v2 = await saveProfileV2({
    currency: profile.currency,
    monthlyBudget: profile.monthlyBudget,
    savingsGoal: profile.savingsGoal,
  });
  return {
    id: 'current',
    currency: v2.currency,
    monthlyBudget: v2.monthlyBudget,
    savingsGoal: v2.savingsGoal,
    updatedAt: new Date().toISOString(),
  };
}
