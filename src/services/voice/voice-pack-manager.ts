import { NativeEventEmitter, NativeModules, Platform } from 'react-native';
import { getDatabase } from '../database/database';

export type VoicePackStatus = 'not_installed' | 'downloading' | 'installed' | 'error';
export type VoiceCapability = 'vad' | 'stt' | 'tts' | 'kws' | 'llm';

export interface VoicePackModule {
  id: string;
  languageId: string;
  displayName: string;
  nativeName: string;
  capability: VoiceCapability;
  modelName: string;
  licence: string;
  sizeBytes: number;
  sha256?: string;
  manifestJson?: string;
  downloadUrl?: string;
  localDir?: string;
  status: VoicePackStatus;
  isActive: boolean;
  downloadedAt?: string;
}

export interface VoiceBenchmarkResult {
  ttsTtfaMs?: number;
  ttsTotalMs?: number;
  ttsRtf?: number;
  sttLoadMs?: number;
  availRamMb?: number;
  threads?: number;
}

export interface PackInspection {
  exists: boolean;
  hasStt: boolean;
  hasTts: boolean;
  hasKws?: boolean;
  hasLlm?: boolean;
  sttDir: string;
  ttsDir: string;
  llmPath?: string;
}

const OfflineSpeechNative = NativeModules.NinjaOfflineSpeechModule as
  | {
      isSherpaAvailable: () => Promise<boolean>;
      setHardwareAcceleration: (enableNnapi: boolean) => Promise<boolean>;
      getVoicePacksBaseDir: () => Promise<string>;
      inspectPackDir: (packDir: string) => Promise<PackInspection>;
      downloadModularPack: (
        packId: string,
        capability: string,
        filesJson: string,
        expectedTotalBytes: number,
        destDir: string
      ) => Promise<string>;
      downloadAndInstallPack: (
        packId: string,
        downloadUrl: string,
        expectedSha256: string | null,
        destDir: string
      ) => Promise<string>;
      runVoiceBenchmark: (ttsDir: string | null, sttDir: string | null) => Promise<VoiceBenchmarkResult>;
      deletePackDir: (destDir: string) => Promise<boolean>;
    }
  | undefined;

const CDN_BASE_KEY = 'voice_pack_cdn_base';
const NNAPI_KEY = 'voice_nnapi_enabled';

class VoicePackManager {
  private activeDownloads = new Set<string>();

