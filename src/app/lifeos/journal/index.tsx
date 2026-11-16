import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { NinjaPalette } from '../../../constants/theme';
import { useNinjaAlert } from '../../../context/ninja-alert-context';
import {
  getJournalEntries,
  saveJournalEntry,
  deleteJournalEntry,
  type JournalEntry,
  type JournalType,
} from '../../../services/journal/journal-service';

export default function NeuroJournalScreen() {
  const router = useRouter();
  const { showToast, showAlert } = useNinjaAlert();

  const [activeTab, setActiveTab] = useState<JournalType | 'history'>('morning');
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Common Ratings
  const [moodRating, setMoodRating] = useState<number>(7);
  const [energyRating, setEnergyRating] = useState<number>(8);

  // Morning Form
  const [morningPriority, setMorningPriority] = useState('');
  const [morningMindset, setMorningMindset] = useState('');
  const [gratitude1, setGratitude1] = useState('');
  const [gratitude2, setGratitude2] = useState('');
  const [gratitude3, setGratitude3] = useState('');
  const [morningAffirmation, setMorningAffirmation] = useState('');

  // Evening Form
  const [eveningWins, setEveningWins] = useState('');
  const [eveningLessons, setEveningLessons] = useState('');
  const [eveningDetachment, setEveningDetachment] = useState('');
  const [sleepReadiness, setSleepReadiness] = useState<number>(8);

  // Rant Vent Form
  const [rantText, setRantText] = useState('');
  const [isBurning, setIsBurning] = useState(false);
  const [burnedNotice, setBurnedNotice] = useState(false);

  // Selected Entry View Modal
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);

  const loadEntries = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getJournalEntries();
      setEntries(data);
    } catch (e) {
      console.warn('Failed to load journal entries:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    void getJournalEntries().then((data) => {
      if (!ignore) {
        setEntries(data);
        setIsLoading(false);
      }
    });
    return () => {
      ignore = true;
    };
  }, []);

  const handleSaveMorning = async () => {
    if (!morningPriority.trim() && !morningMindset.trim() && !gratitude1.trim()) {
      showAlert({
        title: 'Empty Journal',
        message: 'Please write down at least your daily priority or a gratitude.',
        type: 'warning',
        icon: 'pencil',
      });
      return;
    }

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const gratitudes = [gratitude1, gratitude2, gratitude3].filter((g) => g.trim().length > 0);
    const content = `Priority: ${morningPriority}\nMindset: ${morningMindset}\nGratitudes: ${gratitudes.join(', ')}`;

    await saveJournalEntry({
      type: 'morning',
      title: morningPriority || 'Morning Clarity',
      content,
      moodRating,
      energyRating,
      morningData: {
        dailyPriority: morningPriority,
        mindsetNotes: morningMindset,
        gratitudes,
        affirmation: morningAffirmation,
      },
      tags: ['morning', 'mindset'],
    });

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast({
      title: 'Morning Intentions Sealed',
      message: 'Saved locally in 0ms and queued for cloud sync.',
      type: 'success',
      icon: 'weather-sunny',
    });

    setMorningPriority('');
    setMorningMindset('');
    setGratitude1('');
    setGratitude2('');
    setGratitude3('');
    setMorningAffirmation('');
    void loadEntries();
    setActiveTab('history');
  };

  const handleSaveEvening = async () => {
    if (!eveningWins.trim() && !eveningLessons.trim()) {
      showAlert({
        title: 'Empty Reflection',
        message: 'Please log your daily wins or key lessons learned.',
        type: 'warning',
        icon: 'pencil',
      });
      return;
    }

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const wins = eveningWins.split('\n').filter((w) => w.trim().length > 0);
    const content = `Wins:\n${wins.join('\n')}\n\nLessons:\n${eveningLessons}\n\nDetachment:\n${eveningDetachment}`;

    await saveJournalEntry({
      type: 'evening',
      title: 'Evening Debrief',
      content,
      moodRating,
      energyRating,
      eveningData: {
        wins,
        lessonsLearned: eveningLessons,
        detachmentNotes: eveningDetachment,
        sleepReadiness,
      },
      tags: ['evening', 'debrief'],
    });

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast({
      title: 'Evening Debrief Sealed',
      message: 'Saved locally in 0ms and queued for cloud sync.',
      type: 'success',
      icon: 'weather-night',
    });

    setEveningWins('');
    setEveningLessons('');
    setEveningDetachment('');
    void loadEntries();
    setActiveTab('history');
  };

  const handleBurnVent = async () => {
    if (!rantText.trim()) {
      showAlert({
        title: 'No Vent Text',
        message: 'Write down your stress, frustrations, or raw vent before incinerating.',
        type: 'warning',
        icon: 'fire',
      });
      return;
    }

    setIsBurning(true);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    // Save vent with burned ceremonial flag
    await saveJournalEntry({
      type: 'rant',
      title: 'Incinerated Rant Vent',
      content: rantText,
      moodRating,
      energyRating,
      isBurned: true,
      rantData: {
        rawVentText: rantText,
        isBurned: true,
        clarityAnalysis: {
          emotionalValidation: 'Your frustration is acknowledged. You have chosen to let it go.',
          cognitiveDistortions: [
            {
              type: 'Catastrophizing / Overthinking',
              quote: rantText.slice(0, 60),
              reframe: 'This moment is temporary. Focus only on the direct actions within your control.',
            },
          ],
          dichotomyOfControl: {
            withinControl: ['Your focus right now', 'Your breath', 'Your next deliberate choice'],
            outsideControl: ['Past events', 'Other people’s reactions', 'Uncontrollable outcomes'],
          },
          clearPictureSteps: [
            { title: 'Take 3 Deep Breaths', description: 'Box breathing to reset your nervous system' },
            { title: 'Move to Physical Action', description: 'Drink water, stretch, or begin your primary task' },
          ],
          analyzedAt: new Date().toISOString(),
        },
      },
      tags: ['vent', 'burned'],
    });

    setTimeout(async () => {
      setIsBurning(false);
      setBurnedNotice(true);
      setRantText('');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void loadEntries();
    }, 1200);
  };

  const handleDelete = async (id: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await deleteJournalEntry(id);
    setSelectedEntry(null);
    showToast({
      title: 'Entry Deleted',
      message: 'Removed from local database and queued for cloud deletion.',
      type: 'info',
      icon: 'delete-outline',
    });
    void loadEntries();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.badge}>HOLISTIC MENTAL CLARITY</Text>
          <Text style={styles.title}>Neuro Journal</Text>
        </View>
        <TouchableOpacity
          style={styles.cloudBtn}
          onPress={() => router.push('/settings/cloud-sync' as any)}
        >
          <MaterialCommunityIcons name="cloud-sync" size={20} color="#00E699" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'morning' && styles.tabItemActive]}
          onPress={() => setActiveTab('morning')}
        >
          <MaterialCommunityIcons
            name="weather-sunny"
            size={16}
            color={activeTab === 'morning' ? '#00E699' : '#64748B'}
          />
          <Text style={[styles.tabText, activeTab === 'morning' && styles.tabTextActive]}>
            Morning
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'evening' && styles.tabItemActive]}
          onPress={() => setActiveTab('evening')}
        >
          <MaterialCommunityIcons
            name="weather-night"
            size={16}
            color={activeTab === 'evening' ? '#818CF8' : '#64748B'}
          />
          <Text style={[styles.tabText, activeTab === 'evening' && styles.tabTextActive]}>
            Evening
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'rant' && styles.tabItemActive]}
          onPress={() => setActiveTab('rant')}
        >
          <MaterialCommunityIcons
            name="fire"
            size={16}
            color={activeTab === 'rant' ? '#EF4444' : '#64748B'}
          />
          <Text style={[styles.tabText, activeTab === 'rant' && styles.tabTextActive]}>
            Rant & Burn
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'history' && styles.tabItemActive]}
          onPress={() => setActiveTab('history')}
        >
          <MaterialCommunityIcons
            name="book-open-outline"
            size={16}
            color={activeTab === 'history' ? '#38BDF8' : '#64748B'}
          />
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
            History ({entries.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Mood & Energy Bar (Visible on creation tabs) */}
        {activeTab !== 'history' && (
          <View style={styles.metricCard}>
            <View style={styles.metricRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.metricLabel}>Mood Rating: {moodRating}/10</Text>
                <View style={styles.ratingBar}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <TouchableOpacity
                      key={n}
                      style={[
                        styles.ratingChip,
                        moodRating === n && { backgroundColor: '#00E699' },
                      ]}
                      onPress={() => setMoodRating(n)}
                    >
                      <Text
                        style={[
                          styles.ratingText,
                          moodRating === n && { color: '#070A11', fontWeight: '800' },
                        ]}
                      >
                        {n}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <View style={[styles.metricRow, { marginTop: 12 }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.metricLabel}>Energy Rating: {energyRating}/10</Text>
                <View style={styles.ratingBar}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <TouchableOpacity
                      key={n}
                      style={[
                        styles.ratingChip,
                        energyRating === n && { backgroundColor: '#38BDF8' },
                      ]}
                      onPress={() => setEnergyRating(n)}
                    >
                      <Text
                        style={[
                          styles.ratingText,
                          energyRating === n && { color: '#070A11', fontWeight: '800' },
                        ]}
                      >
                        {n}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ────────────── MORNING TAB ────────────── */}
        {activeTab === 'morning' && (
          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.groupHeading}>PRIMARY INTENTION</Text>
              <Text style={styles.inputLabel}>What is your #1 Daily Priority today?</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Finish the offline sync architecture..."
                placeholderTextColor="#64748B"
                value={morningPriority}
                onChangeText={setMorningPriority}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.groupHeading}>MINDSET & INTENTION</Text>
              <Text style={styles.inputLabel}>How do you want to show up today?</Text>
              <TextInput
                style={[styles.textInput, { minHeight: 70 }]}
                placeholder="e.g. Calm, focused, unfazed by trivial distractions..."
                placeholderTextColor="#64748B"
                value={morningMindset}
                onChangeText={setMorningMindset}
                multiline
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.groupHeading}>3-POINT GRATITUDES</Text>
              <TextInput
                style={styles.miniInput}
                placeholder="1. What are you grateful for right now?"
                placeholderTextColor="#64748B"
                value={gratitude1}
                onChangeText={setGratitude1}
              />
              <TextInput
                style={styles.miniInput}
                placeholder="2. Someone who made your life easier..."
                placeholderTextColor="#64748B"
                value={gratitude2}
                onChangeText={setGratitude2}
              />
              <TextInput
                style={styles.miniInput}
                placeholder="3. An opportunity you have today..."
                placeholderTextColor="#64748B"
                value={gratitude3}
                onChangeText={setGratitude3}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.groupHeading}>MORNING AFFIRMATION</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. I master my attention; the world does not dictate my peace."
                placeholderTextColor="#64748B"
                value={morningAffirmation}
                onChangeText={setMorningAffirmation}
              />
            </View>

            <TouchableOpacity style={styles.submitBtn} onPress={handleSaveMorning}>
              <MaterialCommunityIcons name="weather-sunny" size={20} color="#070A11" />
              <Text style={styles.submitBtnText}>Seal Morning Clarity</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ────────────── EVENING TAB ────────────── */}
        {activeTab === 'evening' && (
          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.groupHeading}>DAILY VICTORIES</Text>
              <Text style={styles.inputLabel}>What were your top wins today?</Text>
              <TextInput
                style={[styles.textInput, { minHeight: 80 }]}
                placeholder="• Crushed 3 focus pomodoros&#10;• Avoided mindless doomscrolling"
                placeholderTextColor="#64748B"
                value={eveningWins}
                onChangeText={setEveningWins}
                multiline
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.groupHeading}>LESSONS LEARNED</Text>
              <Text style={styles.inputLabel}>What would you do differently tomorrow?</Text>
              <TextInput
                style={[styles.textInput, { minHeight: 70 }]}
                placeholder="e.g. Put the phone in the other room during deep work..."
                placeholderTextColor="#64748B"
                value={eveningLessons}
                onChangeText={setEveningLessons}
                multiline
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.groupHeading}>COGNITIVE DETACHMENT</Text>
              <Text style={styles.inputLabel}>Release all open work loops before sleep:</Text>
              <TextInput
                style={[styles.textInput, { minHeight: 70 }]}
                placeholder="The day is done. Unfinished tasks can wait until morning."
                placeholderTextColor="#64748B"
                value={eveningDetachment}
                onChangeText={setEveningDetachment}
                multiline
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.groupHeading}>SLEEP READINESS ({sleepReadiness}/10)</Text>
              <View style={styles.ratingBar}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <TouchableOpacity
                    key={n}
                    style={[
                      styles.ratingChip,
                      sleepReadiness === n && { backgroundColor: '#818CF8' },
                    ]}
                    onPress={() => setSleepReadiness(n)}
                  >
                    <Text
                      style={[
                        styles.ratingText,
                        sleepReadiness === n && { color: '#070A11', fontWeight: '800' },
                      ]}
                    >
                      {n}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: '#818CF8' }]}
              onPress={handleSaveEvening}
            >
              <MaterialCommunityIcons name="weather-night" size={20} color="#070A11" />
              <Text style={styles.submitBtnText}>Seal Evening Debrief</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ────────────── RANT & BURN TAB ────────────── */}
        {activeTab === 'rant' && (
          <View style={styles.formContainer}>
            <View style={styles.rantIntroCard}>
              <MaterialCommunityIcons name="fire" size={28} color="#EF4444" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.rantIntroTitle}>Emotional Brain Dump & Incinerator</Text>
                <Text style={styles.rantIntroSub}>
                  Write down unvarnished frustrations, stress, and anxiety. NeuroNinja extracts the dichotomy of control and symbolically burns the emotional baggage.
                </Text>
              </View>
            </View>

            <TextInput
              style={styles.rantTextArea}
              placeholder="Dump all raw emotions here... Nobody is judging you."
              placeholderTextColor="#64748B"
              value={rantText}
              onChangeText={setRantText}
              multiline
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={styles.burnBtn}
              onPress={handleBurnVent}
              disabled={isBurning}
            >
              {isBurning ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <MaterialCommunityIcons name="fire" size={22} color="#FFFFFF" />
                  <Text style={styles.burnBtnText}>Incinerate Emotional Vent</Text>
                </>
              )}
            </TouchableOpacity>

            {burnedNotice && (
              <View style={styles.burnedNoticeBox}>
                <MaterialCommunityIcons name="check-decagram" size={24} color="#00E699" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.burnedNoticeTitle}>Vent Incinerated</Text>
                  <Text style={styles.burnedNoticeSub}>
                    The emotional charge has been detached and burned into ashes. Focus only on what is within your control right now.
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* ────────────── HISTORY TAB ────────────── */}
        {activeTab === 'history' && (
          <View style={styles.historyContainer}>
            {isLoading ? (
              <ActivityIndicator size="large" color="#00E699" style={{ marginVertical: 40 }} />
            ) : entries.length === 0 ? (
              <View style={styles.emptyCard}>
                <MaterialCommunityIcons name="book-open-page-variant" size={40} color="#00E699" />
                <Text style={styles.emptyTitle}>No Journal Entries Yet</Text>
                <Text style={styles.emptySub}>
                  Start your morning mindset, evening debrief, or incinerate a vent.
                </Text>
              </View>
            ) : (
              entries.map((entry) => (
                <TouchableOpacity
                  key={entry.id}
                  style={styles.entryCard}
                  onPress={() => setSelectedEntry(entry)}
                >
                  <View style={styles.entryTop}>
                    <View style={styles.entryTypePill}>
                      <MaterialCommunityIcons
                        name={
                          entry.type === 'morning'
                            ? 'weather-sunny'
                            : entry.type === 'evening'
                            ? 'weather-night'
                            : 'fire'
                        }
                        size={14}
                        color={
                          entry.type === 'morning'
                            ? '#00E699'
                            : entry.type === 'evening'
                            ? '#818CF8'
                            : '#EF4444'
                        }
                      />
                      <Text
                        style={[
                          styles.entryTypeText,
                          {
                            color:
                              entry.type === 'morning'
                                ? '#00E699'
                                : entry.type === 'evening'
                                ? '#818CF8'
                                : '#EF4444',
                          },
                        ]}
                      >
                        {entry.type.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.entryDate}>{entry.date}</Text>
                  </View>

                  <Text style={styles.entryTitle}>{entry.title || 'Journal Entry'}</Text>
                  <Text style={styles.entryBody} numberOfLines={2}>
                    {entry.content}
                  </Text>

                  <View style={styles.entryBottom}>
                    {entry.moodRating && (
                      <Text style={styles.entryMeta}>Mood: {entry.moodRating}/10</Text>
                    )}
                    {entry.energyRating && (
                      <Text style={styles.entryMeta}>Energy: {entry.energyRating}/10</Text>
                    )}
                    {entry.isBurned && (
                      <Text style={[styles.entryMeta, { color: '#EF4444' }]}>🔥 Burned</Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Entry Details Modal */}
      <Modal
        visible={selectedEntry !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedEntry(null)}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalBadge}>
                  {selectedEntry?.type.toUpperCase()} JOURNAL
                </Text>
                <Text style={styles.modalTitle}>
                  {selectedEntry?.title || 'Journal Details'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setSelectedEntry(null)}
              >
                <Ionicons name="close" size={22} color="#F8FAFC" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }}>
              <Text style={styles.modalDate}>{selectedEntry?.date}</Text>
              <Text style={styles.modalText}>{selectedEntry?.content}</Text>

              {/* Rant Clarity Analysis */}
              {selectedEntry?.rantData?.clarityAnalysis && (
                <View style={styles.clarityCard}>
                  <Text style={styles.clarityHeading}>RATIONAL CLARITY BREAKDOWN</Text>
                  <Text style={styles.clarityVal}>
                    {selectedEntry.rantData.clarityAnalysis.emotionalValidation}
                  </Text>

                  <Text style={styles.subHeading}>WHAT IS WITHIN YOUR CONTROL:</Text>
                  {selectedEntry.rantData.clarityAnalysis.dichotomyOfControl.withinControl.map(
                    (step, i) => (
                      <Text key={i} style={styles.bulletItem}>
                        ✓ {step}
                      </Text>
                    )
                  )}

                  <Text style={styles.subHeading}>WHAT IS OUTSIDE YOUR CONTROL:</Text>
                  {selectedEntry.rantData.clarityAnalysis.dichotomyOfControl.outsideControl.map(
                    (step, i) => (
                      <Text key={i} style={[styles.bulletItem, { color: '#94A3B8' }]}>
                        ✕ {step}
                      </Text>
                    )
                  )}
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => selectedEntry && handleDelete(selectedEntry.id)}
            >
              <MaterialCommunityIcons name="delete-outline" size={18} color="#EF4444" />
              <Text style={styles.deleteBtnText}>Delete Entry</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#070A11',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backBtn: {
    padding: 6,
  },
  badge: {
    color: '#00E699',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#F8FAFC',
  },
  cloudBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 230, 153, 0.1)',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#0F1829',
    padding: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 10,
  },
  tabItemActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  tabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#F8FAFC',
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  metricCard: {
    backgroundColor: '#0F1829',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  ratingBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ratingChip: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  formContainer: {
    gap: 16,
  },
  inputGroup: {
    backgroundColor: '#0F1829',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  groupHeading: {
    fontSize: 10,
    fontWeight: '800',
    color: NinjaPalette.emerald,
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 12,
    color: '#F8FAFC',
    fontWeight: '700',
    marginBottom: 10,
  },
  textInput: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    padding: 12,
    color: '#F8FAFC',
    fontSize: 13,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  miniInput: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 10,
    padding: 10,
    color: '#F8FAFC',
    fontSize: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 8,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#00E699',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  submitBtnText: {
    color: '#070A11',
    fontSize: 14,
    fontWeight: '800',
  },
  rantIntroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  rantIntroTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#EF4444',
  },
  rantIntroSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
    lineHeight: 16,
  },
  rantTextArea: {
    backgroundColor: '#0F1829',
    borderRadius: 18,
    padding: 16,
    color: '#F8FAFC',
    fontSize: 14,
    minHeight: 180,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  burnBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EF4444',
    paddingVertical: 14,
    borderRadius: 14,
  },
  burnBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  burnedNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 230, 153, 0.1)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 153, 0.25)',
  },
  burnedNoticeTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#00E699',
  },
  burnedNoticeSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
    lineHeight: 16,
  },
  historyContainer: {
    gap: 12,
  },
  entryCard: {
    backgroundColor: '#0F1829',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  entryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  entryTypePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  entryTypeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  entryDate: {
    fontSize: 11,
    color: '#64748B',
  },
  entryTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  entryBody: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 18,
  },
  entryBottom: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
  },
  entryMeta: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: '#0F1829',
    borderRadius: 18,
    padding: 30,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#070A11',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    marginTop: 60,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalBadge: {
    color: '#00E699',
    fontSize: 10,
    fontWeight: '800',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#F8FAFC',
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
  },
  modalDate: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 14,
  },
  modalText: {
    fontSize: 14,
    color: '#F8FAFC',
    lineHeight: 22,
    marginBottom: 20,
  },
  clarityCard: {
    backgroundColor: '#0F1829',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 153, 0.2)',
    marginBottom: 20,
  },
  clarityHeading: {
    fontSize: 10,
    fontWeight: '800',
    color: '#00E699',
    letterSpacing: 1,
    marginBottom: 8,
  },
  clarityVal: {
    fontSize: 13,
    color: '#F8FAFC',
    lineHeight: 18,
    marginBottom: 12,
  },
  subHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: '#38BDF8',
    marginTop: 8,
    marginBottom: 4,
  },
  bulletItem: {
    fontSize: 12,
    color: '#00E699',
    lineHeight: 18,
    marginLeft: 4,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    marginTop: 10,
  },
  deleteBtnText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '700',
  },
});
