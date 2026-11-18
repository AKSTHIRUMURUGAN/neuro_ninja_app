/**
 * Neuro Finance Types & Contracts
 * 100% Parity with Neuro Ninja Web & Competitor Standards
 */

export type TransactionType = 'expense' | 'income' | 'transfer';

export type PaymentMethod =
  | 'cash'
  | 'upi'
  | 'upi_gpay'
  | 'upi_phonepe'
  | 'upi_paytm'
  | 'upi_bhim'
  | 'credit_card'
  | 'debit_card'
  | 'net_banking'
  | 'wallet'
  | 'other';

export interface PaymentMethodOption {
  id: PaymentMethod;
  label: string;
  icon: string;
  badgeColor: string;
}

export const PAYMENT_METHODS: PaymentMethodOption[] = [
  { id: 'cash', label: 'Cash', icon: '💵', badgeColor: '#10B981' },
  { id: 'upi_gpay', label: 'GPay UPI', icon: '📲', badgeColor: '#38BDF8' },
  { id: 'upi_phonepe', label: 'PhonePe', icon: '🟣', badgeColor: '#A855F7' },
  { id: 'upi_paytm', label: 'Paytm UPI', icon: '💙', badgeColor: '#06B6D4' },
  { id: 'upi_bhim', label: 'BHIM UPI', icon: '🇮🇳', badgeColor: '#F59E0B' },
  { id: 'credit_card', label: 'Credit Card', icon: '💳', badgeColor: '#EF4444' },
  { id: 'debit_card', label: 'Debit Card', icon: '💳', badgeColor: '#818CF8' },
  { id: 'net_banking', label: 'Net Banking', icon: '🏦', badgeColor: '#14B8A6' },
  { id: 'wallet', label: 'Digital Wallet', icon: '👛', badgeColor: '#F97316' },
  { id: 'other', label: 'Other', icon: '📑', badgeColor: '#64748B' },
];

export type MajorCategoryGroup =
  | 'personal'
  | 'office'
  | 'parents'
  | 'household'
  | 'investments'
  | 'other';

export interface CustomCategory {
  id: string;
  name: string;
  iconType: 'emoji' | 'image';
  iconValue: string; // Emoji character (e.g. "🍔") or Image URL
  color?: string;
  budgetLimit?: number;
  group?: MajorCategoryGroup;
}

export interface CategoryGroup {
  id: MajorCategoryGroup;
  label: string;
  icon: string;
  color: string;
  subCategories: CustomCategory[];
}

