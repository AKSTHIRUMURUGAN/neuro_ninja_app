import { getDatabase, generateUuid } from '../database/database';
import { saveTransactionV2 } from './finance-service';
import type { CaptureSource, MajorCategoryGroup, PaymentMethod, TransactionType } from './finance-types';
import type { ParsedTransactionCandidate } from './parsers/parser-types';

export interface IngestionQueueItem {
  id: string;
  source: CaptureSource;
  rawHash: string;
  utrRef?: string;
  amount: number;
  type: TransactionType;
  merchantRaw: string;
  merchantNormalized: string;
  suggestedCategory: string;
  suggestedGroup: MajorCategoryGroup;
  suggestedMember: string;
  paymentMethod: PaymentMethod;
  accountLast4?: string;
  confidence: number;
  status: 'auto_posted' | 'pending_review' | 'merged' | 'dismissed';
  linkedTxId?: string;
  receiptImageUri?: string;
  rawSnippet?: string;
  detectedAt: string;
}

export interface SyncSourceState {
  sourceId: 'notification_listener' | 'sms_backfill' | 'gmail_oauth';
  isEnabled: boolean;
  lastSyncAt?: string;
  accountLabel?: string;
}

function simpleHash(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return 'h_' + (h >>> 0).toString(36);
}

class FinanceIngestionEngine {
  /**
   * Look up learned merchant rules to auto-categorize & boost confidence.
   */
  async applyMerchantRules(candidate: ParsedTransactionCandidate): Promise<ParsedTransactionCandidate> {
    const db = await getDatabase();
    const textToMatch = `${candidate.merchantRaw} ${candidate.rawText}`.toLowerCase();

    const rules = await db.getAllAsync<{
      pattern: string;
      normalized_name: string;
      category_id: string;
      category_group: string;
      spent_on: string;
      payment_method: string | null;
    }>('SELECT pattern, normalized_name, category_id, category_group, spent_on, payment_method FROM finance_merchant_rules ORDER BY hit_count DESC');

    for (const r of rules) {
      if (textToMatch.includes(r.pattern.toLowerCase())) {
        return {
          ...candidate,
          merchantNormalized: r.normalized_name,
          suggestedCategory: r.category_id,
          suggestedGroup: (r.category_group as MajorCategoryGroup) || candidate.suggestedGroup,
          suggestedMember: r.spent_on || candidate.suggestedMember,
          paymentMethod: (r.payment_method as PaymentMethod) || candidate.paymentMethod,
          confidence: Math.min(0.99, Math.max(candidate.confidence, 0.92)),
        };
      }
    }
    return candidate;
  }

