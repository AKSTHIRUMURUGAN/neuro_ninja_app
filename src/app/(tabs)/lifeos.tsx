import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { NinjaPalette } from '../../constants/theme';
import { useNinjaAlert } from '../../context/ninja-alert-context';
import { syncEngine, type SyncStatus } from '../../services/sync/sync-engine';
import { SyncAuthModal } from '../../components/sync/SyncAuthModal';
import {
  PRODUCTIVITY_MODES,
  useNinja,
  type ProductivityMode,
} from '../../context/ninja-context';
import { getAllTasks, getCountdownTasks, type LifeOSTask } from '../../services/tasks/task-engine';
import { getNextUpcomingBlock, type CalendarBlock } from '../../services/calendar/calendar-engine';
import { getAllRoutines, getActiveRoutineRun } from '../../services/routines/routine-engine';
import { getNextEnabledAlarm } from '../../services/alarms/alarm-engine';
import { getHabits, getWeeklyHabitReview } from '../../services/habits/habit-service';
import { getSleepDiaryEntries } from '../../services/sleep/sleep-engine';
import { getTodayKey } from '../../services/storage';

export default function LifeOSHubScreen() {
  const router = useRouter();
  const { showToast } = useNinjaAlert();
  const { productivityMode, setProductivityMode, lifeOSRevision } = useNinja();

  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [showSyncModal, setShowSyncModal] = useState(false);

  useEffect(() => {
    return syncEngine.subscribe(setSyncStatus);
  }, []);

  const handleCloudSyncTap = async () => {
    if (!syncStatus?.user) {
      setShowSyncModal(true);
    } else {
      showToast({
        title: 'Syncing with Web...',
        message: 'Connecting to https://neuroninja.vercel.app',
        type: 'info',
        icon: 'cloud-sync',
      });
      const res = await syncEngine.syncNow();
      if (res.success) {
        showToast({
          title: 'Synced with Web',
          message: 'All LifeOS data up to date',
          type: 'success',
          icon: 'cloud-check',
        });
      }
    }
  };

  const [todayTasksCount, setTodayTasksCount] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);
  const [countdowns, setCountdowns] = useState<LifeOSTask[]>([]);
  const [nextBlock, setNextBlock] = useState<CalendarBlock | null>(null);
  const [routineSummary, setRoutineSummary] = useState('No active routine');
  const [nextAlarmText, setNextAlarmText] = useState('No enabled alarms');
  const [habitSummary, setHabitSummary] = useState('0/0 today');
  const [sleepSummary, setSleepSummary] = useState('Log sleep & sounds');
  const [nowMs, setNowMs] = useState(() => Date.now());

  const loadSummary = useCallback(() => {
    void (async () => {
      const currentMs = Date.now();
      setNowMs(currentMs);
      const [tasks, cTasks, block, routines, activeRun, nextAlarm, habits, weeklyHab, sleep] =
        await Promise.all([
          getAllTasks(),
          getCountdownTasks(),
          getNextUpcomingBlock(),
          getAllRoutines(),
          getActiveRoutineRun(),
          getNextEnabledAlarm(),
          getHabits(),
          getWeeklyHabitReview(),
          getSleepDiaryEntries(1),
        ]);

      const activeTasks = tasks.filter((t) => t.status !== 'completed' && t.status !== 'cancelled');
      setTodayTasksCount(activeTasks.length);
      setOverdueCount(
        activeTasks.filter((t) => t.dueAtUtc && new Date(t.dueAtUtc).getTime() < currentMs).length
      );
      setCountdowns(cTasks.slice(0, 3));
      setNextBlock(block);

      if (activeRun) {
        const runningRtn = routines.find((r) => r.routineId === activeRun.routineId);
        setRoutineSummary(`In Progress: ${runningRtn?.title ?? 'Routine'}`);
      } else {
        setRoutineSummary(`${routines.length} routines configured`);
      }

      if (nextAlarm) {
        setNextAlarmText(`${nextAlarm.alarm.time} · ${nextAlarm.alarm.mission.toUpperCase()}`);
      } else {
        setNextAlarmText('No active alarms');
      }

      const todayKey = getTodayKey();
      const doneToday = habits.filter((h) => h.completedDays.includes(todayKey)).length;
      setHabitSummary(`${doneToday}/${habits.length} today · ${weeklyHab.adherencePercent}% wk`);

      if (sleep.length > 0) {
        const hrs = (sleep[0].durationMinutes / 60).toFixed(1);
        setSleepSummary(`Last: ${hrs}h · Quality ${sleep[0].subjectiveQuality}/5`);
      } else {
        setSleepSummary('Bedtime, sounds & diary');
      }
    })();
  }, []);

  useFocusEffect(loadSummary);

  React.useEffect(() => {
    loadSummary();
  }, [lifeOSRevision, loadSummary]);

  const activeProfile = PRODUCTIVITY_MODES[productivityMode];

  const daysUntil = (utcIso?: string | null): string => {
    if (!utcIso) return '';
    const diffDays = Math.ceil((new Date(utcIso).getTime() - nowMs) / 86400000);
    if (diffDays <= 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    return `In ${diffDays}d`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View>
            <Text style={styles.kicker}>NINJA LIFEOS</Text>
            <Text style={styles.title}>Plan & Command</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              style={[styles.cloudHeaderBtn, syncStatus?.user && styles.cloudHeaderBtnActive]}
              onPress={handleCloudSyncTap}
              accessibilityLabel="Cloud Sync"
            >
              <MaterialCommunityIcons
                name={
                  syncStatus?.state === 'syncing'
                    ? 'cloud-sync'
                    : syncStatus?.user
                    ? 'cloud-check'
                    : 'cloud-outline'
                }
                size={14}
                color={syncStatus?.user ? '#00E699' : '#64748B'}
              />
              <Text style={[styles.cloudHeaderText, syncStatus?.user && styles.cloudHeaderTextActive]}>
                {syncStatus?.user ? 'SYNCED' : 'LOCAL'}
              </Text>
            </TouchableOpacity>

            <View style={[styles.modePill, { borderColor: activeProfile.accentColor }]}>
              <MaterialCommunityIcons
                name={activeProfile.icon as any}
                size={14}
                color={activeProfile.accentColor}
              />
              <Text style={[styles.modePillText, { color: activeProfile.accentColor }]}>
                {activeProfile.label}
              </Text>
            </View>
          </View>
        </View>

        {/* Productivity Mode Selector */}
        <View style={styles.sectionCard}>
          <Text style={styles.cardLabel}>ACTIVE PRODUCTIVITY MODE</Text>
          <Text style={styles.modeSubtitle}>{activeProfile.subtitle}</Text>
          <View style={styles.modeRow}>
            {(Object.keys(PRODUCTIVITY_MODES) as ProductivityMode[]).map((key) => {
              const item = PRODUCTIVITY_MODES[key];
              const active = productivityMode === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.modeChip,
                    active && { backgroundColor: item.accentColor, borderColor: item.accentColor },
                  ]}
                  onPress={() => void setProductivityMode(key)}
                >
                  <Text style={[styles.modeChipText, active && { color: '#070A11' }]}>
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Milestone & Exam Countdowns */}
        {countdowns.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.cardLabel}>EXAM & MILESTONE COUNTDOWNS</Text>
            <View style={{ gap: 8, marginTop: 8 }}>
              {countdowns.map((c) => (
                <TouchableOpacity
                  key={c.taskId}
                  style={styles.countdownRow}
                  onPress={() => router.push(`/lifeos/tasks/detail?id=${c.taskId}` as any)}
                >
                  <MaterialCommunityIcons name="timer-sand" size={16} color="#F59E0B" />
                  <Text style={styles.countdownTitle} numberOfLines={1}>
                    {c.title}
                  </Text>
                  <Text style={styles.countdownBadge}>{daysUntil(c.dueAtUtc)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* 5 Core LifeOS Subareas + Sleep */}
        <View style={styles.hubGrid}>
          <TouchableOpacity
            style={styles.hubCard}
            onPress={() => router.push('/lifeos/tasks' as any)}
          >
            <View style={[styles.hubIcon, { backgroundColor: 'rgba(16, 185, 129, 0.14)' }]}>
              <MaterialCommunityIcons name="checkbox-marked-circle-outline" size={24} color="#10B981" />
            </View>
            <Text style={styles.hubTitle}>Tasks & Inbox</Text>
            <Text style={styles.hubMeta}>
              {todayTasksCount} active{overdueCount > 0 ? ` · ${overdueCount} overdue` : ''}
            </Text>
            <Text style={styles.hubSub}>Quick capture, NLP, Kanban & Matrix</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.hubCard}
            onPress={() => router.push('/lifeos/calendar' as any)}
          >
            <View style={[styles.hubIcon, { backgroundColor: 'rgba(96, 165, 250, 0.14)' }]}>
              <MaterialCommunityIcons name="calendar-clock" size={24} color="#60A5FA" />
            </View>
            <Text style={styles.hubTitle}>Calendar & Blocks</Text>
            <Text style={styles.hubMeta} numberOfLines={1}>
              {nextBlock
                ? `Next: ${nextBlock.title}`
                : 'No upcoming time blocks'}
            </Text>
            <Text style={styles.hubSub}>Day/Week/Month, Plan My Day & Sync</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.hubCard}
            onPress={() => router.push('/lifeos/routines' as any)}
          >
            <View style={[styles.hubIcon, { backgroundColor: 'rgba(168, 85, 247, 0.14)' }]}>
              <MaterialCommunityIcons name="playlist-play" size={24} color="#A855F7" />
            </View>
            <Text style={styles.hubTitle}>Routines</Text>
            <Text style={styles.hubMeta} numberOfLines={1}>
              {routineSummary}
            </Text>
            <Text style={styles.hubSub}>Step-by-step timer & templates</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.hubCard}
            onPress={() => router.push('/alarms' as any)}
          >
            <View style={[styles.hubIcon, { backgroundColor: 'rgba(239, 68, 68, 0.14)' }]}>
              <MaterialCommunityIcons name="alarm" size={24} color="#EF4444" />
            </View>
            <Text style={styles.hubTitle}>Mission Alarms</Text>
            <Text style={styles.hubMeta}>{nextAlarmText}</Text>
            <Text style={styles.hubSub}>7 missions, AlarmManager & wake check</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.hubCard}
            onPress={() => router.push('/habits' as any)}
          >
            <View style={[styles.hubIcon, { backgroundColor: 'rgba(245, 158, 11, 0.14)' }]}>
              <MaterialCommunityIcons name="fire" size={24} color="#F59E0B" />
            </View>
            <Text style={styles.hubTitle}>Habits & Streaks</Text>
            <Text style={styles.hubMeta}>{habitSummary}</Text>
            <Text style={styles.hubSub}>Rest-day recovery & weekly review</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.hubCard}
            onPress={() => router.push('/lifeos/sleep' as any)}
          >
            <View style={[styles.hubIcon, { backgroundColor: 'rgba(6, 182, 212, 0.14)' }]}>
              <MaterialCommunityIcons name="weather-night" size={24} color="#06B6D4" />
            </View>
            <Text style={styles.hubTitle}>Sleep & Bedtime</Text>
            <Text style={styles.hubMeta}>{sleepSummary}</Text>
            <Text style={styles.hubSub}>Diary, wind-down & sleep sounds</Text>
          </TouchableOpacity>

          {/* Neuro Journal */}
          <TouchableOpacity
            style={styles.hubCard}
            onPress={() => router.push('/lifeos/journal' as any)}
          >
            <View style={[styles.hubIcon, { backgroundColor: 'rgba(129, 140, 248, 0.14)' }]}>
              <MaterialCommunityIcons name="book-open-page-variant" size={24} color="#818CF8" />
            </View>
            <Text style={styles.hubTitle}>Neuro Journal</Text>
            <Text style={styles.hubMeta}>Mindset & Vent</Text>
            <Text style={styles.hubSub}>Morning gratitudes, evening wins & rant incinerator</Text>
          </TouchableOpacity>

          {/* Neuro Notes */}
          <TouchableOpacity
            style={styles.hubCard}
            onPress={() => router.push('/lifeos/notes' as any)}
          >
            <View style={[styles.hubIcon, { backgroundColor: 'rgba(16, 185, 129, 0.14)' }]}>
              <MaterialCommunityIcons name="note-text-outline" size={24} color="#10B981" />
            </View>
            <Text style={styles.hubTitle}>Neuro Notes</Text>
            <Text style={styles.hubMeta}>Markdown Hub</Text>
            <Text style={styles.hubSub}>Instant offline capture, tagging & categorization</Text>
          </TouchableOpacity>

          {/* Neuro Finance */}
          <TouchableOpacity
            style={styles.hubCard}
            onPress={() => router.push('/lifeos/finance' as any)}
          >
            <View style={[styles.hubIcon, { backgroundColor: 'rgba(245, 158, 11, 0.14)' }]}>
              <MaterialCommunityIcons name="wallet-outline" size={24} color="#F59E0B" />
            </View>
            <Text style={styles.hubTitle}>Neuro Finance</Text>
            <Text style={styles.hubMeta}>Wealth & EMIs</Text>
            <Text style={styles.hubSub}>Net worth engine, expense burn & portfolio</Text>
          </TouchableOpacity>

          {/* Goals & OKRs */}
          <TouchableOpacity
            style={styles.hubCard}
            onPress={() => router.push('/lifeos/goals' as any)}
          >
            <View style={[styles.hubIcon, { backgroundColor: 'rgba(0, 230, 153, 0.14)' }]}>
              <MaterialCommunityIcons name="target" size={24} color="#00E699" />
            </View>
            <Text style={styles.hubTitle}>Goals & OKRs</Text>
            <Text style={styles.hubMeta}>Strategic Targets</Text>
            <Text style={styles.hubSub}>Short & long-term milestones with coin bounties</Text>
          </TouchableOpacity>

          {/* Focus Wallet */}
          <TouchableOpacity
            style={styles.hubCard}
            onPress={() => router.push('/lifeos/wallet' as any)}
          >
            <View style={[styles.hubIcon, { backgroundColor: 'rgba(245, 158, 11, 0.14)' }]}>
              <MaterialCommunityIcons name="cash-multiple" size={24} color="#F59E0B" />
            </View>
            <Text style={styles.hubTitle}>Focus Wallet</Text>
            <Text style={styles.hubMeta}>Coins & Karma</Text>
            <Text style={styles.hubSub}>Daily bonus chest, transactions & rank perks</Text>
          </TouchableOpacity>

          {/* Neuro Store */}
          <TouchableOpacity
            style={styles.hubCard}
            onPress={() => router.push('/lifeos/store' as any)}
          >
            <View style={[styles.hubIcon, { backgroundColor: 'rgba(236, 72, 153, 0.14)' }]}>
              <MaterialCommunityIcons name="shopping-outline" size={24} color="#EC4899" />
            </View>
            <Text style={styles.hubTitle}>Neuro Store</Text>
            <Text style={styles.hubMeta}>Merch & Eco-Impact</Text>
            <Text style={styles.hubSub}>Hoodies, flasks, tree planting & digital perks</Text>
          </TouchableOpacity>

          {/* Smart Shopping & Groceries */}
          <TouchableOpacity
            style={styles.hubCard}
            onPress={() => router.push('/lifeos/shopping' as any)}
          >
            <View style={[styles.hubIcon, { backgroundColor: 'rgba(16, 185, 129, 0.14)' }]}>
              <MaterialCommunityIcons name="cart-outline" size={24} color="#10B981" />
            </View>
            <Text style={styles.hubTitle}>Smart Shopping</Text>
            <Text style={styles.hubMeta}>Aisles & Nutrition</Text>
            <Text style={styles.hubSub}>Grocery lists, keto/vegan presets & staple bar</Text>
          </TouchableOpacity>

          {/* NeuroBody Vitality */}
          <TouchableOpacity
            style={styles.hubCard}
            onPress={() => router.push('/lifeos/body' as any)}
          >
            <View style={[styles.hubIcon, { backgroundColor: 'rgba(56, 189, 248, 0.14)' }]}>
              <MaterialCommunityIcons name="heart-pulse" size={24} color="#38BDF8" />
            </View>
            <Text style={styles.hubTitle}>NeuroBody Vitality</Text>
            <Text style={styles.hubMeta}>Somatic & Fasting OS</Text>
            <Text style={styles.hubSub}>Vitality score, hydration, 16:8 fasting & macros</Text>
          </TouchableOpacity>

          {/* NeuroHealth Mind */}
          <TouchableOpacity
            style={styles.hubCard}
            onPress={() => router.push('/lifeos/health' as any)}
          >
            <View style={[styles.hubIcon, { backgroundColor: 'rgba(129, 140, 248, 0.14)' }]}>
              <MaterialCommunityIcons name="brain" size={24} color="#818CF8" />
            </View>
            <Text style={styles.hubTitle}>NeuroHealth Mind</Text>
            <Text style={styles.hubMeta}>Breathwork & Radar</Text>
            <Text style={styles.hubSub}>Box breathing, mood radar & binaural timer</Text>
          </TouchableOpacity>

          {/* Neuro Arena */}
          <TouchableOpacity
            style={styles.hubCard}
            onPress={() => router.push('/lifeos/arena' as any)}
          >
            <View style={[styles.hubIcon, { backgroundColor: 'rgba(99, 102, 241, 0.14)' }]}>
              <MaterialCommunityIcons name="gamepad-variant-outline" size={24} color="#6366F1" />
            </View>
            <Text style={styles.hubTitle}>Neuro Arena</Text>
            <Text style={styles.hubMeta}>Brain Games</Text>
            <Text style={styles.hubSub}>Queens, Tango, MindSnap, Math Blitz & Chess</Text>
          </TouchableOpacity>

          {/* Refer & Earn */}
          <TouchableOpacity
            style={styles.hubCard}
            onPress={() => router.push('/lifeos/referrals' as any)}
          >
            <View style={[styles.hubIcon, { backgroundColor: 'rgba(56, 189, 248, 0.14)' }]}>
              <MaterialCommunityIcons name="account-group-outline" size={24} color="#38BDF8" />
            </View>
            <Text style={styles.hubTitle}>Refer & Earn</Text>
            <Text style={styles.hubMeta}>Clan Recruits</Text>
            <Text style={styles.hubSub}>Milestone ladder & 100 coin bonus per friend</Text>
          </TouchableOpacity>

          {/* Villains & Boss Battles */}
          <TouchableOpacity
            style={styles.hubCard}
            onPress={() => router.push('/lifeos/villains' as any)}
          >
            <View style={[styles.hubIcon, { backgroundColor: 'rgba(239, 68, 68, 0.14)' }]}>
              <MaterialCommunityIcons name="skull-crossbones-outline" size={24} color="#EF4444" />
            </View>
            <Text style={styles.hubTitle}>Boss Battles</Text>
            <Text style={styles.hubMeta}>Daily & Weekly Titans</Text>
            <Text style={styles.hubSub}>Combat damage from habits, raid loot & live HP</Text>
          </TouchableOpacity>

          {/* Dynamic Challenges */}
          <TouchableOpacity
            style={styles.hubCard}
            onPress={() => router.push('/lifeos/challenges' as any)}
          >
            <View style={[styles.hubIcon, { backgroundColor: 'rgba(0, 230, 153, 0.14)' }]}>
              <MaterialCommunityIcons name="sword-cross" size={24} color="#00E699" />
            </View>
            <Text style={styles.hubTitle}>Challenges</Text>
            <Text style={styles.hubMeta}>Multi-Day Quests</Text>
            <Text style={styles.hubSub}>Dopamine detox, iron focus & coin bounties</Text>
          </TouchableOpacity>

          {/* Photo Proof Verification */}
          <TouchableOpacity
            style={styles.hubCard}
            onPress={() => router.push('/lifeos/verification' as any)}
          >
            <View style={[styles.hubIcon, { backgroundColor: 'rgba(6, 182, 212, 0.14)' }]}>
              <MaterialCommunityIcons name="camera-outline" size={24} color="#06B6D4" />
            </View>
            <Text style={styles.hubTitle}>Verification Portal</Text>
            <Text style={styles.hubMeta}>Proof & Buddy Audit</Text>
            <Text style={styles.hubSub}>Camera snapshots, parent verification & rewards</Text>
          </TouchableOpacity>

          {/* Parental Curfew Controls */}
          <TouchableOpacity
            style={styles.hubCard}
            onPress={() => router.push('/lifeos/guardian/parental-controls' as any)}
          >
            <View style={[styles.hubIcon, { backgroundColor: 'rgba(129, 140, 248, 0.14)' }]}>
              <MaterialCommunityIcons name="bed-clock" size={24} color="#818CF8" />
            </View>
            <Text style={styles.hubTitle}>Bedtime Curfew</Text>
            <Text style={styles.hubMeta}>Parental Hard Lock</Text>
            <Text style={styles.hubSub}>Master PIN, 21:30-06:30 lock & app quotas</Text>
          </TouchableOpacity>

          {/* Guardian Mode */}
          <TouchableOpacity
            style={styles.hubCard}
            onPress={() => router.push('/lifeos/guardian' as any)}
          >
            <View style={[styles.hubIcon, { backgroundColor: 'rgba(16, 185, 129, 0.14)' }]}>
              <MaterialCommunityIcons name="shield-account-outline" size={24} color="#10B981" />
            </View>
            <Text style={styles.hubTitle}>Guardian Mode</Text>
            <Text style={styles.hubMeta}>Family Shield</Text>
            <Text style={styles.hubSub}>Screen time limits, remote lock & pass approvals</Text>
          </TouchableOpacity>

          {/* Billing & Subscriptions */}
          <TouchableOpacity
            style={styles.hubCard}
            onPress={() => router.push('/lifeos/billing' as any)}
          >
            <View style={[styles.hubIcon, { backgroundColor: 'rgba(234, 179, 8, 0.14)' }]}>
              <MaterialCommunityIcons name="credit-card-chip-outline" size={24} color="#EAB308" />
            </View>
            <Text style={styles.hubTitle}>Membership & Billing</Text>
            <Text style={styles.hubMeta}>Pro & Family</Text>
            <Text style={styles.hubSub}>Tier upgrade, promo coupons & receipts</Text>
          </TouchableOpacity>
        </View>

        {/* Cloud Connect Banner */}
        <TouchableOpacity
          style={styles.cloudSyncBanner}
          onPress={() => router.push('/settings/cloud-sync' as any)}
        >
          <View style={styles.cloudIconBox}>
            <MaterialCommunityIcons name="cloud-sync-outline" size={24} color="#00E699" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.cloudBannerTitle}>Cloud Sync & Web Connect</Text>
            <Text style={styles.cloudBannerSub}>
              Sync Journal, Notes & Finance seamlessly with your production web dashboard.
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color="#64748B" />
        </TouchableOpacity>
      </ScrollView>

      {/* Sync Auth Modal */}
      <SyncAuthModal
        visible={showSyncModal}
        onClose={() => setShowSyncModal(false)}
        onSuccess={() => {
          showToast({
            title: 'Connected',
            message: 'Synced with https://neuroninja.vercel.app',
            type: 'success',
            icon: 'cloud-check',
          });
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#070A11' },
  scroll: { padding: 18, gap: 14, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cloudHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F1829',
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  cloudHeaderBtnActive: {
    borderColor: 'rgba(0, 230, 153, 0.4)',
    backgroundColor: 'rgba(0, 230, 153, 0.08)',
  },
  cloudHeaderText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  cloudHeaderTextActive: {
    color: '#00E699',
  },
  kicker: { color: NinjaPalette.emerald, fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  title: { fontSize: 26, fontWeight: '900', color: '#F8FAFC' },
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: '#0F1829',
  },
  modePillText: { fontSize: 11, fontWeight: '800' },
  sectionCard: {
    backgroundColor: '#0F1829',
    borderRadius: 18,
    padding: 15,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  cardLabel: { fontSize: 10, fontWeight: '800', color: '#10B981', letterSpacing: 1.3 },
  modeSubtitle: { color: '#94A3B8', fontSize: 12, marginTop: 4, marginBottom: 10 },
  modeRow: { flexDirection: 'row', gap: 8 },
  modeChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#162033',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  modeChipText: { color: '#CBD5E1', fontSize: 12, fontWeight: '700' },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#162033',
    padding: 10,
    borderRadius: 10,
  },
  countdownTitle: { flex: 1, color: '#F8FAFC', fontSize: 13, fontWeight: '700' },
  countdownBadge: { color: '#F59E0B', fontSize: 12, fontWeight: '800' },
  hubGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  hubCard: {
    width: '48%',
    backgroundColor: '#0F1829',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
    gap: 6,
  },
  hubIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  hubTitle: { color: '#F8FAFC', fontSize: 15, fontWeight: '800' },
  hubMeta: { color: '#10B981', fontSize: 12, fontWeight: '700' },
  hubSub: { color: '#64748B', fontSize: 11, lineHeight: 15 },
  cloudSyncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F1829',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#00E69944',
    marginTop: 8,
  },
  cloudIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#00E69918',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cloudBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  cloudBannerSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
    lineHeight: 15,
  },
});

