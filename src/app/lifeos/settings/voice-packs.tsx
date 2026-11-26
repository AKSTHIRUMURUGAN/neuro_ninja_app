import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNinjaBack } from '../../../hooks/use-ninja-back';
import { useNinjaAlert } from '../../../context/ninja-alert-context';
import {
  voicePackManager,
  type VoiceBenchmarkResult,
  type VoicePackModule,
} from '../../../services/voice/voice-pack-manager';
import { voiceService } from '../../../services/voice/voice-service';

const LICENCE_NOTICES = [
  {
    name: 'sherpa-onnx (v2.0.3)',
    licence: 'Apache License 2.0',
    summary:
      'Next-gen Kaldi & ONNX Runtime on-device STT, TTS, and VAD engine. Streaming TTS via generateWithCallback + core-aware CPU/NNAPI execution.',
  },
  {
    name: 'AI4Bharat IndicConformer & Indic-TTS',
    licence: 'MIT License',
    summary:
      'Open-source Indian-language speech recognition and synthesis models covering Tamil, Hindi, Telugu, Malayalam, Kannada, and 17+ Indic languages.',
  },
  {
    name: 'Silero VAD & Permissive English/Base Models',
    licence: 'MIT / Apache 2.0',
    summary:
      'Shared Silero VAD (~2.2 MB), Zipformer/Whisper-tiny base, and Kokoro/VITS-VCTK English TTS. Zero GPL-3.0 Piper binaries or CC-BY-NC voices.',
  },
];

function formatMb(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return mb < 10 ? `${mb.toFixed(1)} MB` : `${Math.round(mb)} MB`;
}