  /**
   * Learn or reinforce a merchant categorization rule when the user confirms/edits a transaction.
   */
  async learnMerchantRule(params: {
    merchantRaw: string;
    normalizedName: string;
    category: string;
    categoryGroup: MajorCategoryGroup;
    spentOn: string;
    paymentMethod?: PaymentMethod;
  }) {
    const pattern = params.merchantRaw.trim().toLowerCase().slice(0, 32);
    if (!pattern || pattern === 'merchant payment' || pattern === 'scanned bill' || pattern === 'email receipt') {
      return;
    }
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO finance_merchant_rules (id, pattern, normalized_name, category_id, category_group, spent_on, payment_method, hit_count, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
       ON CONFLICT(pattern) DO UPDATE SET
         normalized_name = excluded.normalized_name,
         category_id = excluded.category_id,
         category_group = excluded.category_group,
         spent_on = excluded.spent_on,
         payment_method = COALESCE(excluded.payment_method, finance_merchant_rules.payment_method),
         hit_count = finance_merchant_rules.hit_count + 1,
         updated_at = excluded.updated_at`,
      [
        generateUuid('mr'),
        pattern,
        params.normalizedName,
        params.category,
        params.categoryGroup,
        params.spentOn,
        params.paymentMethod || null,
        now,
      ]
    );
  }

  /**
   * Ingest a parsed candidate with cross-channel deduplication (UTR / Amount+Date).
   */
  async ingestCandidate(rawCandidate: ParsedTransactionCandidate): Promise<{
    outcome: 'duplicate' | 'merged' | 'auto_posted' | 'pending_review';
    queueId?: string;
    txId?: string;
  }> {
    const db = await getDatabase();
    const candidate = await this.applyMerchantRules(rawCandidate);
    const rawHash = simpleHash(
      `${candidate.source}|${candidate.amount}|${candidate.date}|${candidate.utrRef || candidate.rawText.slice(0, 80)}`
    );

    // 1. Exact hash dedup
    const existingHash = await db.getFirstAsync<{ id: string }>(
      'SELECT id FROM finance_ingestion_queue WHERE raw_hash = ?',
      [rawHash]
    );
    if (existingHash) {
      return { outcome: 'duplicate' };
    }

    // 2. Cross-channel dedup against existing transactions (by UTR or same amount+type+date)
    let matchedTx: { id: string; description: string | null; receipt_url: string | null } | null = null;
    if (candidate.utrRef) {
      matchedTx = await db.getFirstAsync(
        'SELECT id, description, receipt_url FROM finance_transactions_v2 WHERE utr_ref = ?',
        [candidate.utrRef]
      );
    }
    if (!matchedTx) {
      matchedTx = await db.getFirstAsync(
        `SELECT id, description, receipt_url FROM finance_transactions_v2
         WHERE ABS(amount - ?) < 0.02 AND type = ? AND date = ?
         ORDER BY created_at DESC LIMIT 1`,
        [candidate.amount, candidate.type, candidate.date]
      );
    }

    const now = new Date().toISOString();
    const queueId = generateUuid('ing');

    if (matchedTx) {
      // Enrich existing transaction with richer receipt/description if available
      const nextReceipt = matchedTx.receipt_url || candidate.receiptImageUri || null;
      const nextDesc =
        candidate.source === 'gmail' && candidate.description.length > (matchedTx.description?.length || 0)
          ? candidate.description
          : matchedTx.description;

      await db.runAsync(
        `UPDATE finance_transactions_v2
         SET receipt_url = ?, description = ?, utr_ref = COALESCE(utr_ref, ?), updated_at = ?
         WHERE id = ?`,
        [nextReceipt, nextDesc, candidate.utrRef || null, now, matchedTx.id]
      );

      await db.runAsync(
        `INSERT INTO finance_ingestion_queue (
          id, source, raw_hash, utr_ref, amount, type, merchant_raw, merchant_normalized,
          suggested_category, suggested_group, suggested_member, payment_method, account_last4,
          confidence, status, linked_tx_id, receipt_image_uri, raw_snippet, detected_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'merged', ?, ?, ?, ?, ?)`,
        [
          queueId,
          candidate.source,
          rawHash,
          candidate.utrRef || null,
          candidate.amount,
          candidate.type,
          candidate.merchantRaw,
          candidate.merchantNormalized,
          candidate.suggestedCategory,
          candidate.suggestedGroup,
          candidate.suggestedMember,
          candidate.paymentMethod,
          candidate.accountLast4 || null,
          candidate.confidence,
          matchedTx.id,
          candidate.receiptImageUri || null,
          candidate.rawText.slice(0, 240),
          candidate.detectedAt,
          now,
        ]
      );

      return { outcome: 'merged', queueId, txId: matchedTx.id };
    }

    // 3. Confidence routing: Auto-post >= 0.88 for background channels
    const shouldAutoPost =
      candidate.confidence >= 0.88 &&
      (candidate.source === 'notification' || candidate.source === 'sms' || candidate.source === 'gmail');

    let linkedTxId: string | undefined;
    const status = shouldAutoPost ? 'auto_posted' : 'pending_review';

    if (shouldAutoPost) {
      const saved = await saveTransactionV2({
        amount: candidate.amount,
        type: candidate.type,
        category: candidate.suggestedCategory,
        categoryGroup: candidate.suggestedGroup,
        spentOn: candidate.suggestedMember,
        paymentMethod: candidate.paymentMethod,
        date: candidate.date,
        description: candidate.description,
        tags: ['auto-captured', candidate.source],
        source: candidate.source,
        merchantName: candidate.merchantNormalized,
        utrRef: candidate.utrRef,
        receiptUrl: candidate.receiptImageUri,
        confidence: candidate.confidence,
        isVerified: true,
      });
      linkedTxId = saved.id;
      void this.rewardFinanceDiscipline(candidate.merchantNormalized);
    }

    await db.runAsync(
      `INSERT INTO finance_ingestion_queue (
        id, source, raw_hash, utr_ref, amount, type, merchant_raw, merchant_normalized,
        suggested_category, suggested_group, suggested_member, payment_method, account_last4,
        confidence, status, linked_tx_id, receipt_image_uri, raw_snippet, detected_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        queueId,
        candidate.source,
        rawHash,
        candidate.utrRef || null,
        candidate.amount,
        candidate.type,
        candidate.merchantRaw,
        candidate.merchantNormalized,
        candidate.suggestedCategory,
        candidate.suggestedGroup,
        candidate.suggestedMember,
        candidate.paymentMethod,
        candidate.accountLast4 || null,
        candidate.confidence,
        status,
        linkedTxId || null,
        candidate.receiptImageUri || null,
        candidate.rawText.slice(0, 240),
        candidate.detectedAt,
        now,
      ]
    );

    return { outcome: status, queueId, txId: linkedTxId };
  }