export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    id: 'personal',
    label: 'Personal',
    icon: '👤',
    color: '#38BDF8',
    subCategories: [
      { id: 'p_food', name: 'Food & Dining', iconType: 'emoji', iconValue: '🍔', group: 'personal', color: '#F59E0B' },
      { id: 'p_transport', name: 'Transportation', iconType: 'emoji', iconValue: '🚗', group: 'personal', color: '#38BDF8' },
      { id: 'p_shopping', name: 'Shopping', iconType: 'emoji', iconValue: '🛍️', group: 'personal', color: '#EC4899' },
      { id: 'p_entertainment', name: 'Entertainment', iconType: 'emoji', iconValue: '🎮', group: 'personal', color: '#A855F7' },
      { id: 'p_health', name: 'Healthcare & Fitness', iconType: 'emoji', iconValue: '🏥', group: 'personal', color: '#10B981' },
      { id: 'p_education', name: 'Education & Courses', iconType: 'emoji', iconValue: '📚', group: 'personal', color: '#06B6D4' },
      { id: 'p_grooming', name: 'Grooming & Self-care', iconType: 'emoji', iconValue: '💈', group: 'personal', color: '#14B8A6' },
      { id: 'p_subscriptions', name: 'Digital Subscriptions', iconType: 'emoji', iconValue: '📺', group: 'personal', color: '#6366F1' },
    ],
  },
  {
    id: 'office',
    label: 'Office / Work',
    icon: '💼',
    color: '#A855F7',
    subCategories: [
      { id: 'o_meals', name: 'Office Meals & Snacks', iconType: 'emoji', iconValue: '🍱', group: 'office', color: '#F97316' },
      { id: 'o_tools', name: 'Tools & Software', iconType: 'emoji', iconValue: '🛠️', group: 'office', color: '#A855F7' },
      { id: 'o_travel', name: 'Business Travel', iconType: 'emoji', iconValue: '✈️', group: 'office', color: '#6366F1' },
      { id: 'o_supplies', name: 'Office Equipment', iconType: 'emoji', iconValue: '📎', group: 'office', color: '#64748B' },
      { id: 'o_commute', name: 'Work Commute', iconType: 'emoji', iconValue: '🚇', group: 'office', color: '#38BDF8' },
      { id: 'o_networking', name: 'Client & Networking', iconType: 'emoji', iconValue: '🤝', group: 'office', color: '#F59E0B' },
    ],
  },
  {
    id: 'parents',
    label: 'Parents / Family',
    icon: '👨‍👩‍👧',
    color: '#F43F5E',
    subCategories: [
      { id: 'f_medical', name: 'Family Medical & Medicines', iconType: 'emoji', iconValue: '💊', group: 'parents', color: '#F43F5E' },
      { id: 'f_groceries', name: 'Family Groceries', iconType: 'emoji', iconValue: '🛒', group: 'parents', color: '#84CC16' },
      { id: 'f_bills', name: 'Family Utility Bills', iconType: 'emoji', iconValue: '📄', group: 'parents', color: '#F59E0B' },
      { id: 'f_gifts', name: 'Gifts & Festivals', iconType: 'emoji', iconValue: '🎁', group: 'parents', color: '#EC4899' },
      { id: 'f_support', name: 'Monthly Parent Support', iconType: 'emoji', iconValue: '💵', group: 'parents', color: '#10B981' },
    ],
  },
  {
    id: 'household',
    label: 'Household',
    icon: '🏠',
    color: '#F59E0B',
    subCategories: [
      { id: 'h_rent', name: 'House Rent', iconType: 'emoji', iconValue: '🏠', group: 'household', color: '#F59E0B' },
      { id: 'h_utilities', name: 'Electricity / Water / Gas', iconType: 'emoji', iconValue: '💡', group: 'household', color: '#EAB308' },
      { id: 'h_internet', name: 'WiFi & Mobile Recharges', iconType: 'emoji', iconValue: '📶', group: 'household', color: '#38BDF8' },
      { id: 'h_maintenance', name: 'Home Repairs & Upkeep', iconType: 'emoji', iconValue: '🔧', group: 'household', color: '#71717A' },
      { id: 'h_groceries', name: 'Kitchen & Provisions', iconType: 'emoji', iconValue: '🥦', group: 'household', color: '#22C55E' },
      { id: 'h_maid', name: 'Maid / Domestic Help', iconType: 'emoji', iconValue: '🧹', group: 'household', color: '#14B8A6' },
    ],
  },
  {
    id: 'investments',
    label: 'Investments & Savings',
    icon: '📈',
    color: '#10B981',
    subCategories: [
      { id: 'i_sip', name: 'SIP & Mutual Funds', iconType: 'emoji', iconValue: '📊', group: 'investments', color: '#10B981' },
      { id: 'i_stocks', name: 'Stock Market', iconType: 'emoji', iconValue: '📈', group: 'investments', color: '#06B6D4' },
      { id: 'i_fd', name: 'Fixed Deposits & RD', iconType: 'emoji', iconValue: '🏦', group: 'investments', color: '#38BDF8' },
      { id: 'i_ppf', name: 'PPF, EPF & NPS', iconType: 'emoji', iconValue: '🔒', group: 'investments', color: '#8B5CF6' },
      { id: 'i_gold', name: 'Gold / SGB', iconType: 'emoji', iconValue: '🥇', group: 'investments', color: '#F59E0B' },
      { id: 'i_crypto', name: 'Crypto & Web3', iconType: 'emoji', iconValue: '🪙', group: 'investments', color: '#F97316' },
      { id: 'i_insurance', name: 'Life & Health Insurance', iconType: 'emoji', iconValue: '🛡️', group: 'investments', color: '#6366F1' },
    ],
  },
  {
    id: 'other',
    label: 'Other & Misc',
    icon: '📌',
    color: '#64748B',
    subCategories: [
      { id: 'x_travel', name: 'Vacation & Travel', iconType: 'emoji', iconValue: '🏖️', group: 'other', color: '#0EA5E9' },
      { id: 'x_charity', name: 'Donations & Giving', iconType: 'emoji', iconValue: '🤲', group: 'other', color: '#F43F5E' },
      { id: 'x_income', name: 'Income Credit', iconType: 'emoji', iconValue: '💰', group: 'other', color: '#10B981' },
      { id: 'x_misc', name: 'Miscellaneous', iconType: 'emoji', iconValue: '📌', group: 'other', color: '#64748B' },
    ],
  },
];

