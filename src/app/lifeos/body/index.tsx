import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Animated,
  Easing,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { neuroBodyEngine } from '../../../services/body/neurobody-engine';
import { womensHealthEngine } from '../../../services/body/womens-health-engine';
import { neuroHealthEngine } from '../../../services/health/neurohealth-engine';
import type {
  BodyDaySummary,
  MealType,
  FastingProtocol,
  FluidType,
  WomensHealthMode,
  FlowLevel,
  CervicalMucus,
} from '../../../services/body/body-types';
import {
  FASTING_PROTOCOLS,
  FLUID_TYPES,
  HEALTH_MODES,
  FLOW_LEVELS,
  CYCLE_SYMPTOMS,
  CYCLE_MOODS,
} from '../../../services/body/body-types';
import type {
  MoodRating,
  BreathingPattern,
} from '../../../services/health/health-types';
import {
  MOOD_RATING_META,
  BREATHING_PATTERNS,
} from '../../../services/health/health-types';

type BodyTab = 'cycle' | 'fasting' | 'hydration' | 'nutrition' | 'metrics' | 'mind';

export default function NeuroBodyScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<BodyTab>('cycle');
  const [summary, setSummary] = useState<BodyDaySummary | null>(null);

  // Modals
  const [showMealModal, setShowMealModal] = useState(false);
  const [showMetricModal, setShowMetricModal] = useState(false);
  const [showFastModal, setShowFastModal] = useState(false);
  const [showModeModal, setShowModeModal] = useState(false);

  // Women's Health Form State
  const [selectedFlow, setSelectedFlow] = useState<FlowLevel | undefined>(undefined);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [periodStartActive, setPeriodStartActive] = useState(false);
  const [bbtInput, setBbtInput] = useState('36.6');
  const [selectedMucus, setSelectedMucus] = useState<CervicalMucus>('creamy');

  // Fasting Form State
  const [selectedProtocol, setSelectedProtocol] = useState<FastingProtocol>('16:8');

  // Hydration State
  const [selectedFluid, setSelectedFluid] = useState<FluidType>('water');

  // Meal Form State
  const [mealName, setMealName] = useState('');
  const [mealCalories, setMealCalories] = useState('450');
  const [mealProtein, setMealProtein] = useState('35');
  const [mealCarbs, setMealCarbs] = useState('45');
  const [mealFats, setMealFats] = useState('15');
  const [mealType] = useState<MealType>('lunch');

  // Metric Form State
  const [metricWeight, setMetricWeight] = useState('58');
  const [metricHeight, setMetricHeight] = useState('165');
  const [metricWaist, setMetricWaist] = useState('68');
  const [metricChest, setMetricChest] = useState('86');
  const [metricHips, setMetricHips] = useState('92');

  // Breathwork & Mind State
  const [selectedMood, setSelectedMood] = useState<MoodRating>('good');
  const [breathPattern, setBreathPattern] = useState<BreathingPattern>('box');
  const [isBreathingActive, setIsBreathingActive] = useState(false);
  const [breathPhase, setBreathPhase] = useState<'Inhale' | 'Hold' | 'Exhale' | 'Rest'>('Inhale');
  const [breathAnim] = useState(() => new Animated.Value(1));

  // ────────── Data Loading ──────────
  const loadData = useCallback(async () => {
    try {
      const data = await neuroBodyEngine.getDaySummary();
      setSummary(data);

      if (data.womensHealth?.todayLog) {
        const log = data.womensHealth.todayLog;
        setSelectedFlow(log.flowLevel);
        setSelectedSymptoms(log.symptoms || []);
        setSelectedMoods(log.moods || []);
        setPeriodStartActive(log.isPeriodStart);
        if (log.bbtCelsius) setBbtInput(String(log.bbtCelsius));
        if (log.cervicalMucus) setSelectedMucus(log.cervicalMucus);
      }
    } catch (e) {
      console.warn('[NeuroBodyScreen] load error:', e);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadData]);

  // ────────── Breathwork Animation Engine ──────────
  useEffect(() => {
    if (!isBreathingActive) {
      breathAnim.setValue(1);
      const resetTimer = setTimeout(() => {
        setBreathPhase('Inhale');
      }, 0);
      return () => clearTimeout(resetTimer);
    }

    const cfg = BREATHING_PATTERNS[breathPattern];
    let isCancelled = false;

    const runCycle = () => {
      if (isCancelled) return;
      setBreathPhase('Inhale');
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      Animated.timing(breathAnim, {
        toValue: 1.6,
        duration: cfg.inhale * 1000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        if (isCancelled) return;

        if (cfg.holdIn > 0) {
          setBreathPhase('Hold');
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setTimeout(() => {
            if (isCancelled) return;
            startExhale();
          }, cfg.holdIn * 1000);
        } else {
          startExhale();
        }
      });
    };

    const startExhale = () => {
      setBreathPhase('Exhale');
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      Animated.timing(breathAnim, {
        toValue: 1,
        duration: cfg.exhale * 1000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        if (isCancelled) return;

        if (cfg.holdOut > 0) {
          setBreathPhase('Rest');
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setTimeout(() => {
            if (isCancelled) return;
            runCycle();
          }, cfg.holdOut * 1000);
        } else {
          runCycle();
        }
      });
    };

    runCycle();

    return () => {
      isCancelled = true;
      breathAnim.stopAnimation();
    };
  }, [isBreathingActive, breathPattern, breathAnim]);

  // ────────── Women's Health Handlers ──────────
  const handleToggleSymptom = (id: string) => {
    void Haptics.selectionAsync();
    setSelectedSymptoms((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleToggleMood = (id: string) => {
    void Haptics.selectionAsync();
    setSelectedMoods((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const handleSaveCycleLog = async () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await womensHealthEngine.saveTodayLog({
        isPeriodStart: periodStartActive,
        isPeriodEnd: false,
        flowLevel: selectedFlow,
        symptoms: selectedSymptoms,
        moods: selectedMoods,
        bbtCelsius: parseFloat(bbtInput) || 36.6,
        cervicalMucus: selectedMucus,
      });
      await loadData();
      Alert.alert('🌸 Vitality Check-in Saved', 'Hormonal insights updated & +30 Focus Coins awarded!');
    } catch (err) {
      console.warn('[handleSaveCycleLog] error:', err);
    }
  };

  const handleSelectMode = async (mode: WomensHealthMode) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowModeModal(false);
    try {
      await womensHealthEngine.saveProfile({ mode });
      await loadData();
    } catch (err) {
      console.warn('[handleSelectMode] error:', err);
    }
  };

  // ────────── Fasting Handlers ──────────
  const handleStartFast = async () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowFastModal(false);
    try {
      await neuroBodyEngine.startFast(selectedProtocol);
      await loadData();
    } catch (err) {
      console.warn('[handleStartFast] error:', err);
    }
  };

  const handleEndFast = async () => {
    if (!summary?.activeFast) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      await neuroBodyEngine.endFast(summary.activeFast.sessionId, 'good', 'Completed fast via NeuroBody OS');
      await loadData();
    } catch (err) {
      console.warn('[handleEndFast] error:', err);
    }
  };

  // ────────── Hydration Handlers ──────────
  const handleAddWater = async (ml: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await neuroBodyEngine.addWater(ml, selectedFluid);
      await loadData();
    } catch (err) {
      console.warn('[handleAddWater] error:', err);
    }
  };

  // ────────── Meal Handlers ──────────
  const handleAddMeal = async () => {
    if (!mealName.trim()) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowMealModal(false);
    try {
      await neuroBodyEngine.addMeal({
        date: summary?.date || new Date().toISOString().split('T')[0],
        mealType,
        name: mealName.trim(),
        calories: parseInt(mealCalories, 10) || 0,
        protein: parseFloat(mealProtein) || 0,
        carbs: parseFloat(mealCarbs) || 0,
        fats: parseFloat(mealFats) || 0,
      });
      setMealName('');
      await loadData();
    } catch (err) {
      console.warn('[handleAddMeal] error:', err);
    }
  };

  const handleDeleteMeal = async (mealId: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await neuroBodyEngine.deleteMeal(mealId);
      await loadData();
    } catch (err) {
      console.warn('[handleDeleteMeal] error:', err);
    }
  };

  // ────────── Metric Handlers ──────────
  const handleLogMetric = async () => {
    const weight = parseFloat(metricWeight);
    if (!weight) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowMetricModal(false);
    try {
      await neuroBodyEngine.logMetric({
        date: summary?.date || new Date().toISOString().split('T')[0],
        weightKg: weight,
        heightCm: parseFloat(metricHeight) || undefined,
        waistCm: parseFloat(metricWaist) || undefined,
        chestCm: parseFloat(metricChest) || undefined,
        hipsCm: parseFloat(metricHips) || undefined,
      });
      await loadData();
    } catch (err) {
      console.warn('[handleLogMetric] error:', err);
    }
  };

  // ────────── Mental Health Handlers ──────────
  const handleSaveMentalCheckin = async (mood: MoodRating) => {
    setSelectedMood(mood);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await neuroHealthEngine.saveLog(
        mood,
        MOOD_RATING_META[mood].score,
        {
          stress: 3,
          anxiety: 2,
          energy: 8,
          motivation: 8,
          focus: 9,
          happiness: 8,
        },
        ['Deep Focus', 'Centered Mind'],
        undefined,
        ['Mindful Breathing', 'Ninja Energy', 'Physical Health']
      );
      await loadData();
    } catch (err) {
      console.warn('[handleSaveMentalCheckin] error:', err);
    }
  };

  if (!summary) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Synthesizing Vitality Core...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { vitalityScore, womensHealth, activeFast, fastingBioStage } = summary;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ────────── Top Bar ────────── */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.headerTitle}>NEUROBODY OS</Text>
          <Text style={styles.headerSubtitle}>ONE-STOP VITALITY SYSTEM</Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            void loadData();
          }}
          style={styles.refreshButton}
        >
          <Ionicons name="refresh" size={20} color="#00E699" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ────────── 1. The Vitality Core (Hero Header) ────────── */}
        <View style={styles.vitalityHeroCard}>
          <View style={styles.vitalityTopRow}>
            <View style={styles.vitalityScoreRing}>
              <Text style={[styles.vitalityScoreNumber, { color: vitalityScore.statusColor }]}>
                {vitalityScore.total}
              </Text>
              <Text style={styles.vitalityScoreMax}>/100</Text>
            </View>
            <View style={styles.vitalityHeroInfo}>
              <View style={[styles.statusBadge, { borderColor: vitalityScore.statusColor }]}>
                <View style={[styles.statusDot, { backgroundColor: vitalityScore.statusColor }]} />
                <Text style={[styles.statusBadgeText, { color: vitalityScore.statusColor }]}>
                  {vitalityScore.statusLabel}
                </Text>
              </View>
              <Text style={styles.buffDescriptionText}>{vitalityScore.buffDescription}</Text>
              <Text style={styles.vitalitySubtext}>
                Consolidated bio-intelligence from 7 clinical systems.
              </Text>
            </View>
          </View>

          {/* 5 Micro Score Breakdown Chips */}
          <View style={styles.scorePillsRow}>
            <View style={styles.scorePill}>
              <Text style={styles.scorePillEmoji}>💧</Text>
              <Text style={styles.scorePillLabel}>Hydro</Text>
              <Text style={styles.scorePillVal}>{vitalityScore.hydration}/20</Text>
            </View>
            <View style={styles.scorePill}>
              <Text style={styles.scorePillEmoji}>⏳</Text>
              <Text style={styles.scorePillLabel}>Fast</Text>
              <Text style={styles.scorePillVal}>{vitalityScore.fasting}/20</Text>
            </View>
            <View style={styles.scorePill}>
              <Text style={styles.scorePillEmoji}>🥩</Text>
              <Text style={styles.scorePillLabel}>Fuel</Text>
              <Text style={styles.scorePillVal}>{vitalityScore.nutrition}/20</Text>
            </View>
            <View style={styles.scorePill}>
              <Text style={styles.scorePillEmoji}>⚖️</Text>
              <Text style={styles.scorePillLabel}>Vitals</Text>
              <Text style={styles.scorePillVal}>{vitalityScore.bodycare}/20</Text>
            </View>
            <View style={styles.scorePill}>
              <Text style={styles.scorePillEmoji}>🌸</Text>
              <Text style={styles.scorePillLabel}>Mind</Text>
              <Text style={styles.scorePillVal}>{vitalityScore.mindfulness}/20</Text>
            </View>
          </View>
        </View>

        {/* ────────── 2. Horizontal Tab Bar ────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBarContainer}
        >
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'cycle' && styles.tabButtonActive]}
            onPress={() => {
              void Haptics.selectionAsync();
              setActiveTab('cycle');
            }}
          >
            <Text style={styles.tabEmoji}>🌸</Text>
            <Text style={[styles.tabButtonText, activeTab === 'cycle' && styles.tabButtonTextActive]}>
              Cycle & Period
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'fasting' && styles.tabButtonActive]}
            onPress={() => {
              void Haptics.selectionAsync();
              setActiveTab('fasting');
            }}
          >
            <Text style={styles.tabEmoji}>⏳</Text>
            <Text style={[styles.tabButtonText, activeTab === 'fasting' && styles.tabButtonTextActive]}>
              Bio-Fasting
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'hydration' && styles.tabButtonActive]}
            onPress={() => {
              void Haptics.selectionAsync();
              setActiveTab('hydration');
            }}
          >
            <Text style={styles.tabEmoji}>💧</Text>
            <Text style={[styles.tabButtonText, activeTab === 'hydration' && styles.tabButtonTextActive]}>
              Hydration
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'nutrition' && styles.tabButtonActive]}
            onPress={() => {
              void Haptics.selectionAsync();
              setActiveTab('nutrition');
            }}
          >
            <Text style={styles.tabEmoji}>🥗</Text>
            <Text style={[styles.tabButtonText, activeTab === 'nutrition' && styles.tabButtonTextActive]}>
              MacroFuel
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'metrics' && styles.tabButtonActive]}
            onPress={() => {
              void Haptics.selectionAsync();
              setActiveTab('metrics');
            }}
          >
            <Text style={styles.tabEmoji}>⚖️</Text>
            <Text style={[styles.tabButtonText, activeTab === 'metrics' && styles.tabButtonTextActive]}>
              Vitals & BMI
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'mind' && styles.tabButtonActive]}
            onPress={() => {
              void Haptics.selectionAsync();
              setActiveTab('mind');
            }}
          >
            <Text style={styles.tabEmoji}>🫁</Text>
            <Text style={[styles.tabButtonText, activeTab === 'mind' && styles.tabButtonTextActive]}>
              Breath & Mind
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* ────────── TAB 1: WOMEN'S HEALTH & CYCLE HUB (Flo/Clue Parity) ────────── */}
        {activeTab === 'cycle' && womensHealth && (
          <View style={styles.tabContentContainer}>
            {/* Phase Hero Card */}
            <View style={[styles.cycleHeroCard, { borderColor: womensHealth.phaseMeta.color }]}>
              <View style={styles.cycleHeroHeader}>
                <View style={styles.cyclePhaseTagRow}>
                  <Text style={styles.cyclePhaseEmoji}>{womensHealth.phaseMeta.emoji}</Text>
                  <View>
                    <Text style={[styles.cyclePhaseTitle, { color: womensHealth.phaseMeta.color }]}>
                      {womensHealth.phaseMeta.name}
                    </Text>
                    <Text style={styles.cyclePhaseDays}>{womensHealth.phaseMeta.tag}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.modePickerTrigger}
                  onPress={() => setShowModeModal(true)}
                >
                  <Text style={styles.modePickerTriggerText}>Mode ⚙️</Text>
                </TouchableOpacity>
              </View>

              {/* Cycle Day Bar */}
              <View style={styles.cycleBarContainer}>
                <View style={styles.cycleBarRow}>
                  <Text style={styles.cycleDayText}>
                    Day <Text style={{ color: '#00E699', fontWeight: 'bold' }}>{womensHealth.currentCycleDay}</Text> of {womensHealth.totalCycleDays}
                  </Text>
                  <Text style={styles.daysToPeriodText}>
                    {womensHealth.daysUntilNextPeriod} days to next period
                  </Text>
                </View>
                <View style={styles.cycleProgressTrack}>
                  <View
                    style={[
                      styles.cycleProgressFill,
                      {
                        width: `${Math.min(100, (womensHealth.currentCycleDay / womensHealth.totalCycleDays) * 100)}%`,
                        backgroundColor: womensHealth.phaseMeta.color,
                      },
                    ]}
                  />
                </View>
              </View>

              {/* Fertility / Conception Badge */}
              <View style={styles.conceptionRow}>
                <View style={[styles.conceptionPill, { borderColor: womensHealth.isFertileWindow ? '#8B5CF6' : '#334155' }]}>
                  <Text style={styles.conceptionPillEmoji}>✨</Text>
                  <Text style={styles.conceptionPillLabel}>
                    Conception Probability:{' '}
                    <Text style={{ color: womensHealth.isFertileWindow ? '#8B5CF6' : '#94A3B8', fontWeight: 'bold' }}>
                      {womensHealth.conceptionProbability.toUpperCase()}
                    </Text>
                  </Text>
                </View>
              </View>

              {/* Neuro-Productivity & Workout Tips */}
              <View style={styles.neuroTipBox}>
                <Text style={styles.neuroTipTitle}>🧠 Neuro-Cognitive Forecast</Text>
                <Text style={styles.neuroTipBody}>{womensHealth.phaseMeta.neuroTip}</Text>
                <Text style={[styles.neuroTipTitle, { marginTop: 8 }]}>🏋️ Training & Nutrition Sync</Text>
                <Text style={styles.neuroTipBody}>{womensHealth.phaseMeta.workoutTip}</Text>
              </View>
            </View>

            {/* Period Quick Action */}
            <View style={styles.actionCard}>
              <Text style={styles.sectionHeaderTitle}>🩸 Period Flow Tracking</Text>
              <View style={styles.periodToggleRow}>
                <TouchableOpacity
                  style={[styles.periodToggleBtn, periodStartActive && styles.periodToggleBtnActive]}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setPeriodStartActive(!periodStartActive);
                  }}
                >
                  <Text style={styles.periodToggleBtnText}>
                    {periodStartActive ? '✓ Period Started Today' : '+ Log Period Start'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Flow Level Selector */}
              <Text style={styles.subSectionTitle}>Flow Volume</Text>
              <View style={styles.flowRow}>
                {FLOW_LEVELS.map((f) => (
                  <TouchableOpacity
                    key={f.id}
                    style={[
                      styles.flowChip,
                      selectedFlow === f.id && { borderColor: f.color, backgroundColor: '#1E293B' },
                    ]}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      setSelectedFlow(f.id);
                    }}
                  >
                    <Text style={styles.flowChipEmoji}>{f.emoji}</Text>
                    <Text style={[styles.flowChipText, selectedFlow === f.id && { color: f.color, fontWeight: 'bold' }]}>
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Symptoms Matrix (14 Chips) */}
            <View style={styles.actionCard}>
              <Text style={styles.sectionHeaderTitle}>⚡ Daily Symptoms ({selectedSymptoms.length})</Text>
              <View style={styles.chipsWrap}>
                {CYCLE_SYMPTOMS.map((s) => {
                  const isSelected = selectedSymptoms.includes(s.id);
                  return (
                    <TouchableOpacity
                      key={s.id}
                      style={[styles.symptomChip, isSelected && styles.symptomChipActive]}
                      onPress={() => handleToggleSymptom(s.id)}
                    >
                      <Text style={styles.chipEmoji}>{s.emoji}</Text>
                      <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                        {s.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Mood Matrix (8 Chips) */}
            <View style={styles.actionCard}>
              <Text style={styles.sectionHeaderTitle}>🧘 Mind & Emotional State ({selectedMoods.length})</Text>
              <View style={styles.chipsWrap}>
                {CYCLE_MOODS.map((m) => {
                  const isSelected = selectedMoods.includes(m.id);
                  return (
                    <TouchableOpacity
                      key={m.id}
                      style={[styles.moodChip, isSelected && { borderColor: m.color, backgroundColor: '#1E293B' }]}
                      onPress={() => handleToggleMood(m.id)}
                    >
                      <Text style={styles.chipEmoji}>{m.emoji}</Text>
                      <Text style={[styles.chipText, isSelected && { color: m.color, fontWeight: 'bold' }]}>
                        {m.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Vitals: BBT & Cervical Mucus */}
            <View style={styles.actionCard}>
              <Text style={styles.sectionHeaderTitle}>🌡️ Basal Body Temp & Mucus</Text>
              <View style={styles.bbtRow}>
                <View style={styles.bbtInputWrapper}>
                  <Text style={styles.inputFieldLabel}>BBT (°C)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={bbtInput}
                    onChangeText={setBbtInput}
                    keyboardType="numeric"
                    placeholder="36.6"
                    placeholderTextColor="#64748B"
                  />
                </View>
                <View style={styles.mucusInputWrapper}>
                  <Text style={styles.inputFieldLabel}>Cervical Mucus</Text>
                  <View style={styles.mucusChipsRow}>
                    {(['dry', 'sticky', 'creamy', 'egg_white'] as CervicalMucus[]).map((muc) => (
                      <TouchableOpacity
                        key={muc}
                        style={[styles.mucusChip, selectedMucus === muc && styles.mucusChipActive]}
                        onPress={() => {
                          void Haptics.selectionAsync();
                          setSelectedMucus(muc);
                        }}
                      >
                        <Text style={[styles.mucusChipText, selectedMucus === muc && styles.mucusChipTextActive]}>
                          {muc.replace('_', ' ')}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <TouchableOpacity style={styles.saveCheckinButton} onPress={handleSaveCycleLog}>
                <Text style={styles.saveCheckinButtonText}>Save Cycle & Vitality Log (+30 Coins)</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ────────── TAB 2: INTERMITTENT FASTING (Zero Parity) ────────── */}
        {activeTab === 'fasting' && (
          <View style={styles.tabContentContainer}>
            <View style={styles.fastingHeroCard}>
              <View style={styles.fastingTopRow}>
                <Text style={styles.fastingStageEmoji}>{fastingBioStage.emoji}</Text>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.fastingStageTitle, { color: fastingBioStage.color }]}>
                    {fastingBioStage.name}
                  </Text>
                  <Text style={styles.fastingStageDesc}>{fastingBioStage.description}</Text>
                </View>
              </View>

              {/* Fasting Ring / Timer Display */}
              <View style={styles.fastingTimerDisplay}>
                <Text style={styles.fastingElapsedBig}>
                  {summary.fastingElapsedHours.toFixed(1)} <Text style={{ fontSize: 20, color: '#94A3B8' }}>hrs</Text>
                </Text>
                <Text style={styles.fastingTargetSub}>
                  {activeFast ? `Target: ${activeFast.targetHours}h (${activeFast.protocol})` : 'No Active Fast'}
                </Text>
              </View>

              {/* Fast Action Buttons */}
              <View style={styles.fastActionsRow}>
                {activeFast ? (
                  <TouchableOpacity style={styles.endFastBtn} onPress={handleEndFast}>
                    <Text style={styles.endFastBtnText}>Complete Fast & Claim Loot</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.startFastBtn} onPress={() => setShowFastModal(true)}>
                    <Text style={styles.startFastBtnText}>+ Start Intermittent Fast</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Fasting Bio-Zones Reference */}
            <View style={styles.actionCard}>
              <Text style={styles.sectionHeaderTitle}>🧬 Biological Autophagy Stages</Text>
              <View style={styles.bioStageList}>
                <View style={styles.bioStageItem}>
                  <Text style={styles.bioStageEmoji}>🍽️</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bioStageName}>0 - 4h: Digestion & Anabolic</Text>
                    <Text style={styles.bioStageSub}>Insulin elevated, breaking down nutrients</Text>
                  </View>
                </View>
                <View style={styles.bioStageItem}>
                  <Text style={styles.bioStageEmoji}>📉</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bioStageName}>4 - 8h: Insulin Fall</Text>
                    <Text style={styles.bioStageSub}>Blood sugar normalizes, glucagon released</Text>
                  </View>
                </View>
                <View style={styles.bioStageItem}>
                  <Text style={styles.bioStageEmoji}>🔥</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bioStageName}>8 - 12h: Fat Oxidation</Text>
                    <Text style={styles.bioStageSub}>Glycogen tapped out, burning fat for fuel</Text>
                  </View>
                </View>
                <View style={styles.bioStageItem}>
                  <Text style={styles.bioStageEmoji}>⚡</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bioStageName}>12 - 16h: Ketosis Zone</Text>
                    <Text style={styles.bioStageSub}>High ketone production & cognitive focus</Text>
                  </View>
                </View>
                <View style={styles.bioStageItem}>
                  <Text style={styles.bioStageEmoji}>🧬</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bioStageName}>16 - 24h: Cellular Autophagy</Text>
                    <Text style={styles.bioStageSub}>Damaged cells recycled, anti-aging peak</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ────────── TAB 3: HYDRATION & MULTI-FLUIDS (Waterllama Parity) ────────── */}
        {activeTab === 'hydration' && (
          <View style={styles.tabContentContainer}>
            <View style={styles.hydrationHeroCard}>
              <View style={styles.hydrationHeaderRow}>
                <View>
                  <Text style={styles.hydrationTitle}>Fluid Intake Matrix</Text>
                  <Text style={styles.hydrationSubtitle}>
                    {summary.waterTotalMl} / {summary.waterTargetMl} ml ({summary.waterPercentage}%)
                  </Text>
                </View>
                <Ionicons name="water" size={36} color="#38BDF8" />
              </View>

              {/* Water Progress Track */}
              <View style={styles.waterTrack}>
                <View
                  style={[
                    styles.waterFill,
                    { width: `${Math.min(100, summary.waterPercentage)}%` },
                  ]}
                />
              </View>

              {/* Fluid Type Selector */}
              <Text style={styles.subSectionTitle}>Select Fluid Beverage</Text>
              <View style={styles.fluidTypeRow}>
                {(Object.keys(FLUID_TYPES) as FluidType[]).map((f) => {
                  const meta = FLUID_TYPES[f];
                  const isSelected = selectedFluid === f;
                  return (
                    <TouchableOpacity
                      key={f}
                      style={[styles.fluidChip, isSelected && { borderColor: meta.color, backgroundColor: '#1E293B' }]}
                      onPress={() => {
                        void Haptics.selectionAsync();
                        setSelectedFluid(f);
                      }}
                    >
                      <Text style={styles.fluidChipEmoji}>{meta.emoji}</Text>
                      <Text style={[styles.fluidChipText, isSelected && { color: meta.color, fontWeight: 'bold' }]}>
                        {meta.label} ({meta.multiplier}x)
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Quick Tap Increment Buttons */}
              <Text style={[styles.subSectionTitle, { marginTop: 14 }]}>Quick Add Intake</Text>
              <View style={styles.quickWaterRow}>
                <TouchableOpacity style={styles.quickWaterBtn} onPress={() => handleAddWater(250)}>
                  <Text style={styles.quickWaterBtnText}>+250ml Glass</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickWaterBtn} onPress={() => handleAddWater(500)}>
                  <Text style={styles.quickWaterBtnText}>+500ml Bottle</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickWaterBtn} onPress={() => handleAddWater(750)}>
                  <Text style={styles.quickWaterBtnText}>+750ml Flask</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* ────────── TAB 4: NUTRITION & MACROS (MyFitnessPal Parity) ────────── */}
        {activeTab === 'nutrition' && (
          <View style={styles.tabContentContainer}>
            <View style={styles.macroHeroCard}>
              <View style={styles.macroHeaderRow}>
                <View>
                  <Text style={styles.macroTitle}>MacroFueling Matrix</Text>
                  <Text style={styles.macroSubtitle}>
                    {summary.totalCalories} / {summary.calorieGoal} kcal
                  </Text>
                </View>
                <TouchableOpacity style={styles.addMealTrigger} onPress={() => setShowMealModal(true)}>
                  <Text style={styles.addMealTriggerText}>+ Log Meal</Text>
                </TouchableOpacity>
              </View>

              {/* 3 Macro Bars */}
              <View style={styles.macroBarsContainer}>
                {/* Protein */}
                <View style={styles.macroBarItem}>
                  <View style={styles.macroBarLabelRow}>
                    <Text style={styles.macroLabel}>🥩 Protein</Text>
                    <Text style={styles.macroValue}>{summary.totalProtein} / {summary.proteinGoal}g</Text>
                  </View>
                  <View style={styles.macroTrack}>
                    <View
                      style={[
                        styles.macroFill,
                        {
                          width: `${Math.min(100, (summary.totalProtein / (summary.proteinGoal || 1)) * 100)}%`,
                          backgroundColor: '#EF4444',
                        },
                      ]}
                    />
                  </View>
                </View>

                {/* Carbs */}
                <View style={styles.macroBarItem}>
                  <View style={styles.macroBarLabelRow}>
                    <Text style={styles.macroLabel}>🍞 Carbohydrates</Text>
                    <Text style={styles.macroValue}>{summary.totalCarbs}g</Text>
                  </View>
                  <View style={styles.macroTrack}>
                    <View
                      style={[
                        styles.macroFill,
                        {
                          width: `${Math.min(100, (summary.totalCarbs / 220) * 100)}%`,
                          backgroundColor: '#F59E0B',
                        },
                      ]}
                    />
                  </View>
                </View>

                {/* Fats */}
                <View style={styles.macroBarItem}>
                  <View style={styles.macroBarLabelRow}>
                    <Text style={styles.macroLabel}>🥑 Healthy Fats</Text>
                    <Text style={styles.macroValue}>{summary.totalFats}g</Text>
                  </View>
                  <View style={styles.macroTrack}>
                    <View
                      style={[
                        styles.macroFill,
                        {
                          width: `${Math.min(100, (summary.totalFats / 70) * 100)}%`,
                          backgroundColor: '#10B981',
                        },
                      ]}
                    />
                  </View>
                </View>
              </View>
            </View>

            {/* Today's Meals List */}
            <View style={styles.actionCard}>
              <Text style={styles.sectionHeaderTitle}>🍽️ Today’s Logged Fuel ({summary.meals.length})</Text>
              {summary.meals.length === 0 ? (
                <Text style={styles.emptyNoticeText}>No meals logged today. Tap “+ Log Meal” to track your macros!</Text>
              ) : (
                summary.meals.map((m) => (
                  <View key={m.mealId} style={styles.mealRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.mealNameText}>{m.name}</Text>
                      <Text style={styles.mealMacroDetails}>
                        {m.calories} kcal • {m.protein}g P • {m.carbs}g C • {m.fats}g F
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => handleDeleteMeal(m.mealId)}>
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        {/* ────────── TAB 5: VITALS & COMPOSITION (Withings Parity) ────────── */}
        {activeTab === 'metrics' && (
          <View style={styles.tabContentContainer}>
            <View style={styles.vitalsHeroCard}>
              <View style={styles.vitalsHeaderRow}>
                <View>
                  <Text style={styles.vitalsTitle}>Anthropometric Lab</Text>
                  <Text style={styles.vitalsSubtitle}>
                    Latest Weight: <Text style={{ color: '#00E699', fontWeight: 'bold' }}>{summary.latestMetric?.weightKg || 58} kg</Text>
                  </Text>
                </View>
                <TouchableOpacity style={styles.logVitalsTrigger} onPress={() => setShowMetricModal(true)}>
                  <Text style={styles.logVitalsTriggerText}>+ Log Vitals</Text>
                </TouchableOpacity>
              </View>

              {/* BMI & WHtR Badges */}
              <View style={styles.vitalsBadgesRow}>
                <View style={styles.vitalBadgePill}>
                  <Text style={styles.vitalBadgeLabel}>WHO BMI Index</Text>
                  <Text style={styles.vitalBadgeValue}>
                    {summary.latestMetric?.bmi || 21.3} <Text style={{ fontSize: 11, color: '#10B981' }}>(Normal)</Text>
                  </Text>
                </View>
                <View style={styles.vitalBadgePill}>
                  <Text style={styles.vitalBadgeLabel}>Waist-to-Height (WHtR)</Text>
                  <Text style={styles.vitalBadgeValue}>
                    {summary.latestMetric?.whtr || 0.41} <Text style={{ fontSize: 11, color: '#10B981' }}>(Optimal &lt; 0.5)</Text>
                  </Text>
                </View>
              </View>

              {/* Circumferences */}
              <View style={styles.circumferenceGrid}>
                <View style={styles.circItem}>
                  <Text style={styles.circLabel}>Waist</Text>
                  <Text style={styles.circVal}>{summary.latestMetric?.waistCm || 68} cm</Text>
                </View>
                <View style={styles.circItem}>
                  <Text style={styles.circLabel}>Hips</Text>
                  <Text style={styles.circVal}>{summary.latestMetric?.hipsCm || 92} cm</Text>
                </View>
                <View style={styles.circItem}>
                  <Text style={styles.circLabel}>Chest</Text>
                  <Text style={styles.circVal}>{summary.latestMetric?.chestCm || 86} cm</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ────────── TAB 6: BREATHWORK & NERVOUS SYSTEM (Calm Parity) ────────── */}
        {activeTab === 'mind' && (
          <View style={styles.tabContentContainer}>
            {/* Daily Mood Checkin */}
            <View style={styles.actionCard}>
              <Text style={styles.sectionHeaderTitle}>🧘 Daily Nervous System Mood</Text>
              <View style={styles.moodsRow}>
                {(Object.keys(MOOD_RATING_META) as MoodRating[]).map((m) => {
                  const meta = MOOD_RATING_META[m];
                  const isSelected = selectedMood === m;
                  return (
                    <TouchableOpacity
                      key={m}
                      style={[styles.moodRatingBtn, isSelected && { borderColor: meta.color, backgroundColor: '#1E293B' }]}
                      onPress={() => handleSaveMentalCheckin(m)}
                    >
                      <Text style={styles.moodRatingEmoji}>{meta.emoji}</Text>
                      <Text style={[styles.moodRatingText, isSelected && { color: meta.color, fontWeight: 'bold' }]}>
                        {meta.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Interactive Breathwork Pacer */}
            <View style={styles.breathworkHeroCard}>
              <Text style={styles.breathworkTitle}>🫁 Clinical Breathwork Pacer</Text>
              <Text style={styles.breathworkSubtitle}>
                {BREATHING_PATTERNS[breathPattern].name}
              </Text>

              {/* Pattern Selector */}
              <View style={styles.breathPatternRow}>
                {(['box', 'relax', 'resonance'] as BreathingPattern[]).map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.breathPatternChip, breathPattern === p && styles.breathPatternChipActive]}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      setBreathPattern(p);
                    }}
                  >
                    <Text style={[styles.breathPatternChipText, breathPattern === p && styles.breathPatternChipTextActive]}>
                      {p.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Animated Breath Sphere */}
              <View style={styles.sphereContainer}>
                <Animated.View
                  style={[
                    styles.breathSphere,
                    {
                      borderColor: BREATHING_PATTERNS[breathPattern].color,
                      transform: [{ scale: breathAnim }],
                    },
                  ]}
                >
                  <Text style={[styles.breathPhaseText, { color: BREATHING_PATTERNS[breathPattern].color }]}>
                    {breathPhase}
                  </Text>
                </Animated.View>
              </View>

              <TouchableOpacity
                style={[styles.breathActionBtn, isBreathingActive && styles.breathActionBtnActive]}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                  setIsBreathingActive(!isBreathingActive);
                }}
              >
                <Text style={styles.breathActionBtnText}>
                  {isBreathingActive ? 'Stop Breath Session' : 'Begin Breathing Cadence'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* ────────── MODAL 1: WOMEN'S HEALTH MODE ────────── */}
      <Modal visible={showModeModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Select Life Stage Mode</Text>
              <TouchableOpacity onPress={() => setShowModeModal(false)}>
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
            {HEALTH_MODES.map((mode) => (
              <TouchableOpacity
                key={mode.id}
                style={[
                  styles.modeOptionBtn,
                  womensHealth?.phaseMeta && styles.modeOptionBtnActive,
                ]}
                onPress={() => handleSelectMode(mode.id)}
              >
                <Text style={styles.modeOptionEmoji}>{mode.emoji}</Text>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.modeOptionLabel}>{mode.label}</Text>
                  <Text style={styles.modeOptionDesc}>{mode.desc}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* ────────── MODAL 2: FASTING PROTOCOL ────────── */}
      <Modal visible={showFastModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Choose Fasting Protocol</Text>
              <TouchableOpacity onPress={() => setShowFastModal(false)}>
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
            {(Object.keys(FASTING_PROTOCOLS) as FastingProtocol[]).map((p) => {
              const proto = FASTING_PROTOCOLS[p];
              return (
                <TouchableOpacity
                  key={p}
                  style={[styles.protoOptionBtn, selectedProtocol === p && styles.protoOptionBtnActive]}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    setSelectedProtocol(p);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.protoOptionTitle}>{proto.label}</Text>
                    <Text style={styles.protoOptionDesc}>{proto.description}</Text>
                  </View>
                  <Text style={styles.protoOptionHours}>{proto.fastHours}h</Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={styles.confirmModalBtn} onPress={handleStartFast}>
              <Text style={styles.confirmModalBtnText}>Start Fasting Session</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ────────── MODAL 3: ADD MEAL ────────── */}
      <Modal visible={showMealModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Log Nutritional Fuel</Text>
              <TouchableOpacity onPress={() => setShowMealModal(false)}>
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.textInput}
              placeholder="Meal Name (e.g. Grilled Chicken & Quinoa)"
              placeholderTextColor="#64748B"
              value={mealName}
              onChangeText={setMealName}
            />

            <View style={styles.modalInputGrid}>
              <View style={styles.gridField}>
                <Text style={styles.inputFieldLabel}>Calories (kcal)</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  value={mealCalories}
                  onChangeText={setMealCalories}
                />
              </View>
              <View style={styles.gridField}>
                <Text style={styles.inputFieldLabel}>Protein (g)</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  value={mealProtein}
                  onChangeText={setMealProtein}
                />
              </View>
            </View>

            <View style={styles.modalInputGrid}>
              <View style={styles.gridField}>
                <Text style={styles.inputFieldLabel}>Carbs (g)</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  value={mealCarbs}
                  onChangeText={setMealCarbs}
                />
              </View>
              <View style={styles.gridField}>
                <Text style={styles.inputFieldLabel}>Fats (g)</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  value={mealFats}
                  onChangeText={setMealFats}
                />
              </View>
            </View>

            <TouchableOpacity style={styles.confirmModalBtn} onPress={handleAddMeal}>
              <Text style={styles.confirmModalBtnText}>Log Meal & Update Fuel (+40 Coins)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ────────── MODAL 4: LOG VITALS ────────── */}
      <Modal visible={showMetricModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Log Anthropometrics</Text>
              <TouchableOpacity onPress={() => setShowMetricModal(false)}>
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalInputGrid}>
              <View style={styles.gridField}>
                <Text style={styles.inputFieldLabel}>Weight (kg)</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  value={metricWeight}
                  onChangeText={setMetricWeight}
                />
              </View>
              <View style={styles.gridField}>
                <Text style={styles.inputFieldLabel}>Height (cm)</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  value={metricHeight}
                  onChangeText={setMetricHeight}
                />
              </View>
            </View>

            <View style={styles.modalInputGrid}>
              <View style={styles.gridField}>
                <Text style={styles.inputFieldLabel}>Waist (cm)</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  value={metricWaist}
                  onChangeText={setMetricWaist}
                />
              </View>
              <View style={styles.gridField}>
                <Text style={styles.inputFieldLabel}>Chest (cm)</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  value={metricChest}
                  onChangeText={setMetricChest}
                />
              </View>
              <View style={styles.gridField}>
                <Text style={styles.inputFieldLabel}>Hips (cm)</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  value={metricHips}
                  onChangeText={setMetricHips}
                />
              </View>
            </View>

            <TouchableOpacity style={styles.confirmModalBtn} onPress={handleLogMetric}>
              <Text style={styles.confirmModalBtnText}>Save Anthropometrics</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#070A11',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#00E699',
    fontSize: 16,
    fontFamily: 'monospace',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#1E293B',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0F1829',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  headerSubtitle: {
    color: '#00E699',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0F1829',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  // Vitality Hero Card
  vitalityHeroCard: {
    backgroundColor: '#0F1829',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 16,
  },
  vitalityTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  vitalityScoreRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#070A11',
    borderWidth: 3,
    borderColor: '#00E699',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vitalityScoreNumber: {
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 30,
  },
  vitalityScoreMax: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '700',
  },
  vitalityHeroInfo: {
    flex: 1,
    marginLeft: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  buffDescriptionText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  vitalitySubtext: {
    color: '#94A3B8',
    fontSize: 11,
  },
  scorePillsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: '#1E293B',
  },
  scorePill: {
    alignItems: 'center',
    flex: 1,
  },
  scorePillEmoji: {
    fontSize: 16,
    marginBottom: 2,
  },
  scorePillLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '600',
  },
  scorePillVal: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
  },

  // Tab Bar
  tabBarContainer: {
    paddingBottom: 14,
    gap: 8,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: '#0F1829',
    borderWidth: 1,
    borderColor: '#1E293B',
    marginRight: 8,
  },
  tabButtonActive: {
    borderColor: '#00E699',
    backgroundColor: 'rgba(0, 230, 153, 0.1)',
  },
  tabEmoji: {
    fontSize: 15,
    marginRight: 6,
  },
  tabButtonText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '700',
  },
  tabButtonTextActive: {
    color: '#00E699',
  },

  // Tab Content
  tabContentContainer: {
    gap: 14,
  },

  // Cycle Hub
  cycleHeroCard: {
    backgroundColor: '#0F1829',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
  },
  cycleHeroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cyclePhaseTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cyclePhaseEmoji: {
    fontSize: 30,
    marginRight: 10,
  },
  cyclePhaseTitle: {
    fontSize: 17,
    fontWeight: '900',
  },
  cyclePhaseDays: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  modePickerTrigger: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: '#1E293B',
  },
  modePickerTriggerText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  cycleBarContainer: {
    marginBottom: 12,
  },
  cycleBarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cycleDayText: {
    color: '#FFF',
    fontSize: 12,
  },
  daysToPeriodText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  cycleProgressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1E293B',
    overflow: 'hidden',
  },
  cycleProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  conceptionRow: {
    marginBottom: 12,
  },
  conceptionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: '#070A11',
  },
  conceptionPillEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  conceptionPillLabel: {
    color: '#94A3B8',
    fontSize: 11,
  },
  neuroTipBox: {
    backgroundColor: '#070A11',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  neuroTipTitle: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 2,
  },
  neuroTipBody: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 16,
  },

  // Action Cards
  actionCard: {
    backgroundColor: '#0F1829',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  sectionHeaderTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 10,
  },
  subSectionTitle: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  periodToggleRow: {
    marginBottom: 12,
  },
  periodToggleBtn: {
    backgroundColor: '#1E293B',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  periodToggleBtnActive: {
    backgroundColor: 'rgba(244, 63, 94, 0.2)',
    borderColor: '#F43F5E',
  },
  periodToggleBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  flowRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  flowChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#070A11',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  flowChipEmoji: {
    fontSize: 14,
    marginBottom: 2,
  },
  flowChipText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '600',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  symptomChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#070A11',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  symptomChipActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#EF4444',
  },
  moodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#070A11',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  chipEmoji: {
    fontSize: 13,
    marginRight: 6,
  },
  chipText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#EF4444',
    fontWeight: '800',
  },
  bbtRow: {
    gap: 12,
    marginBottom: 14,
  },
  bbtInputWrapper: {
    flex: 1,
  },
  mucusInputWrapper: {
    flex: 1,
  },
  inputFieldLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: '#070A11',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
    color: '#FFF',
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  mucusChipsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  mucusChip: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#070A11',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  mucusChipActive: {
    borderColor: '#8B5CF6',
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  mucusChipText: {
    color: '#94A3B8',
    fontSize: 10,
  },
  mucusChipTextActive: {
    color: '#8B5CF6',
    fontWeight: '700',
  },
  saveCheckinButton: {
    backgroundColor: '#00E699',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  saveCheckinButtonText: {
    color: '#070A11',
    fontSize: 13,
    fontWeight: '900',
  },

  // Fasting Card
  fastingHeroCard: {
    backgroundColor: '#0F1829',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  fastingTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  fastingStageEmoji: {
    fontSize: 34,
  },
  fastingStageTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  fastingStageDesc: {
    color: '#94A3B8',
    fontSize: 11,
  },
  fastingTimerDisplay: {
    alignItems: 'center',
    marginVertical: 14,
  },
  fastingElapsedBig: {
    color: '#FFF',
    fontSize: 42,
    fontWeight: '900',
  },
  fastingTargetSub: {
    color: '#00E699',
    fontSize: 12,
    fontWeight: '700',
  },
  fastActionsRow: {
    marginTop: 8,
  },
  startFastBtn: {
    backgroundColor: '#00E699',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  startFastBtnText: {
    color: '#070A11',
    fontSize: 13,
    fontWeight: '900',
  },
  endFastBtn: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  endFastBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '900',
  },
  bioStageList: {
    gap: 10,
  },
  bioStageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#070A11',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  bioStageEmoji: {
    fontSize: 20,
    marginRight: 10,
  },
  bioStageName: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  bioStageSub: {
    color: '#64748B',
    fontSize: 10,
  },

  // Hydration Card
  hydrationHeroCard: {
    backgroundColor: '#0F1829',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  hydrationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  hydrationTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '900',
  },
  hydrationSubtitle: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
  },
  waterTrack: {
    height: 12,
    borderRadius: 6,
    backgroundColor: '#070A11',
    overflow: 'hidden',
    marginBottom: 16,
  },
  waterFill: {
    height: '100%',
    backgroundColor: '#38BDF8',
    borderRadius: 6,
  },
  fluidTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  fluidChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#070A11',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  fluidChipEmoji: {
    fontSize: 13,
    marginRight: 4,
  },
  fluidChipText: {
    color: '#94A3B8',
    fontSize: 11,
  },
  quickWaterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  quickWaterBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#070A11',
    borderWidth: 1,
    borderColor: '#38BDF8',
    alignItems: 'center',
  },
  quickWaterBtnText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
  },

  // Macro Card
  macroHeroCard: {
    backgroundColor: '#0F1829',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  macroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  macroTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '900',
  },
  macroSubtitle: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '700',
  },
  addMealTrigger: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#00E699',
  },
  addMealTriggerText: {
    color: '#070A11',
    fontSize: 11,
    fontWeight: '900',
  },
  macroBarsContainer: {
    gap: 10,
  },
  macroBarItem: {},
  macroBarLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  macroLabel: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
  },
  macroValue: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
  },
  macroTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#070A11',
    overflow: 'hidden',
  },
  macroFill: {
    height: '100%',
    borderRadius: 4,
  },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#1E293B',
  },
  mealNameText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  mealMacroDetails: {
    color: '#94A3B8',
    fontSize: 11,
  },
  emptyNoticeText: {
    color: '#64748B',
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 12,
  },

  // Vitals Card
  vitalsHeroCard: {
    backgroundColor: '#0F1829',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  vitalsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  vitalsTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '900',
  },
  vitalsSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
  },
  logVitalsTrigger: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#00E699',
  },
  logVitalsTriggerText: {
    color: '#070A11',
    fontSize: 11,
    fontWeight: '900',
  },
  vitalsBadgesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  vitalBadgePill: {
    flex: 1,
    backgroundColor: '#070A11',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  vitalBadgeLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 2,
  },
  vitalBadgeValue: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
  circumferenceGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: '#1E293B',
  },
  circItem: {
    alignItems: 'center',
    flex: 1,
  },
  circLabel: {
    color: '#64748B',
    fontSize: 10,
  },
  circVal: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // Breathwork & Mind
  moodsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  moodRatingBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#070A11',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  moodRatingEmoji: {
    fontSize: 18,
    marginBottom: 2,
  },
  moodRatingText: {
    color: '#94A3B8',
    fontSize: 9,
    fontWeight: '600',
  },
  breathworkHeroCard: {
    backgroundColor: '#0F1829',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    alignItems: 'center',
  },
  breathworkTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '900',
  },
  breathworkSubtitle: {
    color: '#00E699',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 12,
  },
  breathPatternRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  breathPatternChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#070A11',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  breathPatternChipActive: {
    borderColor: '#00E699',
    backgroundColor: 'rgba(0, 230, 153, 0.15)',
  },
  breathPatternChipText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
  },
  breathPatternChipTextActive: {
    color: '#00E699',
  },
  sphereContainer: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  breathSphere: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    backgroundColor: 'rgba(0, 230, 153, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  breathPhaseText: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  breathActionBtn: {
    width: '100%',
    backgroundColor: '#00E699',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  breathActionBtnActive: {
    backgroundColor: '#EF4444',
  },
  breathActionBtnText: {
    color: '#070A11',
    fontSize: 13,
    fontWeight: '900',
  },

  // Modals
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#0F1829',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
    gap: 12,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '900',
  },
  modeOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#070A11',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  modeOptionBtnActive: {
    borderColor: '#00E699',
  },
  modeOptionEmoji: {
    fontSize: 22,
  },
  modeOptionLabel: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  modeOptionDesc: {
    color: '#64748B',
    fontSize: 11,
  },
  protoOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#070A11',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  protoOptionBtnActive: {
    borderColor: '#00E699',
  },
  protoOptionTitle: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  protoOptionDesc: {
    color: '#64748B',
    fontSize: 11,
  },
  protoOptionHours: {
    color: '#00E699',
    fontSize: 13,
    fontWeight: '900',
  },
  modalInputGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  gridField: {
    flex: 1,
  },
  confirmModalBtn: {
    backgroundColor: '#00E699',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  confirmModalBtnText: {
    color: '#070A11',
    fontSize: 13,
    fontWeight: '900',
  },
});