  async getPendingItems(): Promise<IngestionQueueItem[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      "SELECT * FROM finance_ingestion_queue WHERE status = 'pending_review' ORDER BY detected_at DESC LIMIT 50"
    );
    return rows.map((r) => ({
      id: r.id,
      source: r.source as CaptureSource,
      rawHash: r.raw_hash,
      utrRef: r.utr_ref || undefined,
      amount: Number(r.amount),
      type: r.type as TransactionType,
      merchantRaw: r.merchant_raw || 'Unknown',
      merchantNormalized: r.merchant_normalized || 'Unknown',
      suggestedCategory: r.suggested_category,
      suggestedGroup: (r.suggested_group as MajorCategoryGroup) || 'personal',
      suggestedMember: r.suggested_member || 'personal',
      paymentMethod: (r.payment_method as PaymentMethod) || 'upi',
      accountLast4: r.account_last4 || undefined,
      confidence: Number(r.confidence),
      status: r.status,
      linkedTxId: r.linked_tx_id || undefined,
      receiptImageUri: r.receipt_image_uri || undefined,
      rawSnippet: r.raw_snippet || undefined,
      detectedAt: r.detected_at,
    }));
  }

  async approvePendingItem(
    queueId: string,
    overrides?: {
      amount?: number;
      type?: TransactionType;
      category?: string;
      categoryGroup?: MajorCategoryGroup;
      spentOn?: string;
      paymentMethod?: PaymentMethod;
      description?: string;
    }
  ): Promise<string | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<any>('SELECT * FROM finance_ingestion_queue WHERE id = ?', [queueId]);
    if (!row) return null;

    const finalCat = overrides?.category || row.suggested_category;
    const finalGroup = overrides?.categoryGroup || (row.suggested_group as MajorCategoryGroup) || 'personal';
    const finalMember = overrides?.spentOn || row.suggested_member || 'personal';
    const finalMethod = overrides?.paymentMethod || (row.payment_method as PaymentMethod) || 'upi';

    const saved = await saveTransactionV2({
      amount: overrides?.amount ?? Number(row.amount),
      type: overrides?.type ?? (row.type as TransactionType),
      category: finalCat,
      categoryGroup: finalGroup,
      spentOn: finalMember,
      paymentMethod: finalMethod,
      date: (row.detected_at as string).split('T')[0],
      description: overrides?.description || row.merchant_normalized || row.raw_snippet,
      tags: ['auto-captured', row.source],
      source: row.source as CaptureSource,
      merchantName: row.merchant_normalized,
      utrRef: row.utr_ref || undefined,
      receiptUrl: row.receipt_image_uri || undefined,
      confidence: Number(row.confidence),
      isVerified: true,
    });

    await db.runAsync(
      "UPDATE finance_ingestion_queue SET status = 'auto_posted', linked_tx_id = ? WHERE id = ?",
      [saved.id, queueId]
    );

    await this.learnMerchantRule({
      merchantRaw: row.merchant_raw || row.merchant_normalized || '',
      normalizedName: row.merchant_normalized || row.merchant_raw || 'Merchant',
      category: finalCat,
      categoryGroup: finalGroup,
      spentOn: finalMember,
      paymentMethod: finalMethod,
    });

    void this.rewardFinanceDiscipline(row.merchant_normalized || 'Expense');
    return saved.id;
  }

  async dismissPendingItem(queueId: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync("UPDATE finance_ingestion_queue SET status = 'dismissed' WHERE id = ?", [queueId]);
  }

  async approveAllHighConfidence(minConfidence: number = 0.75): Promise<number> {
    const items = await this.getPendingItems();
    let count = 0;
    for (const item of items) {
      if (item.confidence >= minConfidence) {
        await this.approvePendingItem(item.id);
        count++;
      }
    }
    return count;
  }

  async getSyncSources(): Promise<SyncSourceState[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>('SELECT * FROM finance_sync_sources');
    return rows.map((r) => ({
      sourceId: r.source_id,
      isEnabled: r.is_enabled === 1,
      lastSyncAt: r.last_sync_at || undefined,
      accountLabel: r.account_label || undefined,
    }));
  }

  async setSyncSourceState(
    sourceId: 'notification_listener' | 'sms_backfill' | 'gmail_oauth',
    isEnabled: boolean,
    accountLabel?: string
  ): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO finance_sync_sources (source_id, is_enabled, last_sync_at, account_label, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(source_id) DO UPDATE SET
         is_enabled = excluded.is_enabled,
         last_sync_at = COALESCE(excluded.last_sync_at, finance_sync_sources.last_sync_at),
         account_label = COALESCE(excluded.account_label, finance_sync_sources.account_label),
         updated_at = excluded.updated_at`,
      [sourceId, isEnabled ? 1 : 0, now, accountLabel || null, now]
    );
  }

  async rewardFinanceDiscipline(label: string) {
    try {
      const { unifiedGamificationEngine } = await import('../gamification/unified-gamification-engine');
      await unifiedGamificationEngine.dealActionDamage('task', 25, `Finance Tracked: ${label}`);
    } catch {
      // Non-fatal
    }
  }
}

export const financeIngestionEngine = new FinanceIngestionEngine();