export const DEFAULT_CUSTOM_CATEGORIES: CustomCategory[] = [
  { id: 'Food & Dining', name: 'Food & Dining', iconType: 'emoji', iconValue: '🍔', group: 'personal', color: '#F59E0B', budgetLimit: 6000 },
  { id: 'Transportation', name: 'Transportation', iconType: 'emoji', iconValue: '🚗', group: 'personal', color: '#38BDF8', budgetLimit: 3000 },
  { id: 'Shopping', name: 'Shopping', iconType: 'emoji', iconValue: '🛍️', group: 'personal', color: '#EC4899', budgetLimit: 4000 },
  { id: 'Entertainment', name: 'Entertainment', iconType: 'emoji', iconValue: '🎮', group: 'personal', color: '#A855F7', budgetLimit: 2000 },
  { id: 'Bills & Utilities', name: 'Bills & Utilities', iconType: 'emoji', iconValue: '💡', group: 'household', color: '#F43F5E', budgetLimit: 4000 },
  { id: 'Healthcare', name: 'Healthcare', iconType: 'emoji', iconValue: '🏥', group: 'personal', color: '#10B981', budgetLimit: 3000 },
  { id: 'Education', name: 'Education', iconType: 'emoji', iconValue: '📚', group: 'personal', color: '#06B6D4', budgetLimit: 2500 },
  { id: 'House Rent', name: 'House Rent', iconType: 'emoji', iconValue: '🏠', group: 'household', color: '#F59E0B', budgetLimit: 15000 },
  { id: 'SIP & Mutual Funds', name: 'SIP & Mutual Funds', iconType: 'emoji', iconValue: '📊', group: 'investments', color: '#10B981', budgetLimit: 10000 },
  { id: 'Income', name: 'Income', iconType: 'emoji', iconValue: '💰', group: 'other', color: '#10B981' },
  { id: 'Other', name: 'Other', iconType: 'emoji', iconValue: '📌', group: 'other', color: '#64748B', budgetLimit: 2000 },
];

export type FamilyRelationship =
  | 'self'
  | 'spouse'
  | 'father'
  | 'mother'
  | 'child'
  | 'sibling'
  | 'family'
  | 'office'
  | 'friend'
  | 'business'
  | 'roommate'
  | 'other'
  | (string & {});

export interface FamilyMember {
  id: string;
  name: string;
  relationship: FamilyRelationship;
  avatarEmoji?: string;
  avatarType?: 'emoji' | 'image' | 'icon';
  avatarUrl?: string;
  iconName?: string;
  color?: string;
  isCustom?: boolean;
  isDefault?: boolean;
}

export const DEFAULT_FAMILY_MEMBERS: FamilyMember[] = [
  { id: 'personal', name: 'Self', relationship: 'self', avatarEmoji: '👤', color: '#38BDF8', isDefault: true },
  { id: 'parents', name: 'Parents / Elders', relationship: 'father', avatarEmoji: '👨‍👩‍👧', color: '#F43F5E', isDefault: true },
  { id: 'family', name: 'Family Combined', relationship: 'family', avatarEmoji: '🏠', color: '#F59E0B', isDefault: true },
  { id: 'child', name: 'Child / Kids', relationship: 'child', avatarEmoji: '👶', color: '#10B981', isDefault: true },
  { id: 'spouse', name: 'Spouse / Partner', relationship: 'spouse', avatarEmoji: '💍', color: '#A855F7', isDefault: true },
  { id: 'office', name: 'Office / Business', relationship: 'office', avatarEmoji: '💼', color: '#6366F1', isDefault: true },
];

export interface FinanceTransaction {
  id: string;
  amount: number;
  type: TransactionType;
  category: string;
  categoryGroup?: MajorCategoryGroup;
  spentOn?: string; // member id or 'personal'|'parents'|'spouse'|'child'|'office'
  paymentMethod?: PaymentMethod;
  date: string; // YYYY-MM-DD
  description?: string;
  linkedGoalId?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  syncStatus?: 'synced' | 'pending' | 'error';
}

export interface SalaryDeductions {
  pf: number; // Provident Fund
  pt: number; // Professional Tax
  tds: number; // Tax Deducted at Source
  insurance: number; // Health/Life Insurance
  other: number; // Other deductions
}

export type IncomeSourceType =
  | 'salary'
  | 'freelance'
  | 'rental'
  | 'business'
  | 'dividend'
  | 'pension'
  | 'other';

