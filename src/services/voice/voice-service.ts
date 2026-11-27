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
      startWakeWordListening: (kwsDir: string, vadModelPath: string | null) => Promise<boolean>;
      stopWakeWordListening: () => Promise<boolean>;
      warmUpModels?: (ttsDir: string | null, sttDir: string | null) => Promise<boolean>;
      requestAssistantAudioFocus?: () => Promise<boolean>;
      abandonAssistantAudioFocus?: () => Promise<boolean>;
      startBargeInMonitor?: (vadModelPath: string | null) => Promise<boolean>;
      stopBargeInMonitor?: () => Promise<boolean>;
      isHeadsetConnected?: () => Promise<boolean>;
      setCommunicationAudioMode?: (enabled: boolean) => Promise<boolean>;
      setBackgroundWakeWordService?: (enabled: boolean) => Promise<boolean>;
      openBatteryOptimizationSettings?: () => Promise<boolean>;
      setWakeWordSensitivity?: (threshold: number) => Promise<boolean>;
      setWakeWordMode?: (mode: string) => Promise<boolean>;
      recordCustomWakeSample?: (
        owwDir: string,
        durationMs: number
      ) => Promise<{ embeddingJson: string; rmsPct: number }>;
      recordRoomNoiseCalibration?: (
        owwDir: string,
        durationMs: number
      ) => Promise<{ negSamplesJson: string; bgMeanJson: string; rmsPct: number }>;
      saveCustomWakeProfile?: (
        owwDir: string,
        phrase: string,
        samplesJson: string,
        negSamplesJson: string | null,
        bgMeanJson: string | null,
        append: boolean
      ) => Promise<number>;
      getCustomWakeProfile?: (
        owwDir: string
      ) => Promise<{
        phrase: string;
        sampleCount: number;
        maxSamples?: number;
        hasNoiseCalibration?: boolean;
      } | null>;
      clearCustomWakeProfile?: (owwDir: string) => Promise<boolean>;
      playWakeChime?: () => Promise<boolean>;
      setIgnoreDeviceMediaAudio?: (enabled: boolean) => Promise<boolean>;
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

    // Tier 3: Zero-download OS Speech (wait until TextToSpeech actually finishes speaking)
    try {
      await new Promise<void>((resolve) => {
        let settled = false;
        let pollTimer: ReturnType<typeof setInterval> | null = null;
        let maxTimer: ReturnType<typeof setTimeout> | null = null;
        const done = () => {
          if (!settled) {
            settled = true;
            if (pollTimer) clearInterval(pollTimer);
            if (maxTimer) clearTimeout(maxTimer);
            resolve();
          }
        };
        Speech.speak(clean, {
          language: opts.lang || 'en-IN',
          rate,
          pitch: opts.pitch ?? 1.0,
          onDone: done,
          onStopped: done,
          onError: done,
        });
        // Guard against missed onDone by polling Speech.isSpeakingAsync() after initial startup
        const minWait = Math.max(1800, clean.length * 85);
        setTimeout(() => {
          if (settled) return;
          pollTimer = setInterval(() => {
            void Speech.isSpeakingAsync()
              .then((speaking) => {
                if (!speaking) done();
              })
              .catch(() => done());
          }, 220);
        }, minWait);
        maxTimer = setTimeout(done, Math.max(6000, clean.length * 160));
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
    // Hard guard: never open STT mic while TTS is still speaking out of the speaker
    try {
      const stillSpeaking = await Speech.isSpeakingAsync();
      if (stillSpeaking) {
        await this.stopSpeaking();
        await new Promise((r) => setTimeout(r, 320));
      }
    } catch {}

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

  async startWakeWordListening(onDetected: (keyword: string) => void): Promise<() => void> {
    if (Platform.OS !== 'android' || !OfflineSpeechNative?.startWakeWordListening) {
      return () => {};
    }
    const kwsDir = await voicePackManager.getWakeWordDir();
    if (!kwsDir) {
      return () => {};
    }
    const vadPath = await voicePackManager.getSharedVadPath();
    const emitter = new NativeEventEmitter(NativeModules.NinjaOfflineSpeechModule);
    const sub = emitter.addListener(
      'NinjaWakeWordDetected',
      (evt: { value?: string }) => {
        onDetected(evt?.value || 'HI NEURO NINJA');
      }
    );

    try {
      await OfflineSpeechNative.startWakeWordListening(kwsDir, vadPath);
    } catch (e) {
      console.warn('[VoiceService] Wake-word start skipped:', e);
    }

    return () => {
      sub.remove();
      void this.stopWakeWordListening();
    };
  }

  async stopWakeWordListening(): Promise<void> {
    if (Platform.OS === 'android' && OfflineSpeechNative?.stopWakeWordListening) {
      try {
        await OfflineSpeechNative.stopWakeWordListening();
      } catch {}
    }
  }

  async warmUp(langId?: string): Promise<void> {
    if (Platform.OS !== 'android' || !OfflineSpeechNative?.warmUpModels) return;
    const lang = (langId || (await voicePackManager.getActiveLanguageId())).toLowerCase();
    const ttsDir =
      (await voicePackManager.getInstalledDir(`tts-${lang}`)) ||
      (await voicePackManager.getInstalledDir('tts-en-in'));
    const sttDir =
      (await voicePackManager.getInstalledDir(`stt-${lang}`)) ||
      (await voicePackManager.getInstalledDir('stt-base-multilingual'));
    try {
      await OfflineSpeechNative.warmUpModels(ttsDir, sttDir);
    } catch {}
  }

  async requestAudioFocus(): Promise<void> {
    if (Platform.OS === 'android' && OfflineSpeechNative?.requestAssistantAudioFocus) {
      try {
        await OfflineSpeechNative.requestAssistantAudioFocus();
      } catch {}
    }
  }

  async abandonAudioFocus(): Promise<void> {
    if (Platform.OS === 'android' && OfflineSpeechNative?.abandonAssistantAudioFocus) {
      try {
        await OfflineSpeechNative.abandonAssistantAudioFocus();
      } catch {}
    }
  }

  async startBargeInMonitor(onBargeIn: () => void): Promise<() => void> {
    if (Platform.OS !== 'android' || !OfflineSpeechNative?.startBargeInMonitor) {
      return () => {};
    }
    const vadPath = await voicePackManager.getSharedVadPath();
    const emitter = new NativeEventEmitter(NativeModules.NinjaOfflineSpeechModule);
    const sub = emitter.addListener('NinjaBargeInDetected', () => {
      onBargeIn();
    });
    try {
      await OfflineSpeechNative.startBargeInMonitor(vadPath);
    } catch {}
    return () => {
      sub.remove();
      void this.stopBargeInMonitor();
    };
  }

  async stopBargeInMonitor(): Promise<void> {
    if (Platform.OS === 'android' && OfflineSpeechNative?.stopBargeInMonitor) {
      try {
        await OfflineSpeechNative.stopBargeInMonitor();
      } catch {}
    }
  }

  async isHeadsetConnected(): Promise<boolean> {
    if (Platform.OS !== 'android' || !OfflineSpeechNative?.isHeadsetConnected) return false;
    try {
      return await OfflineSpeechNative.isHeadsetConnected();
    } catch {
      return false;
    }
  }

  async setCommunicationAudioMode(enabled: boolean): Promise<void> {
    if (Platform.OS === 'android' && OfflineSpeechNative?.setCommunicationAudioMode) {
      try {
        await OfflineSpeechNative.setCommunicationAudioMode(enabled);
      } catch {}
    }
  }

  async setBackgroundWakeWordService(enabled: boolean): Promise<void> {
    if (Platform.OS === 'android' && OfflineSpeechNative?.setBackgroundWakeWordService) {
      try {
        await OfflineSpeechNative.setBackgroundWakeWordService(enabled);
      } catch {}
    }
  }

  async openBatteryOptimizationSettings(): Promise<void> {
    if (Platform.OS === 'android' && OfflineSpeechNative?.openBatteryOptimizationSettings) {
      try {
        await OfflineSpeechNative.openBatteryOptimizationSettings();
      } catch {}
    }
  }

  async setWakeWordSensitivity(threshold: number): Promise<void> {
    if (Platform.OS === 'android' && OfflineSpeechNative?.setWakeWordSensitivity) {
      try {
        await OfflineSpeechNative.setWakeWordSensitivity(threshold);
      } catch {}
    }
  }

  async setWakeWordMode(mode: 'auto' | 'builtin' | 'custom' | 'both'): Promise<void> {
    if (Platform.OS === 'android' && OfflineSpeechNative?.setWakeWordMode) {
      try {
        await OfflineSpeechNative.setWakeWordMode(mode);
      } catch {}
    }
  }

  async recordCustomWakeSample(
    owwDir: string,
    durationMs = 1900
  ): Promise<{ embeddingJson: string; rmsPct: number }> {
    if (Platform.OS !== 'android' || !OfflineSpeechNative?.recordCustomWakeSample) {
      throw new Error('Custom mic wake-word training is supported on Android native builds.');
    }
    return OfflineSpeechNative.recordCustomWakeSample(owwDir, durationMs);
  }

  async recordRoomNoiseCalibration(
    owwDir: string,
    durationMs = 2000
  ): Promise<{ negSamplesJson: string; bgMeanJson: string; rmsPct: number }> {
    if (Platform.OS !== 'android' || !OfflineSpeechNative?.recordRoomNoiseCalibration) {
      throw new Error('Room noise calibration is supported on Android native builds.');
    }
    return OfflineSpeechNative.recordRoomNoiseCalibration(owwDir, durationMs);
  }

  async saveCustomWakeProfile(
    owwDir: string,
    phrase: string,
    samples: number[][],
    options?: {
      negSamplesJson?: string | null;
      bgMeanJson?: string | null;
      append?: boolean;
    }
  ): Promise<number> {
    if (Platform.OS !== 'android' || !OfflineSpeechNative?.saveCustomWakeProfile) {
      return 0;
    }
    return OfflineSpeechNative.saveCustomWakeProfile(
      owwDir,
      phrase,
      JSON.stringify(samples),
      options?.negSamplesJson ?? null,
      options?.bgMeanJson ?? null,
      Boolean(options?.append)
    );
  }

  async getCustomWakeProfile(
    owwDir: string
  ): Promise<{
    phrase: string;
    sampleCount: number;
    maxSamples?: number;
    hasNoiseCalibration?: boolean;
  } | null> {
    if (Platform.OS !== 'android' || !OfflineSpeechNative?.getCustomWakeProfile) {
      return null;
    }
    try {
      return await OfflineSpeechNative.getCustomWakeProfile(owwDir);
    } catch {
      return null;
    }
  }

  async clearCustomWakeProfile(owwDir: string): Promise<boolean> {
    if (Platform.OS !== 'android' || !OfflineSpeechNative?.clearCustomWakeProfile) {
      return false;
    }
    try {
      return await OfflineSpeechNative.clearCustomWakeProfile(owwDir);
    } catch {
      return false;
    }
  }

  async playWakeChime(): Promise<void> {
    if (Platform.OS === 'android' && OfflineSpeechNative?.playWakeChime) {
      try {
        await OfflineSpeechNative.playWakeChime();
      } catch {}
    }
  }

  async setIgnoreDeviceMediaAudio(enabled: boolean): Promise<void> {
    if (Platform.OS === 'android' && OfflineSpeechNative?.setIgnoreDeviceMediaAudio) {
      try {
        await OfflineSpeechNative.setIgnoreDeviceMediaAudio(enabled);
      } catch {}
    }
  }
}

export const voiceService = new UnifiedVoiceService();
