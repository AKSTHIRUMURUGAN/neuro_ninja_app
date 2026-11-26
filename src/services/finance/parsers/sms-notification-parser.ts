import type { PaymentMethod, TransactionType } from '../finance-types';
import type { ParsedTransactionCandidate } from './parser-types';

const OTP_OR_SPAM_PATTERNS = [
  /\botp\b/i,
  /one[\s-]?time[\s-]?password/i,
  /verification\s+code/i,
  /\bcvv\b/i,
  /do\s+not\s+share/i,
  /pre[\s-]?approved/i,
  /apply\s+now/i,
  /win\s+up\s*to/i,
  /instant\s+loan/i,
  /requested\s+money/i,
  /collect\s+request/i,
  /mandate\s+created/i,
  /available\s+limit\s+is/i,
];

const DEBIT_KEYWORDS = /\b(debited|spent|paid|sent|withdrawn|charged|purchase|txn\s+of|deducted)\b/i;
const CREDIT_KEYWORDS = /\b(credited|received|deposited|refunded|cashback|reversed)\b/i;
const TRANSFER_KEYWORDS = /(credit\s+card\s+bill|cc\s+bill|self\s+transfer|own\s+account|bill\s+payment\s+towards\s+card)/i;
const REFUND_KEYWORDS = /\b(refund|refunded|reversed|reversal|cashback)\b/i;

function extractAmount(text: string): number | null {
  // Match Rs. 1,250.50 | INR 450 | ₹999.00 | Rs 500
  const m = text.match(/(?:rs\.?|inr|₹)\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/i);
  if (!m) return null;
  const val = parseFloat(m[1].replace(/,/g, ''));
  return Number.isFinite(val) && val > 0 ? val : null;
}

function detectPaymentMethod(text: string, packageName?: string): PaymentMethod {
  const lower = text.toLowerCase();
  const pkg = (packageName || '').toLowerCase();
  if (pkg.includes('nbu.paisa') || lower.includes('gpay') || lower.includes('google pay')) return 'upi_gpay';
  if (pkg.includes('phonepe') || lower.includes('phonepe')) return 'upi_phonepe';
  if (pkg.includes('paytm') || lower.includes('paytm')) return 'upi_paytm';
  if (lower.includes('bhim')) return 'upi_bhim';
  if (lower.includes('upi') || lower.includes('vpa') || /@[a-z]{3,}/i.test(text)) return 'upi';
  if (lower.includes('credit card') || lower.includes('cc xx')) return 'credit_card';
  if (lower.includes('debit card') || lower.includes('atm') || lower.includes('pos')) return 'debit_card';
  if (lower.includes('neft') || lower.includes('imps') || lower.includes('rtgs') || lower.includes('netbanking')) return 'net_banking';
  return 'upi';
}

function extractUtrRef(text: string): string | undefined {
  const m = text.match(/(?:utr|ref(?:\s*no\.?)?|rrn|upi\s*ref)[:\s#-]*([0-9]{10,14})/i);
  return m ? m[1] : undefined;
}

function extractAccountLast4(text: string): string | undefined {
  const m = text.match(/(?:a\/c|acct|account|card)\s*(?:no\.?)?\s*(?:x+|\*+)?([0-9]{4})\b/i);
  return m ? m[1] : undefined;
}

function extractMerchant(text: string): string {
  // Pattern 1: "to Swiggy" / "at Starbucks" / "towards Uber" / "info: VPA"
  const p1 = text.match(/(?:at|to|towards|for|merchant|vpa)\s+([A-Za-z0-9@._&\-\s]{2,32}?)(?:\s+(?:on|via|using|ref|utr|avl|bal|is|for|\d{2}[/-])|[.;,\n]|$)/i);
  if (p1 && p1[1].trim().length >= 2) {
    return p1[1].trim().replace(/^UPI[-\s]*/i, '');
  }
  // Pattern 2: UPI VPA like swiggy@icici
  const vpa = text.match(/([a-z0-9._-]+)@(?:ok[a-z]+|ybl|ibl|axl|paytm|icici|hdfcbank|sbi)/i);
  if (vpa) return vpa[1];
  return 'Merchant Payment';
}

export function parseSmsOrNotification(
  text: string,
  source: 'sms' | 'notification',
  opts?: { packageName?: string; timestampMs?: number }
): ParsedTransactionCandidate | null {
  if (!text || text.trim().length < 12) return null;

  // 1. Reject OTPs, promos, collect requests
  for (const pat of OTP_OR_SPAM_PATTERNS) {
    if (pat.test(text)) return null;
  }

  // 2. Must contain an explicit amount
  const amount = extractAmount(text);
  if (!amount) return null;

  // 3. Determine transaction direction
  const hasDebit = DEBIT_KEYWORDS.test(text);
  const hasCredit = CREDIT_KEYWORDS.test(text);
  if (!hasDebit && !hasCredit) return null;

  let type: TransactionType = hasDebit ? 'expense' : 'income';
  if (TRANSFER_KEYWORDS.test(text)) {
    type = 'transfer';
  }
  const isRefund = REFUND_KEYWORDS.test(text);

  const paymentMethod = detectPaymentMethod(text, opts?.packageName);
  const utrRef = extractUtrRef(text);
  const accountLast4 = extractAccountLast4(text);
  const merchantRaw = extractMerchant(text);

  const ts = opts?.timestampMs ? new Date(opts.timestampMs) : new Date();
  const date = ts.toISOString().split('T')[0];

  let confidence = 0.72;
  if (utrRef) confidence += 0.12;
  if (accountLast4) confidence += 0.06;
  if (merchantRaw !== 'Merchant Payment') confidence += 0.08;
  confidence = Math.min(0.98, confidence);

  return {
    source,
    rawText: text.slice(0, 300),
    amount,
    type,
    merchantRaw,
    merchantNormalized: merchantRaw,
    paymentMethod,
    accountLast4,
    utrRef,
    date,
    detectedAt: ts.toISOString(),
    suggestedCategory: type === 'income' ? 'Income Credit' : 'Miscellaneous',
    suggestedGroup: type === 'income' ? 'other' : 'personal',
    suggestedMember: 'personal',
    description: `${merchantRaw}${accountLast4 ? ` (••${accountLast4})` : ''}`,
    confidence,
    isRefund,
  };
}
