import type { ParsedTransactionCandidate } from './parser-types';

const GMAIL_KNOWN_SENDERS: { pattern: RegExp; merchant: string; category: string; group: 'personal' | 'household' | 'other' }[] = [
  { pattern: /swiggy/i, merchant: 'Swiggy', category: 'Food & Dining', group: 'personal' },
  { pattern: /zomato/i, merchant: 'Zomato', category: 'Food & Dining', group: 'personal' },
  { pattern: /amazon/i, merchant: 'Amazon', category: 'Shopping', group: 'personal' },
  { pattern: /flipkart/i, merchant: 'Flipkart', category: 'Shopping', group: 'personal' },
  { pattern: /uber/i, merchant: 'Uber', category: 'Transportation', group: 'personal' },
  { pattern: /olacabs|ola\s/i, merchant: 'Ola', category: 'Transportation', group: 'personal' },
  { pattern: /blinkit|grofers/i, merchant: 'Blinkit', category: 'Kitchen & Provisions', group: 'household' },
  { pattern: /zepto/i, merchant: 'Zepto', category: 'Kitchen & Provisions', group: 'household' },
  { pattern: /netflix/i, merchant: 'Netflix', category: 'Digital Subscriptions', group: 'personal' },
  { pattern: /spotify/i, merchant: 'Spotify', category: 'Digital Subscriptions', group: 'personal' },
  { pattern: /airtel/i, merchant: 'Airtel', category: 'WiFi & Mobile Recharges', group: 'household' },
  { pattern: /jio/i, merchant: 'Jio', category: 'WiFi & Mobile Recharges', group: 'household' },
  { pattern: /bescom|electricity|power\s+bill/i, merchant: 'Electricity Utility', category: 'Electricity / Water / Gas', group: 'household' },
  { pattern: /irctc/i, merchant: 'IRCTC', category: 'Vacation & Travel', group: 'other' },
];

export function parseGmailReceipt(params: {
  from: string;
  subject: string;
  snippet: string;
  bodyText?: string;
  internalDateMs?: number;
}): ParsedTransactionCandidate | null {
  const combined = `${params.from}\n${params.subject}\n${params.bodyText || params.snippet}`;

  // Skip OTPs & marketing newsletters
  if (/\botp\b|verification\s+code|unsubscribe\s+from\s+promotional/i.test(combined)) {
    return null;
  }

  // Extract total amount (prefer Total Paid / Order Total / Grand Total)
  const totalMatch = combined.match(
    /(?:grand\s*total|total\s*paid|amount\s*paid|order\s*total|bill\s*amount|debited\s*for)\s*[:\-]?\s*(?:rs\.?|inr|₹)\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/i
  ) || combined.match(/(?:rs\.?|inr|₹)\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/i);

  if (!totalMatch) return null;
  const amount = parseFloat(totalMatch[1].replace(/,/g, ''));
  if (!Number.isFinite(amount) || amount <= 0) return null;

  let merchant = 'Email Receipt';
  let suggestedCategory = 'Shopping';
  let suggestedGroup: 'personal' | 'household' | 'other' = 'personal';

  for (const s of GMAIL_KNOWN_SENDERS) {
    if (s.pattern.test(combined)) {
      merchant = s.merchant;
      suggestedCategory = s.category;
      suggestedGroup = s.group;
      break;
    }
  }

  const isCredit = /\b(credited|refund\s*processed|salary\s*credited)\b/i.test(combined);
  const dueMatch = combined.match(/due\s*(?:date|by)\s*[:\-]?\s*(\d{1,2}[\s/-][A-Za-z0-9]{2,3}[\s/-]\d{2,4})/i);

  const dt = params.internalDateMs ? new Date(params.internalDateMs) : new Date();
  const date = dt.toISOString().split('T')[0];

  return {
    source: 'gmail',
    rawText: `${params.subject} — ${params.snippet}`.slice(0, 300),
    amount,
    type: isCredit ? 'income' : 'expense',
    merchantRaw: merchant,
    merchantNormalized: merchant,
    paymentMethod: /credit\s*card/i.test(combined) ? 'credit_card' : 'upi',
    date,
    detectedAt: dt.toISOString(),
    suggestedCategory: isCredit ? 'Income Credit' : suggestedCategory,
    suggestedGroup: isCredit ? 'other' : suggestedGroup,
    suggestedMember: 'personal',
    description: `${merchant}: ${params.subject.slice(0, 60)}`,
    confidence: merchant !== 'Email Receipt' ? 0.9 : 0.68,
    billDueDate: dueMatch ? dueMatch[1] : undefined,
  };
}
