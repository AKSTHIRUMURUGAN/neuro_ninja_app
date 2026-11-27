import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';
import { voicePackManager } from './voice-pack-manager';
import { voiceService } from './voice-service';

const BG_WAKE_KEY = 'neuroninja_bg_wake_word_enabled';
const WAKE_THRESHOLD_KEY = 'neuroninja_wake_threshold';
const WAKE_MODE_KEY = 'neuroninja_wake_mode';
const IGNORE_MEDIA_KEY = 'neuroninja_ignore_device_media';

type TriggerListener = (source: string) => void;
type StatusListener = (armed: boolean) => void;

class VoiceAssistantController {
  private triggerListeners = new Set<TriggerListener>();
  private statusListeners = new Set<StatusListener>();
  private stopKws: (() => void) | null = null;
  private isOverlayOpen = false;
  private armed = false;
  private appStateInitialized = false;
  private armingPromise: Promise<boolean> | null = null;
  private backgroundWakeEnabled = false;

  async setBackgroundWakeEnabled(enabled: boolean): Promise<void> {
    this.backgroundWakeEnabled = enabled;
    await AsyncStorage.setItem(BG_WAKE_KEY, enabled ? '1' : '0').catch(() => {});
    await voiceService.setBackgroundWakeWordService(enabled);
  }

  async getBackgroundWakeEnabled(): Promise<boolean> {
    try {
      const val = await AsyncStorage.getItem(BG_WAKE_KEY);
      this.backgroundWakeEnabled = val === '1';
    } catch {}
    return this.backgroundWakeEnabled;
  }

  async setIgnoreDeviceMediaEnabled(enabled: boolean): Promise<void> {
    await AsyncStorage.setItem(IGNORE_MEDIA_KEY, enabled ? '1' : '0').catch(() => {});
    await voiceService.setIgnoreDeviceMediaAudio(enabled);
  }

  async getIgnoreDeviceMediaEnabled(): Promise<boolean> {
    try {
      const val = await AsyncStorage.getItem(IGNORE_MEDIA_KEY);
      return val !== '0';
    } catch {
      return true;
    }
  }

  onTrigger(listener: TriggerListener): () => void {
    this.triggerListeners.add(listener);
    return () => this.triggerListeners.delete(listener);
  }

  onStatusChange(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.armed);
    return () => this.statusListeners.delete(listener);
  }

  private setArmed(val: boolean): void {
    this.armed = val;
    for (const cb of this.statusListeners) {
      cb(val);
    }
  }

  isWakeWordArmed(): boolean {
    return this.armed;
  }

  trigger(source = 'Tap'): void {
    for (const cb of this.triggerListeners) {
      cb(source);
    }
  }

  setOverlayActive(active: boolean): void {
    this.isOverlayOpen = active;
    if (active) {
      void this.disarmWakeWord();
    } else {
      void this.armWakeWord();
    }
  }

  async armWakeWord(): Promise<boolean> {
    if (Platform.OS !== 'android' || this.isOverlayOpen) return false;
    if (this.armed) return true;
    if (this.armingPromise) return this.armingPromise;

    this.armingPromise = (async () => {
      if (!this.appStateInitialized) {
        this.appStateInitialized = true;
        try {
          const [bg, th, mode, ignoreMedia] = await Promise.all([
            AsyncStorage.getItem(BG_WAKE_KEY),
            AsyncStorage.getItem(WAKE_THRESHOLD_KEY),
            AsyncStorage.getItem(WAKE_MODE_KEY),
            AsyncStorage.getItem(IGNORE_MEDIA_KEY),
          ]);
          this.backgroundWakeEnabled = bg === '1';
          if (bg === '1') {
            void voiceService.setBackgroundWakeWordService(true);
          }
          void voiceService.setIgnoreDeviceMediaAudio(ignoreMedia !== '0');
          if (th) {
            const num = Number(th);
            if (!Number.isNaN(num)) void voiceService.setWakeWordSensitivity(num);
          }
          if (mode === 'auto' || mode === 'builtin' || mode === 'custom' || mode === 'both') {
            void voiceService.setWakeWordMode(mode);
          }
        } catch {}

        AppState.addEventListener('change', (state) => {
          if (state === 'active' && !this.isOverlayOpen) {
            void this.armWakeWord();
          } else if (!this.backgroundWakeEnabled) {
            void this.disarmWakeWord();
          }
        });
      }

      const kwsDir = await voicePackManager.getWakeWordDir();
      if (!kwsDir) {
        this.setArmed(false);
        return false;
      }

      // Ensure previous listener is fully stopped before starting new one
      await this.disarmWakeWord();
      this.stopKws = await voiceService.startWakeWordListening((kw) => {
        this.setArmed(false);
        this.trigger(kw || 'HI_NEURO_NINJA');
      });
      this.setArmed(true);
      return true;
    })();

    try {
      return await this.armingPromise;
    } finally {
      this.armingPromise = null;
    }
  }

  async disarmWakeWord(): Promise<void> {
    this.stopKws?.();
    this.stopKws = null;
    this.setArmed(false);
    await voiceService.stopWakeWordListening();
  }
}

export const assistantController = new VoiceAssistantController();
