import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { PRODUCTIVITY_MODES, useNinja } from '../../context/ninja-context';
import { getAllTasks, type LifeOSTask } from '../../services/tasks/task-engine';
import { getNextUpcomingBlock, type CalendarBlock } from '../../services/calendar/calendar-engine';
import { getNextEnabledAlarm, type MissionAlarm } from '../../services/alarms/alarm-engine';
import { getActiveRoutineRun, getAllRoutines } from '../../services/routines/routine-engine';

export function LifeOSTodayBrief() {
  const router = useRouter();
  const { productivityMode, lifeOSRevision } = useNinja();
  const [nextAlarm, setNextAlarm] = useState<MissionAlarm | null>(null);
  const [topTasks, setTopTasks] = useState<LifeOSTask[]>([]);
  const [nextBlock, setNextBlock] = useState<CalendarBlock | null>(null);
  const [routineLabel, setRoutineLabel] = useState<string>('Start Morning or Study Routine');

  const refreshBrief = useCallback(() => {
    void (async () => {
      const [alarmInfo, tasks, block, run, routines] = await Promise.all([
        getNextEnabledAlarm(),
        getAllTasks(),
        getNextUpcomingBlock(),
        getActiveRoutineRun(),
        getAllRoutines(),
      ]);
      setNextAlarm(alarmInfo?.alarm ?? null);
      setTopTasks(
        tasks.filter((t) => t.status !== 'completed' && t.status !== 'cancelled').slice(0, 3)
      );
      setNextBlock(block);
      if (run) {
        const match = routines.find((r) => r.routineId === run.routineId);
        setRoutineLabel(`Resume: ${match?.title ?? 'Active Routine'}`);
      } else if (routines.length > 0) {
        setRoutineLabel(routines[0].title);
      }
    })();
  }, []);

  useFocusEffect(refreshBrief);

  React.useEffect(() => {
    refreshBrief();
  }, [lifeOSRevision, refreshBrief]);

  const modeInfo = PRODUCTIVITY_MODES[productivityMode];

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.kicker}>TODAY&apos;S LIFEOS BRIEF</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/lifeos' as any)}>
          <Text style={styles.openAll}>Open LifeOS →</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.rowGrid}>
        <TouchableOpacity
          style={styles.miniCard}
          onPress={() => router.push('/alarms' as any)}
        >
          <MaterialCommunityIcons name="alarm" size={16} color="#EF4444" />
          <Text style={styles.miniLabel}>Next Alarm</Text>
          <Text style={styles.miniVal} numberOfLines={1}>
            {nextAlarm ? `${nextAlarm.time} · ${nextAlarm.mission.toUpperCase()}` : 'None set'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.miniCard}
          onPress={() => router.push('/lifeos/calendar' as any)}
        >
          <MaterialCommunityIcons name="calendar-clock" size={16} color="#60A5FA" />
          <Text style={styles.miniLabel}>Next Block</Text>
          <Text style={styles.miniVal} numberOfLines={1}>
            {nextBlock
              ? `${new Date(nextBlock.startAtUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ${nextBlock.title}`
              : 'Tap to time-block'}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.listCard}
        onPress={() => router.push('/lifeos/tasks' as any)}
      >
        <View style={styles.listHeader}>
          <MaterialCommunityIcons name="checkbox-marked-circle-outline" size={16} color="#10B981" />
          <Text style={styles.listHeaderTitle}>
            Today&apos;s Top Tasks ({topTasks.length})
          </Text>
        </View>
        {topTasks.length === 0 ? (
          <Text style={styles.emptyText}>Inbox clear — tap to quick-capture a task</Text>
        ) : (
          topTasks.map((t) => (
            <Text key={t.taskId} style={styles.taskLine} numberOfLines={1}>
              • {t.title}
            </Text>
          ))
        )}
      </TouchableOpacity>

      <View style={styles.rowGrid}>
        <TouchableOpacity
          style={styles.miniCard}
          onPress={() => router.push('/lifeos/routines' as any)}
        >
          <MaterialCommunityIcons name="playlist-play" size={16} color="#A855F7" />
          <Text style={styles.miniLabel}>Routine</Text>
          <Text style={styles.miniVal} numberOfLines={1}>
            {routineLabel}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.miniCard}
          onPress={() => router.push(`/focus/pomodoro?minutes=${modeInfo.focusMinutes}` as any)}
        >
          <MaterialCommunityIcons
            name={modeInfo.icon as any}
            size={16}
            color={modeInfo.accentColor}
          />
          <Text style={styles.miniLabel}>{modeInfo.label}</Text>
          <Text style={styles.miniVal} numberOfLines={1}>
            Recommended: {modeInfo.focusMinutes}m focus
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0F1829',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    marginBottom: 24,
    gap: 10,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kicker: { color: '#10B981', fontSize: 10, fontWeight: '800', letterSpacing: 1.4 },
  openAll: { color: '#60A5FA', fontSize: 12, fontWeight: '700' },
  rowGrid: { flexDirection: 'row', gap: 10 },
  miniCard: {
    flex: 1,
    backgroundColor: '#162033',
    borderRadius: 12,
    padding: 10,
    gap: 4,
  },
  miniLabel: { color: '#94A3B8', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  miniVal: { color: '#F8FAFC', fontSize: 12, fontWeight: '700' },
  listCard: {
    backgroundColor: '#162033',
    borderRadius: 12,
    padding: 11,
    gap: 4,
  },
  listHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  listHeaderTitle: { color: '#F8FAFC', fontSize: 12, fontWeight: '800' },
  emptyText: { color: '#64748B', fontSize: 12 },
  taskLine: { color: '#CBD5E1', fontSize: 12, fontWeight: '600' },
});

