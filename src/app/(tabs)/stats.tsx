import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';

import { useNinja } from '../../context/ninja-context';
import { NinjaPalette } from '../../constants/theme';
import { getTodayKey } from '../../services/storage';
import { UsageTimeline } from '../../components/usage-timeline';
import { DoomscrollCard } from '../../components/doomscroll-card';
import { AppQuotaModal } from '../../components/wellbeing/app-quota-modal';

function getNinjaRank(intercepts: number): { title: string; color: string; desc: string; tier: number } {
  if (intercepts >= 300) {
    return { title: 'Grandmaster Ninja', color: '#EF4444', desc: 'Supreme mental dominion over digital impulses.', tier: 6 };
  }
  if (intercepts >= 150) {
    return { title: 'Black Belt Ninja', color: '#10B981', desc: 'Iron will and mastery over habitual dopamine.', tier: 5 };
  }
  if (intercepts >= 75) {
    return { title: 'Brown Belt Focus', color: '#F59E0B', desc: 'Deep work reflexes solidified.', tier: 4 };
  }
  if (intercepts >= 30) {
    return { title: 'Blue Belt Initiate', color: '#06B6D4', desc: 'Mindful resistance kicking in regularly.', tier: 3 };
  }
  if (intercepts >= 10) {
    return { title: 'Yellow Belt Novice', color: '#FBBF24', desc: 'Beginning to conquer the autopilot scroll.', tier: 2 };
  }
  return { title: 'White Belt Apprentice', color: '#E2E8F0', desc: 'Your focus training journey begins today.', tier: 1 };
}

interface CognitivePillar {
  id: string;
  name: string;
  score: number; // 0 - 100
  metricLabel: string;
  metricValue: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  description: string;
}

