import { getDatabase, generateUuid } from '../database/database';
import { VerifierRecord, VerificationRequestRecord, VerificationStatus } from '../habits/habit-types';
import { walletService } from '../wallet/wallet-service';

export async function getVerifiers(): Promise<VerifierRecord[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: string;
    user_id: string | null;
    verifier_email: string;
    verifier_name: string;
    relationship: string;
    status: string;
    created_at: string;
    sync_status: string | null;
  }>('SELECT * FROM verifiers ORDER BY created_at DESC');

  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id ?? undefined,
    verifierEmail: r.verifier_email,
    verifierName: r.verifier_name,
    relationship: (r.relationship as 'friend' | 'parent' | 'mentor' | 'coach') || 'friend',
    status: (r.status as 'pending' | 'invited' | 'accepted' | 'declined') || 'accepted',
    createdAt: r.created_at,
    syncStatus: (r.sync_status as 'synced' | 'pending') || 'synced',
  }));
}

export async function addVerifier(input: {
  verifierName: string;
  verifierEmail: string;
  relationship: 'friend' | 'parent' | 'mentor' | 'coach';
}): Promise<VerifierRecord> {
  const db = await getDatabase();
  const id = generateUuid('vrf');
  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO verifiers (id, user_id, verifier_email, verifier_name, relationship, status, created_at, sync_status)
       VALUES (?, 'local_user', ?, ?, ?, 'accepted', ?, 'pending')`,
      id,
      input.verifierEmail.trim().toLowerCase(),
      input.verifierName.trim(),
      input.relationship,
      now
    );

    // Queue sync to web REST API (/api/verifiers)
    await db.runAsync(
      `INSERT INTO sync_outbox (outbox_id, entity_type, entity_id, action, payload_json, created_at, status)
       VALUES (?, 'verifier', ?, 'invite', ?, ?, 'pending')`,
      generateUuid('out'),
      id,
      JSON.stringify({ ...input, id, createdAt: now }),
      now
    );
  });

  return {
    id,
    userId: 'local_user',
    verifierEmail: input.verifierEmail.trim().toLowerCase(),
    verifierName: input.verifierName.trim(),
    relationship: input.relationship,
    status: 'accepted',
    createdAt: now,
    syncStatus: 'pending',
  };
}

export async function deleteVerifier(id: string): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM verifiers WHERE id = ?', id);
    await db.runAsync(
      `INSERT INTO sync_outbox (outbox_id, entity_type, entity_id, action, payload_json, created_at, status)
       VALUES (?, 'verifier', ?, 'delete', '{}', ?, 'pending')`,
      generateUuid('out'),
      id,
      new Date().toISOString()
    );
  });
}

export async function createVerificationRequest(input: {
  taskId?: string | null;
  habitId?: string | null;
  date?: string | null;
  verifierId: string;
  verifierEmail?: string | null;
  type: 'habit' | 'task';
  notes?: string | null;
  proofUrl?: string | null;
}): Promise<VerificationRequestRecord> {
  const db = await getDatabase();
  const id = generateUuid('vreq');
  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO verification_requests
       (id, task_id, habit_id, date, user_id, verifier_id, verifier_email, type, status, notes, proof_url, created_at, sync_status)
       VALUES (?, ?, ?, ?, 'local_user', ?, ?, ?, 'pending', ?, ?, ?, 'pending')`,
      id,
      input.taskId || null,
      input.habitId || null,
      input.date || null,
      input.verifierId,
      input.verifierEmail || null,
      input.type,
      input.notes || null,
      input.proofUrl || null,
      now
    );

    // If it's a task, update task's verification_status
    if (input.taskId) {
      await db.runAsync(
        "UPDATE tasks SET verification_status = 'pending', verifier_id = ?, verifier_email = ? WHERE task_id = ?",
        input.verifierId,
        input.verifierEmail || null,
        input.taskId
      );
    }

    // Queue sync to web REST API (/api/verification-requests)
    await db.runAsync(
      `INSERT INTO sync_outbox (outbox_id, entity_type, entity_id, action, payload_json, created_at, status)
       VALUES (?, 'verification_request', ?, 'create', ?, ?, 'pending')`,
      generateUuid('out'),
      id,
      JSON.stringify({ ...input, id, createdAt: now }),
      now
    );
  });

  return {
    id,
    taskId: input.taskId,
    habitId: input.habitId,
    date: input.date,
    userId: 'local_user',
    verifierId: input.verifierId,
    verifierEmail: input.verifierEmail,
    type: input.type,
    status: 'pending',
    notes: input.notes,
    proofUrl: input.proofUrl,
    createdAt: now,
    syncStatus: 'pending',
  };
}

