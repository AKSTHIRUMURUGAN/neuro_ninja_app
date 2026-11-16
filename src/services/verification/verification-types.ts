export type VerificationProofStatus = 'pending' | 'verified' | 'rejected';
export type VerificationEntityType = 'habit' | 'task';

export interface VerificationProof {
  id: string;
  requestId: string;
  entityType: VerificationEntityType;
  entityId: string;
  entityTitle?: string;
  verifierId: string;
  verifierName?: string;
  photoUri: string;
  notes?: string;
  status: VerificationProofStatus;
  rejectionReason?: string;
  submittedAt: string;
  reviewedAt?: string;
  coinsAwarded: number;
}

export interface SubmitProofInput {
  entityType: VerificationEntityType;
  entityId: string;
  entityTitle: string;
  verifierId: string;
  photoUri: string;
  notes?: string;
}
