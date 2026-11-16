import { getDatabase } from '../database/database';
import { walletService } from '../wallet/wallet-service';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type SoundCategory = 'neural' | 'nature' | 'lofi' | 'noise';

export interface AudioVaultTrack {
  trackId: string;
  title: string;
  category: SoundCategory;
  frequencyHz?: string;
  icon: string;
  description: string;
  assetKey: string;
  priceCoins: number;
  isUnlocked: boolean;
  unlockType: 'free' | 'coins' | 'streak' | 'rank' | 'boss';
  unlockRequirement?: string;
  unlockedAt?: string;
}

export interface StemMixConfig {
  carrierTrackId: string;
  textureTrackId: string;
  carrierVolume: number; // 0.0 - 1.0
  textureVolume: number; // 0.0 - 1.0
}

const STEM_MIX_KEY = '@nn_focus_stem_mix_v1';
const ACTIVE_TRACK_KEY = '@nn_focus_active_track_v1';

export class AudioVaultEngine {
  /**
   * Fetches all audio vault tracks from SQLite.
   */
  public async getAllTracks(): Promise<AudioVaultTrack[]> {
    try {
      const db = await getDatabase();
      const rows = await db.getAllAsync<{
        track_id: string;
        title: string;
        category: string;
        frequency_hz: string | null;
        icon: string;
        description: string;
        asset_key: string;
        price_coins: number;
        is_unlocked: number;
        unlock_type: string;
        unlock_requirement: string | null;
        unlocked_at: string | null;
      }>('SELECT * FROM audio_vault_tracks ORDER BY is_unlocked DESC, category ASC, price_coins ASC');

      return rows.map((r) => ({
        trackId: r.track_id,
        title: r.title,
        category: r.category as SoundCategory,
        frequencyHz: r.frequency_hz ?? undefined,
        icon: r.icon,
        description: r.description,
        assetKey: r.asset_key,
        priceCoins: r.price_coins,
        isUnlocked: r.is_unlocked === 1,
        unlockType: r.unlock_type as AudioVaultTrack['unlockType'],
        unlockRequirement: r.unlock_requirement ?? undefined,
        unlockedAt: r.unlocked_at ?? undefined,
      }));
    } catch (e) {
      console.warn('[AudioVaultEngine] getAllTracks error:', e);
      return [];
    }
  }

  /**
   * Unlocks a locked soundscape using Focus Coins.
   */
  public async unlockTrackWithCoins(trackId: string): Promise<{
    success: boolean;
    track?: AudioVaultTrack;
    error?: string;
  }> {
    try {
      const db = await getDatabase();
      const row = await db.getFirstAsync<{
        track_id: string;
        title: string;
        price_coins: number;
        is_unlocked: number;
      }>('SELECT * FROM audio_vault_tracks WHERE track_id = ?', [trackId]);

      if (!row) {
        return { success: false, error: 'Track not found in Audio Vault' };
      }

      if (row.is_unlocked === 1) {
        return { success: true };
      }

      const balance = await walletService.getBalance();
      if (balance.coins < row.price_coins) {
        return {
          success: false,
          error: `Insufficient coins. Need ${row.price_coins} Focus Coins (You have ${balance.coins}).`,
        };
      }

      // Deduct coins from wallet
      const spendResult = await walletService.spendCoins(
        row.price_coins,
        'store',
        `Unlocked Audio Vault Track: "${row.title}"`,
        trackId
      );

      if (!spendResult.success) {
        return { success: false, error: spendResult.error || 'Failed to process payment' };
      }

      // Mark unlocked in SQLite
      await db.runAsync(
        `UPDATE audio_vault_tracks
         SET is_unlocked = 1, unlocked_at = datetime('now')
         WHERE track_id = ?`,
        [trackId]
      );

      const all = await this.getAllTracks();
      const updated = all.find((t) => t.trackId === trackId);

      return { success: true, track: updated };
    } catch (e) {
      console.warn('[AudioVaultEngine] unlockTrackWithCoins error:', e);
      return { success: false, error: 'An unexpected error occurred during unlock' };
    }
  }

  /**
   * Auto-unlocks tracks when streak or belt promotions are reached.
   */
  public async checkMilestoneUnlocks(streakDays: number, xp: number): Promise<string[]> {
    const newlyUnlocked: string[] = [];
    try {
      const db = await getDatabase();

      // 7-day streak track
      if (streakDays >= 7) {
        const row = await db.getFirstAsync<{ is_unlocked: number }>(
          'SELECT is_unlocked FROM audio_vault_tracks WHERE track_id = ?',
          ['track_432hz_sacred']
        );
        if (row && row.is_unlocked === 0) {
          await db.runAsync(
            `UPDATE audio_vault_tracks
             SET is_unlocked = 1, unlocked_at = datetime('now')
             WHERE track_id = 'track_432hz_sacred'`
          );
          newlyUnlocked.push('432Hz Sacred Harmonic Sine');
        }
      }

      // Blue Belt (4,000 XP) track
      if (xp >= 4000) {
        const row = await db.getFirstAsync<{ is_unlocked: number }>(
          'SELECT is_unlocked FROM audio_vault_tracks WHERE track_id = ?',
          ['track_hyper_gamma']
        );
        if (row && row.is_unlocked === 0) {
          await db.runAsync(
            `UPDATE audio_vault_tracks
             SET is_unlocked = 1, unlocked_at = datetime('now')
             WHERE track_id = 'track_hyper_gamma'`
          );
          newlyUnlocked.push('Overclocked 40Hz Super-Gamma');
        }
      }
    } catch (e) {
      console.warn('[AudioVaultEngine] checkMilestoneUnlocks error:', e);
    }
    return newlyUnlocked;
  }

  /**
   * Unlocks boss raid trophy track after a Villain is slain.
   */
  public async unlockBossTrack(): Promise<boolean> {
    try {
      const db = await getDatabase();
      await db.runAsync(
        `UPDATE audio_vault_tracks
         SET is_unlocked = 1, unlocked_at = datetime('now')
         WHERE track_id = 'track_boss_anthem'`
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Active single track ID.
   */
  public async getActiveTrackId(): Promise<string> {
    try {
      const val = await AsyncStorage.getItem(ACTIVE_TRACK_KEY);
      return val || 'track_kyoto_rain';
    } catch {
      return 'track_kyoto_rain';
    }
  }

  public async setActiveTrackId(trackId: string): Promise<void> {
    try {
      await AsyncStorage.setItem(ACTIVE_TRACK_KEY, trackId);
    } catch (e) {
      console.warn('[AudioVaultEngine] setActiveTrackId error:', e);
    }
  }

  /**
   * Multi-stem mix ratio persistence.
   */
  public async getStemMixConfig(): Promise<StemMixConfig> {
    try {
      const raw = await AsyncStorage.getItem(STEM_MIX_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('[AudioVaultEngine] getStemMixConfig error:', e);
    }
    return {
      carrierTrackId: 'track_40hz_gamma',
      textureTrackId: 'track_kyoto_rain',
      carrierVolume: 0.7,
      textureVolume: 0.5,
    };
  }

  public async saveStemMixConfig(config: StemMixConfig): Promise<void> {
    try {
      await AsyncStorage.setItem(STEM_MIX_KEY, JSON.stringify(config));
    } catch (e) {
      console.warn('[AudioVaultEngine] saveStemMixConfig error:', e);
    }
  }
}

export const audioVaultEngine = new AudioVaultEngine();
