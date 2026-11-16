import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useNinja } from '../../context/ninja-context';
import { NinjaPalette } from '../../constants/theme';
import { getTodayKey } from '../../services/storage';
import { UsageTimeline } from '../../components/usage-timeline';
import { DoomscrollCard } from '../../components/doomscroll-card';
import { AppQuotaModal } from '../../components/wellbeing/app-quota-modal';

function getNinjaRank(intercepts: number): { title: string; color: string; desc: string } {
  if (intercepts >= 300) {
    return { title: 'Grandmaster Ninja', color: '#EF4444', desc: 'Supreme mental dominion over digital impulses.' };
  }
  if (intercepts >= 150) {
    return { title: 'Black Belt Ninja', color: '#10B981', desc: 'Iron will and mastery over habitual dopamine.' };
  }
  if (intercepts >= 75) {
    return { title: 'Brown Belt Focus', color: '#F59E0B', desc: 'Deep work reflexes solidified.' };
  }
  if (intercepts >= 30) {
    return { title: 'Blue Belt Initiate', color: '#06B6D4', desc: 'Mindful resistance kicking in regularly.' };
  }
  if (intercepts >= 10) {
    return { title: 'Yellow Belt Novice', color: '#FBBF24', desc: 'Beginning to conquer the autopilot scroll.' };
  }
  return { title: 'White Belt Apprentice', color: '#E2E8F0', desc: 'Your focus training journey begins today.' };
}

