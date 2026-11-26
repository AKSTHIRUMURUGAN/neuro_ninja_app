import { NativeEventEmitter, NativeModules, Platform } from 'react-native';
import * as Speech from 'expo-speech';
import { voiceBridge } from '../finance/native-finance-bridge';
import { voicePackManager } from './voice-pack-manager';

export interface SpeakOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
  speakerId?: number;
}

export interface ListenOptions {
  lang?: string;
  onPartial?: (text: string) => void;
}

const OfflineSpeechNative = NativeModules.NinjaOfflineSpeechModule as
  | {
      speakOffline: (
        text: string,
        ttsDir: string,
        speed: number,
        speakerId: number
      ) => Promise<boolean>;
      stopSpeaking: () => Promise<boolean>;
      startOfflineListening: (sttDir: string, vadModelPath: string | null) => Promise<string>;
      stopOfflineListening: () => Promise<boolean>;
    }
  | undefined;

class UnifiedVoiceService {
  async speak(text: string, opts: SpeakOptions = {}): Promise<'offline' | 'os'> {
    const clean = text.trim();
    if (!clean) return 'os';

    const rate = opts.rate ?? 1.0;
    const speakerId = opts.speakerId ?? 0;

    if (Platform.OS === 'android' && OfflineSpeechNative) {
      try {
        const active = await voicePackManager.getActivePack();
        const targetId = opts.lang || active?.id || 'en-IN';
        const inspection = await voicePackManager.inspectPack(targetId);
        if (inspection?.hasTts) {
          await OfflineSpeechNative.speakOffline(clean, inspection.ttsDir, rate, speakerId);
          return 'offline';
        }
      } catch (e) {
        console.warn('[VoiceService] Offline TTS fallback to OS expo-speech:', e);
      }
    }

    Speech.speak(clean, {
      language: opts.lang || 'en-IN',
      rate,
      pitch: opts.pitch ?? 1.0,
    });
    return 'os';
  }

  async stopSpeaking(): Promise<void> {
    if (Platform.OS === 'android' && OfflineSpeechNative) {
      try {
        await OfflineSpeechNative.stopSpeaking();
      } catch {}
    }
    try {
      await Speech.stop();
    } catch {}
  }

  async startListening(opts: ListenOptions = {}): Promise<{ text: string; engine: 'offline' | 'os' }> {
    const lang = opts.lang || (await voicePackManager.getActivePack())?.id || 'en-IN';

    if (Platform.OS === 'android' && OfflineSpeechNative) {
      try {
        const inspection = await voicePackManager.inspectPack(lang);
        if (inspection?.hasStt) {
          const text = await OfflineSpeechNative.startOfflineListening(
            inspection.sttDir,
            `${inspection.sttDir}/silero_vad.onnx`
          );
          return { text, engine: 'offline' };
        }
      } catch (e) {
        console.warn('[VoiceService] Offline STT fallback to OS SpeechRecognizer:', e);
      }
    }

    const emitter = voiceBridge.getEmitter();
    const sub =
      emitter && opts.onPartial
        ? emitter.addListener('NinjaVoicePartial', (e: { value?: string }) => {
            if (e?.value) opts.onPartial?.(e.value);
          })
        : null;

    try {
      const text = await voiceBridge.startListening(lang);
      return { text, engine: 'os' };
    } finally {
      sub?.remove();
    }
  }

  async stopListening(): Promise<void> {
    if (Platform.OS === 'android' && OfflineSpeechNative) {
      try {
        await OfflineSpeechNative.stopOfflineListening();
      } catch {}
    }
    try {
      await voiceBridge.stopListening();
    } catch {}
  }

  async cancelListening(): Promise<void> {
    if (Platform.OS === 'android' && OfflineSpeechNative) {
      try {
        await OfflineSpeechNative.stopOfflineListening();
      } catch {}
    }
    try {
      await voiceBridge.cancelListening();
    } catch {}
  }

  getOfflineEmitter(): NativeEventEmitter | null {
    if (Platform.OS !== 'android' || !OfflineSpeechNative) return null;
    return new NativeEventEmitter(NativeModules.NinjaOfflineSpeechModule);
  }
}

export const voiceService = new UnifiedVoiceService();
