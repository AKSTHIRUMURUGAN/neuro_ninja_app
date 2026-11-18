import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  getSpendingByPersona,
  getSpendingByGroup,
  getDailyCashflowTrend,
  getBurnRateSummary,
} from '../../services/finance/finance-service';
import { FamilyMember, MajorCategoryGroup } from '../../services/finance/finance-types';
import { MemberAvatar } from './MemberAvatar';

export interface ExpenseAnalyticsViewProps {
  currencySymbol: string;
}

export function ExpenseAnalyticsView({ currencySymbol }: ExpenseAnalyticsViewProps) {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [personas, setPersonas] = useState<{ persona: FamilyMember; amount: number; percentage: number; count: number }[]>([]);
  const [groups, setGroups] = useState<{ group: MajorCategoryGroup; label: string; icon: string; color: string; amount: number; percentage: number }[]>([]);
  const [cashflow, setCashflow] = useState<{ date: string; displayDate: string; income: number; expense: number; net: number }[]>([]);
  const [burnRate, setBurnRate] = useState<{
    dailyBurn: number;
    projectedMonthlyExpense: number;
    highestExpense: { title: string; amount: number; category: string } | null;
    totalSpent: number;
    totalIncome: number;
    netSavingsRate: number;
  }>({
    dailyBurn: 0,
    projectedMonthlyExpense: 0,
    highestExpense: null,
    totalSpent: 0,
    totalIncome: 0,
    netSavingsRate: 0,
  });

  useEffect(() => {
    let isMounted = true;
    const fetchAnalytics = async () => {
      try {
        const [p, g, c, b] = await Promise.all([
          getSpendingByPersona(timeRange),
          getSpendingByGroup(timeRange),
          getDailyCashflowTrend(timeRange),
          getBurnRateSummary(timeRange),
        ]);
        if (isMounted) {
          setPersonas(p);
          setGroups(g);
          setCashflow(c);
          setBurnRate(b);
        }
      } catch (e) {
        console.warn('[ExpenseAnalytics] Error loading analytics:', e);
      }
    };
    void fetchAnalytics();
    return () => {
      isMounted = false;
    };
  }, [timeRange]);

  const handleRangeChange = (r: '7d' | '30d' | '90d' | '1y') => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeRange(r);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Time Range Pill Switcher */}
      <View style={styles.rangeRow}>
        {(['7d', '30d', '90d', '1y'] as const).map((r) => {
          const active = timeRange === r;
          const label = r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : r === '90d' ? '90 Days' : '1 Year';
          return (
            <TouchableOpacity
              key={r}
              style={[styles.rangePill, active && styles.rangePillActive]}
              onPress={() => handleRangeChange(r)}
            >
              <Text style={[styles.rangePillText, active && styles.rangePillTextActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Burn Rate & Cashflow Matrix */}
      <View style={styles.kpiGrid}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>DAILY BURN RATE</Text>
          <Text style={[styles.kpiValue, { color: '#F43F5E' }]}>
            {currencySymbol}
            {burnRate.dailyBurn.toLocaleString()}
          </Text>
          <Text style={styles.kpiSub}>Avg. daily outflows</Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>PROJECTED 30D</Text>
          <Text style={[styles.kpiValue, { color: '#F59E0B' }]}>
            {currencySymbol}
            {burnRate.projectedMonthlyExpense.toLocaleString()}
          </Text>
          <Text style={styles.kpiSub}>Based on current velocity</Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>SAVINGS RATE</Text>
          <Text style={[styles.kpiValue, { color: burnRate.netSavingsRate >= 20 ? '#10B981' : '#F59E0B' }]}>
            {burnRate.netSavingsRate}%
          </Text>
          <Text style={styles.kpiSub}>Target: &gt; 20%</Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>HIGHEST EXPENSE</Text>
          <Text style={[styles.kpiValue, { color: '#EC4899', fontSize: 16 }]} numberOfLines={1}>
            {burnRate.highestExpense ? `${currencySymbol}${burnRate.highestExpense.amount.toLocaleString()}` : 'None'}
          </Text>
          <Text style={styles.kpiSub} numberOfLines={1}>
            {burnRate.highestExpense ? burnRate.highestExpense.title : 'No entries'}
          </Text>
        </View>
      </View>

      {/* "Spent For Whom" Persona Breakdown */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <MaterialCommunityIcons name="account-group" size={20} color="#38BDF8" />
          <Text style={styles.sectionTitle}>SPENT FOR WHOM (PERSONAS)</Text>
        </View>
        <Text style={styles.sectionSub}>Breakdown of capital allocated to family, dependents, self & work</Text>

        {personas.length === 0 ? (
          <Text style={styles.emptyText}>No persona expenses recorded in this period.</Text>
        ) : (
          personas.map((p) => (
            <View key={p.persona.id} style={styles.personaRow}>
              <MemberAvatar member={p.persona} size={36} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={styles.personaRowTop}>
                  <Text style={styles.personaName}>{p.persona.name}</Text>
                  <Text style={styles.personaAmount}>
                    {currencySymbol}
                    {p.amount.toLocaleString()} ({p.percentage}%)
                  </Text>
                </View>
                {/* Visual Progress Bar */}
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.min(100, p.percentage)}%`,
                        backgroundColor: p.persona.color || '#38BDF8',
                      },
                    ]}
                  />
                </View>
                <Text style={styles.personaCount}>{p.count} transactions</Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Major Category Group Split */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <MaterialCommunityIcons name="shape" size={20} color="#00E699" />
          <Text style={styles.sectionTitle}>CATEGORY GROUP DISTRIBUTION</Text>
        </View>
        <Text style={styles.sectionSub}>Macro-allocation across your financial domains</Text>

        {groups.length === 0 ? (
          <Text style={styles.emptyText}>No categorized transactions found.</Text>
        ) : (
          groups.map((g) => (
            <View key={g.group} style={styles.groupRow}>
              <View style={[styles.groupIconBox, { backgroundColor: `${g.color}20`, borderColor: `${g.color}40` }]}>
                <Text style={{ fontSize: 16 }}>{g.icon}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={styles.personaRowTop}>
                  <Text style={styles.personaName}>{g.label}</Text>
                  <Text style={styles.personaAmount}>
                    {currencySymbol}
                    {g.amount.toLocaleString()} ({g.percentage}%)
                  </Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.min(100, g.percentage)}%`,
                        backgroundColor: g.color,
                      },
                    ]}
                  />
                </View>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Cashflow Trend Bar Chart Simulation */}
      <View style={[styles.sectionCard, { marginBottom: 30 }]}>
        <View style={styles.sectionHeaderRow}>
          <MaterialCommunityIcons name="chart-bell-curve-cumulative" size={20} color="#F59E0B" />
          <Text style={styles.sectionTitle}>DAILY CASHFLOW TREND</Text>
        </View>
        <Text style={styles.sectionSub}>Net daily velocity (Income minus Expenses)</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chartScroll}>
          {cashflow.slice(-14).map((c) => {
            const isPos = c.net >= 0;
            const maxVal = Math.max(1, ...cashflow.map((x) => Math.abs(x.net)));
            const barHeight = Math.max(8, Math.min(80, (Math.abs(c.net) / maxVal) * 80));

            return (
              <View key={c.date} style={styles.barCol}>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        height: barHeight,
                        backgroundColor: isPos ? '#10B981' : '#F43F5E',
                      },
                    ]}
                  />
                </View>
                <Text style={styles.barDate}>{c.displayDate}</Text>
                <Text style={[styles.barNet, { color: isPos ? '#10B981' : '#F43F5E' }]}>
                  {c.net === 0 ? '0' : `${c.net > 0 ? '+' : ''}${Math.round(c.net / 1000)}k`}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  rangeRow: {
    flexDirection: 'row',
    backgroundColor: '#0F1829',
    borderRadius: 14,
    padding: 4,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  rangePill: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  rangePillActive: {
    backgroundColor: '#1E293B',
  },
  rangePillText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  rangePillTextActive: {
    color: '#00E699',
    fontWeight: '800',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  kpiCard: {
    width: '48.5%',
    backgroundColor: '#0F1829',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '900',
    marginTop: 4,
  },
  kpiSub: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: '#0F1829',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: 0.8,
  },
  sectionSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 14,
  },
  emptyText: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  personaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  personaRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  personaName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  personaAmount: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94A3B8',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#070A11',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  personaCount: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 3,
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  groupIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  chartScroll: {
    flexDirection: 'row',
    paddingVertical: 10,
  },
  barCol: {
    alignItems: 'center',
    marginRight: 14,
    width: 36,
  },
  barTrack: {
    height: 80,
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: 14,
    backgroundColor: '#070A11',
    borderRadius: 7,
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 7,
  },
  barDate: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 6,
    fontWeight: '600',
  },
  barNet: {
    fontSize: 9,
    fontWeight: '800',
    marginTop: 2,
  },
});
