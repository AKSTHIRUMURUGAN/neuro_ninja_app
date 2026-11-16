import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { neuroHealthEngine } from '../../../services/health/neurohealth-engine';
import type {
  MoodRating,
  MentalWellnessScores,
  BreathingPattern,
} from '../../../services/health/health-types';
import {
  MOOD_RATING_META,
  QUICK_MOOD_TAGS,
  BREATHING_PATTERNS,
} from '../../../services/health/health-types';

type HealthTab = 'checkin' | 'breathwork' | 'meditation';

export default function NeuroHealthScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<HealthTab>('checkin');

  // Daily Check-in state
  const [selectedMood, setSelectedMood] = useState<MoodRating>('good');
  const [selectedTags, setSelectedTags] = useState<string[]>(['Deep Focus', 'Calm Mind']);
  const [wellnessScores, setWellnessScores] = useState<MentalWellnessScores>({
    stress: 3,
    anxiety: 2,
    energy: 8,
    motivation: 8,
    focus: 9,
    happiness: 8,
  });
  const [gratitude1, setGratitude1] = useState('');
  const [gratitude2, setGratitude2] = useState('');
  const [gratitude3, setGratitude3] = useState('');
  const [journalText, setJournalText] = useState('');

  // Breathwork State
  const [selectedPattern, setSelectedPattern] = useState<BreathingPattern>('box');
  const [breathActive, setBreathActive] = useState(false);
  const [breathPhase, setBreathPhase] = useState<'Inhale' | 'Hold' | 'Exhale' | 'Rest'>('Inhale');
  const [phaseSecondsLeft, setPhaseSecondsLeft] = useState(4);
  const [completedCycles, setCompletedCycles] = useState(0);

  // Meditation State
  const [meditationDuration, setMeditationDuration] = useState(300); // 5 min
  const [meditationRemaining, setMeditationRemaining] = useState(300);
  const [meditationActive, setMeditationActive] = useState(false);

  // Animation values for breathing circle
  const [scaleAnim] = useState(() => new Animated.Value(1));

  const loadData = useCallback(async () => {
    try {
      const log = await neuroHealthEngine.getTodayLog();
      if (log) {
        setSelectedMood(log.mood);
        setWellnessScores(log.wellnessScores);
        setSelectedTags(log.tags);
        if (log.gratitudeList.length >= 1) setGratitude1(log.gratitudeList[0]);
        if (log.gratitudeList.length >= 2) setGratitude2(log.gratitudeList[1]);
        if (log.gratitudeList.length >= 3) setGratitude3(log.gratitudeList[2]);
        if (log.journalText) setJournalText(log.journalText);
      }
    } catch (e) {
      console.warn('[NeuroHealthScreen] load error:', e);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadData]);

  // Guided Breathwork Pacer Effect
  useEffect(() => {
    let timer: any = null;
    const config = BREATHING_PATTERNS[selectedPattern];

    if (breathActive) {
      timer = setInterval(() => {
        setPhaseSecondsLeft((prev) => {
          if (prev > 1) return prev - 1;

          // Transition to next phase
          if (breathPhase === 'Inhale') {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (config.holdIn > 0) {
              setBreathPhase('Hold');
              return config.holdIn;
            } else {
              setBreathPhase('Exhale');
              return config.exhale;
            }
          } else if (breathPhase === 'Hold') {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setBreathPhase('Exhale');
            return config.exhale;
          } else if (breathPhase === 'Exhale') {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (config.holdOut > 0) {
              setBreathPhase('Rest');
              return config.holdOut;
            } else {
              setBreathPhase('Inhale');
              setCompletedCycles((c) => c + 1);
              return config.inhale;
            }
          } else {
            // Rest -> Inhale
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            setBreathPhase('Inhale');
            setCompletedCycles((c) => c + 1);
            return config.inhale;
          }
        });
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [breathActive, breathPhase, selectedPattern]);

  // Breathing Visual Scale Animation
  useEffect(() => {
    if (breathPhase === 'Inhale') {
      Animated.timing(scaleAnim, {
        toValue: 1.45,
        duration: BREATHING_PATTERNS[selectedPattern].inhale * 1000,
        useNativeDriver: true,
      }).start();
    } else if (breathPhase === 'Exhale') {
      Animated.timing(scaleAnim, {
        toValue: 1.0,
        duration: BREATHING_PATTERNS[selectedPattern].exhale * 1000,
        useNativeDriver: true,
      }).start();
    }
  }, [breathPhase, selectedPattern, scaleAnim]);

  // Meditation Timer Effect
  useEffect(() => {
    let timer: any = null;
    if (meditationActive && meditationRemaining > 0) {
      timer = setInterval(() => {
        setMeditationRemaining((prev) => {
          if (prev <= 1) {
            setMeditationActive(false);
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [meditationActive, meditationRemaining]);

  const handleSaveCheckin = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const gratList = [gratitude1, gratitude2, gratitude3].filter((g) => g.trim().length > 0);
    const scoreVal = MOOD_RATING_META[selectedMood]?.score || 4;

    await neuroHealthEngine.saveLog(
      selectedMood,
      scoreVal,
      wellnessScores,
      selectedTags,
      journalText,
      gratList
    );
    await loadData();
  };

  const handleStopBreathwork = async () => {
    setBreathActive(false);
    if (completedCycles >= 3) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await neuroHealthEngine.recordBreathworkSession(
        BREATHING_PATTERNS[selectedPattern].name,
        completedCycles
      );
    }
  };

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.badge}>MIND & NEURO-COGNITIVE OS</Text>
          <Text style={styles.title}>NeuroHealth Mind</Text>
        </View>
        <TouchableOpacity
          style={styles.actionHeaderBtn}
          onPress={() => router.push('/lifeos/body' as any)}
        >
          <MaterialCommunityIcons name="water" size={20} color="#38BDF8" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'checkin' && styles.tabBtnActive]}
          onPress={() => {
            Haptics.selectionAsync();
            setActiveTab('checkin');
          }}
        >
          <Text style={[styles.tabBtnText, activeTab === 'checkin' && styles.tabBtnTextActive]}>
            Check-In
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'breathwork' && styles.tabBtnActive]}
          onPress={() => {
            Haptics.selectionAsync();
            setActiveTab('breathwork');
          }}
        >
          <Text style={[styles.tabBtnText, activeTab === 'breathwork' && styles.tabBtnTextActive]}>
            Breathwork
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'meditation' && styles.tabBtnActive]}
          onPress={() => {
            Haptics.selectionAsync();
            setActiveTab('meditation');
          }}
        >
          <Text style={[styles.tabBtnText, activeTab === 'meditation' && styles.tabBtnTextActive]}>
            Meditation
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {activeTab === 'checkin' && (
          /* Check-In Tab */
          <View style={{ gap: 14 }}>
            {/* Mood Selector */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>How is your nervous system today?</Text>
              <Text style={styles.cardSubtitle}>Select your baseline mental state:</Text>

              <View style={styles.moodRow}>
                {(Object.keys(MOOD_RATING_META) as MoodRating[]).map((mKey) => {
                  const meta = MOOD_RATING_META[mKey];
                  const isSel = selectedMood === mKey;
                  return (
                    <TouchableOpacity
                      key={mKey}
                      style={[styles.moodItem, isSel && styles.moodItemActive]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSelectedMood(mKey);
                      }}
                    >
                      <Text style={styles.moodEmoji}>{meta.emoji}</Text>
                      <Text style={[styles.moodLabel, isSel && styles.moodLabelActive]}>
                        {meta.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 6-Score Mental Wellness Sliders */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Wellness Radar Dimensions</Text>
              <Text style={styles.cardSubtitle}>Rate your levels (1 to 10):</Text>

              <View style={styles.wellnessGrid}>
                {/* Focus */}
                <View style={styles.wellnessRow}>
                  <Text style={styles.wellnessLabel}>Deep Focus</Text>
                  <View style={styles.scoreStepper}>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() =>
                        setWellnessScores({
                          ...wellnessScores,
                          focus: Math.max(1, wellnessScores.focus - 1),
                        })
                      }
                    >
                      <Text style={styles.stepBtnText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.stepValText}>{wellnessScores.focus}/10</Text>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() =>
                        setWellnessScores({
                          ...wellnessScores,
                          focus: Math.min(10, wellnessScores.focus + 1),
                        })
                      }
                    >
                      <Text style={styles.stepBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Energy */}
                <View style={styles.wellnessRow}>
                  <Text style={styles.wellnessLabel}>Vibrant Energy</Text>
                  <View style={styles.scoreStepper}>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() =>
                        setWellnessScores({
                          ...wellnessScores,
                          energy: Math.max(1, wellnessScores.energy - 1),
                        })
                      }
                    >
                      <Text style={styles.stepBtnText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.stepValText}>{wellnessScores.energy}/10</Text>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() =>
                        setWellnessScores({
                          ...wellnessScores,
                          energy: Math.min(10, wellnessScores.energy + 1),
                        })
                      }
                    >
                      <Text style={styles.stepBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Stress */}
                <View style={styles.wellnessRow}>
                  <Text style={styles.wellnessLabel}>Stress Load</Text>
                  <View style={styles.scoreStepper}>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() =>
                        setWellnessScores({
                          ...wellnessScores,
                          stress: Math.max(1, wellnessScores.stress - 1),
                        })
                      }
                    >
                      <Text style={styles.stepBtnText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.stepValText}>{wellnessScores.stress}/10</Text>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() =>
                        setWellnessScores({
                          ...wellnessScores,
                          stress: Math.min(10, wellnessScores.stress + 1),
                        })
                      }
                    >
                      <Text style={styles.stepBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>

            {/* Quick Mood Tags */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Mindset Tags</Text>
              <View style={styles.tagsContainer}>
                {QUICK_MOOD_TAGS.map((tag) => {
                  const isSel = selectedTags.includes(tag);
                  return (
                    <TouchableOpacity
                      key={tag}
                      style={[styles.tagChip, isSel && styles.tagChipActive]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        if (isSel) {
                          setSelectedTags(selectedTags.filter((t) => t !== tag));
                        } else {
                          setSelectedTags([...selectedTags, tag]);
                        }
                      }}
                    >
                      <Text style={[styles.tagChipText, isSel && styles.tagChipTextActive]}>
                        {tag}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Gratitude & Journaling */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>3 Daily Gratitudes</Text>
              <TextInput
                style={styles.gratitudeInput}
                placeholder="1. What energized you today?"
                placeholderTextColor="#64748B"
                value={gratitude1}
                onChangeText={setGratitude1}
              />
              <TextInput
                style={styles.gratitudeInput}
                placeholder="2. What challenged you to grow?"
                placeholderTextColor="#64748B"
                value={gratitude2}
                onChangeText={setGratitude2}
              />
              <TextInput
                style={styles.gratitudeInput}
                placeholder="3. What are you peaceful about?"
                placeholderTextColor="#64748B"
                value={gratitude3}
                onChangeText={setGratitude3}
              />
            </View>

            <TouchableOpacity style={styles.saveCheckinBtn} onPress={handleSaveCheckin}>
              <MaterialCommunityIcons name="check-circle" size={20} color="#070A11" />
              <Text style={styles.saveCheckinBtnText}>Save Mindful Check-in (+25 Coins)</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'breathwork' && (
          /* Breathwork Tab */
          <View style={{ gap: 14, alignItems: 'center' }}>
            {/* Pattern Selector */}
            <View style={styles.patternsRow}>
              {(Object.keys(BREATHING_PATTERNS) as BreathingPattern[]).map((pKey) => {
                const pat = BREATHING_PATTERNS[pKey];
                const isSel = selectedPattern === pKey;
                return (
                  <TouchableOpacity
                    key={pKey}
                    style={[styles.patternChip, isSel && styles.patternChipActive]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedPattern(pKey);
                      setBreathActive(false);
                      setBreathPhase('Inhale');
                      setPhaseSecondsLeft(pat.inhale);
                    }}
                  >
                    <Text style={[styles.patternChipText, isSel && styles.patternChipTextActive]}>
                      {pat.name.split(' (')[0]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Pattern Description */}
            <View style={styles.cardFullWidth}>
              <Text style={styles.patTitle}>
                {BREATHING_PATTERNS[selectedPattern].name}
              </Text>
              <Text style={styles.patDesc}>
                {BREATHING_PATTERNS[selectedPattern].description}
              </Text>
            </View>

            {/* Animated Breathing Circle */}
            <View style={styles.circleOuterContainer}>
              <Animated.View
                style={[
                  styles.breathingCircle,
                  {
                    transform: [{ scale: scaleAnim }],
                    borderColor: BREATHING_PATTERNS[selectedPattern].color,
                  },
                ]}
              >
                <Text style={styles.breathPhaseText}>{breathPhase.toUpperCase()}</Text>
                <Text style={styles.breathSecondsText}>{phaseSecondsLeft}s</Text>
              </Animated.View>
            </View>

            <Text style={styles.cycleCounterText}>
              Completed Cycles: {completedCycles}
            </Text>

            {/* Action Button */}
            {breathActive ? (
              <TouchableOpacity
                style={styles.stopBreathBtn}
                onPress={handleStopBreathwork}
              >
                <MaterialCommunityIcons name="stop" size={20} color="#F8FAFC" />
                <Text style={styles.stopBreathBtnText}>Finish Breathwork (+50 Coins)</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.startBreathBtn}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setBreathActive(true);
                  setBreathPhase('Inhale');
                  setPhaseSecondsLeft(BREATHING_PATTERNS[selectedPattern].inhale);
                }}
              >
                <MaterialCommunityIcons name="play" size={22} color="#070A11" />
                <Text style={styles.startBreathBtnText}>Begin Pacing Protocol</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {activeTab === 'meditation' && (
          /* Meditation Tab */
          <View style={{ gap: 16, alignItems: 'center' }}>
            <View style={styles.cardFullWidth}>
              <Text style={styles.patTitle}>Binaural Meditation Timer</Text>
              <Text style={styles.patDesc}>
                Alpha (10Hz) & Theta (6Hz) waves for deep parasympathetic tone and cognitive restoration.
              </Text>
            </View>

            {/* Duration Pills */}
            <View style={styles.patternsRow}>
              {[300, 600, 900, 1200].map((dur) => (
                <TouchableOpacity
                  key={dur}
                  style={[
                    styles.patternChip,
                    meditationDuration === dur && styles.patternChipActive,
                  ]}
                  onPress={() => {
                    setMeditationDuration(dur);
                    setMeditationRemaining(dur);
                    setMeditationActive(false);
                  }}
                >
                  <Text
                    style={[
                      styles.patternChipText,
                      meditationDuration === dur && styles.patternChipTextActive,
                    ]}
                  >
                    {dur / 60} Min
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Large Clock Display */}
            <View style={styles.meditationClockBox}>
              <Text style={styles.meditationClockText}>
                {formatTimer(meditationRemaining)}
              </Text>
              <Text style={styles.meditationClockSub}>REMAINING TIME</Text>
            </View>

            {meditationActive ? (
              <TouchableOpacity
                style={styles.stopBreathBtn}
                onPress={() => setMeditationActive(false)}
              >
                <MaterialCommunityIcons name="pause" size={20} color="#F8FAFC" />
                <Text style={styles.stopBreathBtnText}>Pause Session</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.startBreathBtn}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setMeditationActive(true);
                }}
              >
                <MaterialCommunityIcons name="play" size={22} color="#070A11" />
                <Text style={styles.startBreathBtnText}>Start Meditation</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
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
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  backBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  badge: { fontSize: 10, fontWeight: '800', color: '#818CF8', letterSpacing: 1 },
  title: { fontSize: 20, fontWeight: '800', color: '#F8FAFC' },
  actionHeaderBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#0F1829',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  tabBtnActive: {
    backgroundColor: 'rgba(129, 140, 248, 0.15)',
    borderColor: '#818CF8',
  },
  tabBtnText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  tabBtnTextActive: { color: '#818CF8' },
  scroll: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: '#0F1829',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  cardFullWidth: {
    width: '100%',
    backgroundColor: '#0F1829',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#F8FAFC' },
  cardSubtitle: { fontSize: 11, color: '#94A3B8', marginTop: 2, marginBottom: 12 },
  moodRow: { flexDirection: 'row', gap: 6, justifyContent: 'space-between' },
  moodItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  moodItemActive: {
    backgroundColor: 'rgba(0, 230, 153, 0.15)',
    borderWidth: 1,
    borderColor: '#00E699',
  },
  moodEmoji: { fontSize: 22 },
  moodLabel: { fontSize: 10, fontWeight: '700', color: '#64748B', marginTop: 4 },
  moodLabelActive: { color: '#00E699' },
  wellnessGrid: { gap: 10 },
  wellnessRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  wellnessLabel: { fontSize: 13, fontWeight: '700', color: '#F8FAFC' },
  scoreStepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: { fontSize: 16, fontWeight: '800', color: '#00E699' },
  stepValText: { fontSize: 14, fontWeight: '800', color: '#00E699' },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  tagChipActive: {
    backgroundColor: 'rgba(129, 140, 248, 0.2)',
    borderColor: '#818CF8',
  },
  tagChipText: { fontSize: 11, fontWeight: '700', color: '#94A3B8' },
  tagChipTextActive: { color: '#818CF8' },
  gratitudeInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 10,
    padding: 10,
    color: '#F8FAFC',
    fontSize: 12,
    marginBottom: 8,
  },
  saveCheckinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#00E699',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 6,
  },
  saveCheckinBtnText: { fontSize: 14, fontWeight: '800', color: '#070A11' },
  patternsRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  patternChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#0F1829',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  patternChipActive: {
    backgroundColor: 'rgba(0, 230, 153, 0.15)',
    borderColor: '#00E699',
  },
  patternChipText: { fontSize: 12, fontWeight: '700', color: '#94A3B8' },
  patternChipTextActive: { color: '#00E699' },
  patTitle: { fontSize: 15, fontWeight: '800', color: '#F8FAFC' },
  patDesc: { fontSize: 11, color: '#94A3B8', marginTop: 4, lineHeight: 16 },
  circleOuterContainer: {
    width: 240,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  breathingCircle: {
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 24, 41, 0.7)',
  },
  breathPhaseText: { fontSize: 16, fontWeight: '900', color: '#F8FAFC', letterSpacing: 2 },
  breathSecondsText: { fontSize: 24, fontWeight: '900', color: '#00E699', marginTop: 4 },
  cycleCounterText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  startBreathBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#00E699',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 10,
    width: '100%',
  },
  startBreathBtnText: { fontSize: 14, fontWeight: '800', color: '#070A11' },
  stopBreathBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EF4444',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 10,
    width: '100%',
  },
  stopBreathBtnText: { fontSize: 14, fontWeight: '800', color: '#F8FAFC' },
  meditationClockBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
  },
  meditationClockText: { fontSize: 52, fontWeight: '900', color: '#818CF8' },
  meditationClockSub: { fontSize: 11, fontWeight: '800', color: '#64748B', letterSpacing: 2, marginTop: 4 },
});