export async function getVerificationRequests(
  filterStatus?: 'all' | VerificationStatus
): Promise<VerificationRequestRecord[]> {
  const db = await getDatabase();
  let query = 'SELECT * FROM verification_requests';
  const params: string[] = [];

  if (filterStatus && filterStatus !== 'all') {
    query += ' WHERE status = ?';
    params.push(filterStatus);
  }
  query += ' ORDER BY created_at DESC';

  const rows = await db.getAllAsync<{
    id: string;
    task_id: string | null;
    habit_id: string | null;
    date: string | null;
    user_id: string;
    verifier_id: string;
    verifier_email: string | null;
    type: string;
    status: string;
    notes: string | null;
    proof_url: string | null;
    verifier_notes: string | null;
    created_at: string;
    responded_at: string | null;
    sync_status: string | null;
  }>(query, ...params);

  return rows.map((r) => ({
    id: r.id,
    taskId: r.task_id,
    habitId: r.habit_id,
    date: r.date,
    userId: r.user_id,
    verifierId: r.verifier_id,
    verifierEmail: r.verifier_email,
    type: (r.type as 'habit' | 'task') || 'habit',
    status: (r.status as VerificationStatus) || 'pending',
    notes: r.notes,
    proofUrl: r.proof_url,
    verifierNotes: r.verifier_notes,
    createdAt: r.created_at,
    respondedAt: r.responded_at,
    syncStatus: (r.sync_status as 'synced' | 'pending') || 'synced',
  }));
}

export async function respondToVerificationRequest(
  id: string,
  action: 'verify' | 'reject',
  verifierNotes?: string
): Promise<void> {
  const db = await getDatabase();
  const nextStatus: VerificationStatus = action === 'verify' ? 'verified' : 'rejected';
  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    const req = await db.getFirstAsync<{
      task_id: string | null;
      habit_id: string | null;
      date: string | null;
    }>('SELECT task_id, habit_id, date FROM verification_requests WHERE id = ?', id);

    await db.runAsync(
      `UPDATE verification_requests
       SET status = ?, verifier_notes = ?, responded_at = ?, sync_status = 'pending'
       WHERE id = ?`,
      nextStatus,
      verifierNotes || null,
      now,
      id
    );

    if (req?.task_id) {
      await db.runAsync(
        'UPDATE tasks SET verification_status = ?, verified_at = ?, sync_status = ? WHERE task_id = ?',
        nextStatus,
        now,
        'pending',
        req.task_id
      );
    }

    if (req?.habit_id && req?.date) {
      await db.runAsync(
        'UPDATE habit_checkins SET verified_at = ?, sync_status = ? WHERE habit_id = ? AND date = ?',
        now,
        'pending',
        req.habit_id,
        req.date
      );
    }

    if (action === 'verify') {
      try {
        await walletService.creditCoins(
          25,
          50,
          'escrow',
          'Accountability verification approved! 🤝',
          id
        );
      } catch (err) {
        console.warn('[VerificationService] Failed to credit verification coins:', err);
      }
    }

    // Queue sync to web REST API (/api/verification-requests/[id])
    await db.runAsync(
      `INSERT INTO sync_outbox (outbox_id, entity_type, entity_id, action, payload_json, created_at, status)
       VALUES (?, 'verification_request', ?, ?, ?, ?, 'pending')`,
      generateUuid('out'),
      id,
      action,
      JSON.stringify({ action, verifierNotes, respondedAt: now }),
      now
    );
  });
}
