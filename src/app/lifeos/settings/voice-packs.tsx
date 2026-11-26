import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
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
  type VoiceLanguagePack,
} from '../../../services/voice/voice-pack-manager';
import { voiceService } from '../../../services/voice/voice-service';

const LICENCE_NOTICES = [
  {
    name: 'sherpa-onnx (v2.0.3)',
    licence: 'Apache License 2.0',
    summary:
      'Next-gen Kaldi & ONNX Runtime on-device STT, TTS, and VAD engine (k2-fsa/sherpa-onnx). Commercial closed-source distribution permitted with Apache 2.0 notice.',
  },
  {
    name: 'AI4Bharat IndicConformer & Indic-TTS',
    licence: 'MIT License',
    summary:
      'Open-source Indian-language speech recognition and synthesis models covering Tamil, Hindi, Telugu, Malayalam, Kannada, and 17+ Indic languages.',
  },
  {
    name: 'Silero VAD & Permissive English Models',
    licence: 'MIT / Apache 2.0',
    summary:
      'Voice activity detection (Silero VAD, MIT) and English Zipformer / Kokoro-82M / VITS-VCTK checkpoints. Zero GPL-3.0 Piper binaries or CC-BY-NC voices.',
  },
];

function formatMb(bytes: number): string {
  return `${Math.max(1, Math.round(bytes / (1024 * 1024)))} MB`;
}