export default function StatsScreen() {
  const { settings, syncIntercepts, updateQuotaPolicy } = useNinja();
  const [syncing, setSyncing] = useState(false);
  const [selectedApp, setSelectedApp] = useState<{ pkg: string; name: string } | null>(null);

  const totalIntercepts = settings.totalInterceptsCount || 0;
  const hoursSaved = ((totalIntercepts * 15) / 60).toFixed(1);

  const todayKey = getTodayKey();
  const todayStat = settings.dailyStats[todayKey] ?? {
    intercepts: 0,
    minutesEarned: 0,
    sessionsCompleted: 0,
  };

  const rank = getNinjaRank(totalIntercepts);

  const handleManualSync = async () => {
    setSyncing(true);
    await syncIntercepts();
    setSyncing(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.badge}>FOCUS INTELLIGENCE</Text>
          <Text style={styles.title}>Brain Analytics</Text>
        </View>

        {/* Ninja Rank Hero Card */}
        <View style={styles.rankCard}>
          <View style={[styles.rankIconBox, { borderColor: rank.color }]}>
            <MaterialCommunityIcons name="sword" size={32} color={rank.color} />
          </View>
          <Text style={[styles.rankTitle, { color: rank.color }]}>{rank.title}</Text>
          <Text style={styles.rankDesc}>{rank.desc}</Text>

          <View style={styles.rankProgressBar}>
            <View
              style={[
                styles.rankProgressFill,
                { width: `${Math.min(100, (totalIntercepts / 150) * 100)}%`, backgroundColor: rank.color },
              ]}
            />
          </View>
          <Text style={styles.rankProgressLabel}>
            {totalIntercepts} total intercepts recorded
          </Text>
        </View>

        {/* Primary Stats Grid */}
        <View style={styles.statsGrid}>
          {/* Stat 1: Total Intercepts */}
          <View style={styles.statBox}>
            <MaterialCommunityIcons
              name="shield-alert-outline"
              size={24}
              color={NinjaPalette.emerald}
              style={{ marginBottom: 8 }}
            />
            <Text style={styles.statNumber}>{totalIntercepts}</Text>
            <Text style={styles.statLabel}>Distractions Blocked</Text>
          </View>

          {/* Stat 2: Reclaimed Hours */}
          <View style={styles.statBox}>
            <MaterialCommunityIcons
              name="clock-time-four-outline"
              size={24}
              color={NinjaPalette.cyan}
              style={{ marginBottom: 8 }}
            />
            <Text style={styles.statNumber}>{hoursSaved} hrs</Text>
            <Text style={styles.statLabel}>Focus Time Reclaimed</Text>
          </View>
        </View>

        {/* Today's Focus Overview */}
        <View style={styles.todayCard}>
          <Text style={styles.todayHeading}>TODAY&apos;S DISCIPLINE</Text>
          <View style={styles.todayRow}>
            <View>
              <Text style={styles.todayVal}>{todayStat.intercepts}</Text>
              <Text style={styles.todaySub}>Intercepts today</Text>
            </View>
            <View>
              <Text style={styles.todayVal}>{todayStat.minutesEarned}m</Text>
              <Text style={styles.todaySub}>Earned focus passes</Text>
            </View>
          </View>
        </View>

        {/* Doomscrolling Intelligence Card (Opal / StayFree / one sec Parity) */}
        <DoomscrollCard />

        {/* Weekly Screen Time Reduction Challenge (StayFree / Opal Parity) */}
        <View style={styles.challengeCard}>
          <View style={styles.challengeHeader}>
            <View style={styles.challengeIconBox}>
              <MaterialCommunityIcons name="target" size={20} color="#00E699" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.challengeBadge}>WEEKLY CHALLENGE</Text>
              <Text style={styles.challengeTitle}>-15% Screen Time Target</Text>
            </View>
            <View style={styles.challengePill}>
              <Text style={styles.challengePillText}>4/7 Days</Text>
            </View>
          </View>
          <Text style={styles.challengeSub}>
            Keep daily screen time under 2h 30m to achieve this week&apos;s digital detox badge.
          </Text>

          {/* 7-Day Rhythm Dots */}
          <View style={styles.weekDotsRow}>
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => {
              const isPassed = idx < 4;
              const isToday = idx === 4;
              return (
                <View key={idx} style={styles.dayCol}>
                  <View
                    style={[
                      styles.dayDot,
                      isPassed && styles.dayDotPassed,
                      isToday && styles.dayDotToday,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={isPassed ? 'check' : isToday ? 'record-circle-outline' : 'circle-outline'}
                      size={14}
                      color={isPassed ? '#070A11' : isToday ? '#00E699' : '#475569'}
                    />
                  </View>
                  <Text style={[styles.dayText, isToday && { color: '#00E699', fontWeight: 'bold' }]}>
                    {day}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Deep Digital Wellbeing & 24h Rhythm */}
        <View style={{ marginBottom: 20 }}>
          <UsageTimeline
            todayStat={todayStat}
            totalIntercepts={totalIntercepts}
            policies={settings.appQuotaPolicies}
            onEditAppQuota={(pkg, name) => setSelectedApp({ pkg, name })}
          />
        </View>

        {/* Sync Button */}
        <TouchableOpacity
          style={styles.syncButton}
          onPress={handleManualSync}
          disabled={syncing}
        >
          <MaterialCommunityIcons
            name={syncing ? 'loading' : 'refresh'}
            size={18}
            color={NinjaPalette.emerald}
          />
          <Text style={styles.syncButtonText}>
            {syncing ? 'Syncing...' : 'Sync Background Intercepts'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* App Quota & Curfew Setup Modal */}
      {selectedApp && (
        <AppQuotaModal
          visible={!!selectedApp}
          appName={selectedApp.name}
          packageName={selectedApp.pkg}
          currentPolicy={settings.appQuotaPolicies[selectedApp.pkg]}
          onClose={() => setSelectedApp(null)}
          onSave={(newPolicy) => {
            void updateQuotaPolicy(selectedApp.pkg, newPolicy);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#070A11',
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  badge: {
    color: NinjaPalette.emerald,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: NinjaPalette.textPrimary,
  },
  rankCard: {
    backgroundColor: '#0F1829',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  rankIconBox: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  rankTitle: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 4,
  },
  rankDesc: {
    fontSize: 12,
    color: NinjaPalette.textSecondary,
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 20,
    maxWidth: 240,
  },
  rankProgressBar: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    marginBottom: 8,
  },
  rankProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  rankProgressLabel: {
    fontSize: 11,
    color: NinjaPalette.textMuted,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#0F1829',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 18,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '900',
    color: NinjaPalette.textPrimary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: NinjaPalette.textSecondary,
  },
  todayCard: {
    backgroundColor: '#0F1829',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 20,
    marginBottom: 24,
  },
  todayHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: NinjaPalette.emerald,
    letterSpacing: 1.5,
    marginBottom: 14,
  },
  todayRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  todayVal: {
    fontSize: 22,
    fontWeight: '900',
    color: NinjaPalette.textPrimary,
    textAlign: 'center',
  },
  todaySub: {
    fontSize: 12,
    color: NinjaPalette.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  challengeCard: {
    backgroundColor: '#0F1829',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 153, 0.2)',
    padding: 20,
    marginBottom: 20,
  },
  challengeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  challengeIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 230, 153, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  challengeBadge: {
    color: '#00E699',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  challengeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: NinjaPalette.textPrimary,
  },
  challengePill: {
    backgroundColor: 'rgba(0, 230, 153, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 153, 0.3)',
  },
  challengePillText: {
    color: '#00E699',
    fontSize: 11,
    fontWeight: '700',
  },
  challengeSub: {
    fontSize: 12,
    color: NinjaPalette.textSecondary,
    marginBottom: 16,
    lineHeight: 16,
  },
  weekDotsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 16,
    padding: 12,
  },
  dayCol: {
    alignItems: 'center',
    gap: 6,
  },
  dayDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  dayDotPassed: {
    backgroundColor: '#00E699',
    borderColor: '#00E699',
  },
  dayDotToday: {
    borderColor: '#00E699',
    borderWidth: 1.5,
  },
  dayText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  syncButtonText: {
    color: NinjaPalette.emerald,
    fontSize: 13,
    fontWeight: 'bold',
  },
});

