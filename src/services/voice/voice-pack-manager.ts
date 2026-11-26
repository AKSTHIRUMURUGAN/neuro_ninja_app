import { NativeEventEmitter, NativeModules, Platform } from 'react-native';
import { getDatabase } from '../database/database';

export type VoicePackStatus = 'not_installed' | 'downloading' | 'installed' | 'error';

export interface VoiceLanguagePack {
  id: string;
  displayName: string;
  nativeName: string;
  sttModelName: string;
  ttsModelName: string;
  licence: string;
  sizeBytes: number;
  sha256?: string;
  downloadUrl?: string;
  localDir?: string;
  status: VoicePackStatus;
  isActive: boolean;
  downloadedAt?: string;
}

export interface PackInspection {
  exists: boolean;
  hasStt: boolean;
  hasTts: boolean;
  sttDir: string;
  ttsDir: string;
}

const OfflineSpeechNative = NativeModules.NinjaOfflineSpeechModule as
  | {
      isSherpaAvailable: () => Promise<boolean>;
      getVoicePacksBaseDir: () => Promise<string>;
      inspectPackDir: (packDir: string) => Promise<PackInspection>;
      downloadAndInstallPack: (
        packId: string,
        downloadUrl: string,
        expectedSha256: string | null,
        destDir: string
      ) => Promise<string>;
      deletePackDir: (destDir: string) => Promise<boolean>;
    }
  | undefined;

const CDN_BASE_KEY = 'voice_pack_cdn_base';

class VoicePackManager {
  async isOfflineRuntimeReady(): Promise<boolean> {
    if (Platform.OS !== 'android' || !OfflineSpeechNative) return false;
    try {
      return await OfflineSpeechNative.isSherpaAvailable();
    } catch {
      return false;
    }
  }

  async getCdnBaseUrl(): Promise<string> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ value_json: string }>(
      'SELECT value_json FROM lifeos_state WHERE key = ?',
      [CDN_BASE_KEY]
    );
    if (!row) return '';
    try {
      return String(JSON.parse(row.value_json) || '');
    } catch {
      return '';
    }
  }

  async setCdnBaseUrl(url: string): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      'INSERT OR REPLACE INTO lifeos_state (key, value_json, updated_at) VALUES (?, ?, ?)',
      [CDN_BASE_KEY, JSON.stringify(url.trim().replace(/\/+$/, '')), now]
    );
  }

  async getPacks(): Promise<VoiceLanguagePack[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{
      id: string;
      display_name: string;
      native_name: string;
      stt_model_name: string;
      tts_model_name: string;
      licence: string;
      size_bytes: number;
      sha256: string | null;
      download_url: string | null;
      local_dir: string | null;
      status: string;
      is_active: number;
      downloaded_at: string | null;
    }>('SELECT * FROM voice_language_packs ORDER BY is_active DESC, id ASC');

    return rows.map((r) => ({
      id: r.id,
      displayName: r.display_name,
      nativeName: r.native_name,
      sttModelName: r.stt_model_name,
      ttsModelName: r.tts_model_name,
      licence: r.licence,
      sizeBytes: Number(r.size_bytes),
      sha256: r.sha256 || undefined,
      downloadUrl: r.download_url || undefined,
      localDir: r.local_dir || undefined,
      status: (r.status as VoicePackStatus) || 'not_installed',
      isActive: r.is_active === 1,
      downloadedAt: r.downloaded_at || undefined,
    }));
  }

  async getActivePack(): Promise<VoiceLanguagePack | null> {
    const packs = await this.getPacks();
    return packs.find((p) => p.isActive) || packs[0] || null;
  }

  async setActivePack(packId: string): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.withTransactionAsync(async () => {
      await db.runAsync('UPDATE voice_language_packs SET is_active = 0');
      await db.runAsync(
        'UPDATE voice_language_packs SET is_active = 1, updated_at = ? WHERE id = ?',
        [now, packId]
      );
    });
  }

  async inspectPack(packId: string): Promise<PackInspection | null> {
    if (Platform.OS !== 'android' || !OfflineSpeechNative) return null;
    const packs = await this.getPacks();
    const pack = packs.find((p) => p.id === packId);
    if (!pack?.localDir) return null;
    try {
      return await OfflineSpeechNative.inspectPackDir(pack.localDir);
    } catch {
      return null;
    }
  }

  async installPack(
    packId: string,
    overrideUrl?: string,
    expectedSha256?: string,
    onProgress?: (pct: number) => void
  ): Promise<VoiceLanguagePack | null> {
    if (Platform.OS !== 'android' || !OfflineSpeechNative) {
      throw new Error('Offline sherpa-onnx packs are supported on Android native builds.');
    }

    const db = await getDatabase();
    const packs = await this.getPacks();
    const pack = packs.find((p) => p.id === packId);
    if (!pack) throw new Error(`Unknown voice pack: ${packId}`);

    const cdnBase = await this.getCdnBaseUrl();
    const url =
      overrideUrl?.trim() ||
      pack.downloadUrl ||
      (cdnBase ? `${cdnBase}/${packId}.zip` : '');

    if (!url) {
      throw new Error(
        'Set your CDN Base URL (or direct .zip URL) in Voice Downloads to fetch self-hosted MIT/Apache ONNX packs.'
      );
    }

    const baseDir = await OfflineSpeechNative.getVoicePacksBaseDir();
    const destDir = `${baseDir}/${packId}`;
    const now = new Date().toISOString();

    await db.runAsync(
      "UPDATE voice_language_packs SET status = 'downloading', updated_at = ? WHERE id = ?",
      [now, packId]
    );

    const emitter = new NativeEventEmitter(NativeModules.NinjaOfflineSpeechModule);
    const sub = emitter.addListener(
      'NinjaVoicePackProgress',
      (evt: { packId?: string; progress?: number }) => {
        if (evt.packId === packId && typeof evt.progress === 'number') {
          onProgress?.(evt.progress);
        }
      }
    );

    try {
      const installedDir = await OfflineSpeechNative.downloadAndInstallPack(
        packId,
        url,
        expectedSha256 || pack.sha256 || null,
        destDir
      );
      const doneAt = new Date().toISOString();
      await db.runAsync(
        "UPDATE voice_language_packs SET status = 'installed', local_dir = ?, download_url = ?, downloaded_at = ?, updated_at = ? WHERE id = ?",
        [installedDir, url, doneAt, doneAt, packId]
      );
      const updated = await this.getPacks();
      return updated.find((p) => p.id === packId) || null;
    } catch (e) {
      await db.runAsync(
        "UPDATE voice_language_packs SET status = 'error', updated_at = ? WHERE id = ?",
        [new Date().toISOString(), packId]
      );
      throw e;
    } finally {
      sub.remove();
    }
  }

  async removePack(packId: string): Promise<void> {
    const db = await getDatabase();
    const packs = await this.getPacks();
    const pack = packs.find((p) => p.id === packId);
    if (Platform.OS === 'android' && OfflineSpeechNative && pack?.localDir) {
      await OfflineSpeechNative.deletePackDir(pack.localDir);
    }
    await db.runAsync(
      "UPDATE voice_language_packs SET status = 'not_installed', local_dir = NULL, downloaded_at = NULL, updated_at = ? WHERE id = ?",
      [new Date().toISOString(), packId]
    );
  }
}

export const voicePackManager = new VoicePackManager();