export default function VoicePacksScreen() {
  const { handleSmartBack } = useNinjaBack({ fallbackRoute: '/(tabs)/settings' });
  const { showToast, showAlert } = useNinjaAlert();

  const [packs, setPacks] = useState<VoiceLanguagePack[]>([]);
  const [cdnBase, setCdnBase] = useState('');
  const [runtimeReady, setRuntimeReady] = useState(false);
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const [busyPackId, setBusyPackId] = useState<string | null>(null);
  const [showLicences, setShowLicences] = useState(false);

  const loadState = useCallback(async () => {
    const [list, base, ready] = await Promise.all([
      voicePackManager.getPacks(),
      voicePackManager.getCdnBaseUrl(),
      voicePackManager.isOfflineRuntimeReady(),
    ]);
    setPacks(list);
    setCdnBase(base);
    setRuntimeReady(ready);
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      const [list, base, ready] = await Promise.all([
        voicePackManager.getPacks(),
        voicePackManager.getCdnBaseUrl(),
        voicePackManager.isOfflineRuntimeReady(),
      ]);
      if (!active) return;
      setPacks(list);
      setCdnBase(base);
      setRuntimeReady(ready);
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleSaveCdn = async () => {
    await voicePackManager.setCdnBaseUrl(cdnBase);
    showToast({
      title: 'CDN Base Saved',
      message: cdnBase.trim() ? 'Pack downloads will fetch from your CDN.' : 'CDN URL cleared.',
      type: 'success',
      icon: 'cloud-check',
    });
  };

  const handleDownload = async (pack: VoiceLanguagePack) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setBusyPackId(pack.id);
    setProgressMap((prev) => ({ ...prev, [pack.id]: 1 }));
    try {
      await voicePackManager.installPack(pack.id, undefined, undefined, (pct) => {
        setProgressMap((prev) => ({ ...prev, [pack.id]: pct }));
      });
      await loadState();
      showToast({
        title: `${pack.displayName} Installed`,
        message: '100% offline STT & TTS ready.',
        type: 'success',
        icon: 'check-circle',
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Download failed';
      showAlert({ title: 'Voice Pack Download', message: msg });
      await loadState();
    } finally {
      setBusyPackId(null);
    }
  };

  const handleSetActive = async (pack: VoiceLanguagePack) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await voicePackManager.setActivePack(pack.id);
    await loadState();
    showToast({
      title: 'Active Voice Language Updated',
      message: `${pack.displayName} (${pack.nativeName}) is now primary.`,
      type: 'info',
      icon: 'translate',
    });
  };

  const handleTestVoice = async (pack: VoiceLanguagePack) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const sample =
      pack.id.startsWith('ta')
        ? 'வணக்கம்! NeuroNinja offline voice ready.'
        : pack.id.startsWith('hi')
          ? 'नमस्ते! NeuroNinja offline voice ready.'
          : `Hello! ${pack.displayName} voice is ready in NeuroNinja.`;
    const engine = await voiceService.speak(sample, { lang: pack.id });
    showToast({
      title: engine === 'offline' ? 'Offline sherpa-onnx TTS' : 'OS Speech Fallback',
      message:
        engine === 'offline'
          ? `Spoke via downloaded ${pack.ttsModelName}.`
          : 'No offline pack downloaded yet; used OS speech.',
      type: 'info',
      icon: 'volume-high',
    });
  };

  const handleRemove = async (pack: VoiceLanguagePack) => {
    await voicePackManager.removePack(pack.id);
    await loadState();
    showToast({
      title: 'Voice Pack Removed',
      message: `${pack.displayName} removed from device storage.`,
      type: 'info',
      icon: 'trash-can',
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleSmartBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#F8FAFC" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.tag}>SHERPA-ONNX · AI4BHARAT INDIC</Text>
          <Text style={styles.title}>Offline Voice Packs</Text>
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
                ? 'sherpa-onnx v2.0.3 Native Engine Ready'
                : 'Using OS Speech Fallback'}
            </Text>
          </View>
          <Text style={styles.statusSub}>
            Download only the languages you need. All models use permissive MIT / Apache 2.0 licences safe for commercial distribution.
          </Text>

          <Text style={styles.cdnLabel}>SELF-HOSTED MODEL PACK CDN BASE URL</Text>
          <View style={styles.cdnRow}>
            <TextInput
              style={styles.cdnInput}
              value={cdnBase}
              onChangeText={setCdnBase}
              placeholder="https://cdn.example.com/neuroninja-voice-packs"
              placeholderTextColor="#64748B"
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.cdnSaveBtn} onPress={handleSaveCdn}>
              <Text style={styles.cdnSaveText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>

        {packs.map((pack) => {
          const isInstalled = pack.status === 'installed';
          const isDownloading = busyPackId === pack.id || pack.status === 'downloading';
          const pct = progressMap[pack.id] ?? 0;

          return (
            <View key={pack.id} style={[styles.packCard, pack.isActive && styles.packCardActive]}>
              <View style={styles.packTop}>
                <View style={{ flex: 1 }}>
                  <View style={styles.nameRow}>
                    <Text style={styles.packName}>{pack.displayName}</Text>
                    <Text style={styles.nativeName}>{pack.nativeName}</Text>
                  </View>
                  <Text style={styles.modelMeta}>
                    STT: {pack.sttModelName} · TTS: {pack.ttsModelName}
                  </Text>
                </View>
                <View style={styles.licencePill}>
                  <Text style={styles.licencePillText}>{pack.licence}</Text>
                </View>
              </View>

              <View style={styles.metaRow}>
                <Text style={styles.sizeText}>Est. {formatMb(pack.sizeBytes)}</Text>
                <Text style={[styles.stateText, isInstalled && { color: '#00E699' }]}>
                  {isInstalled ? 'INSTALLED (OFFLINE)' : isDownloading ? `DOWNLOADING ${pct}%` : 'NOT INSTALLED'}
                </Text>
              </View>

              <View style={styles.actionsRow}>
                {!isInstalled ? (
                  <TouchableOpacity
                    style={styles.primaryBtn}
                    disabled={isDownloading}
                    onPress={() => handleDownload(pack)}
                  >
                    {isDownloading ? (
                      <ActivityIndicator size="small" color="#070A11" />
                    ) : (
                      <>
                        <MaterialCommunityIcons name="download" size={16} color="#070A11" />
                        <Text style={styles.primaryBtnText}>Download</Text>
                      </>
                    )}
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.dangerBtn} onPress={() => handleRemove(pack)}>
                    <Ionicons name="trash-outline" size={15} color="#F43F5E" />
                    <Text style={styles.dangerBtnText}>Remove</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity style={styles.secondaryBtn} onPress={() => handleTestVoice(pack)}>
                  <Ionicons name="volume-high-outline" size={15} color="#38BDF8" />
                  <Text style={styles.secondaryBtnText}>Test TTS</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.secondaryBtn, pack.isActive && styles.activeBtn]}
                  onPress={() => handleSetActive(pack)}
                >
                  <Text style={[styles.secondaryBtnText, pack.isActive && { color: '#070A11' }]}>
                    {pack.isActive ? 'Active' : 'Use'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <Modal visible={showLicences} animationType="slide" transparent onRequestClose={() => setShowLicences(false)}>
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
  statusTitle: { color: '#F8FAFC', fontSize: 14, fontWeight: '800' },
  statusSub: { color: '#94A3B8', fontSize: 12, marginTop: 6, lineHeight: 17 },
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
  packCard: {
    backgroundColor: '#0F1829',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  packCardActive: { borderColor: 'rgba(0,230,153,0.45)' },
  packTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
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
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, marginBottom: 10 },
  sizeText: { color: '#64748B', fontSize: 11, fontWeight: '700' },
  stateText: { color: '#94A3B8', fontSize: 11, fontWeight: '800' },
  actionsRow: { flexDirection: 'row', gap: 8 },
  primaryBtn: {
    flex: 1.4,
    backgroundColor: '#00E699',
    borderRadius: 10,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  primaryBtnText: { color: '#070A11', fontSize: 12.5, fontWeight: '800' },
  dangerBtn: {
    flex: 1.2,
    backgroundColor: 'rgba(244,63,94,0.12)',
    borderRadius: 10,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  dangerBtnText: { color: '#F43F5E', fontSize: 12, fontWeight: '800' },
  secondaryBtn: {
    flex: 1,
    backgroundColor: '#162238',
    borderRadius: 10,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  activeBtn: { backgroundColor: '#00E699' },
  secondaryBtnText: { color: '#E2E8F0', fontSize: 12, fontWeight: '700' },
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
