import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { getDatabase } from '../database/database';
import { parseGmailReceipt } from './parsers/gmail-receipt-parser';
import { financeIngestionEngine } from './finance-ingestion-engine';

const GMAIL_TOKEN_KEY = 'finance_gmail_oauth_token';

export interface GmailSyncSummary {
  scanned: number;
  imported: number;
  merged: number;
  pendingReview: number;
}

class GmailSyncService {
  /**
   * Store OAuth access token locally (never sent to external telemetry).
   */
  async saveAccessToken(token: string, email?: string): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      "INSERT OR REPLACE INTO lifeos_state (key, value_json, updated_at) VALUES (?, ?, ?)",
      [GMAIL_TOKEN_KEY, JSON.stringify({ token, email, savedAt: now }), now]
    );
    await financeIngestionEngine.setSyncSourceState('gmail_oauth', true, email || 'Connected');
  }

  async getStoredToken(): Promise<{ token: string; email?: string } | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ value_json: string }>(
      'SELECT value_json FROM lifeos_state WHERE key = ?',
      [GMAIL_TOKEN_KEY]
    );
    if (!row) return null;
    try {
      return JSON.parse(row.value_json);
    } catch {
      return null;
    }
  }

  async disconnect(): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM lifeos_state WHERE key = ?', [GMAIL_TOKEN_KEY]);
    await financeIngestionEngine.setSyncSourceState('gmail_oauth', false, undefined);
  }

  /**
   * Launch Google OAuth implicit/PKCE flow using Expo WebBrowser when clientId is configured.
   */
  async connectWithGoogleOAuth(googleClientId: string): Promise<{ success: boolean; email?: string; error?: string }> {
    if (!googleClientId) {
      return {
        success: false,
        error: 'Set EXPO_PUBLIC_GOOGLE_CLIENT_ID in .env to enable live Gmail OAuth.',
      };
    }

    const redirectUri = Linking.createURL('auth/gmail');
    const scope = encodeURIComponent('https://www.googleapis.com/auth/gmail.readonly email');
    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(googleClientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=token&scope=${scope}&prompt=consent`;

    const res = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
    if (res.type === 'success' && res.url) {
      const hash = res.url.split('#')[1] || '';
      const params = new URLSearchParams(hash);
      const token = params.get('access_token');
      if (token) {
        let email: string | undefined;
        try {
          const profRes = await fetch('https://www.googleapis.com/gmail/v1/users/me/profile', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (profRes.ok) {
            const prof = await profRes.json();
            email = prof.emailAddress;
          }
        } catch {}
        await this.saveAccessToken(token, email);
        return { success: true, email };
      }
    }
    return { success: false, error: 'Gmail authorization cancelled or expired.' };
  }

  /**
   * Fetch recent transaction/receipt emails from Gmail API and run through Dedup & Ingestion Engine.
   */
  async syncRecentReceipts(maxResults: number = 25): Promise<GmailSyncSummary> {
    const stored = await this.getStoredToken();
    if (!stored?.token) {
      throw new Error('Gmail not connected');
    }

    const query = encodeURIComponent(
      'newer_than:30d (debited OR credited OR "order confirmation" OR "total paid" OR "bill due" OR from:(swiggy OR zomato OR amazon OR flipkart OR uber OR hdfcbank OR icicibank OR sbi OR axisbank))'
    );

    const listRes = await fetch(
      `https://www.googleapis.com/gmail/v1/users/me/messages?q=${query}&maxResults=${maxResults}`,
      { headers: { Authorization: `Bearer ${stored.token}` } }
    );

    if (!listRes.ok) {
      if (listRes.status === 401) {
        await this.disconnect();
        throw new Error('Gmail session expired. Please reconnect.');
      }
      throw new Error(`Gmail API error (${listRes.status})`);
    }

    const listJson = await listRes.json();
    const messages: { id: string }[] = listJson.messages || [];

    const summary: GmailSyncSummary = { scanned: 0, imported: 0, merged: 0, pendingReview: 0 };

    for (const msg of messages) {
      summary.scanned += 1;
      const detailRes = await fetch(
        `https://www.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`,
        { headers: { Authorization: `Bearer ${stored.token}` } }
      );
      if (!detailRes.ok) continue;

      const detail = await detailRes.json();
      const headers: { name: string; value: string }[] = detail.payload?.headers || [];
      const from = headers.find((h) => h.name.toLowerCase() === 'from')?.value || '';
      const subject = headers.find((h) => h.name.toLowerCase() === 'subject')?.value || '';
      const snippet = detail.snippet || '';
      const internalDateMs = detail.internalDate ? Number(detail.internalDate) : Date.now();

      const parsed = parseGmailReceipt({ from, subject, snippet, internalDateMs });
      if (!parsed) continue;

      const res = await financeIngestionEngine.ingestCandidate(parsed);
      if (res.outcome === 'auto_posted') summary.imported += 1;
      else if (res.outcome === 'merged') summary.merged += 1;
      else if (res.outcome === 'pending_review') summary.pendingReview += 1;
    }

    await financeIngestionEngine.setSyncSourceState('gmail_oauth', true, stored.email);
    return summary;
  }
}

export const gmailSyncService = new GmailSyncService();
