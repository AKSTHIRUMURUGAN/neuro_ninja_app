import type { ParsedTransactionCandidate } from './parser-types';

/**
 * Heuristic parser for on-device ML Kit OCR text extracted from paper bills/receipts.
 */
export function parseReceiptOcrText(ocrText: string, receiptImageUri?: string): ParsedTransactionCandidate | null {
  const lines = ocrText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return null;

  // 1. Merchant Name: First meaningful header line (not tax invoice, not phone, not date)
  let merchant = 'Scanned Bill';
  for (const line of lines.slice(0, 5)) {
    if (
      line.length >= 3 &&
      !/^(tax\s*invoice|receipt|bill|gstin|phone|tel|date|welcome)/i.test(line) &&
      !/^\d+$/.test(line)
    ) {
      merchant = line.slice(0, 40);
      break;
    }
  }

  // 2. Total Amount: prioritize lines with Grand Total / Net Payable / Total Amount / Balance Due
  let totalAmount: number | null = null;
  const totalKeywords = /(grand\s*total|net\s*payable|total\s*payable|amount\s*due|bill\s*total|net\s*amount|total)/i;
  const excludeSubLines = /(sub\s*total|cgst|sgst|igst|tax|discount|round\s*off|qty|items)/i;

  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (totalKeywords.test(line) && !excludeSubLines.test(line)) {
      const m = line.match(/(?:rs\.?|inr|₹)?\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)\s*$/i);
      if (m) {
        const val = parseFloat(m[1].replace(/,/g, ''));
        if (Number.isFinite(val) && val > 0) {
          totalAmount = val;
          break;
        }
      }
    }
  }

  // Fallback: largest currency-like decimal number in the bottom half of receipt
  if (!totalAmount) {
    const bottomHalf = lines.slice(Math.floor(lines.length / 2)).join('\n');
    const nums = [...bottomHalf.matchAll(/(?:rs\.?|inr|₹)?\s*([0-9]{1,5}(?:,[0-9]{2,3})*\.[0-9]{2})/gi)]
      .map((m) => parseFloat(m[1].replace(/,/g, '')))
      .filter((n) => Number.isFinite(n) && n > 0 && n < 500000);
    if (nums.length > 0) {
      totalAmount = Math.max(...nums);
    }
  }

  if (!totalAmount) return null;

  // 3. Date extraction (DD/MM/YYYY or YYYY-MM-DD)
  let date = new Date().toISOString().split('T')[0];
  const dmy = ocrText.match(/\b(\d{2})[/-](\d{2})[/-](20\d{2})\b/);
  if (dmy) {
    const [, dd, mm, yyyy] = dmy;
    if (Number(mm) >= 1 && Number(mm) <= 12 && Number(dd) >= 1 && Number(dd) <= 31) {
      date = `${yyyy}-${mm}-${dd}`;
    }
  }

  // 4. GST note
  const gstMatch = ocrText.match(/(?:cgst|sgst|gst)[^\d]*([0-9]+(?:\.[0-9]{1,2})?)/i);
  const gstNote = gstMatch ? ` (Incl. GST ₹${gstMatch[1]})` : '';

  return {
    source: 'ocr',
    rawText: ocrText.slice(0, 300),
    amount: totalAmount,
    type: 'expense',
    merchantRaw: merchant,
    merchantNormalized: merchant,
    paymentMethod: 'upi',
    date,
    detectedAt: new Date().toISOString(),
    suggestedCategory: 'Shopping',
    suggestedGroup: 'personal',
    suggestedMember: 'personal',
    description: `${merchant} Receipt${gstNote}`,
    confidence: 0.85,
    receiptImageUri: receiptImageUri,
  };
}
