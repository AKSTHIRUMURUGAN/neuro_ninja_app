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
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useNinjaBack } from '../../../hooks/use-ninja-back';
import { useNinjaAlert } from '../../../context/ninja-alert-context';
import {
  voicePackManager,
  type VoiceBenchmarkResult,
  type VoicePackModule,
} from '../../../services/voice/voice-pack-manager';
import { voiceService, type VoiceEngineTier } from '../../../services/voice/voice-service';
import { assistantController } from '../../../services/voice/assistant-controller';
import { voiceBridge } from '../../../services/finance/native-finance-bridge';
import { localLlmService, type NinjaVoiceIntent } from '../../../services/ai/local-llm-service';

const PLAYGROUND_LANGS = [
  { id: 'en-IN', label: 'English', sample: 'Hello! NeuroNinja offline voice engine is ready.' },
  { id: 'ta-IN', label: 'தமிழ் (Tamil)', sample: 'வணக்கம்! NeuroNinja offline voice ready.' },
  { id: 'hi-IN', label: 'हिन्दी (Hindi)', sample: 'नमस्ते! NeuroNinja offline voice ready.' },
  { id: 'te-IN', label: 'తెలుగు', sample: 'నమస్కారం! NeuroNinja offline voice ready.' },
  { id: 'ml-IN', label: 'മലയാളം', sample: 'നമസ്കാരം! NeuroNinja offline voice ready.' },
  { id: 'kn-IN', label: 'ಕನ್ನಡ', sample: 'ನಮಸ್ಕಾರ! NeuroNinja offline voice ready.' },
];

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

  // Live STT + TTS + LLM Playground state
  const [pgLang, setPgLang] = useState('en-IN');
  const [pgListening, setPgListening] = useState(false);
  const [pgTranscript, setPgTranscript] = useState('');
  const [pgSttTier, setPgSttTier] = useState<VoiceEngineTier | null>(null);
  const [pgSttLatencyMs, setPgSttLatencyMs] = useState<number | null>(null);
  const [pgTtsText, setPgTtsText] = useState('Hello! NeuroNinja offline voice engine is ready.');
  const [pgTtsSpeed, setPgTtsSpeed] = useState<number>(1.0);
  const [pgSpeaking, setPgSpeaking] = useState(false);
  const [pgTtsTier, setPgTtsTier] = useState<VoiceEngineTier | null>(null);
  const [pgTtsLatencyMs, setPgTtsLatencyMs] = useState<number | null>(null);
  const [pgLlmPrompt, setPgLlmPrompt] = useState('Log 250 rupees for masala dosa');
  const [pgLlmBusy, setPgLlmBusy] = useState(false);
  const [pgLlmResult, setPgLlmResult] = useState<NinjaVoiceIntent | null>(null);
  const [pgLlmLatencyMs, setPgLlmLatencyMs] = useState<number | null>(null);
  const [kwsLevel, setKwsLevel] = useState(0);
  const [kwsScore, setKwsScore] = useState(0);
  const [kwsMediaPaused, setKwsMediaPaused] = useState(false);
  const [kwsLastHit, setKwsLastHit] = useState<string | null>(null);
  const [bgWakeWord, setBgWakeWord] = useState(false);
  const [ignoreMediaAudio, setIgnoreMediaAudio] = useState(true);
  const [wakeThreshold, setWakeThreshold] = useState(0.45);
  const [customPhraseInput, setCustomPhraseInput] = useState('Hi Ninja');
  const [customProfile, setCustomProfile] = useState<{
    phrase: string;
    sampleCount: number;
    maxSamples?: number;
    hasNoiseCalibration?: boolean;
  } | null>(null);
  const [enrollSamples, setEnrollSamples] = useState<number[][]>([]);
  const [enrollRecording, setEnrollRecording] = useState(false);
  const [calibratingNoise, setCalibratingNoise] = useState(false);
  const [noiseCal, setNoiseCal] = useState<{
    negSamplesJson: string;
    bgMeanJson: string;
  } | null>(null);

  useEffect(() => {
    const emitter = voiceService.getOfflineEmitter();
    if (!emitter) return;
    const subLvl = emitter.addListener('NinjaWakeWordLevel', (e: { value?: string }) => {
      const val = Number(e?.value || 0);
      if (!Number.isNaN(val)) setKwsLevel(val);
    });
    const subScore = emitter.addListener('NinjaWakeWordScore', (e: { value?: string }) => {
      const raw = e?.value || '';
      const [pctStr, label] = raw.split('|');
      const pct = Number(pctStr || 0);
      if (!Number.isNaN(pct)) setKwsScore(pct);
      setKwsMediaPaused(label === 'MEDIA_PAUSED');
    });
    const subHit = emitter.addListener('NinjaWakeWordDetected', (e: { value?: string }) => {
      if (e?.value) setKwsLastHit(e.value);
    });
    return () => {
      subLvl.remove();
      subScore.remove();
      subHit.remove();
    };
  }, []);

  const refreshState = useCallback(async () => {
    const [list, base, ready, nnapi, bg, ignoreMedia, th] = await Promise.all([
      voicePackManager.getModules(),
      voicePackManager.getCdnBaseUrl(),
      voicePackManager.isOfflineRuntimeReady(),
      voicePackManager.getNnapiEnabled(),
      assistantController.getBackgroundWakeEnabled(),
      assistantController.getIgnoreDeviceMediaEnabled(),
      AsyncStorage.getItem('neuroninja_wake_threshold'),
    ]);
    setModules(list);
    setCdnBase(base);
    setRuntimeReady(ready);
    setNnapiEnabled(nnapi);
    setBgWakeWord(bg);
    setIgnoreMediaAudio(ignoreMedia);
    if (th && !Number.isNaN(Number(th))) setWakeThreshold(Number(th));

    const owwDir = await voicePackManager.getInstalledDir('oww-en-v1');
    if (owwDir) {
      const prof = await voiceService.getCustomWakeProfile(owwDir);
      setCustomProfile(prof);
      if (prof?.phrase) setCustomPhraseInput(prof.phrase);
      void assistantController.armWakeWord();
    } else {
      setCustomProfile(null);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      await voicePackManager.resetStaleDownloads();
      if (!active) return;
      await refreshState();
      void voiceService.warmUp();
    })();
    return () => {
      active = false;
    };
  }, [refreshState]);

  const sharedModules = useMemo(
    () =>
      modules.filter(
        (m) =>
          (m.languageId === 'shared' || m.languageId === 'base') &&
          m.capability !== 'kws' &&
          m.capability !== 'llm'
      ),
    [modules]
  );

  const aiModules = useMemo(
    () => modules.filter((m) => m.capability === 'kws' || m.capability === 'llm'),
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
    showToast({
      title: `${mod.displayName} Deleted`,
      message: 'Files & memory cache cleared. Ready to reinstall.',
      type: 'info',
      icon: 'trash-can-outline',
    });
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

  const formatTierLabel = (tier: VoiceEngineTier | null) => {
    if (!tier) return 'IDLE';
    if (tier === 'offline_lang') return '⚡ TIER 1: OFFLINE_LANG';
    if (tier === 'offline_base') return '⚡ TIER 2: OFFLINE_BASE';
    if (tier === 'cloud') return '☁️ TIER 4: CLOUD';
    return '🌐 TIER 3: OS SPEECH';
  };

  const handlePlaygroundListenToggle = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (pgListening) {
      setPgListening(false);
      await voiceService.stopListening();
      return;
    }

    setPgListening(true);
    setPgTranscript('');
    setPgSttTier(null);
    setPgSttLatencyMs(null);

    const offlineEmitter = voiceService.getOfflineEmitter();
    const osEmitter = voiceBridge.getEmitter();
    const subOffline = offlineEmitter?.addListener(
      'NinjaOfflineSpeechPartial',
      (e: { value?: string }) => {
        if (e?.value) setPgTranscript(e.value);
      }
    );
    const subOs = osEmitter?.addListener('NinjaVoicePartial', (e: { value?: string }) => {
      if (e?.value) setPgTranscript(e.value);
    });

    try {
      const res = await voiceService.startListening({
        lang: pgLang,
        onPartial: (partial) => setPgTranscript(partial),
      });
      setPgTranscript(res.text || '(No speech detected)');
      setPgSttTier(res.engine);
      setPgSttLatencyMs(res.latencyMs);
    } catch (e: unknown) {
      showToast({
        title: 'STT Error',
        message: e instanceof Error ? e.message : 'Microphone listening failed',
        type: 'error',
        icon: 'microphone-off',
      });
    } finally {
      subOffline?.remove();
      subOs?.remove();
      setPgListening(false);
    }
  };

  const handlePlaygroundSpeakToggle = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (pgSpeaking) {
      setPgSpeaking(false);
      await voiceService.stopSpeaking();
      return;
    }

    const text = pgTtsText.trim();
    if (!text) return;
    setPgSpeaking(true);
    const t0 = Date.now();
    try {
      const tier = await voiceService.speak(text, { lang: pgLang, rate: pgTtsSpeed });
      setPgTtsTier(tier);
      setPgTtsLatencyMs(Date.now() - t0);
    } catch (e: unknown) {
      showToast({
        title: 'TTS Error',
        message: e instanceof Error ? e.message : 'Speech synthesis failed',
        type: 'error',
        icon: 'volume-off',
      });
    } finally {
      setPgSpeaking(false);
    }
  };

  const handleSelectPlaygroundLang = async (langId: string, sample: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPgLang(langId);
    setPgTtsText(sample);
    await voicePackManager.setActiveLanguage(langId);
    await refreshState();
  };

  const handlePlaygroundRunLlm = async () => {
    const prompt = pgLlmPrompt.trim();
    if (!prompt || pgLlmBusy) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPgLlmBusy(true);
    setPgLlmResult(null);
    const t0 = Date.now();
    try {
      const result = await localLlmService.parseVoiceCommand(prompt, {
        onToken: (acc) => {
          if (!acc.trimStart().startsWith('{')) {
            setPgLlmResult({ intent: 'CHAT', reply: acc, modelId: 'Streaming…' });
          }
        },
      });
      setPgLlmResult(result);
      setPgLlmLatencyMs(Date.now() - t0);
    } catch (e: unknown) {
      showToast({
        title: 'Local LLM Error',
        message: e instanceof Error ? e.message : 'Inference failed',
        type: 'error',
        icon: 'robot-off',
      });
    } finally {
      setPgLlmBusy(false);
    }
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

        {/* Live Interactive STT & TTS Playground */}
        <View style={styles.playgroundCard}>
          <View style={styles.statusRow}>
            <MaterialCommunityIcons name="waveform" size={20} color="#38BDF8" />
            <Text style={styles.statusTitle}>Live STT & TTS Playground</Text>
            {pgSttTier ? (
              <View style={styles.tierBadge}>
                <Text style={styles.tierBadgeText}>{formatTierLabel(pgSttTier)}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.statusSub}>
            Select a language (English, Tamil, Hindi, etc.) and test real-time STT, TTS, and Local LLM offline.
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: 10 }}
            contentContainerStyle={{ gap: 6 }}
          >
            {PLAYGROUND_LANGS.map((l) => (
              <TouchableOpacity
                key={l.id}
                style={[styles.speedChip, pgLang === l.id && styles.speedChipActive]}
                onPress={() => void handleSelectPlaygroundLang(l.id, l.sample)}
              >
                <Text style={[styles.speedChipText, pgLang === l.id && { color: '#070A11' }]}>
                  {l.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.cdnLabel}>1. SPEAK → REAL-TIME TEXT (STT)</Text>
          <View style={styles.transcriptBox}>
            <Text style={styles.transcriptText}>
              {pgTranscript || (pgListening ? 'Listening… speak clearly now' : 'Tap Start Listening and speak to see live transcript…')}
            </Text>
            {pgSttLatencyMs !== null ? (
              <Text style={styles.latencyText}>Latency: {pgSttLatencyMs} ms · {formatTierLabel(pgSttTier)}</Text>
            ) : null}
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.primaryBtn, pgListening && styles.stopBtn]}
              onPress={handlePlaygroundListenToggle}
            >
              <Ionicons name={pgListening ? 'stop-circle' : 'mic'} size={15} color={pgListening ? '#FFF' : '#070A11'} />
              <Text style={[styles.primaryBtnText, pgListening && { color: '#FFF' }]}>
                {pgListening ? 'Stop Listening' : 'Start Listening'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryBtn}
              disabled={!pgTranscript.trim()}
              onPress={() => setPgTtsText(pgTranscript)}
            >
              <Ionicons name="arrow-down-circle-outline" size={15} color="#38BDF8" />
              <Text style={styles.secondaryBtnText}>Send to TTS</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.cdnLabel, { marginTop: 14 }]}>2. TYPE → SPEAK (TTS)</Text>
          <TextInput
            style={styles.pgInput}
            value={pgTtsText}
            onChangeText={setPgTtsText}
            multiline
            placeholder="Type English, Tamil, Hindi, Telugu, Malayalam, or Kannada text…"
            placeholderTextColor="#64748B"
          />

          <View style={styles.speedRow}>
            <Text style={styles.speedLabel}>Speed:</Text>
            {[0.8, 1.0, 1.25].map((spd) => (
              <TouchableOpacity
                key={spd}
                style={[styles.speedChip, pgTtsSpeed === spd && styles.speedChipActive]}
                onPress={() => setPgTtsSpeed(spd)}
              >
                <Text style={[styles.speedChipText, pgTtsSpeed === spd && { color: '#070A11' }]}>
                  {spd}x
                </Text>
              </TouchableOpacity>
            ))}
            {pgTtsLatencyMs !== null ? (
              <Text style={[styles.latencyText, { marginLeft: 'auto', marginTop: 0 }]}>
                {pgTtsLatencyMs} ms
              </Text>
            ) : null}
          </View>

          <View style={[styles.actionsRow, { marginTop: 8 }]}>
            <TouchableOpacity
              style={[styles.primaryBtn, pgSpeaking && styles.stopBtn]}
              onPress={handlePlaygroundSpeakToggle}
            >
              <Ionicons name={pgSpeaking ? 'stop' : 'volume-high'} size={15} color={pgSpeaking ? '#FFF' : '#070A11'} />
              <Text style={[styles.primaryBtnText, pgSpeaking && { color: '#FFF' }]}>
                {pgSpeaking ? 'Stop Speaking' : 'Speak Text'}
              </Text>
            </TouchableOpacity>
            {pgTtsTier ? (
              <View style={[styles.tierBadge, { alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 10 }]}>
                <Text style={styles.tierBadgeText}>{formatTierLabel(pgTtsTier)}</Text>
              </View>
            ) : null}
          </View>

          <Text style={[styles.cdnLabel, { marginTop: 14 }]}>3. OFFLINE LOCAL LLM PLAYGROUND (QWEN2.5)</Text>
          <TextInput
            style={styles.pgInput}
            value={pgLlmPrompt}
            onChangeText={setPgLlmPrompt}
            multiline
            placeholder='Try "Open WhatsApp", "Start 25 min focus", or "Log 250 tea"'
            placeholderTextColor="#64748B"
          />
          <View style={[styles.actionsRow, { marginTop: 8 }]}>
            <TouchableOpacity
              style={styles.primaryBtn}
              disabled={pgLlmBusy}
              onPress={handlePlaygroundRunLlm}
            >
              {pgLlmBusy ? (
                <ActivityIndicator size="small" color="#070A11" />
              ) : (
                <Text style={styles.primaryBtnText}>Run Local LLM</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryBtn}
              disabled={!pgTranscript.trim()}
              onPress={() => setPgLlmPrompt(pgTranscript)}
            >
              <Text style={styles.secondaryBtnText}>Use STT Text</Text>
            </TouchableOpacity>
          </View>

          {pgLlmResult ? (
            <View style={[styles.transcriptBox, { marginTop: 8, marginBottom: 0 }]}>
              <Text style={styles.latencyText}>
                Intent: {pgLlmResult.intent} · {pgLlmResult.modelId || 'Rule Fallback'}
                {pgLlmResult.tokensPerSec ? ` · ${pgLlmResult.tokensPerSec.toFixed(1)} tok/s` : ''}
                {pgLlmLatencyMs !== null ? ` · ${pgLlmLatencyMs} ms` : ''}
              </Text>
              <Text style={[styles.transcriptText, { marginTop: 4 }]}>{pgLlmResult.reply}</Text>
              <TouchableOpacity
                style={[styles.secondaryBtn, { marginTop: 8, alignSelf: 'flex-start', paddingHorizontal: 12 }]}
                onPress={() => void voiceService.speak(pgLlmResult.reply, { lang: pgLang, rate: pgTtsSpeed })}
              >
                <Ionicons name="volume-high-outline" size={14} color="#38BDF8" />
                <Text style={styles.secondaryBtnText}>Speak LLM Reply</Text>
              </TouchableOpacity>
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
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <ActivityIndicator size="small" color="#070A11" />
                        <Text style={styles.primaryBtnText}>
                          {progressMap[mod.id] ? `${progressMap[mod.id]}%` : 'Downloading…'}
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.primaryBtnText}>
                        Download ({formatMb(mod.sizeBytes)})
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

        <Text style={styles.sectionHeader}>WAKE-WORD (&quot;HI NEURONINJA&quot;) &amp; OFFLINE LOCAL LLM</Text>
        {aiModules.map((mod) => {
          const installed = mod.status === 'installed';
          const downloading = busyId === mod.id || mod.status === 'downloading';
          return (
            <View key={mod.id} style={styles.packCard}>
              <View style={styles.packTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.packName}>{mod.displayName}</Text>
                  <Text style={styles.modelMeta}>
                    {mod.modelName} · {mod.nativeName} · {formatMb(mod.sizeBytes)}
                  </Text>
                </View>
                <View style={styles.licencePill}>
                  <Text style={styles.licencePillText}>{mod.licence}</Text>
                </View>
              </View>
              {mod.capability === 'kws' && installed ? (
                <View style={{ marginTop: 8, backgroundColor: '#070A11', borderRadius: 10, padding: 10 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ color: '#94A3B8', fontSize: 11, fontWeight: '700' }}>
                      Mic ({kwsLevel}%) · Confidence ({kwsScore}%)
                    </Text>
                    <Text style={{ color: kwsMediaPaused ? '#F59E0B' : '#00E699', fontSize: 11, fontWeight: '800' }}>
                      {kwsMediaPaused
                        ? 'Paused (Speaker Media Active)'
                        : kwsLastHit
                          ? `Hit: ${kwsLastHit}`
                          : mod.id === 'oww-en-v1'
                            ? customProfile
                              ? `Say "${customProfile.phrase}"`
                              : 'Say "Hey Jarvis"'
                            : 'Say "Hi Ninja" / "Okay Computer"'}
                    </Text>
                  </View>
                  <View style={{ height: 6, backgroundColor: '#1E293B', borderRadius: 3, overflow: 'hidden', marginBottom: 4 }}>
                    <View
                      style={{
                        width: `${Math.min(100, Math.max(4, kwsLevel))}%`,
                        height: 6,
                        backgroundColor: kwsLevel > 15 ? '#00E699' : '#38BDF8',
                      }}
                    />
                  </View>
                  <View style={{ height: 4, backgroundColor: '#1E293B', borderRadius: 2, overflow: 'hidden' }}>
                    <View
                      style={{
                        width: `${Math.min(100, Math.max(2, kwsScore))}%`,
                        height: 4,
                        backgroundColor: kwsScore >= Math.round(wakeThreshold * 100) ? '#00E699' : '#A855F7',
                      }}
                    />
                  </View>

                  {mod.id === 'oww-en-v1' ? (
                    <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: '#1E293B', paddingTop: 10 }}>
                      <Text style={{ color: '#CBD5E1', fontSize: 11, fontWeight: '800', marginBottom: 6 }}>
                        SENSITIVITY (GOOGLE-ASSISTANT STYLE)
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
                        {[
                          { label: 'High (0.35)', val: 0.35 },
                          { label: 'Balanced (0.45)', val: 0.45 },
                          { label: 'Strict (0.60)', val: 0.6 },
                        ].map((opt) => (
                          <TouchableOpacity
                            key={opt.val}
                            style={[
                              styles.speedChip,
                              Math.abs(wakeThreshold - opt.val) < 0.02 && styles.speedChipActive,
                            ]}
                            onPress={() => {
                              setWakeThreshold(opt.val);
                              void AsyncStorage.setItem('neuroninja_wake_threshold', String(opt.val));
                              void voiceService.setWakeWordSensitivity(opt.val);
                            }}
                          >
                            <Text
                              style={[
                                styles.speedChipText,
                                Math.abs(wakeThreshold - opt.val) < 0.02 && { color: '#070A11' },
                              ]}
                            >
                              {opt.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      <Text style={{ color: '#CBD5E1', fontSize: 11, fontWeight: '800', marginBottom: 4 }}>
                        CUSTOM MIC WAKE-WORD TRAINING (10–30 SAMPLES · VOICE MATCH)
                      </Text>
                      <Text style={{ color: '#64748B', fontSize: 11, marginBottom: 6 }}>
                        {customProfile
                          ? `Active: "${customProfile.phrase}" (${customProfile.sampleCount}/30 samples${customProfile.hasNoiseCalibration ? ' · Noise Calibrated' : ''}). Add more up to 30 anytime.`
                          : '1) Calibrate 2s room silence to block false triggers. 2) Record 10–30 samples of your phrase (e.g. "Hi Ninja").'}
                      </Text>
                      <TextInput
                        style={[styles.pgInput, { minHeight: 38, paddingVertical: 6, marginBottom: 6 }]}
                        value={customPhraseInput}
                        onChangeText={setCustomPhraseInput}
                        placeholder='Custom phrase (e.g. "Hi Ninja")'
                        placeholderTextColor="#64748B"
                      />

                      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 6 }}>
                        <TouchableOpacity
                          style={[
                            styles.secondaryBtn,
                            { flex: 1 },
                            (noiseCal || customProfile?.hasNoiseCalibration) && {
                              borderColor: 'rgba(0,230,153,0.45)',
                            },
                          ]}
                          disabled={calibratingNoise || enrollRecording}
                          onPress={async () => {
                            const owwDir = await voicePackManager.getInstalledDir('oww-en-v1');
                            if (!owwDir) return;
                            setCalibratingNoise(true);
                            try {
                              const cal = await voiceService.recordRoomNoiseCalibration(owwDir, 2000);
                              setNoiseCal({
                                negSamplesJson: cal.negSamplesJson,
                                bgMeanJson: cal.bgMeanJson,
                              });
                              showToast({
                                title: 'Room Noise Calibrated',
                                message: `Background floor (${cal.rmsPct}%) learned to reject silence/noise.`,
                                type: 'success',
                                icon: 'shield-check',
                              });
                            } catch (e) {
                              showAlert({
                                title: 'Noise Calibration',
                                message: e instanceof Error ? e.message : 'Failed to calibrate room noise',
                              });
                            } finally {
                              setCalibratingNoise(false);
                              void assistantController.armWakeWord();
                            }
                          }}
                        >
                          {calibratingNoise ? (
                            <ActivityIndicator size="small" color="#38BDF8" />
                          ) : (
                            <Ionicons
                              name={noiseCal || customProfile?.hasNoiseCalibration ? 'shield-checkmark' : 'volume-mute-outline'}
                              size={14}
                              color={noiseCal || customProfile?.hasNoiseCalibration ? '#00E699' : '#38BDF8'}
                            />
                          )}
                          <Text style={styles.secondaryBtnText}>
                            {calibratingNoise
                              ? 'Stay Silent (2s)...'
                              : noiseCal || customProfile?.hasNoiseCalibration
                                ? 'Room Noise Calibrated ✓'
                                : '1. Calibrate Room Silence (2s)'}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                        <TouchableOpacity
                          style={[styles.secondaryBtn, { flex: 1 }]}
                          disabled={
                            enrollRecording ||
                            calibratingNoise ||
                            (customProfile?.sampleCount || 0) + enrollSamples.length >= 30
                          }
                          onPress={async () => {
                            const owwDir = await voicePackManager.getInstalledDir('oww-en-v1');
                            if (!owwDir) return;
                            setEnrollRecording(true);
                            try {
                              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              const res = await voiceService.recordCustomWakeSample(owwDir, 1900);
                              if (res.rmsPct < 4) {
                                showToast({
                                  title: 'Too Quiet',
                                  message: 'Speak clearly near the mic and try again.',
                                  type: 'warning',
                                  icon: 'microphone-off',
                                });
                              } else {
                                const vec = JSON.parse(res.embeddingJson) as number[];
                                const nextCount = enrollSamples.length + 1;
                                setEnrollSamples((prev) => [...prev.slice(0, 29), vec]);
                                showToast({
                                  title: `Sample ${(customProfile?.sampleCount || 0) + nextCount}/30 Captured`,
                                  message: `Mic energy ${res.rmsPct}%`,
                                  type: 'success',
                                  icon: 'microphone',
                                });
                              }
                            } catch (e) {
                              showAlert({
                                title: 'Mic Training',
                                message: e instanceof Error ? e.message : 'Failed to record sample',
                              });
                            } finally {
                              setEnrollRecording(false);
                              void assistantController.armWakeWord();
                            }
                          }}
                        >
                          {enrollRecording ? (
                            <ActivityIndicator size="small" color="#38BDF8" />
                          ) : (
                            <Ionicons name="mic" size={14} color="#38BDF8" />
                          )}
                          <Text style={styles.secondaryBtnText}>
                            {enrollRecording
                              ? 'Speak Now (1.9s)...'
                              : (customProfile?.sampleCount || 0) + enrollSamples.length >= 30
                                ? 'Max 30 Samples Reached'
                                : customProfile
                                  ? `Add Sample (${customProfile.sampleCount + enrollSamples.length}/30)`
                                  : `2. Record (${enrollSamples.length}/10 min · max 30)`}
                          </Text>
                        </TouchableOpacity>

                        {((!customProfile && enrollSamples.length >= 10) ||
                          (customProfile && enrollSamples.length >= 1)) ? (
                          <TouchableOpacity
                            style={[styles.primaryBtn, { flex: 1 }]}
                            onPress={async () => {
                              const owwDir = await voicePackManager.getInstalledDir('oww-en-v1');
                              if (!owwDir) return;
                              const phrase = customPhraseInput.trim() || 'Hi Ninja';
                              const totalSaved = await voiceService.saveCustomWakeProfile(
                                owwDir,
                                phrase,
                                enrollSamples,
                                {
                                  negSamplesJson: noiseCal?.negSamplesJson ?? null,
                                  bgMeanJson: noiseCal?.bgMeanJson ?? null,
                                  append: Boolean(customProfile),
                                }
                              );
                              setEnrollSamples([]);
                              await assistantController.disarmWakeWord();
                              await refreshState();
                              showToast({
                                title: `"${phrase}" Updated (${totalSaved}/30)`,
                                message: 'Noise-gated Voice Match is now listening!',
                                type: 'success',
                                icon: 'check-circle',
                              });
                            }}
                          >
                            <Text style={styles.primaryBtnText}>
                              {customProfile
                                ? `Save +${enrollSamples.length} (${Math.min(30, customProfile.sampleCount + enrollSamples.length)}/30)`
                                : `Save & Activate (${enrollSamples.length})`}
                            </Text>
                          </TouchableOpacity>
                        ) : null}

                        {customProfile ? (
                          <TouchableOpacity
                            style={[styles.dangerBtn, { paddingHorizontal: 10 }]}
                            onPress={async () => {
                              const owwDir = await voicePackManager.getInstalledDir('oww-en-v1');
                              if (!owwDir) return;
                              await voiceService.clearCustomWakeProfile(owwDir);
                              setEnrollSamples([]);
                              setNoiseCal(null);
                              await assistantController.disarmWakeWord();
                              await refreshState();
                              showToast({
                                title: 'Reset to Hey Jarvis',
                                message: 'Built-in openWakeWord model active.',
                                type: 'info',
                                icon: 'refresh',
                              });
                            }}
                          >
                            <Text style={styles.dangerBtnText}>Reset</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>

                      <View style={{ marginTop: 10, backgroundColor: '#0B1220', borderRadius: 8, padding: 8 }}>
                        <Text style={{ color: '#94A3B8', fontSize: 10.5, fontWeight: '800', marginBottom: 3 }}>
                          INSTANT OFFLINE COMMANDS (SAY AFTER WAKE CHIME)
                        </Text>
                        <Text style={{ color: '#CBD5E1', fontSize: 11, lineHeight: 16 }}>
                          • &quot;Start 25 min focus&quot; · &quot;Spent 250 on fuel&quot;{'\n'}
                          • &quot;Open WhatsApp&quot; · &quot;Note call supplier&quot; · &quot;Open Finance&quot;
                        </Text>
                      </View>
                    </View>
                  ) : null}

                  <View style={[styles.switchRow, { marginTop: 10, paddingTop: 8 }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.switchTitle, { fontSize: 12 }]}>Ignore Device Media Audio</Text>
                      <Text style={styles.switchSub}>Blocks YouTube/Reels/TTS speaker output from triggering wake-word</Text>
                    </View>
                    <Switch
                      value={ignoreMediaAudio}
                      onValueChange={(val) => {
                        setIgnoreMediaAudio(val);
                        void assistantController.setIgnoreDeviceMediaEnabled(val);
                      }}
                      thumbColor={ignoreMediaAudio ? '#00E699' : '#94A3B8'}
                      trackColor={{ false: '#1E293B', true: 'rgba(0,230,153,0.35)' }}
                    />
                  </View>
                  <View style={[styles.switchRow, { marginTop: 10, paddingTop: 8 }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.switchTitle, { fontSize: 12 }]}>Background Wake-Word Service</Text>
                      <Text style={styles.switchSub}>Keeps mic alive even when minimized / screen off</Text>
                    </View>
                    <Switch
                      value={bgWakeWord}
                      onValueChange={(val) => {
                        setBgWakeWord(val);
                        void assistantController.setBackgroundWakeEnabled(val);
                      }}
                      thumbColor={bgWakeWord ? '#00E699' : '#94A3B8'}
                      trackColor={{ false: '#1E293B', true: 'rgba(0,230,153,0.35)' }}
                    />
                  </View>
                  <TouchableOpacity
                    style={[styles.secondaryBtn, { marginTop: 8, paddingVertical: 6 }]}
                    onPress={() => void voiceService.openBatteryOptimizationSettings()}
                  >
                    <Ionicons name="battery-charging-outline" size={14} color="#38BDF8" />
                    <Text style={styles.secondaryBtnText}>Allow Unrestricted Battery</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
              <View style={[styles.actionsRow, { marginTop: 10 }]}>
                {!installed ? (
                  <TouchableOpacity
                    style={styles.primaryBtn}
                    disabled={downloading}
                    onPress={() => handleDownloadModule(mod)}
                  >
                    {downloading ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <ActivityIndicator size="small" color="#070A11" />
                        <Text style={styles.primaryBtnText}>
                          {progressMap[mod.id] ? `${progressMap[mod.id]}%` : 'Downloading…'}
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.primaryBtnText}>
                        Download ({formatMb(mod.sizeBytes)})
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
                ) : grp.tts.manifestJson || grp.tts.downloadUrl || cdnBase.trim().length > 0 ? (
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
                ) : (
                  <TouchableOpacity
                    style={styles.secondaryBtn}
                    onPress={() => handleTestVoice(grp.languageId, grp.displayName)}
                  >
                    <Text style={styles.secondaryBtnText}>OS Offline TTS</Text>
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
  playgroundCard: {
    backgroundColor: '#0F1829',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.28)',
  },
  tierBadge: {
    backgroundColor: 'rgba(56,189,248,0.14)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.3)',
  },
  tierBadgeText: { color: '#38BDF8', fontSize: 9.5, fontWeight: '800' },
  transcriptBox: {
    backgroundColor: '#070A11',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    minHeight: 62,
    justifyContent: 'space-between',
  },
  transcriptText: { color: '#E2E8F0', fontSize: 12.5, lineHeight: 18 },
  latencyText: { color: '#00E699', fontSize: 10.5, fontWeight: '700', marginTop: 6 },
  stopBtn: { backgroundColor: '#F43F5E' },
  pgInput: {
    backgroundColor: '#070A11',
    color: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12.5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    minHeight: 54,
    textAlignVertical: 'top',
  },
  speedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  speedLabel: { color: '#94A3B8', fontSize: 11, fontWeight: '700', marginRight: 2 },
  speedChip: {
    backgroundColor: '#162238',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  speedChipActive: { backgroundColor: '#38BDF8' },
  speedChipText: { color: '#CBD5E1', fontSize: 11, fontWeight: '800' },
});