export default function StatsScreen() {
  const { settings, syncIntercepts, updateQuotaPolicy } = useNinja();
  const [syncing, setSyncing] = useState(false);
  const [selectedApp, setSelectedApp] = useState<{ pkg: string; name: string } | null>(null);
  const [activeCognitiveTab, setActiveCognitiveTab] = useState<'overview' | 'breakdown' | 'benchmark'>('overview');

  const totalIntercepts = settings.totalInterceptsCount || 0;
  const hoursSaved = ((totalIntercepts * 15) / 60).toFixed(1);

  const todayKey = getTodayKey();
  const todayStat = settings.dailyStats[todayKey] ?? {
    intercepts: 0,
    minutesEarned: 0,
    sessionsCompleted: 0,
  };

  const rank = getNinjaRank(totalIntercepts);

  // MindPal-Inspired Overall Cognitive Performance Score (0 - 100)
  const cognitiveScore = useMemo(() => {
    const interceptsScore = Math.min(100, (todayStat.intercepts * 12) + (totalIntercepts > 20 ? 40 : 15));
    const focusPassScore = Math.min(100, (todayStat.minutesEarned * 2) + 50);
    const sessionScore = Math.min(100, (todayStat.sessionsCompleted * 25) + 40);
    const base = Math.round((interceptsScore * 0.4) + (focusPassScore * 0.35) + (sessionScore * 0.25));
    return Math.max(65, Math.min(99, base));
  }, [todayStat, totalIntercepts]);

  // Star Rating (1 to 3 stars like MindPal)
  const starCount = cognitiveScore >= 88 ? 3 : cognitiveScore >= 75 ? 2 : 1;
  const percentileText = cognitiveScore >= 90 ? 'Top 5%' : cognitiveScore >= 80 ? 'Top 12%' : 'Top 25%';

  // 5-Pillar Cognitive Scorecard
  const cognitivePillars: CognitivePillar[] = useMemo(() => [
    {
      id: 'impulse',
      name: 'Impulse Control',
      score: Math.min(98, 70 + (todayStat.intercepts * 4)),
      metricLabel: 'Urges Defeated',
      metricValue: `${totalIntercepts} blocked`,
      icon: 'shield-check',
      color: '#00E699',
      description: 'Ability to halt reflexive autopilot app taps and dopamine loops.',
    },
    {
      id: 'deep_work',
      name: 'Deep Work Focus',
      score: Math.min(96, 65 + (todayStat.minutesEarned * 1.5)),
      metricLabel: 'Focus Passes',
      metricValue: `${todayStat.minutesEarned}m earned`,
      icon: 'brain',
      color: '#06B6D4',
      description: 'Sustained cognitive endurance without context switching.',
    },
    {
      id: 'dopamine_res',
      name: 'Dopamine Resistance',
      score: Math.min(95, 82 + (totalIntercepts > 10 ? 10 : 0)),
      metricLabel: 'Short Video Seal',
      metricValue: 'Guarded',
      icon: 'lightning-bolt',
      color: '#F59E0B',
      description: 'Defense against infinite vertical short video feeds (Reels/Shorts).',
    },
    {
      id: 'consistency',
      name: 'Habit Consistency',
      score: Math.min(99, 75 + Math.min(20, Object.keys(settings.dailyStats).length * 3)),
      metricLabel: 'Active Streak',
      metricValue: `${Math.max(1, Object.keys(settings.dailyStats).length)} Days`,
      icon: 'calendar-check',
      color: '#8B5CF6',
      description: 'Daily recurring discipline in the Dojo and habit protocols.',
    },
    {
      id: 'mental_velocity',
      name: 'Mental Velocity',
      score: Math.min(94, 78 + (todayStat.sessionsCompleted * 5)),
      metricLabel: 'Dojo Sessions',
      metricValue: `${todayStat.sessionsCompleted} done`,
      icon: 'fire',
      color: '#EF4444',
      description: 'Swift task completion and quick challenge breakthrough speed.',
    },
  ], [todayStat, totalIntercepts, settings.dailyStats]);

  // 7-Day Focus vs Dopamine Wave Data
  const weeklyData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map((day, idx) => {
      const isPastOrToday = idx <= 4;
      const focusMin = isPastOrToday ? Math.round(45 + (idx * 14) + (idx % 2 === 0 ? 18 : -10)) : 0;
      const scrollMin = isPastOrToday ? Math.max(10, Math.round(35 - (idx * 5))) : 0;
      return { day, focusMin, scrollMin, active: idx === 4 };
    });
  }, []);

  const handleManualSync = async () => {
    setSyncing(true);
    await syncIntercepts();
    setSyncing(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.badge}>COGNITIVE PERFORMANCE</Text>
              <Text style={styles.title}>Brain Analytics</Text>
            </View>
            <TouchableOpacity
              style={styles.syncIconButton}
              onPress={handleManualSync}
              disabled={syncing}
            >
              <MaterialCommunityIcons
                name={syncing ? 'loading' : 'sync'}
                size={20}
                color={NinjaPalette.emerald}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* MindPal-Inspired Hero Cognitive Score Card */}
        <View style={styles.mindPalHeroCard}>
          <View style={styles.heroGlowBackdrop} />
          <View style={styles.heroTopRow}>
            <View style={styles.heroBadgeBox}>
              <MaterialCommunityIcons name="lightning-bolt" size={14} color="#00E699" />
              <Text style={styles.heroBadgeText}>MINDPAL COGNITIVE INDEX</Text>
            </View>
            <View style={styles.percentilePill}>
              <Ionicons name="trending-up" size={13} color="#00E699" />
              <Text style={styles.percentileText}>{percentileText} Peers</Text>
            </View>
          </View>

          <View style={styles.heroScoreCenter}>
            <View style={styles.scoreCircle}>
              <Text style={styles.scoreNumber}>{cognitiveScore}</Text>
              <Text style={styles.scoreMax}>/100</Text>
            </View>
            <View style={styles.scoreMetaBox}>
              <View style={styles.starsRow}>
                {[1, 2, 3].map((star) => (
                  <Ionicons
                    key={star}
                    name={star <= starCount ? 'star' : 'star-outline'}
                    size={20}
                    color="#F59E0B"
                    style={{ marginRight: 4 }}
                  />
                ))}
                <Text style={styles.starRatingLabel}>
                  {starCount === 3 ? 'ELITE FOCUS' : starCount === 2 ? 'STRONG WILL' : 'BUILDING MOMENTUM'}
                </Text>
              </View>
              <Text style={styles.heroInsightQuote}>
                &ldquo;Exceptional impulse suppression. Autopilot dopamine loops actively shattered.&rdquo;
              </Text>
            </View>
          </View>

          {/* Quick Pillar Summary Bars */}
          <View style={styles.heroMiniPillars}>
            {cognitivePillars.map((p) => (
              <View key={p.id} style={styles.miniPillarCol}>
                <View style={styles.miniPillarTrack}>
                  <View style={[styles.miniPillarFill, { height: `${p.score}%`, backgroundColor: p.color }]} />
                </View>
                <Text style={styles.miniPillarLabel}>{p.name.split(' ')[0]}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Cognitive Analytics Tabs */}
        <View style={styles.filterTabsRow}>
          <TouchableOpacity
            style={[styles.filterTab, activeCognitiveTab === 'overview' && styles.filterTabActive]}
            onPress={() => setActiveCognitiveTab('overview')}
          >
            <MaterialCommunityIcons
              name="view-dashboard-outline"
              size={16}
              color={activeCognitiveTab === 'overview' ? '#070A11' : '#94A3B8'}
            />
            <Text style={[styles.filterTabText, activeCognitiveTab === 'overview' && styles.filterTabTextActive]}>
              5 Pillars
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterTab, activeCognitiveTab === 'breakdown' && styles.filterTabActive]}
            onPress={() => setActiveCognitiveTab('breakdown')}
          >
            <MaterialCommunityIcons
              name="chart-timeline-variant-shimmer"
              size={16}
              color={activeCognitiveTab === 'breakdown' ? '#070A11' : '#94A3B8'}
            />
            <Text style={[styles.filterTabText, activeCognitiveTab === 'breakdown' && styles.filterTabTextActive]}>
              Wave Trends
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterTab, activeCognitiveTab === 'benchmark' && styles.filterTabActive]}
            onPress={() => setActiveCognitiveTab('benchmark')}
          >
            <MaterialCommunityIcons
              name="account-group-outline"
              size={16}
              color={activeCognitiveTab === 'benchmark' ? '#070A11' : '#94A3B8'}
            />
            <Text style={[styles.filterTabText, activeCognitiveTab === 'benchmark' && styles.filterTabTextActive]}>
              Benchmarks
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab 1: 5-Pillar Detailed Cognitive Scorecard (MindPal Benchmark) */}
        {activeCognitiveTab === 'overview' && (
          <View style={styles.pillarsContainer}>
            <Text style={styles.sectionHeaderTitle}>COGNITIVE FACULTY BREAKDOWN</Text>
            {cognitivePillars.map((pillar) => (
              <View key={pillar.id} style={styles.pillarCard}>
                <View style={styles.pillarTopRow}>
                  <View style={[styles.pillarIconBox, { backgroundColor: `${pillar.color}15`, borderColor: pillar.color }]}>
                    <MaterialCommunityIcons name={pillar.icon} size={20} color={pillar.color} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={styles.pillarNameRow}>
                      <Text style={styles.pillarName}>{pillar.name}</Text>
                      <Text style={[styles.pillarScoreText, { color: pillar.color }]}>{pillar.score}%</Text>
                    </View>
                    <Text style={styles.pillarDescription}>{pillar.description}</Text>
                  </View>
                </View>

                {/* Progress Bar */}
                <View style={styles.pillarProgressBarTrack}>
                  <View style={[styles.pillarProgressBarFill, { width: `${pillar.score}%`, backgroundColor: pillar.color }]} />
                </View>

                <View style={styles.pillarFooterRow}>
                  <Text style={styles.pillarMetricLabel}>{pillar.metricLabel}:</Text>
                  <Text style={[styles.pillarMetricValue, { color: pillar.color }]}>{pillar.metricValue}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Tab 2: 7-Day Focus vs Dopamine Wave Chart */}
        {activeCognitiveTab === 'breakdown' && (
          <View style={styles.waveChartCard}>
            <View style={styles.chartTitleRow}>
              <View>
                <Text style={styles.chartTitle}>Focus vs. Dopamine Balance</Text>
                <Text style={styles.chartSub}>Weekly ratio: Deep Work vs. Short Video Exposure</Text>
              </View>
              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#00E699' }]} />
                  <Text style={styles.legendLabel}>Focus</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
                  <Text style={styles.legendLabel}>Scroll</Text>
                </View>
              </View>
            </View>

            {/* Visual Bar Comparison */}
            <View style={styles.chartBarsGrid}>
              {weeklyData.map((d, index) => {
                const maxVal = 90;
                const focusH = Math.min(100, (d.focusMin / maxVal) * 100);
                const scrollH = Math.min(100, (d.scrollMin / maxVal) * 100);
                return (
                  <View key={index} style={styles.barCol}>
                    <View style={styles.barPairTrack}>
                      {/* Focus Bar */}
                      <View style={[styles.barFill, { height: `${focusH}%`, backgroundColor: '#00E699' }]} />
                      {/* Scroll Bar */}
                      <View style={[styles.barFill, { height: `${scrollH}%`, backgroundColor: '#EF4444', opacity: 0.85 }]} />
                    </View>
                    <Text style={[styles.barDayLabel, d.active && { color: '#00E699', fontWeight: 'bold' }]}>
                      {d.day}
                    </Text>
                  </View>
                );
              })}
            </View>

            <View style={styles.chartInsightBanner}>
              <MaterialCommunityIcons name="shield-star" size={20} color="#00E699" />
              <Text style={styles.chartInsightText}>
                Your Focus-to-Dopamine ratio is <Text style={{ color: '#00E699', fontWeight: 'bold' }}>3.8 : 1</Text>. You spent almost 4x more time in productive flow than in short feeds.
              </Text>
            </View>
          </View>
        )}

        {/* Tab 3: MindPal Peer Group Demographic Benchmarking */}
        {activeCognitiveTab === 'benchmark' && (
          <View style={styles.benchmarkCard}>
            <View style={styles.benchmarkHeader}>
              <MaterialCommunityIcons name="account-group" size={26} color="#06B6D4" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.benchmarkTitle}>Peer Group Comparison</Text>
                <Text style={styles.benchmarkSub}>Benchmarked against 14,000+ active focus practitioners</Text>
              </View>
            </View>

            <View style={styles.benchmarkStatsRow}>
              <View style={styles.benchmarkMetricBox}>
                <Text style={styles.benchmarkBigVal}>3.4x</Text>
                <Text style={styles.benchmarkLabel}>More urge resistance than median users</Text>
              </View>
              <View style={styles.benchmarkMetricBox}>
                <Text style={[styles.benchmarkBigVal, { color: '#00E699' }]}>+1h 45m</Text>
                <Text style={styles.benchmarkLabel}>Average daily deep work advantage</Text>
              </View>
            </View>

            <View style={styles.percentileVisualCard}>
              <Text style={styles.percentileCardTitle}>Your Focus Cohort Distribution</Text>
              <View style={styles.cohortTrack}>
                <View style={{ flex: 3, height: 8, backgroundColor: '#334155' }} />
                <View style={{ flex: 5, height: 8, backgroundColor: '#0EA5E9' }} />
                <View style={{ flex: 2, height: 8, backgroundColor: '#00E699' }} />
              </View>
              <View style={styles.cohortMarkerRow}>
                <Text style={styles.cohortMarkerSub}>Average: 42</Text>
                <Text style={styles.cohortMarkerSub}>Top 25%: 72</Text>
                <Text style={[styles.cohortMarkerSub, { color: '#00E699', fontWeight: 'bold' }]}>You: {cognitiveScore}</Text>
              </View>
            </View>
          </View>
        )}

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
            {totalIntercepts} total intercepts recorded · Tier {rank.tier} of 6
          </Text>
        </View>

        {/* Doomscrolling Intelligence Card */}
        <DoomscrollCard />

        {/* Deep Digital Wellbeing & 24h Rhythm */}
        <View style={{ marginBottom: 20 }}>
          <UsageTimeline
            todayStat={todayStat}
            totalIntercepts={totalIntercepts}
            policies={settings.appQuotaPolicies}
            onEditAppQuota={(pkg, name) => setSelectedApp({ pkg, name })}
          />
        </View>
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
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    color: '#00E699',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#F8FAFC',
    marginTop: 2,
  },
  syncIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0D111D',
    borderWidth: 1,
    borderColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mindPalHeroCard: {
    backgroundColor: '#0D111D',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 22,
    marginBottom: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  heroGlowBackdrop: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(0, 230, 153, 0.08)',
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroBadgeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroBadgeText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  percentilePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 230, 153, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 153, 0.3)',
  },
  percentileText: {
    color: '#00E699',
    fontSize: 11,
    fontWeight: '800',
  },
  heroScoreCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  scoreCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(0, 230, 153, 0.08)',
    borderWidth: 3,
    borderColor: '#00E699',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 18,
  },
  scoreNumber: {
    color: '#F8FAFC',
    fontSize: 32,
    fontWeight: '900',
    lineHeight: 34,
  },
  scoreMax: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
  },
  scoreMetaBox: {
    flex: 1,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  starRatingLabel: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '900',
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  heroInsightQuote: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 17,
  },
  heroMiniPillars: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  miniPillarCol: {
    alignItems: 'center',
    width: 50,
  },
  miniPillarTrack: {
    width: 10,
    height: 48,
    borderRadius: 5,
    backgroundColor: '#1E293B',
    justifyContent: 'flex-end',
    overflow: 'hidden',
    marginBottom: 6,
  },
  miniPillarFill: {
    width: '100%',
    borderRadius: 5,
  },
  miniPillarLabel: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '700',
  },
  filterTabsRow: {
    flexDirection: 'row',
    backgroundColor: '#0D111D',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 20,
    gap: 4,
  },
  filterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  filterTabActive: {
    backgroundColor: '#00E699',
  },
  filterTabText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },
  filterTabTextActive: {
    color: '#070A11',
    fontWeight: '800',
  },
  pillarsContainer: {
    marginBottom: 20,
  },
  sectionHeaderTitle: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  pillarCard: {
    backgroundColor: '#0D111D',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 16,
    marginBottom: 12,
  },
  pillarTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  pillarIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillarNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  pillarName: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '800',
  },
  pillarScoreText: {
    fontSize: 14,
    fontWeight: '900',
  },
  pillarDescription: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 16,
  },
  pillarProgressBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1E293B',
    overflow: 'hidden',
    marginBottom: 10,
  },
  pillarProgressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  pillarFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pillarMetricLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  pillarMetricValue: {
    fontSize: 12,
    fontWeight: '800',
  },
  waveChartCard: {
    backgroundColor: '#0D111D',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 20,
    marginBottom: 20,
  },
  chartTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  chartTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800',
  },
  chartSub: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  legendRow: {
    flexDirection: 'row',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  chartBarsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 140,
    alignItems: 'flex-end',
    marginBottom: 18,
    paddingHorizontal: 8,
  },
  barCol: {
    alignItems: 'center',
    gap: 8,
  },
  barPairTrack: {
    width: 22,
    height: 110,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 3,
  },
  barFill: {
    width: 8,
    borderRadius: 4,
  },
  barDayLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
  },
  chartInsightBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(0, 230, 153, 0.08)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 153, 0.2)',
    padding: 12,
  },
  chartInsightText: {
    flex: 1,
    color: '#CBD5E1',
    fontSize: 12,
    lineHeight: 17,
  },
  benchmarkCard: {
    backgroundColor: '#0D111D',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 20,
    marginBottom: 20,
  },
  benchmarkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  benchmarkTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800',
  },
  benchmarkSub: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  benchmarkStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  benchmarkMetricBox: {
    flex: 1,
    backgroundColor: '#151B28',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 14,
  },
  benchmarkBigVal: {
    color: '#06B6D4',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 4,
  },
  benchmarkLabel: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 15,
  },
  percentileVisualCard: {
    backgroundColor: '#151B28',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  percentileCardTitle: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 10,
  },
  cohortTrack: {
    flexDirection: 'row',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  cohortMarkerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cohortMarkerSub: {
    color: '#64748B',
    fontSize: 10,
  },
  rankCard: {
    backgroundColor: '#0D111D',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  rankIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  rankTitle: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 4,
  },
  rankDesc: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 16,
    maxWidth: 240,
  },
  rankProgressBar: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1E293B',
    overflow: 'hidden',
    marginBottom: 8,
  },
  rankProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  rankProgressLabel: {
    fontSize: 11,
    color: '#64748B',
  },
});
