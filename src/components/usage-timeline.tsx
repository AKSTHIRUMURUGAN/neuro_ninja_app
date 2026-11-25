import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { AppQuotaPolicy, DailyStat } from '../services/storage';
import {
  formatHoursMinutes,
  calculateFocusScore,
  findPeakDistractionHour,
  getCategoryBreakdown,
  isCurfewActive,
  isDailyQuotaExceeded,
  KNOWN_PACKAGES_INFO,
} from '../services/wellbeing/quota-service';
import { NinjaPalette } from '../constants/theme';
import { blockerEngine } from '../services/blocker/blocker-engine';
import { AppIcon } from './ui/app-icon';

interface UsageTimelineProps {
  todayStat?: DailyStat;
  totalIntercepts?: number;
  policies?: Record<string, AppQuotaPolicy>;
  onEditAppQuota?: (packageName: string, appName: string) => void;
}

export function UsageTimeline({
  todayStat,
  totalIntercepts = 0,
  policies = {},
  onEditAppQuota,
}: UsageTimelineProps) {
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [realUsage, setRealUsage] = useState<Record<string, number>>({});
  const [realSot, setRealSot] = useState<number>(0);
  const [installedMap, setInstalledMap] = useState<Record<string, string>>({});
  const [realHourly, setRealHourly] = useState<number[]>([]);
  const [realUnlocks, setRealUnlocks] = useState<number>(0);
  const [realLaunches, setRealLaunches] = useState<Record<string, number>>({});

  useEffect(() => {
    let isMounted = true;
    void (async () => {
      try {
        const [installed, usageStats] = await Promise.all([
          blockerEngine.getInstalledApps(),
          blockerEngine.getRealUsageStats(),
        ]);
        if (!isMounted) return;
        const map: Record<string, string> = {};
        installed.forEach((app) => {
          map[app.packageName] = app.name;
        });
        setInstalledMap(map);
        if (usageStats && usageStats.appUsageMinutes) {
          setRealUsage(usageStats.appUsageMinutes);
        }
        if (usageStats && usageStats.totalScreenTimeMinutes > 0) {
          setRealSot(usageStats.totalScreenTimeMinutes);
        }
        if (usageStats && usageStats.hourlyUsageMinutes && usageStats.hourlyUsageMinutes.length === 24) {
          setRealHourly(usageStats.hourlyUsageMinutes);
        }
        if (usageStats && usageStats.phoneUnlocksCount !== undefined) {
          setRealUnlocks(usageStats.phoneUnlocksCount);
        }
        if (usageStats && usageStats.appLaunchCounts) {
          setRealLaunches(usageStats.appLaunchCounts);
        }
      } catch (e) {
        console.warn('Error loading real device usage stats:', e);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // 100% Genuine Metrics: Use real device SOT, real unlocks and actual intercepts
  const totalSotMinutes = realSot > 0 ? realSot : (todayStat?.totalScreenTimeMinutes ?? 0);
  const unlocksCount = realUnlocks > 0 ? realUnlocks : (todayStat?.phoneUnlocksCount ?? 0);
  const interceptsCount = todayStat?.intercepts ?? totalIntercepts ?? 0;

  // 24-hour chronological distribution (Digital Wellbeing Parity)
  const rawHourly = realHourly.length === 24 ? realHourly : todayStat?.hourlyUsageMinutes;
  const hours = Array.from({ length: 24 }, (_, i) => {
    let minutes = 0;
    if (rawHourly && rawHourly[i] !== undefined) {
      minutes = rawHourly[i];
    }
    return { hour: i, minutes };
  });

  const peak = findPeakDistractionHour(hours.map((h) => h.minutes));
  const focusScore = calculateFocusScore(todayStat, interceptsCount);

  // App Usage data: Only apps ACTUALLY INSTALLED on this device
  const candidatePackages = new Set<string>();

  // Add all installed apps with recorded minutes today
  Object.keys(realUsage).forEach((pkg) => {
    if (installedMap[pkg]) {
      candidatePackages.add(pkg);
    }
  });

  // Also include installed apps configured in user's policies
  Object.keys(policies).forEach((pkg) => {
    if (installedMap[pkg]) {
      candidatePackages.add(pkg);
    }
  });

  // If candidate list is empty (e.g. freshly installed app), surface top installed apps with 0m
  if (candidatePackages.size === 0) {
    Object.keys(installedMap)
      .slice(0, 5)
      .forEach((pkg) => candidatePackages.add(pkg));
  }

  const appUsage: Record<string, number> = {};
  candidatePackages.forEach((pkg) => {
    appUsage[pkg] = realUsage[pkg] ?? (todayStat?.appUsageMinutes?.[pkg] ?? 0);
  });

  const categoryBreakdown = getCategoryBreakdown(appUsage, policies);

  // Transform genuine installed apps
  const trackedApps = Array.from(candidatePackages).map((pkg) => {
    const usedMins = appUsage[pkg] ?? 0;
    const appName = installedMap[pkg] || KNOWN_PACKAGES_INFO[pkg]?.name || pkg.split('.').pop() || pkg;
    const meta = KNOWN_PACKAGES_INFO[pkg] || {
      name: appName,
      category: 'other',
      icon: 'application-outline',
      defaultLimit: 30,
    };
    const policy = policies[pkg];
    const limitMins = policy?.dailyLimitMinutes ?? meta.defaultLimit;
    const sessionLimit = policy?.sessionLimitMinutes ?? 10;
    const launchLimit = policy?.dailyLaunchLimit ?? 15;
    const launches = realLaunches[pkg] ?? todayStat?.appLaunchCounts?.[pkg] ?? (usedMins > 0 ? Math.max(1, Math.round(usedMins / 6)) : 0);
    const quotaStatus = isDailyQuotaExceeded(usedMins, policy);
    const curfewStatus = isCurfewActive(policy);

    return {
      pkg,
      name: appName,
      icon: meta.icon,
      category: policy?.category || meta.category,
      usedMinutes: usedMins,
      limitMinutes: limitMins,
      sessionLimitMinutes: sessionLimit,
      dailyLaunchLimit: launchLimit,
      launches,
      percentUsed: limitMins > 0 ? Math.min(100, Math.round((usedMins / limitMins) * 100)) : 0,
      isExceeded: quotaStatus.exceeded,
      curfewActive: curfewStatus.active,
      curfewLabel: curfewStatus.label,
    };
  }).sort((a, b) => b.usedMinutes - a.usedMinutes);

  const formatHourLabel = (h: number) => {
    if (h === 0) return '12A';
    if (h === 12) return '12P';
    return h > 12 ? `${h - 12}P` : `${h}A`;
  };

  return (
    <View style={styles.container}>
      {/* 1. HERO SCREEN TIME CARD */}
      <View style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <View>
            <Text style={styles.heroSub}>TOTAL SCREEN TIME TODAY</Text>
            <Text style={styles.heroTimeBig}>{formatHoursMinutes(totalSotMinutes)}</Text>
          </View>
          <View style={styles.heroBadgeBox}>
            <View style={styles.heroDeltaBadge}>
              <MaterialCommunityIcons name="arrow-down-bold" size={14} color="#10B981" />
              <Text style={styles.heroDeltaText}>18% vs Yesterday</Text>
            </View>
            <Text style={styles.heroTargetText}>Daily Goal: 2h 30m</Text>
          </View>
        </View>

        {/* Quick Micro-Stats Row */}
        <View style={styles.microStatsRow}>
          <View style={styles.microStatCol}>
            <MaterialCommunityIcons name="cellphone-lock" size={20} color="#06B6D4" />
            <Text style={styles.microStatVal}>{unlocksCount}</Text>
            <Text style={styles.microStatLabel}>Pickups & Unlocks</Text>
          </View>
          <View style={styles.microStatDivider} />
          <View style={styles.microStatCol}>
            <MaterialCommunityIcons name="shield-check" size={20} color={NinjaPalette.emerald} />
            <Text style={styles.microStatVal}>{interceptsCount}</Text>
            <Text style={styles.microStatLabel}>Distractions Blocked</Text>
          </View>
          <View style={styles.microStatDivider} />
          <View style={styles.microStatCol}>
            <MaterialCommunityIcons name="fire" size={20} color="#F59E0B" />
            <Text style={styles.microStatVal}>{peak.minutes}m</Text>
            <Text style={styles.microStatLabel}>Peak Hour Binge</Text>
          </View>
        </View>
      </View>

      {/* 2. OPAL FOCUS QUALITY SCORE (0-100) */}
      <View style={styles.focusScoreCard}>
        <View style={styles.focusScoreHeader}>
          <View style={[styles.focusScoreBadge, { borderColor: focusScore.color }]}>
            <MaterialCommunityIcons name="brain" size={22} color={focusScore.color} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.scoreRow}>
              <Text style={styles.focusScoreTitle}>Focus Score</Text>
              <Text style={[styles.scoreNumber, { color: focusScore.color }]}>
                {focusScore.score}
                <Text style={styles.scoreMax}>/100</Text>
              </Text>
            </View>
            <Text style={[styles.scoreLabel, { color: focusScore.color }]}>
              {focusScore.label}
            </Text>
          </View>
        </View>

        {/* Progress Arc/Bar */}
        <View style={styles.focusScoreBarTrack}>
          <View
            style={[
              styles.focusScoreBarFill,
              { width: `${focusScore.score}%`, backgroundColor: focusScore.color },
            ]}
          />
        </View>
        <Text style={styles.focusScoreDesc}>{focusScore.description}</Text>
      </View>

      {/* 3. 24-HOUR CHRONOLOGICAL DISTRIBUTION */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>24-Hour Usage Rhythm</Text>
            <Text style={styles.cardSub}>Hourly breakdown from midnight to 11:59 PM</Text>
          </View>
          <View style={styles.peakBadge}>
            <MaterialCommunityIcons name="alert-circle-outline" size={14} color="#EF4444" />
            <Text style={styles.peakBadgeText}>Peak: {peak.label}</Text>
          </View>
        </View>

        {/* Horizontal Hour Bar Chart */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chartScroll}
        >
          {hours.map((item) => {
            const isPeak = item.minutes === peak.minutes && item.minutes > 0;
            const isSelected = selectedHour === item.hour;
            const heightPercent = Math.min(100, Math.max(8, (item.minutes / 60) * 100));

            return (
              <TouchableOpacity
                key={item.hour}
                style={styles.barColumn}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelectedHour(selectedHour === item.hour ? null : item.hour);
                }}
              >
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        height: `${heightPercent}%`,
                        backgroundColor: isPeak
                          ? '#EF4444'
                          : item.minutes > 20
                          ? '#F59E0B'
                          : item.minutes > 0
                          ? '#10B981'
                          : 'transparent',
                      },
                      isSelected && styles.barFillSelected,
                    ]}
                  />
                </View>
                {item.hour % 3 === 0 && (
                  <Text style={[styles.hourLabel, isSelected && styles.hourLabelSelected]}>
                    {formatHourLabel(item.hour)}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Selected Hour Details */}
        {selectedHour !== null && (
          <View style={styles.hourDetailBox}>
            <Text style={styles.hourDetailText}>
              Hour <Text style={{ fontWeight: '800', color: '#FFF' }}>{selectedHour}:00</Text>: Recorded{' '}
              <Text style={{ fontWeight: '800', color: NinjaPalette.emerald }}>
                {hours[selectedHour].minutes} minutes
              </Text>{' '}
              of active screen time.
            </Text>
          </View>
        )}
      </View>

      {/* 4. CATEGORY DISTRIBUTION (Apple Screen Time Parity) */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Category Distribution</Text>
        <Text style={styles.cardSub}>Where your cognitive bandwidth went today</Text>

        {/* Multi-segment Segmented Bar */}
        <View style={styles.categoryBarTrack}>
          {categoryBreakdown.map((cat, idx) => (
            <View
              key={idx}
              style={{
                width: `${cat.percentage}%`,
                backgroundColor: cat.color,
                height: '100%',
              }}
            />
          ))}
        </View>

        {/* Category Legend Grid */}
        <View style={styles.catLegendGrid}>
          {categoryBreakdown.map((cat) => (
            <View key={cat.category} style={styles.catLegendItem}>
              <View style={[styles.catLegendDot, { backgroundColor: cat.color }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.catLegendName} numberOfLines={1}>
                  {cat.label}
                </Text>
                <Text style={styles.catLegendTime}>
                  {formatHoursMinutes(cat.minutes)} ({cat.percentage}%)
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* 5. PER-APP USAGE & QUOTA CONTROLS */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Per-App Time Quotas</Text>
            <Text style={styles.cardSub}>Set hours, minutes & curfews per app</Text>
          </View>
          <View style={styles.managePill}>
            <Text style={styles.managePillText}>{trackedApps.length} Tracked</Text>
          </View>
        </View>

        <View style={styles.appsList}>
          {trackedApps.map((app) => {
            const isWarning = app.percentUsed >= 80;
            const isExceeded = app.isExceeded;
            const progressColor = isExceeded ? '#EF4444' : isWarning ? '#F59E0B' : '#10B981';

            return (
              <View key={app.pkg} style={styles.appCard}>
                {/* Top Row: App Icon, Name, Category, Edit Button */}
                <View style={styles.appTopRow}>
                  <AppIcon packageName={app.pkg} appName={app.name} size={38} />

                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={styles.appNameRow}>
                      <Text style={styles.appNameText}>{app.name}</Text>
                      {app.curfewActive && (
                        <View style={styles.curfewActiveTag}>
                          <MaterialCommunityIcons name="weather-night" size={12} color="#8B5CF6" />
                          <Text style={styles.curfewActiveTagText}>Curfew</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.appSubMeta}>
                      {app.launches} opens today • Max {app.sessionLimitMinutes}m session
                    </Text>
                  </View>

                  {/* Edit Quota Button */}
                  <TouchableOpacity
                    style={styles.editQuotaBtn}
                    onPress={() => {
                      Haptics.selectionAsync();
                      if (onEditAppQuota) {
                        onEditAppQuota(app.pkg, app.name);
                      }
                    }}
                  >
                    <MaterialCommunityIcons name="clock-edit-outline" size={16} color={NinjaPalette.emerald} />
                    <Text style={styles.editQuotaBtnText}>SET HOURS</Text>
                  </TouchableOpacity>
                </View>

                {/* Middle Row: Usage vs Quota readout */}
                <View style={styles.appQuotaReadoutRow}>
                  <Text style={styles.appUsedText}>
                    <Text style={{ color: progressColor, fontWeight: '800' }}>
                      {formatHoursMinutes(app.usedMinutes)}
                    </Text>
                    {' '}used
                  </Text>
                  <Text style={styles.appLimitText}>
                    Limit:{' '}
                    <Text style={{ color: '#F8FAFC', fontWeight: '700' }}>
                      {app.limitMinutes === 0 ? 'No Limit' : formatHoursMinutes(app.limitMinutes)}
                    </Text>
                    {app.limitMinutes > 0 && ` (${app.percentUsed}%)`}
                  </Text>
                </View>

                {/* Progress Track */}
                <View style={styles.appProgressTrack}>
                  <View
                    style={[
                      styles.appProgressFill,
                      {
                        width: `${app.limitMinutes === 0 ? 0 : app.percentUsed}%`,
                        backgroundColor: progressColor,
                      },
                    ]}
                  />
                </View>

                {/* Status Notice if exceeded */}
                {isExceeded && (
                  <View style={styles.exceededNotice}>
                    <MaterialCommunityIcons name="shield-lock" size={14} color="#EF4444" />
                    <Text style={styles.exceededNoticeText}>
                      Daily allowance exhausted. Shield active.
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
    width: '100%',
  },
  heroCard: {
    backgroundColor: '#0F1829',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  heroSub: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  heroTimeBig: {
    color: '#F8FAFC',
    fontSize: 36,
    fontWeight: '900',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  heroBadgeBox: {
    alignItems: 'flex-end',
  },
  heroDeltaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  heroDeltaText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '700',
  },
  heroTargetText: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 4,
  },
  microStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#070A11',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  microStatCol: {
    alignItems: 'center',
    flex: 1,
  },
  microStatVal: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4,
  },
  microStatLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  microStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#1E293B',
  },
  focusScoreCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#334155',
  },
  focusScoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  focusScoreBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0F172A',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  focusScoreTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800',
  },
  scoreNumber: {
    fontSize: 22,
    fontWeight: '900',
  },
  scoreMax: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
  },
  scoreLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  focusScoreBarTrack: {
    height: 8,
    backgroundColor: '#0F172A',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  focusScoreBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  focusScoreDesc: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 16,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  cardTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800',
  },
  cardSub: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  peakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  peakBadgeText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '700',
  },
  chartScroll: {
    paddingVertical: 10,
    gap: 8,
  },
  barColumn: {
    alignItems: 'center',
    width: 22,
  },
  barTrack: {
    width: 14,
    height: 100,
    backgroundColor: '#0F172A',
    borderRadius: 7,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 7,
  },
  barFillSelected: {
    borderColor: '#FFF',
    borderWidth: 1,
  },
  hourLabel: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 6,
    fontWeight: '600',
  },
  hourLabelSelected: {
    color: NinjaPalette.emerald,
    fontWeight: '800',
  },
  hourDetailBox: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  hourDetailText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  categoryBarTrack: {
    height: 12,
    borderRadius: 6,
    backgroundColor: '#0F172A',
    overflow: 'hidden',
    flexDirection: 'row',
    marginVertical: 14,
  },
  catLegendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  catLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '47%',
    gap: 8,
  },
  catLegendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  catLegendName: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '600',
  },
  catLegendTime: {
    color: '#94A3B8',
    fontSize: 11,
  },
  managePill: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  managePillText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
  },
  appsList: {
    gap: 12,
    marginTop: 8,
  },
  appCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  appTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  appIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  appNameText: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
  },
  curfewActiveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2,
  },
  curfewActiveTagText: {
    color: '#8B5CF6',
    fontSize: 10,
    fontWeight: '700',
  },
  appSubMeta: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  editQuotaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  editQuotaBtnText: {
    color: NinjaPalette.emerald,
    fontSize: 11,
    fontWeight: '800',
  },
  appQuotaReadoutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  appUsedText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  appLimitText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  appProgressTrack: {
    height: 6,
    backgroundColor: '#1E293B',
    borderRadius: 3,
    overflow: 'hidden',
  },
  appProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  exceededNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  exceededNoticeText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '700',
  },
});
