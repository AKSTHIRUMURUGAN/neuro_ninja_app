import type { CaptureSource, MajorCategoryGroup, PaymentMethod, TransactionType } from '../finance-types';

export interface ParsedTransactionCandidate {
  source: CaptureSource;
  rawText: string;
  amount: number;
  type: TransactionType;
  merchantRaw: string;
  merchantNormalized: string;
  paymentMethod: PaymentMethod;
  accountLast4?: string;
  utrRef?: string;
  date: string; // YYYY-MM-DD
  detectedAt: string; // ISO timestamp
  suggestedCategory: string;
  suggestedGroup: MajorCategoryGroup;
  suggestedMember: string;
  description: string;
  confidence: number; // 0.0 - 1.0
  receiptImageUri?: string;
  billDueDate?: string;
  isRefund?: boolean;
}
