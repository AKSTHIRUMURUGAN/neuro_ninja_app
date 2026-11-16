import { getDatabase } from '../database/database';
import { walletService } from '../wallet/wallet-service';
import { villainEngine } from '../villains/villain-engine';
import type {
  VerificationProof,
  VerificationProofStatus,
  SubmitProofInput,
} from './verification-types';

class VerificationEngine {
  /**
   * Submit real photo proof for a completed habit or task
   */
  async submitProof(input: SubmitProofInput): Promise<VerificationProof> {
    const db = await getDatabase();
    const id = 'proof_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    const requestId = 'req_' + Date.now();
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO verification_proofs (
        id, request_id, entity_type, entity_id, verifier_id, photo_uri, notes,
        status, rejection_reason, submitted_at, reviewed_at, coins_awarded
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NULL, ?, NULL, 0)`,
      [
        id,
        requestId,
        input.entityType,
        input.entityId,
        input.verifierId,
        input.photoUri,
        input.notes ?? '',
        now,
      ]
    );

    return {
      id,
      requestId,
      entityType: input.entityType,
      entityId: input.entityId,
      entityTitle: input.entityTitle,
      verifierId: input.verifierId,
      photoUri: input.photoUri,
      notes: input.notes,
      status: 'pending',
      submittedAt: now,
      coinsAwarded: 0,
    };
  }

  /**
   * Get all submitted verification proofs
   */
  async getProofs(statusFilter?: VerificationProofStatus): Promise<VerificationProof[]> {
    const db = await getDatabase();
    let query = 'SELECT * FROM verification_proofs';
    const params: any[] = [];

    if (statusFilter) {
      query += ' WHERE status = ?';
      params.push(statusFilter);
    }
    query += ' ORDER BY submitted_at DESC';

    const rows = await db.getAllAsync<{
      id: string;
      request_id: string;
      entity_type: string;
      entity_id: string;
      verifier_id: string;
      photo_uri: string;
      notes: string | null;
      status: string;
      rejection_reason: string | null;
      submitted_at: string;
      reviewed_at: string | null;
      coins_awarded: number;
    }>(query, params);

    return rows.map((r) => ({
      id: r.id,
      requestId: r.request_id,
      entityType: r.entity_type as any,
      entityId: r.entity_id,
      verifierId: r.verifier_id,
      photoUri: r.photo_uri,
      notes: r.notes ?? undefined,
      status: r.status as any,
      rejectionReason: r.rejection_reason ?? undefined,
      submittedAt: r.submitted_at,
      reviewedAt: r.reviewed_at ?? undefined,
      coinsAwarded: r.coins_awarded,
    }));
  }

  /**
   * Approve proof (Parent or Buddy verifier action)
   */
  async approveProof(proofId: string, verifierName = 'Guardian/Buddy'): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const coinsReward = 100;
    const xpReward = 250;

    await db.runAsync(
      `UPDATE verification_proofs 
       SET status = 'verified', reviewed_at = ?, coins_awarded = ?
       WHERE id = ?`,
      [now, coinsReward, proofId]
    );

    // Reward wallet
    await walletService.creditCoins(
      coinsReward,
      xpReward,
      'habit',
      `Social Proof Verified by ${verifierName}`,
      proofId
    );

    // Damage villains
    try {
      await villainEngine.dealDamage('habit', 75, `Verified Social Proof (${verifierName})`);
    } catch (e) {
      console.warn('[VerificationEngine] villain damage error:', e);
    }
  }

  /**
   * Reject proof with feedback reason
   */
  async rejectProof(proofId: string, reason: string): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();

    await db.runAsync(
      `UPDATE verification_proofs 
       SET status = 'rejected', rejection_reason = ?, reviewed_at = ?
       WHERE id = ?`,
      [reason, now, proofId]
    );
  }
}

export const verificationEngine = new VerificationEngine();
