export interface ParentalConfig {
  id: number;
  pinHash: string;
  curfewEnabled: boolean;
  curfewStartTime: string; // e.g. "21:30"
  curfewEndTime: string; // e.g. "06:30"
  dailyTotalQuotaMinutes: number;
  strictCurfewActive: boolean;
  emergencyContacts: string[];
  updatedAt: string;
}

export interface AppQuota {
  packageName: string;
  appName: string;
  dailyLimitMinutes: number;
  isCurfewBlocked: boolean;
}

export interface ParentalAuditLog {
  id: string;
  eventType: 'curfew_block' | 'quota_exceeded' | 'parent_override' | 'settings_tamper_attempt';
  packageName?: string;
  details: string;
  createdAt: string;
}
