import type { MajorCategoryGroup, PaymentMethod, TransactionType } from '../finance-types';
import type { ParsedTransactionCandidate } from './parser-types';

const WORD_NUMBERS: Record<string, number> = {
  hundred: 100,
  thousand: 1000,
  k: 1000,
  lakh: 100000,
  lac: 100000,
};

function parseSpokenAmount(text: string): number | null {
  // Handle "1.5k", "2k", "450", "1,200"
  const kMatch = text.match(/(\d+(?:\.\d+)?)\s*k\b/i);
  if (kMatch) return Math.round(parseFloat(kMatch[1]) * 1000);

  const numMatch = text.match(/(\d{1,3}(?:,\d{2,3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)/);
  if (!numMatch) return null;
  let val = parseFloat(numMatch[1].replace(/,/g, ''));

  const after = text.slice((numMatch.index || 0) + numMatch[0].length).trim().toLowerCase();
  for (const [word, mult] of Object.entries(WORD_NUMBERS)) {
    if (after.startsWith(word) && val < 1000) {
      val *= mult;
      break;
    }
  }
  return Number.isFinite(val) && val > 0 ? val : null;
}

export function parseVoiceExpense(transcript: string): ParsedTransactionCandidate | null {
  const clean = transcript.trim();
  if (!clean) return null;

  const amount = parseSpokenAmount(clean);
  if (!amount) return null;

  const lower = clean.toLowerCase();

  // Type detection
  let type: TransactionType = 'expense';
  if (/\b(received|got|earned|salary|income|refund|credited)\b/i.test(lower)) {
    type = 'income';
  } else if (/\b(transferred|transfer|sent to own)\b/i.test(lower)) {
    type = 'transfer';
  }

  // Payment method
  let paymentMethod: PaymentMethod = 'upi';
  if (/\b(gpay|google pay)\b/i.test(lower)) paymentMethod = 'upi_gpay';
  else if (/\bphonepe\b/i.test(lower)) paymentMethod = 'upi_phonepe';
  else if (/\bpaytm\b/i.test(lower)) paymentMethod = 'upi_paytm';
  else if (/\b(cash|wallet)\b/i.test(lower)) paymentMethod = 'cash';
  else if (/\bcredit\s*card\b/i.test(lower)) paymentMethod = 'credit_card';
  else if (/\bdebit\s*card\b/i.test(lower)) paymentMethod = 'debit_card';

  // Relative date
  const now = new Date();
  if (/\byesterday\b/i.test(lower)) {
    now.setDate(now.getDate() - 1);
  }
  const date = now.toISOString().split('T')[0];

  // Family member cue
  let suggestedMember = 'personal';
  let suggestedGroup: MajorCategoryGroup = 'personal';
  if (/\b(mom|mother|dad|father|parents)\b/i.test(lower)) {
    suggestedMember = 'parents';
    suggestedGroup = 'parents';
  } else if (/\b(office|work|client|business)\b/i.test(lower)) {
    suggestedMember = 'office';
    suggestedGroup = 'office';
  } else if (/\b(family|house|home|rent|electricity|wifi)\b/i.test(lower)) {
    suggestedMember = 'family';
    suggestedGroup = 'household';
  }

  // Category keywords
  let suggestedCategory = type === 'income' ? 'Income Credit' : 'Miscellaneous';
  if (/\b(lunch|dinner|breakfast|coffee|tea|food|swiggy|zomato|biryani|pizza|snack|restaurant)\b/i.test(lower)) {
    suggestedCategory = 'Food & Dining';
  } else if (/\b(uber|ola|auto|cab|metro|bus|petrol|fuel|train|flight)\b/i.test(lower)) {
    suggestedCategory = 'Transportation';
  } else if (/\b(grocery|groceries|vegetables|milk|blinkit|zepto|dmart)\b/i.test(lower)) {
    suggestedCategory = 'Kitchen & Provisions';
    suggestedGroup = 'household';
  } else if (/\b(medicine|doctor|pharmacy|hospital|medical|apollo)\b/i.test(lower)) {
    suggestedCategory = suggestedMember === 'parents' ? 'Family Medical & Medicines' : 'Healthcare';
  } else if (/\b(rent)\b/i.test(lower)) {
    suggestedCategory = 'House Rent';
    suggestedGroup = 'household';
  } else if (/\b(electricity|water|gas|wifi|recharge|bill)\b/i.test(lower)) {
    suggestedCategory = 'Bills & Utilities';
    suggestedGroup = 'household';
  } else if (/\b(shopping|amazon|flipkart|clothes|shoes)\b/i.test(lower)) {
    suggestedCategory = 'Shopping';
  } else if (/\b(movie|netflix|game|entertainment)\b/i.test(lower)) {
    suggestedCategory = 'Entertainment';
  }

  // Extract merchant/note after "at" / "on" / "for"
  const atMatch = clean.match(/\b(?:at|from)\s+([A-Za-z0-9\s&]{2,25}?)(?:\s+(?:via|by|in|for|yesterday|today)|$)/i);
  const merchant = atMatch ? atMatch[1].trim() : clean.slice(0, 32);

  return {
    source: 'voice',
    rawText: clean,
    amount,
    type,
    merchantRaw: merchant,
    merchantNormalized: merchant,
    paymentMethod,
    date,
    detectedAt: new Date().toISOString(),
    suggestedCategory,
    suggestedGroup,
    suggestedMember,
    description: clean,
    confidence: 0.92,
  };
}
