import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { voiceService } from '../../services/voice/voice-service';
import { voiceBridge } from '../../services/finance/native-finance-bridge';
import { assistantController } from '../../services/voice/assistant-controller';
import {
  localLlmService,
  type AiLanguageMode,
  type NinjaVoiceIntent,
} from '../../services/ai/local-llm-service';
import { saveTransactionV2 } from '../../services/finance/finance-service';
import { createTask } from '../../services/tasks/task-engine';
import {
  getRealtimeInstalledLauncherApps,
  launchApplication,
} from '../../services/launcher/launcher-service';

type AssistantStage = 'greeting' | 'listening' | 'thinking' | 'speaking' | 'done';

const NINJA_ICON = require('../../../assets/images/icon.png');

const AI_LANG_OPTIONS: { id: AiLanguageMode; label: string; speechLang: string }[] = [
  { id: 'auto', label: 'Auto (EN+Indic)', speechLang: 'en-IN' },
  { id: 'en-IN', label: 'English', speechLang: 'en-IN' },
  { id: 'ta-IN', label: 'தமிழ்', speechLang: 'ta-IN' },
  { id: 'hi-IN', label: 'हिन्दी', speechLang: 'hi-IN' },
];

export function NinjaAssistantOverlay() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [stage, setStage] = useState<AssistantStage>('greeting');
  const [wakeLabel, setWakeLabel] = useState('Hi NeuroNinja');
  const [aiLang, setAiLang] = useState<AiLanguageMode>(() => localLlmService.getAiLanguageMode());
  const [transcript, setTranscript] = useState('');
  const [reply, setReply] = useState('');
  const [intentInfo, setIntentInfo] = useState<NinjaVoiceIntent | null>(null);

  const [pulseAnim] = useState(() => new Animated.Value(1));
  const activeSessionRef = useRef(false);
  const bargedInRef = useRef(false);
  const stopBargeInRef = useRef<(() => void) | null>(null);
  const ttsQueueRef = useRef<Promise<void>>(Promise.resolve());

  const stopBargeIn = useCallback(() => {
    stopBargeInRef.current?.();
    stopBargeInRef.current = null;
  }, []);

  const speechLang = AI_LANG_OPTIONS.find((o) => o.id === aiLang)?.speechLang || 'en-IN';

  const enqueueSpeech = useCallback(
    (sentence: string) => {
      const clean = sentence.trim();
      if (!clean) return;
      ttsQueueRef.current = ttsQueueRef.current.then(async () => {
        if (!activeSessionRef.current || bargedInRef.current) return;
        await voiceService.speak(clean, { lang: speechLang });
      });
    },
    [speechLang]
  );

  const executeIntentAction = useCallback(
    async (intent: NinjaVoiceIntent) => {
      if (intent.intent === 'LOG_EXPENSE' && intent.amount && intent.amount > 0) {
        try {
          await saveTransactionV2({
            amount: intent.amount,
            type: 'expense',
            category: intent.category || 'General',
            merchantName: intent.merchant,
            description: intent.merchant || 'Voice logged expense',
            source: 'voice',
          });
        } catch {}
        return;
      }
      if (intent.intent === 'ADD_TASK' && intent.title) {
        try {
          await createTask({ title: intent.title, source: 'voice' });
        } catch {}
        return;
      }
      if (intent.intent === 'QUICK_NOTE' && intent.title) {
        try {
          await Clipboard.setStringAsync(intent.title);
          await createTask({ title: `Note: ${intent.title}`, source: 'voice' });
        } catch {}
        return;
      }
      if (intent.intent === 'START_FOCUS') {
        setVisible(false);
        activeSessionRef.current = false;
        assistantController.setOverlayActive(false);
        void voiceService.abandonAudioFocus();
        router.push('/focus/pomodoro');
        return;
      }
      if (intent.intent === 'NAVIGATE' && intent.route) {
        setVisible(false);
        activeSessionRef.current = false;
        assistantController.setOverlayActive(false);
        void voiceService.abandonAudioFocus();
        router.push(intent.route as never);
        return;
      }
      if (intent.intent === 'OPEN_APP' && intent.appName && Platform.OS === 'android') {
        const target = intent.appName.toLowerCase();
        try {
          const apps = await getRealtimeInstalledLauncherApps();
          const match = apps.find((a) => a.name.toLowerCase().includes(target));
          if (match) {
            setVisible(false);
            activeSessionRef.current = false;
            assistantController.setOverlayActive(false);
            void voiceService.abandonAudioFocus();
            await launchApplication(match.packageName);
          }
        } catch {}
      }
    },
    [router]
  );

  const startAssistantSession = useCallback(
    async (triggeredKeyword?: string) => {
      if (activeSessionRef.current) return;
      activeSessionRef.current = true;
      bargedInRef.current = false;
      assistantController.setOverlayActive(true);
      await voiceService.requestAudioFocus();
      // Keep MODE_NORMAL + USAGE_ASSISTANT so TTS plays loudly through the loudspeaker (not earpiece)
      await voiceService.setCommunicationAudioMode(false);
      const headsetConnected = await voiceService.isHeadsetConnected();

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setWakeLabel(triggeredKeyword ? triggeredKeyword.replace(/_/g, ' ') : 'NeuroNinja');
      setTranscript('');
      setReply('Hi! I am NeuroNinja. What would you like to do?');
      setIntentInfo(null);
      setStage('greeting');
      setVisible(true);

      // Speak greeting cleanly without mic active (user can tap "Interrupt & Speak" anytime)
      await voiceService.speak("Hi! I'm NeuroNinja. What would you like to do?", {
        lang: speechLang,
      });
      if (!activeSessionRef.current) return;

      // 350ms echo cooldown tail so room reverb of AI's last syllable isn't captured by STT
      await new Promise((r) => setTimeout(r, 350));
      if (!activeSessionRef.current) return;

      // Listen via 4-tier STT (now with AEC + isolated 512-sample Silero VAD)
      setStage('listening');
      bargedInRef.current = false;
      const offlineEmitter = voiceService.getOfflineEmitter();
      const osEmitter = voiceBridge.getEmitter();
      const subOffline = offlineEmitter?.addListener(
        'NinjaOfflineSpeechPartial',
        (e: { value?: string }) => {
          if (e?.value) setTranscript(e.value);
        }
      );
      const subOs = osEmitter?.addListener('NinjaVoicePartial', (e: { value?: string }) => {
        if (e?.value) setTranscript(e.value);
      });

      let spoken = '';
      try {
        const res = await voiceService.startListening({
          lang: speechLang,
          onPartial: (p) => setTranscript(p),
        });
        spoken = res.text?.trim() || '';
        setTranscript(spoken || '(No speech detected)');
      } catch (e: unknown) {
        setReply(e instanceof Error ? e.message : 'Microphone unavailable.');
        setStage('done');
        return;
      } finally {
        subOffline?.remove();
        subOs?.remove();
      }

      if (!activeSessionRef.current || !spoken) {
        setStage('done');
        return;
      }

      // Stream Local LLM + Sentence-Chunked TTS + Headset Barge-In
      setStage('thinking');
      setReply('');
      ttsQueueRef.current = Promise.resolve();
      if (headsetConnected) {
        stopBargeInRef.current = await voiceService.startBargeInMonitor(() => {
          bargedInRef.current = true;
          void voiceService.stopSpeaking();
          activeSessionRef.current = false;
          assistantController.trigger('Listening');
        });
      }

      let appNames: string[] = [];
      if (Platform.OS === 'android') {
        try {
          const apps = await getRealtimeInstalledLauncherApps();
          appNames = apps.slice(0, 18).map((a) => a.name);
        } catch {}
      }

      const intent = await localLlmService.parseVoiceCommand(spoken, {
        languageMode: aiLang,
        appNames,
        onToken: (acc) => {
          if (!acc.trimStart().startsWith('{')) {
            setReply(acc);
          }
        },
        onSentence: (sentence) => {
          setStage('speaking');
          enqueueSpeech(sentence);
        },
      });

      if (!activeSessionRef.current || bargedInRef.current) {
        stopBargeIn();
        return;
      }
      setIntentInfo(intent);
      setReply(intent.reply);
      setStage('speaking');
      await ttsQueueRef.current;
      stopBargeIn();

      if (!activeSessionRef.current || bargedInRef.current) return;
      setStage('done');
      await executeIntentAction(intent);
    },
    [enqueueSpeech, executeIntentAction, stopBargeIn]
  );

  const closeAssistant = useCallback(() => {
    activeSessionRef.current = false;
    bargedInRef.current = false;
    stopBargeIn();
    void voiceService.stopListening();
    void voiceService.stopSpeaking();
    void voiceService.setCommunicationAudioMode(false);
    void voiceService.abandonAudioFocus();
    setVisible(false);
    assistantController.setOverlayActive(false);
  }, [stopBargeIn]);

  // Pulse animation while active
  useEffect(() => {
    if (!visible) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 650, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 650, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [visible, pulseAnim]);

  // Subscribe to single unified assistantController
  useEffect(() => {
    const unsub = assistantController.onTrigger((kw) => {
      void startAssistantSession(kw);
    });
    void assistantController.armWakeWord();
    return () => {
      unsub();
      void assistantController.disarmWakeWord();
    };
  }, [startAssistantSession]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={closeAssistant}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.topRow}>
            <Animated.View style={[styles.logoRing, { transform: [{ scale: pulseAnim }] }]}>
              <Image source={NINJA_ICON} style={styles.logoImg} />
            </Animated.View>
            <View style={{ flex: 1 }}>
              <Text style={styles.brandTag}>NEURONINJA AI · {wakeLabel}</Text>
              <Text style={styles.stageTitle}>
                {stage === 'greeting'
                  ? 'Saying hello… (speak anytime to interrupt)'
                  : stage === 'listening'
                    ? 'Listening to you…'
                    : stage === 'thinking'
                      ? 'Thinking offline…'
                      : stage === 'speaking'
                        ? 'Speaking… (speak anytime to interrupt)'
                        : 'Ready'}
              </Text>
            </View>
            <TouchableOpacity onPress={closeAssistant} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <View style={styles.langRow}>
            {AI_LANG_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.id}
                style={[styles.langChip, aiLang === opt.id && styles.langChipActive]}
                onPress={() => {
                  setAiLang(opt.id);
                  localLlmService.setAiLanguageMode(opt.id);
                }}
              >
                <Text style={[styles.langChipText, aiLang === opt.id && { color: '#070A11' }]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.resetChip}
              onPress={() => {
                localLlmService.clearConversation();
                setTranscript('');
                setReply('New topic ready. What would you like to discuss?');
              }}
            >
              <Text style={styles.resetChipText}>New Topic</Text>
            </TouchableOpacity>
          </View>

          {transcript ? (
            <View style={styles.bubbleUser}>
              <Text style={styles.bubbleLabel}>YOU</Text>
              <Text style={styles.bubbleText}>{transcript}</Text>
            </View>
          ) : null}

          <View style={styles.bubbleAi}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.bubbleAiLabel}>NEURONINJA</Text>
              {stage === 'thinking' ? <ActivityIndicator size="small" color="#00E699" /> : null}
            </View>
            <Text style={styles.bubbleText}>{reply || 'Hi! How can I help you today?'}</Text>
            {intentInfo?.modelId ? (
              <Text style={styles.metaText}>
                {intentInfo.intent} · {intentInfo.modelId}
                {intentInfo.tokensPerSec ? ` · ${intentInfo.tokensPerSec.toFixed(1)} tok/s` : ''}
              </Text>
            ) : null}
          </View>

          <View style={styles.footerRow}>
            <TouchableOpacity
              style={[
                styles.micAgainBtn,
                (stage === 'greeting' || stage === 'speaking') && { backgroundColor: '#F59E0B' },
              ]}
              onPress={() => {
                activeSessionRef.current = false;
                bargedInRef.current = true;
                stopBargeIn();
                void voiceService.stopSpeaking();
                void startAssistantSession('Interrupt');
              }}
            >
              <Ionicons
                name={stage === 'greeting' || stage === 'speaking' ? 'hand-left' : 'mic'}
                size={16}
                color="#070A11"
              />
              <Text style={styles.micAgainText}>
                {stage === 'greeting' || stage === 'speaking' ? 'Interrupt & Speak' : 'Ask Again'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dismissBtn} onPress={closeAssistant}>
              <Text style={styles.dismissText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,0.78)',
    justifyContent: 'flex-end',
    padding: 14,
  },
  sheet: {
    backgroundColor: '#0F1829',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(0,230,153,0.4)',
  },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  logoRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,230,153,0.16)',
    borderWidth: 2,
    borderColor: '#00E699',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImg: { width: 38, height: 38, borderRadius: 19 },
  brandTag: { color: '#00E699', fontSize: 10, fontWeight: '800', letterSpacing: 0.9 },
  stageTitle: { color: '#F8FAFC', fontSize: 15.5, fontWeight: '800', marginTop: 2 },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#162238',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleUser: {
    backgroundColor: '#070A11',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.25)',
  },
  bubbleAi: {
    backgroundColor: '#09111E',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,230,153,0.25)',
  },
  bubbleLabel: { color: '#38BDF8', fontSize: 9.5, fontWeight: '800', marginBottom: 3 },
  bubbleAiLabel: { color: '#00E699', fontSize: 9.5, fontWeight: '800', marginBottom: 3 },
  bubbleText: { color: '#F8FAFC', fontSize: 14, lineHeight: 20 },
  metaText: { color: '#64748B', fontSize: 10.5, fontWeight: '700', marginTop: 6 },
  footerRow: { flexDirection: 'row', gap: 10 },
  micAgainBtn: {
    flex: 1.4,
    backgroundColor: '#00E699',
    borderRadius: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  micAgainText: { color: '#070A11', fontWeight: '800', fontSize: 13 },
  dismissBtn: {
    flex: 0.8,
    backgroundColor: '#162238',
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissText: { color: '#CBD5E1', fontWeight: '700', fontSize: 13 },
  langRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
    alignItems: 'center',
  },
  langChip: {
    backgroundColor: '#162238',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  langChipActive: { backgroundColor: '#38BDF8' },
  langChipText: { color: '#CBD5E1', fontSize: 11, fontWeight: '800' },
  resetChip: {
    marginLeft: 'auto',
    backgroundColor: 'rgba(0,230,153,0.12)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(0,230,153,0.3)',
  },
  resetChipText: { color: '#00E699', fontSize: 10.5, fontWeight: '800' },
});
