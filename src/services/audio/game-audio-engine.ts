import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';

const GAME_SOUND_ASSETS = {
  combat_slash: require('../../../assets/game/sounds/combat_slash.wav'),
  combat_crit: require('../../../assets/game/sounds/combat_crit.wav'),
  boss_grunt: require('../../../assets/game/sounds/boss_grunt.wav'),
  boss_death: require('../../../assets/game/sounds/boss_death.wav'),
  gate_impact: require('../../../assets/game/sounds/gate_impact.wav'),
  gate_crumble: require('../../../assets/game/sounds/gate_crumble.wav'),
  coin_jingle: require('../../../assets/game/sounds/coin_jingle.wav'),
  chest_creak: require('../../../assets/game/sounds/chest_creak.wav'),
  chest_reveal: require('../../../assets/game/sounds/chest_reveal.wav'),
  hammer_strike: require('../../../assets/game/sounds/hammer_strike.wav'),
  fanfare_taiko: require('../../../assets/game/sounds/fanfare_taiko.wav'),
};

export type GameSoundId = keyof typeof GAME_SOUND_ASSETS;

class GameAudioEngine {
  private isMuted: boolean = false;
  private isInitialized: boolean = false;
  private activePlayers: AudioPlayer[] = [];

  private async ensureInit() {
    if (!this.isInitialized) {
      try {
        await setAudioModeAsync({ playsInSilentMode: false });
        const { getDatabase } = await import('../database/database');
        const db = await getDatabase();
        const row = await db.getFirstAsync<{ value_json: string }>(
          "SELECT value_json FROM lifeos_state WHERE key = 'game_audio_muted'"
        );
        if (row) {
          this.isMuted = row.value_json === 'true';
        }
        this.isInitialized = true;
      } catch (e) {
        console.warn('[GameAudioEngine] Init error:', e);
      }
    }
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
    void (async () => {
      try {
        const { getDatabase } = await import('../database/database');
        const db = await getDatabase();
        await db.runAsync(
          "INSERT OR REPLACE INTO lifeos_state (key, value_json, updated_at) VALUES ('game_audio_muted', ?, ?)",
          [muted ? 'true' : 'false', new Date().toISOString()]
        );
      } catch {}
    })();
  }

  getMuted(): boolean {
    return this.isMuted;
  }

  async playSound(id: GameSoundId, volume: number = 1.0) {
    if (this.isMuted) return;
    try {
      await this.ensureInit();
      const asset = GAME_SOUND_ASSETS[id];
      if (!asset) return;

      const player = createAudioPlayer(asset);
      player.volume = Math.max(0, Math.min(1.0, volume));
      player.loop = false;
      player.play();

      this.activePlayers.push(player);
      // Clean up player reference after 3s
      setTimeout(() => {
        const idx = this.activePlayers.indexOf(player);
        if (idx !== -1) {
          this.activePlayers.splice(idx, 1);
        }
      }, 3000);
    } catch (e) {
      // Audio errors in games should never crash the UI
      console.warn(`[GameAudioEngine] Error playing sound ${id}:`, e);
    }
  }

  async playSlash() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    await this.playSound('combat_slash', 0.9);
  }

  async playCrit() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    await this.playSound('combat_crit', 1.0);
  }

  async playBossHurt() {
    await this.playSound('boss_grunt', 0.7);
  }

  async playBossDefeated() {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    await this.playSound('boss_death', 1.0);
  }

  async playCoinJingle() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    await this.playSound('coin_jingle', 0.85);
  }

  async playChestCreak() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    await this.playSound('chest_creak', 0.75);
  }

  async playChestUnlock() {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    await this.playSound('chest_reveal', 1.0);
  }

  async playGateImpact() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    await this.playSound('gate_impact', 0.9);
  }

  async playGateCrumble() {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    await this.playSound('gate_crumble', 0.85);
  }

  async playForgeHammer() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    await this.playSound('hammer_strike', 0.9);
  }

  async playHammer() {
    await this.playForgeHammer();
  }

  async playBossGrunt() {
    await this.playBossHurt();
  }

  async playBossDeath() {
    await this.playBossDefeated();
  }

  async playChestReveal() {
    await this.playChestUnlock();
  }

  async playFanfare() {
    await this.playLevelUp();
  }

  async playLevelUp() {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    await this.playSound('fanfare_taiko', 1.0);
  }
}

export const gameAudio = new GameAudioEngine();
