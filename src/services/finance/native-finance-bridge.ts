import { NativeEventEmitter, NativeModules, PermissionsAndroid, Platform } from 'react-native';
import { financeIngestionEngine } from './finance-ingestion-engine';
import { parseSmsOrNotification } from './parsers/sms-notification-parser';

interface RawPendingNotification {
  packageName?: string;
  title?: string;
  text?: string;
  timestampMs?: number;
}

interface RawSmsItem {
  address?: string;
  body?: string;
  timestampMs?: number;
}

interface RawSmsResponse {
  permissionRequired?: boolean;
  items?: RawSmsItem[];
}

export interface OcrRecognitionResult {
  text: string;
  lines: string[];
}

const CaptureModule = NativeModules.NinjaFinanceCaptureModule as
  | {
      isNotificationAccessEnabled: () => Promise<boolean>;
      openNotificationAccessSettings: () => void;
      drainPendingNotifications: () => Promise<string>;
      readRecentBankSms: (days: number) => Promise<string>;
    }
  | undefined;

const VoiceModule = NativeModules.NinjaVoiceModule as
  | {
      isAvailable: () => Promise<boolean>;
      startListening: (locale?: string | null) => Promise<string>;
      stopListening: () => Promise<boolean>;
      cancelListening: () => Promise<boolean>;
    }
  | undefined;

const OcrModule = NativeModules.NinjaReceiptOcrModule as
  | {
      recognizeText: (imageUri: string) => Promise<OcrRecognitionResult>;
    }
  | undefined;

export const isNativeFinanceAvailable = (): boolean =>
  Platform.OS === 'android' && Boolean(CaptureModule);

export async function isNotificationAccessEnabled(): Promise<boolean> {
  if (Platform.OS !== 'android' || !CaptureModule) return false;
  try {
    return await CaptureModule.isNotificationAccessEnabled();
  } catch {
    return false;
  }
}

export function openNotificationAccessSettings(): boolean {
  if (Platform.OS !== 'android' || !CaptureModule) return false;
  try {
    CaptureModule.openNotificationAccessSettings();
    return true;
  } catch {
    return false;
  }
}

export async function requestSmsReadPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_SMS,
      {
        title: 'Read Bank & UPI SMS',
        message:
          'NeuroFinance scans bank and UPI transaction alerts locally on your device to auto-log expenses. OTPs and personal chats are ignored.',
        buttonPositive: 'Allow',
        buttonNegative: 'Cancel',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}

export async function requestAudioPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      {
        title: 'Voice Expense Microphone',
        message: 'NeuroFinance needs microphone access to transcribe spoken expenses.',
        buttonPositive: 'Allow',
        buttonNegative: 'Cancel',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}

export async function drainNotificationsToEngine(): Promise<{
  processed: number;
  saved: number;
  queued: number;
}> {
  if (Platform.OS !== 'android' || !CaptureModule) {
    return { processed: 0, saved: 0, queued: 0 };
  }

  try {
    const rawJson = await CaptureModule.drainPendingNotifications();
    const items = JSON.parse(rawJson || '[]') as RawPendingNotification[];
    if (!Array.isArray(items) || items.length === 0) {
      return { processed: 0, saved: 0, queued: 0 };
    }

    let saved = 0;
    let queued = 0;
    for (const item of items) {
      const text = item.text || item.title || '';
      if (!text.trim()) continue;
      const candidate = parseSmsOrNotification(text, 'notification', {
        packageName: item.packageName,
        timestampMs: item.timestampMs,
      });
      if (!candidate) continue;
      const res = await financeIngestionEngine.ingestCandidate(candidate);
      if (res.outcome === 'auto_posted') saved += 1;
      else if (res.outcome === 'pending_review') queued += 1;
    }

    return { processed: items.length, saved, queued };
  } catch (e) {
    console.warn('[NativeFinanceBridge] drainNotificationsToEngine failed:', e);
    return { processed: 0, saved: 0, queued: 0 };
  }
}

export async function scanRecentSmsToEngine(days = 30): Promise<{
  permissionRequired: boolean;
  scanned: number;
  saved: number;
  queued: number;
}> {
  if (Platform.OS !== 'android' || !CaptureModule) {
    return { permissionRequired: false, scanned: 0, saved: 0, queued: 0 };
  }

  try {
    const rawJson = await CaptureModule.readRecentBankSms(days);
    const parsed = JSON.parse(rawJson || '{}') as RawSmsResponse;
    if (parsed.permissionRequired) {
      return { permissionRequired: true, scanned: 0, saved: 0, queued: 0 };
    }

    const items = Array.isArray(parsed.items) ? parsed.items : [];
    let saved = 0;
    let queued = 0;
    for (const sms of items) {
      if (!sms.body) continue;
      const candidate = parseSmsOrNotification(sms.body, 'sms', {
        packageName: sms.address,
        timestampMs: sms.timestampMs,
      });
      if (!candidate) continue;
      const res = await financeIngestionEngine.ingestCandidate(candidate);
      if (res.outcome === 'auto_posted') saved += 1;
      else if (res.outcome === 'pending_review') queued += 1;
    }

    await financeIngestionEngine.setSyncSourceState('sms_backfill', true);
    return { permissionRequired: false, scanned: items.length, saved, queued };
  } catch (e) {
    console.warn('[NativeFinanceBridge] scanRecentSmsToEngine failed:', e);
    return { permissionRequired: false, scanned: 0, saved: 0, queued: 0 };
  }
}

export const voiceBridge = {
  isAvailable: async (): Promise<boolean> => {
    if (Platform.OS !== 'android' || !VoiceModule) return false;
    try {
      return await VoiceModule.isAvailable();
    } catch {
      return false;
    }
  },
  startListening: async (locale = 'en-IN'): Promise<string> => {
    if (Platform.OS !== 'android' || !VoiceModule) {
      throw new Error('Native voice recognition is only available on Android builds.');
    }
    const granted = await requestAudioPermission();
    if (!granted) {
      throw new Error('Microphone permission denied.');
    }
    return VoiceModule.startListening(locale);
  },
  stopListening: async (): Promise<boolean> => {
    if (Platform.OS !== 'android' || !VoiceModule) return false;
    return VoiceModule.stopListening();
  },
  cancelListening: async (): Promise<boolean> => {
    if (Platform.OS !== 'android' || !VoiceModule) return false;
    return VoiceModule.cancelListening();
  },
  getEmitter: (): NativeEventEmitter | null => {
    if (Platform.OS !== 'android' || !VoiceModule) return null;
    return new NativeEventEmitter(NativeModules.NinjaVoiceModule);
  },
};

export const receiptOcrBridge = {
  isAvailable: (): boolean => Platform.OS === 'android' && Boolean(OcrModule),
  recognizeText: async (imageUri: string): Promise<OcrRecognitionResult> => {
    if (Platform.OS !== 'android' || !OcrModule) {
      throw new Error('On-device receipt OCR is only available on Android builds.');
    }
    return OcrModule.recognizeText(imageUri);
  },
};
