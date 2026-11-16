import {
  type BatchedNotificationItem,
  loadNinjaSettings,
} from '../storage';

export interface NotificationFirewallConfig {
  firewallEnabled: boolean;
  suppressAllBlockedApps: boolean;
  suppressedPackages: string[];
  digestSchedules: { hour: number; minute: number; label: string }[];
  obfuscateDopamineText: boolean;
  allowEmergencyVIPContacts: boolean;
}

export const DEFAULT_FIREWALL_CONFIG: NotificationFirewallConfig = {
  firewallEnabled: true,
  suppressAllBlockedApps: true,
  suppressedPackages: [
    'com.instagram.android',
    'com.google.android.youtube',
    'com.zhiliaoapp.musically',
    'com.twitter.android',
    'com.reddit.frontpage',
    'com.whatsapp',
  ],
  digestSchedules: [
    { hour: 9, minute: 0, label: 'Morning Calm Digest' },
    { hour: 13, minute: 30, label: 'Midday Focused Review' },
    { hour: 19, minute: 0, label: 'Evening Mindful Debrief' },
  ],
  obfuscateDopamineText: true,
  allowEmergencyVIPContacts: true,
};

/** Obfuscate clickbait / dopamine text into calm neutral text (Regain Parity) */
export function sanitizeDopamineAlert(
  title: string,
  body: string,
  appName: string
): { cleanTitle: string; cleanBody: string } {
  // If preview is sensationalized or contains typical dopamine bait
  return {
    cleanTitle: `${appName} Alert`,
    cleanBody: 'New activity recorded. Held silently in your Mindful Vault.',
  };
}

/** Check if notifications from this package should be intercepted & suppressed */
export async function shouldSuppressNotification(packageName: string): Promise<boolean> {
  const settings = await loadNinjaSettings();
  if (!settings.shieldActive) return false;
  return settings.androidBlockedPackages.includes(packageName);
}

/** Generates single consolidated notification payload for all batched items */
export function buildConsolidatedDigest(notifications: BatchedNotificationItem[]): {
  title: string;
  body: string;
  totalCount: number;
  appBreakdown: Record<string, number>;
} {
  const breakdown: Record<string, number> = {};
  for (const n of notifications) {
    breakdown[n.appName] = (breakdown[n.appName] || 0) + 1;
  }

  const appsSummary = Object.entries(breakdown)
    .map(([name, count]) => `${name} (${count})`)
    .join(', ');

  const total = notifications.length;

  return {
    title: `📬 NeuroNinja Digest: ${total} Mindful Alert${total === 1 ? '' : 's'}`,
    body: total === 0 ? 'Your inbox is clear.' : `${appsSummary}. Zero screen wakeups.`,
    totalCount: total,
    appBreakdown: breakdown,
  };
}
