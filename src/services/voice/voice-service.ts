import { NativeEventEmitter, NativeModules, Platform } from 'react-native';
import * as Speech from 'expo-speech';
import { voiceBridge } from '../finance/native-finance-bridge';
import { voicePackManager } from './voice-pack-manager';

export type VoiceEngineTier = 'offline_lang' | 'offline_base' | 'os' | 'cloud';

export interface SpeakOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
  speakerId?: number;
  allowCloudFallback?: boolean;
}

export interface ListenOptions {
  lang?: string;
  onPartial?: (text: string) => void;
  allowCloudFallback?: boolean;
}

export interface VoiceListenResult {
  text: string;
  engine: VoiceEngineTier;
  latencyMs: number;
}

export interface CloudVoiceFallback {
  stt?: (lang: string) => Promise<string>;
  tts?: (text: string, lang: string) => Promise<void>;
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
  private cloudFallback: CloudVoiceFallback = {};

  registerCloudFallback(handler: CloudVoiceFallback): void {
    this.cloudFallback = handler;
  }

  /**
   * 4-Tier Progressive TTS:
   * Tier 1: Language-specific sherpa-onnx TTS (tts-<lang>)
   * Tier 2: Compact shared English TTS fallback (tts-en-in, for EN text)
   * Tier 3: Zero-download OS TTS (expo-speech)
   * Tier 4: Optional opt-in Cloud TTS
   */
  async speak(text: string, opts: SpeakOptions = {}): Promise<VoiceEngineTier> {
    const clean = text.trim();
    if (!clean) return 'os';

    const rate = opts.rate ?? 1.0;
    const speakerId = opts.speakerId ?? 0;
    const targetLang = (opts.lang || (await voicePackManager.getActiveLanguageId())).toLowerCase();

    if (Platform.OS === 'android' && OfflineSpeechNative) {
      // Tier 1: Language-specific offline TTS
      try {
        const langTtsDir = await voicePackManager.getInstalledDir(`tts-${targetLang}`);
        if (langTtsDir) {
          await OfflineSpeechNative.speakOffline(clean, langTtsDir, rate, speakerId);
          return 'offline_lang';
        }
      } catch (e) {
        console.warn('[VoiceService] Tier-1 TTS failed, trying fallback:', e);
      }

      // Tier 2: Compact shared English TTS fallback for Latin-script prompts
      if (targetLang !== 'en-in' && /^[\x00-\x7F\s₹$%.,!?0-9]+$/.test(clean)) {
        try {
          const baseTtsDir = await voicePackManager.getInstalledDir('tts-en-in');
          if (baseTtsDir) {
            await OfflineSpeechNative.speakOffline(clean, baseTtsDir, rate, speakerId);
            return 'offline_base';
          }
        } catch (e) {
          console.warn('[VoiceService] Tier-2 TTS failed, falling back to OS:', e);
        }
      }
    }

    // Tier 3: Zero-download OS Speech
    try {
      Speech.speak(clean, {
        language: opts.lang || 'en-IN',
        rate,
        pitch: opts.pitch ?? 1.0,
      });
      return 'os';
    } catch (e) {
      if (opts.allowCloudFallback && this.cloudFallback.tts) {
        await this.cloudFallback.tts(clean, opts.lang || 'en-IN');
        return 'cloud';
      }
      throw e;
    }
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

  /**
   * 4-Tier Progressive STT:
   * Tier 1: Language-specific sherpa-onnx STT (stt-<lang>) + shared Silero VAD
   * Tier 2: Compact shared Multilingual Base STT (stt-base-multilingual, ~40MB)
   * Tier 3: Zero-download OS SpeechRecognizer (NinjaVoiceModule)
   * Tier 4: Optional opt-in Cloud STT
   */
  async startListening(opts: ListenOptions = {}): Promise<VoiceListenResult> {
    const t0 = Date.now();
    const activeLang = opts.lang || (await voicePackManager.getActiveLanguageId());
    const langKey = activeLang.toLowerCase();

    if (Platform.OS === 'android' && OfflineSpeechNative) {
      const vadPath = await voicePackManager.getSharedVadPath();

      // Tier 1: Language-specific offline STT
      const langSttDir = await voicePackManager.getInstalledDir(`stt-${langKey}`);
      if (langSttDir) {
        try {
          const text = await OfflineSpeechNative.startOfflineListening(langSttDir, vadPath);
          return { text, engine: 'offline_lang', latencyMs: Date.now() - t0 };
        } catch (e) {
          console.warn('[VoiceService] Tier-1 STT failed, trying Tier-2 base:', e);
        }
      }

      // Tier 2: Compact shared multilingual base STT
      const baseSttDir = await voicePackManager.getInstalledDir('stt-base-multilingual');
      if (baseSttDir) {
        try {
          const text = await OfflineSpeechNative.startOfflineListening(baseSttDir, vadPath);
          return { text, engine: 'offline_base', latencyMs: Date.now() - t0 };
        } catch (e) {
          console.warn('[VoiceService] Tier-2 STT failed, falling back to OS:', e);
        }
      }
    }

    // Tier 3: Zero-download OS SpeechRecognizer
    const emitter = voiceBridge.getEmitter();
    const sub =
      emitter && opts.onPartial
        ? emitter.addListener('NinjaVoicePartial', (e: { value?: string }) => {
            if (e?.value) opts.onPartial?.(e.value);
          })
        : null;

    try {
      const text = await voiceBridge.startListening(activeLang);
      return { text, engine: 'os', latencyMs: Date.now() - t0 };
    } catch (err) {
      if (opts.allowCloudFallback && this.cloudFallback.stt) {
        const text = await this.cloudFallback.stt(activeLang);
        return { text, engine: 'cloud', latencyMs: Date.now() - t0 };
      }
      throw err;
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