export interface SalaryProfile {
  id: string;
  memberId: string;
  memberName: string;
  relationship: FamilyRelationship;
  incomeType: IncomeSourceType;
  monthlyGross: number;
  basicPay: number;
  hra: number;
  specialAllowance: number;
  deductions: SalaryDeductions;
  inHandSalary: number;
  sideIncome: number;
  payDate: number; // 1-31
  effectiveDate: string; // YYYY-MM
  companyName?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  syncStatus?: 'synced' | 'pending' | 'error';
}

export type LoanType =
  | 'home'
  | 'car'
  | 'personal'
  | 'education'
  | 'credit_card'
  | 'two_wheeler'
  | 'consumer_durable'
  | 'gold'
  | 'other';

export type ObligationType = 'term_loan' | 'consumer_emi' | 'borrowed_personal';

export interface EMIRecord {
  id: string;
  loanName: string;
  loanType: LoanType;
  obligationType: ObligationType;
  borrowerMember: string;
  lenderName?: string;
  principalAmount: number;
  interestRate: number; // Annual %
  tenureMonths: number;
  emiAmount: number; // Monthly EMI
  startDate: string; // YYYY-MM-DD
  dueDayOfMonth: number; // 1-31
  monthsPaid: number;
  remainingMonths: number;
  totalInterestPayable?: number;
  outstandingPrincipal: number;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  syncStatus?: 'synced' | 'pending' | 'error';
}

export type InvestmentType =
  | 'stocks'
  | 'mutual_funds'
  | 'fd'
  | 'ppf'
  | 'nps'
  | 'epf'
  | 'gold'
  | 'real_estate'
  | 'crypto'
  | 'bonds'
  | 'other';

export interface InvestmentRecord {
  id: string;
  name: string;
  type: InvestmentType;
  platform?: string; // Zerodha, Groww, Kuvera, HDFC, etc.
  investedAmount: number;
  currentValue: number;
  units?: number;
  purchaseDate: string; // YYYY-MM-DD
  sipAmount?: number;
  sipFrequency?: 'monthly' | 'quarterly';
  sipDayOfMonth?: number;
  maturityDate?: string;
  interestRate?: number;
  returnsPercent: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  syncStatus?: 'synced' | 'pending' | 'error';
}

export type AssetCategory =
  | 'bank_cash'
  | 'investments'
  | 'gold_jewellery'
  | 'real_estate'
  | 'vehicles'
  | 'pf_gratuity'
  | 'business'
  | 'other';

export interface AssetItem {
  id: string;
  name: string;
  category: AssetCategory;
  value: number;
  owner: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  syncStatus?: 'synced' | 'pending' | 'error';
}

export type LiabilityCategory =
  | 'home_loan'
  | 'vehicle_loan'
  | 'personal_loan'
  | 'education_loan'
  | 'credit_card'
  | 'borrowed_family'
  | 'consumer_emi'
  | 'other';

export interface LiabilityItem {
  id: string;
  name: string;
  category: LiabilityCategory;
  totalOutstanding: number;
  monthlyEMI?: number;
  borrower: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  syncStatus?: 'synced' | 'pending' | 'error';
}

export type FinancialGoalCategory =
  | 'vehicle'
  | 'house'
  | 'education'
  | 'wedding'
  | 'travel'
  | 'emergency'
  | 'retirement'
  | 'gadget'
  | 'other';

export interface FinancialGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentSaved: number;
  targetDate: string; // YYYY-MM
  priority: 'high' | 'medium' | 'low';
  category: FinancialGoalCategory;
  monthlyAllocation?: number;
  createdAt: string;
  updatedAt: string;
  syncStatus?: 'synced' | 'pending' | 'error';
}

export interface FinancialProfile {
  id: string;
  currency: string;
  monthlyBudget: number;
  savingsGoal: number;
  emergencyFundCurrent: number;
  emergencyFundTarget: number;
  monthlyExpenses: number;
  fireTarget: number;
  fireAgeTarget: number;
  categoryBudgets: Record<string, number>;
  updatedAt: string;
}

export interface EMISafetyInfo {
  maxSafeEMI: number;
  remainingCapacity: number;
  status: 'safe' | 'moderate' | 'critical';
  percentage: number; // DTI %
}

export interface NetWorthSummary {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  liquidCash: number;
  investmentAssets: number;
  emergencyFundRunwayMonths: number;
}
