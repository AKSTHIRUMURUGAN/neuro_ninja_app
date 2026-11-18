export interface ParentalConfig {
  id: number;
  pinHash: string;
  curfewEnabled: boolean;
  curfewStartTime: string; // e.g. "21:30"
  curfewEndTime: string; // e.g. "06:30"
  dailyTotalQuotaMinutes: number;
  strictCurfewActive: boolean;
  biometricsEnabled: boolean;
  emergencyContacts: string[];
  securityQuestion: string;
  securityAnswerHash: string;
  guardianPairingKey: string;
  updatedAt: string;
}

export interface AppQuota {
  packageName: string;
  appName: string;
  dailyLimitMinutes: number;
  isCurfewBlocked: boolean;
  usedMinutesToday?: number;
}

export interface ParentalAuditLog {
  id: string;
  eventType:
    | 'curfew_block'
    | 'quota_exceeded'
    | 'parent_override'
    | 'settings_tamper_attempt'
    | 'biometric_unlock'
    | 'emergency_pass_granted';
  packageName?: string;
  details: string;
  createdAt: string;
}

export interface EmergencyPassResult {
  success: boolean;
  message: string;
  durationMinutes: number;
}