  async resetStaleDownloads(): Promise<void> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ id: string }>(
      "SELECT id FROM voice_pack_modules WHERE status = 'downloading'"
    );
    const now = new Date().toISOString();
    for (const r of rows) {
      if (!this.activeDownloads.has(r.id)) {
        await db.runAsync(
          "UPDATE voice_pack_modules SET status = 'not_installed', updated_at = ? WHERE id = ?",
          [now, r.id]
        );
      }
    }
  }

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
    await db.runAsync(
      'INSERT OR REPLACE INTO lifeos_state (key, value_json, updated_at) VALUES (?, ?, ?)',
      [CDN_BASE_KEY, JSON.stringify(url.trim().replace(/\/+$/, '')), new Date().toISOString()]
    );
  }

  async getNnapiEnabled(): Promise<boolean> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ value_json: string }>(
      'SELECT value_json FROM lifeos_state WHERE key = ?',
      [NNAPI_KEY]
    );
    if (!row) return false;
    try {
      return Boolean(JSON.parse(row.value_json));
    } catch {
      return false;
    }
  }

  async setNnapiEnabled(enabled: boolean): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      'INSERT OR REPLACE INTO lifeos_state (key, value_json, updated_at) VALUES (?, ?, ?)',
      [NNAPI_KEY, JSON.stringify(enabled), new Date().toISOString()]
    );
    if (Platform.OS === 'android' && OfflineSpeechNative?.setHardwareAcceleration) {
      await OfflineSpeechNative.setHardwareAcceleration(enabled);
    }
  }

  async getModules(): Promise<VoicePackModule[]> {
    const db = await getDatabase();
    let rows = await db.getAllAsync<{
      id: string;
      language_id: string;
      display_name: string;
      native_name: string;
      capability: string;
      model_name: string;
      licence: string;
      size_bytes: number;
      sha256: string | null;
      manifest_json: string | null;
      download_url: string | null;
      local_dir: string | null;
      status: string;
      is_active: number;
      downloaded_at: string | null;
    }>('SELECT * FROM voice_pack_modules ORDER BY is_active DESC, language_id ASC, capability ASC');

    if (!rows.some((r) => r.id === 'oww-en-v1')) {
      const owwBase = 'https://github.com/dscripka/openWakeWord/releases/download/v0.5.1';
      const owwManifest = JSON.stringify([
        { name: 'melspectrogram.onnx', url: `${owwBase}/melspectrogram.onnx`, size: 1087958 },
        { name: 'embedding_model.onnx', url: `${owwBase}/embedding_model.onnx`, size: 1326578 },
        { name: 'hey_jarvis_v0.1.onnx', url: `${owwBase}/hey_jarvis_v0.1.onnx`, size: 1271370 },
      ]);
      const now = new Date().toISOString();
      try {
        await db.runAsync(
          `INSERT OR IGNORE INTO voice_pack_modules
            (id, language_id, display_name, native_name, capability, model_name, licence, size_bytes, manifest_json, status, is_active, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'not_installed', 1, ?)`,
          [
            'oww-en-v1',
            'shared',
            'openWakeWord ("Hey Jarvis" / Custom "Hi Ninja")',
            'Dedicated 3-Stage ONNX (<1.5% CPU)',
            'kws',
            'openWakeWord v0.5.1 (Apache 2.0)',
            'Apache 2.0',
            3685906,
            owwManifest,
            now,
          ]
        );
      } catch {}

      rows = await db.getAllAsync(
        'SELECT * FROM voice_pack_modules ORDER BY is_active DESC, language_id ASC, capability ASC'
      );

      if (!rows.some((r) => r.id === 'oww-en-v1')) {
        rows.unshift({
          id: 'oww-en-v1',
          language_id: 'shared',
          display_name: 'openWakeWord ("Hey Jarvis" / Custom "Hi Ninja")',
          native_name: 'Dedicated 3-Stage ONNX (<1.5% CPU)',
          capability: 'kws',
          model_name: 'openWakeWord v0.5.1 (Apache 2.0)',
          licence: 'Apache 2.0',
          size_bytes: 3685906,
          sha256: null,
          manifest_json: owwManifest,
          download_url: null,
          local_dir: null,
          status: 'not_installed',
          is_active: 1,
          downloaded_at: null,
        });
      }
    }

    // Reconcile disk state for oww-en-v1 if files were already downloaded on disk
    if (Platform.OS === 'android' && OfflineSpeechNative) {
      const owwRow = rows.find((r) => r.id === 'oww-en-v1');
      if (owwRow && owwRow.status !== 'installed' && !this.activeDownloads.has('oww-en-v1')) {
        try {
          const baseDir = await OfflineSpeechNative.getVoicePacksBaseDir();
          const expectedDir = `${baseDir}/oww-en-v1`;
          const info = await OfflineSpeechNative.inspectPackDir(expectedDir);
          if (info.exists && info.hasKws) {
            const now = new Date().toISOString();
            owwRow.status = 'installed';
            owwRow.local_dir = expectedDir;
            owwRow.downloaded_at = owwRow.downloaded_at || now;
            await db.runAsync(
              "UPDATE voice_pack_modules SET status = 'installed', local_dir = ?, downloaded_at = COALESCE(downloaded_at, ?), updated_at = ? WHERE id = 'oww-en-v1'",
              [expectedDir, now, now]
            );
          }
        } catch {}
      }
    }

    return rows.map((r) => ({
      id: r.id,
      languageId: r.language_id,
      displayName: r.display_name,
      nativeName: r.native_name,
      capability: r.capability as VoiceCapability,
      modelName: r.model_name,
      licence: r.licence,
      sizeBytes: Number(r.size_bytes),
      sha256: r.sha256 || undefined,
      manifestJson: r.manifest_json || undefined,
      downloadUrl: r.download_url || undefined,
      localDir: r.local_dir || undefined,
      status: (r.status as VoicePackStatus) || 'not_installed',
      isActive: r.is_active === 1,
      downloadedAt: r.downloaded_at || undefined,
    }));
  }

  async getActiveLanguageId(): Promise<string> {
    const mods = await this.getModules();
    const active = mods.find(
      (m) => m.isActive && m.languageId !== 'shared' && m.languageId !== 'base'
    );
    return active?.languageId || 'en-IN';
  }

  async setActiveLanguage(languageId: string): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        "UPDATE voice_pack_modules SET is_active = 0 WHERE language_id NOT IN ('shared', 'base')"
      );
      await db.runAsync(
        'UPDATE voice_pack_modules SET is_active = 1, updated_at = ? WHERE language_id = ?',
        [now, languageId]
      );
    });
  }

  async getInstalledDir(moduleId: string): Promise<string | null> {
    const mods = await this.getModules();
    const mod = mods.find((m) => m.id === moduleId && m.status === 'installed');
    if (!mod?.localDir || Platform.OS !== 'android' || !OfflineSpeechNative) return null;
    try {
      const info = await OfflineSpeechNative.inspectPackDir(mod.localDir);
      if (!info.exists) return null;
      if (mod.capability === 'stt' && info.hasStt) return info.sttDir;
      if (mod.capability === 'tts' && info.hasTts) return info.ttsDir;
      if (mod.capability === 'vad') return mod.localDir;
      if (mod.capability === 'kws' && info.hasKws) return mod.localDir;
      if (mod.capability === 'llm' && info.hasLlm && info.llmPath) return info.llmPath;
      return null;
    } catch {
      return null;
    }
  }

  async getSharedVadPath(): Promise<string | null> {
    const dir = await this.getInstalledDir('vad-silero-v1');
    return dir ? `${dir}/silero_vad.onnx` : null;
  }

  async getWakeWordDir(): Promise<string | null> {
    return (
      (await this.getInstalledDir('oww-en-v1')) ||
      (await this.getInstalledDir('kws-en-v1'))
    );
  }

  async getInstalledLlmPath(): Promise<{ id: string; path: string } | null> {
    const mods = await this.getModules();
    // Prefer 1.5B if installed, else 0.5B
    for (const id of ['llm-qwen2.5-1.5b-q4', 'llm-qwen2.5-0.5b-q4']) {
      const m = mods.find((x) => x.id === id && x.status === 'installed');
      if (m) {
        const p = await this.getInstalledDir(id);
        if (p) return { id, path: p };
      }
    }
    return null;
  }

  async installModule(
    moduleId: string,
    overrideUrl?: string,
    onProgress?: (pct: number) => void
  ): Promise<VoicePackModule | null> {
    if (Platform.OS !== 'android' || !OfflineSpeechNative) {
      throw new Error('Offline sherpa-onnx modules are supported on Android native builds.');
    }

    const db = await getDatabase();
    const mods = await this.getModules();
    const mod = mods.find((m) => m.id === moduleId);
    if (!mod) throw new Error(`Unknown voice module: ${moduleId}`);

    const cdnBase = await this.getCdnBaseUrl();
    const url = overrideUrl?.trim() || mod.downloadUrl || (cdnBase ? `${cdnBase}/${moduleId}.zip` : '');
    if (!url && !mod.manifestJson) {
      throw new Error(
        'Set your CDN Base URL in Offline Voice Packs to download modular STT/TTS/VAD files.'
      );
    }

    const baseDir = await OfflineSpeechNative.getVoicePacksBaseDir();
    const destDir = `${baseDir}/${moduleId}`;
    const now = new Date().toISOString();

    this.activeDownloads.add(moduleId);
    await db.runAsync(
      "UPDATE voice_pack_modules SET status = 'downloading', updated_at = ? WHERE id = ?",
      [now, moduleId]
    );

    const emitter = new NativeEventEmitter(NativeModules.NinjaOfflineSpeechModule);
    const sub = emitter.addListener(
      'NinjaVoicePackProgress',
      (evt: { packId?: string; progress?: number }) => {
        if (evt.packId === moduleId && typeof evt.progress === 'number') {
          onProgress?.(evt.progress);
        }
      }
    );

    try {
      const installedDir = mod.manifestJson
        ? await OfflineSpeechNative.downloadModularPack(
            moduleId,
            mod.capability,
            mod.manifestJson,
            mod.sizeBytes,
            destDir
          )
        : await OfflineSpeechNative.downloadAndInstallPack(
            moduleId,
            url,
            mod.sha256 || null,
            destDir
          );

      const doneAt = new Date().toISOString();
      await db.runAsync(
        "UPDATE voice_pack_modules SET status = 'installed', local_dir = ?, download_url = ?, downloaded_at = ?, updated_at = ? WHERE id = ?",
        [installedDir, url || null, doneAt, doneAt, moduleId]
      );
      const updated = await this.getModules();
      return updated.find((m) => m.id === moduleId) || null;
    } catch (e) {
      await db.runAsync(
        "UPDATE voice_pack_modules SET status = 'error', updated_at = ? WHERE id = ?",
        [new Date().toISOString(), moduleId]
      );
      throw e;
    } finally {
      this.activeDownloads.delete(moduleId);
      sub.remove();
    }
  }

  async removeModule(moduleId: string): Promise<void> {
    const db = await getDatabase();
    if (moduleId.startsWith('llm-')) {
      try {
        const { localLlmService } = await import('../ai/local-llm-service');
        await localLlmService.unload();
      } catch {}
    }
    if (Platform.OS === 'android' && OfflineSpeechNative) {
      try {
        const baseDir = await OfflineSpeechNative.getVoicePacksBaseDir();
        await OfflineSpeechNative.deletePackDir(`${baseDir}/${moduleId}`);
      } catch {
        const mods = await this.getModules();
        const mod = mods.find((m) => m.id === moduleId);
        if (mod?.localDir) {
          await OfflineSpeechNative.deletePackDir(mod.localDir);
        }
      }
    }
    await db.runAsync(
      "UPDATE voice_pack_modules SET status = 'not_installed', local_dir = NULL, downloaded_at = NULL, updated_at = ? WHERE id = ?",
      [new Date().toISOString(), moduleId]
    );
  }

  async runBenchmark(languageId: string): Promise<VoiceBenchmarkResult | null> {
    if (Platform.OS !== 'android' || !OfflineSpeechNative?.runVoiceBenchmark) return null;
    const langSuffix = languageId.toLowerCase();
    const ttsDir =
      (await this.getInstalledDir(`tts-${langSuffix}`)) ||
      (await this.getInstalledDir('tts-en-in'));
    const sttDir =
      (await this.getInstalledDir(`stt-${langSuffix}`)) ||
      (await this.getInstalledDir('stt-base-multilingual'));
    return OfflineSpeechNative.runVoiceBenchmark(ttsDir, sttDir);
  }
}

export const voicePackManager = new VoicePackManager();