export default function VoicePacksScreen() {
  const { handleSmartBack } = useNinjaBack({ fallbackRoute: '/(tabs)/settings' });
  const { showToast, showAlert } = useNinjaAlert();

  const [modules, setModules] = useState<VoicePackModule[]>([]);
  const [cdnBase, setCdnBase] = useState('');
  const [nnapiEnabled, setNnapiEnabled] = useState(false);
  const [runtimeReady, setRuntimeReady] = useState(false);
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [benchmark, setBenchmark] = useState<VoiceBenchmarkResult | null>(null);
  const [showLicences, setShowLicences] = useState(false);

  const refreshState = useCallback(async () => {
    const [list, base, ready, nnapi] = await Promise.all([
      voicePackManager.getModules(),
      voicePackManager.getCdnBaseUrl(),
      voicePackManager.isOfflineRuntimeReady(),
      voicePackManager.getNnapiEnabled(),
    ]);
    setModules(list);
    setCdnBase(base);
    setRuntimeReady(ready);
    setNnapiEnabled(nnapi);
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      const [list, base, ready, nnapi] = await Promise.all([
        voicePackManager.getModules(),
        voicePackManager.getCdnBaseUrl(),
        voicePackManager.isOfflineRuntimeReady(),
        voicePackManager.getNnapiEnabled(),
      ]);
      if (!active) return;
      setModules(list);
      setCdnBase(base);
      setRuntimeReady(ready);
      setNnapiEnabled(nnapi);
    })();
    return () => {
      active = false;
    };
  }, []);

  const sharedModules = useMemo(
    () => modules.filter((m) => m.languageId === 'shared' || m.languageId === 'base'),
    [modules]
  );

  const languageGroups = useMemo(() => {
    const map = new Map<
      string,
      {
        languageId: string;
        displayName: string;
        nativeName: string;
        isActive: boolean;
        stt?: VoicePackModule;
        tts?: VoicePackModule;
      }
    >();
    for (const m of modules) {
      if (m.languageId === 'shared' || m.languageId === 'base') continue;
      const existing = map.get(m.languageId) || {
        languageId: m.languageId,
        displayName: m.displayName.replace(/ (STT|TTS)$/, ''),
        nativeName: m.nativeName,
        isActive: m.isActive,
      };
      if (m.isActive) existing.isActive = true;
      if (m.capability === 'stt') existing.stt = m;
      if (m.capability === 'tts') existing.tts = m;
      map.set(m.languageId, existing);
    }
    return Array.from(map.values());
  }, [modules]);

  const handleSaveCdn = async () => {
    await voicePackManager.setCdnBaseUrl(cdnBase);
    showToast({
      title: 'CDN Base Saved',
      message: cdnBase.trim() ? 'Modular packs will stream from your CDN.' : 'CDN URL cleared.',
      type: 'success',
      icon: 'cloud-check',
    });
  };

  const handleToggleNnapi = async (val: boolean) => {
    setNnapiEnabled(val);
    await voicePackManager.setNnapiEnabled(val);
    showToast({
      title: val ? 'NNAPI Hardware Acceleration Enabled' : 'CPU Inference Active',
      message: val
        ? 'Will use Android NNAPI with automatic CPU fallback.'
        : 'Using core-aware ARM64 CPU threads.',
      type: 'info',
      icon: 'chip',
    });
  };

  const handleDownloadModule = async (mod: VoicePackModule) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setBusyId(mod.id);
    setProgressMap((prev) => ({ ...prev, [mod.id]: 1 }));
    try {
      await voicePackManager.installModule(mod.id, undefined, (pct) => {
        setProgressMap((prev) => ({ ...prev, [mod.id]: pct }));
      });
      await refreshState();
      showToast({
        title: `${mod.displayName} Ready`,
        message: 'Verified & smoke-tested locally.',
        type: 'success',
        icon: 'check-circle',
      });
    } catch (e: unknown) {
      showAlert({
        title: 'Module Download',
        message: e instanceof Error ? e.message : 'Download failed',
      });
      await refreshState();
    } finally {
      setBusyId(null);
    }
  };

  const handleRemoveModule = async (mod: VoicePackModule) => {
    await voicePackManager.removeModule(mod.id);
    await refreshState();
  };

  const handleSetActiveLanguage = async (langId: string, label: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await voicePackManager.setActiveLanguage(langId);
    await refreshState();
    showToast({
      title: 'Primary Language Updated',
      message: `${label} selected (4-tier fallback active).`,
      type: 'info',
      icon: 'translate',
    });
  };

  const handleTestVoice = async (langId: string, label: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const sample = langId.startsWith('ta')
      ? 'வணக்கம்! NeuroNinja offline voice ready.'
      : langId.startsWith('hi')
        ? 'नमस्ते! NeuroNinja offline voice ready.'
        : `Hello! ${label} voice is active via 4-tier routing.`;
    const tier = await voiceService.speak(sample, { lang: langId });
    showToast({
      title: `Spoke via ${tier.toUpperCase()}`,
      message:
        tier === 'offline_lang'
          ? 'Tier 1: Language-specific sherpa-onnx TTS.'
          : tier === 'offline_base'
            ? 'Tier 2: Compact shared English offline TTS.'
            : 'Tier 3: Zero-download OS Speech fallback.',
      type: 'info',
      icon: 'volume-high',
    });
  };

  const handleRunBenchmark = async () => {
    const activeLang = await voicePackManager.getActiveLanguageId();
    const res = await voicePackManager.runBenchmark(activeLang);
    if (!res || (!res.ttsTtfaMs && !res.sttLoadMs)) {
      showToast({
        title: 'No Offline Pack Installed',
        message: 'Download an STT or TTS module (or base pack) to benchmark sherpa-onnx.',
        type: 'info',
        icon: 'speedometer',
      });
      return;
    }
    setBenchmark(res);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleSmartBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#F8FAFC" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.tag}>BHARATVOICE · 4-TIER FALLBACK</Text>
          <Text style={styles.title}>Modular Voice Engine</Text>
        </View>
        <TouchableOpacity onPress={() => setShowLicences(true)} style={styles.licenceBtn}>
          <MaterialCommunityIcons name="scale-balance" size={18} color="#00E699" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <MaterialCommunityIcons
              name={runtimeReady ? 'check-decagram' : 'alert-circle-outline'}
              size={20}
              color={runtimeReady ? '#00E699' : '#F59E0B'}
            />
            <Text style={styles.statusTitle}>
              {runtimeReady
                ? 'sherpa-onnx Streaming Engine + Memory Guard'
                : 'Using Zero-Download OS Fallback'}
            </Text>
          </View>
          <Text style={styles.statusSub}>
            Download only STT or only TTS per language, or use the 40 MB Tier-2 base pack. OS Speech works automatically at 0 MB.
          </Text>

          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchTitle}>NNAPI Hardware Acceleration</Text>
              <Text style={styles.switchSub}>Opt-in NPU/GPU delegate with CPU fallback</Text>
            </View>
            <Switch
              value={nnapiEnabled}
              onValueChange={handleToggleNnapi}
              thumbColor={nnapiEnabled ? '#00E699' : '#94A3B8'}
              trackColor={{ false: '#1E293B', true: 'rgba(0,230,153,0.35)' }}
            />
          </View>

          <Text style={styles.cdnLabel}>MODULAR PACK CDN BASE URL</Text>
          <View style={styles.cdnRow}>
            <TextInput
              style={styles.cdnInput}
              value={cdnBase}
              onChangeText={setCdnBase}
              placeholder="https://cdn.example.com/bharatvoice"
              placeholderTextColor="#64748B"
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.cdnSaveBtn} onPress={handleSaveCdn}>
              <Text style={styles.cdnSaveText}>Save</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.benchBtn} onPress={handleRunBenchmark}>
            <MaterialCommunityIcons name="speedometer" size={16} color="#38BDF8" />
            <Text style={styles.benchBtnText}>Run On-Device Latency & RAM Benchmark</Text>
          </TouchableOpacity>

          {benchmark ? (
            <View style={styles.benchBox}>
              <Text style={styles.benchLine}>
                TTFA: {benchmark.ttsTtfaMs ?? '-'} ms · RTF: {benchmark.ttsRtf?.toFixed(2) ?? '-'} · STT Load:{' '}
                {benchmark.sttLoadMs ?? '-'} ms
              </Text>
              <Text style={styles.benchLine}>
                Threads: {benchmark.threads ?? '-'} · Free RAM: {benchmark.availRamMb ?? '-'} MB
              </Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.sectionHeader}>SHARED CORE & TIER-2 FALLBACK</Text>
        {sharedModules.map((mod) => {
          const installed = mod.status === 'installed';
          const downloading = busyId === mod.id || mod.status === 'downloading';
          return (
            <View key={mod.id} style={styles.packCard}>
              <View style={styles.packTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.packName}>{mod.displayName}</Text>
                  <Text style={styles.modelMeta}>
                    {mod.modelName} · {formatMb(mod.sizeBytes)}
                  </Text>
                </View>
                <View style={styles.licencePill}>
                  <Text style={styles.licencePillText}>{mod.licence}</Text>
                </View>
              </View>
              <View style={[styles.actionsRow, { marginTop: 10 }]}>
                {!installed ? (
                  <TouchableOpacity
                    style={styles.primaryBtn}
                    disabled={downloading}
                    onPress={() => handleDownloadModule(mod)}
                  >
                    {downloading ? (
                      <ActivityIndicator size="small" color="#070A11" />
                    ) : (
                      <Text style={styles.primaryBtnText}>
                        Download ({progressMap[mod.id] ? `${progressMap[mod.id]}%` : formatMb(mod.sizeBytes)})
                      </Text>
                    )}
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.dangerBtn} onPress={() => handleRemoveModule(mod)}>
                    <Text style={styles.dangerBtnText}>Remove ({formatMb(mod.sizeBytes)})</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}

        <Text style={styles.sectionHeader}>MODULAR LANGUAGE PACKS (STT & TTS SEPARATE)</Text>
        {languageGroups.map((grp) => (
          <View key={grp.languageId} style={[styles.packCard, grp.isActive && styles.packCardActive]}>
            <View style={styles.packTop}>
              <View style={{ flex: 1 }}>
                <View style={styles.nameRow}>
                  <Text style={styles.packName}>{grp.displayName}</Text>
                  <Text style={styles.nativeName}>{grp.nativeName}</Text>
                </View>
                <Text style={styles.modelMeta}>
                  {grp.stt?.modelName || 'STT'} · {grp.tts?.modelName || 'TTS'}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.useBtn, grp.isActive && styles.activeBtn]}
                onPress={() => handleSetActiveLanguage(grp.languageId, grp.displayName)}
              >
                <Text style={[styles.useBtnText, grp.isActive && { color: '#070A11' }]}>
                  {grp.isActive ? 'Active' : 'Use'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.actionsRow}>
              {grp.stt ? (
                grp.stt.status === 'installed' ? (
                  <TouchableOpacity
                    style={styles.dangerBtn}
                    onPress={() => handleRemoveModule(grp.stt!)}
                  >
                    <Text style={styles.dangerBtnText}>Remove STT</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.primaryBtn}
                    disabled={busyId === grp.stt.id}
                    onPress={() => handleDownloadModule(grp.stt!)}
                  >
                    <Text style={styles.primaryBtnText}>
                      {busyId === grp.stt.id
                        ? `STT ${progressMap[grp.stt.id] ?? 0}%`
                        : `STT (${formatMb(grp.stt.sizeBytes)})`}
                    </Text>
                  </TouchableOpacity>
                )
              ) : null}

              {grp.tts ? (
                grp.tts.status === 'installed' ? (
                  <TouchableOpacity
                    style={styles.dangerBtn}
                    onPress={() => handleRemoveModule(grp.tts!)}
                  >
                    <Text style={styles.dangerBtnText}>Remove TTS</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.primaryBtn}
                    disabled={busyId === grp.tts.id}
                    onPress={() => handleDownloadModule(grp.tts!)}
                  >
                    <Text style={styles.primaryBtnText}>
                      {busyId === grp.tts.id
                        ? `TTS ${progressMap[grp.tts.id] ?? 0}%`
                        : `TTS (${formatMb(grp.tts.sizeBytes)})`}
                    </Text>
                  </TouchableOpacity>
                )
              ) : null}

              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => handleTestVoice(grp.languageId, grp.displayName)}
              >
                <Ionicons name="volume-high-outline" size={15} color="#38BDF8" />
                <Text style={styles.secondaryBtnText}>Test</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal
        visible={showLicences}
        animationType="slide"
        transparent
        onRequestClose={() => setShowLicences(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Open-Source Licences & Attribution</Text>
              <TouchableOpacity onPress={() => setShowLicences(false)}>
                <Ionicons name="close" size={22} color="#94A3B8" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {LICENCE_NOTICES.map((item) => (
                <View key={item.name} style={styles.noticeCard}>
                  <Text style={styles.noticeTitle}>{item.name}</Text>
                  <Text style={styles.noticeLicence}>{item.licence}</Text>
                  <Text style={styles.noticeBody}>{item.summary}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#070A11' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#0F1829',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tag: { color: '#00E699', fontSize: 9.5, fontWeight: '800', letterSpacing: 0.8 },
  title: { color: '#F8FAFC', fontSize: 18, fontWeight: '800' },
  licenceBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#0F1829',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,230,153,0.28)',
  },
  scroll: { padding: 16, paddingBottom: 40 },
  statusCard: {
    backgroundColor: '#0F1829',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,230,153,0.2)',
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusTitle: { color: '#F8FAFC', fontSize: 14, fontWeight: '800', flex: 1 },
  statusSub: { color: '#94A3B8', fontSize: 12, marginTop: 6, lineHeight: 17 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  switchTitle: { color: '#E2E8F0', fontSize: 13, fontWeight: '700' },
  switchSub: { color: '#64748B', fontSize: 11 },
  cdnLabel: { color: '#64748B', fontSize: 10, fontWeight: '700', marginTop: 12, marginBottom: 6 },
  cdnRow: { flexDirection: 'row', gap: 8 },
  cdnInput: {
    flex: 1,
    backgroundColor: '#070A11',
    color: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cdnSaveBtn: {
    backgroundColor: '#38BDF8',
    borderRadius: 10,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  cdnSaveText: { color: '#070A11', fontWeight: '800', fontSize: 12 },
  benchBtn: {
    marginTop: 10,
    backgroundColor: '#162238',
    borderRadius: 10,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  benchBtnText: { color: '#38BDF8', fontSize: 12, fontWeight: '700' },
  benchBox: {
    marginTop: 8,
    backgroundColor: '#070A11',
    borderRadius: 8,
    padding: 8,
  },
  benchLine: { color: '#CBD5E1', fontSize: 11 },
  sectionHeader: {
    color: '#64748B',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.9,
    marginTop: 6,
    marginBottom: 8,
  },
  packCard: {
    backgroundColor: '#0F1829',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  packCardActive: { borderColor: 'rgba(0,230,153,0.45)' },
  packTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 10 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  packName: { color: '#F8FAFC', fontSize: 15, fontWeight: '800' },
  nativeName: { color: '#38BDF8', fontSize: 13, fontWeight: '700' },
  modelMeta: { color: '#94A3B8', fontSize: 11, marginTop: 4 },
  licencePill: {
    backgroundColor: 'rgba(0,230,153,0.12)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  licencePillText: { color: '#00E699', fontSize: 10, fontWeight: '800' },
  useBtn: {
    backgroundColor: '#162238',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  useBtnText: { color: '#E2E8F0', fontSize: 11, fontWeight: '700' },
  actionsRow: { flexDirection: 'row', gap: 8 },
  primaryBtn: {
    flex: 1.2,
    backgroundColor: '#00E699',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { color: '#070A11', fontSize: 11.5, fontWeight: '800' },
  dangerBtn: {
    flex: 1.2,
    backgroundColor: 'rgba(244,63,94,0.12)',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerBtnText: { color: '#F43F5E', fontSize: 11.5, fontWeight: '800' },
  secondaryBtn: {
    flex: 0.8,
    backgroundColor: '#162238',
    borderRadius: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  activeBtn: { backgroundColor: '#00E699' },
  secondaryBtnText: { color: '#E2E8F0', fontSize: 11.5, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(2,6,23,0.82)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#0B1220',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: { color: '#F8FAFC', fontSize: 16, fontWeight: '800' },
  noticeCard: {
    backgroundColor: '#111C30',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  noticeTitle: { color: '#F8FAFC', fontSize: 14, fontWeight: '800' },
  noticeLicence: { color: '#00E699', fontSize: 11, fontWeight: '700', marginTop: 2 },
  noticeBody: { color: '#94A3B8', fontSize: 12, marginTop: 5, lineHeight: 17 },
});
