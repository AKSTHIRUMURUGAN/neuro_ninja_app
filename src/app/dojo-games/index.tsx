import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { StroopTest } from '../../components/challenges/stroop-test';
import { DualNBackGame } from '../../components/challenges/dual-n-back';
import { MathMission } from '../../components/alarms/math-mission';

type GameMode = 'stroop' | 'nback' | 'matiks';

export default function DojoGamesScreen() {
  const router = useRouter();
  const [activeGame, setActiveGame] = useState<GameMode>('stroop');
  const [sessionScore, setSessionScore] = useState<number | null>(null);

  const handleGameEnd = (score: number) => {
    setSessionScore(score);
  };

  const handlePlayAgain = () => {
    setSessionScore(null);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>
        <View>
          <Text style={styles.badge}>COGNITIVE DOJO</Text>
          <Text style={styles.title}>Brain Training Arcade</Text>
        </View>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Game Mode Selector */}
        <View style={styles.modeTabs}>
          <TouchableOpacity
            style={[styles.tab, activeGame === 'stroop' && styles.tabActive]}
            onPress={() => {
              setActiveGame('stroop');
              setSessionScore(null);
            }}
          >
            <Ionicons name="eye-outline" size={14} color={activeGame === 'stroop' ? '#00E699' : '#64748B'} />
            <Text style={[styles.tabText, activeGame === 'stroop' && styles.tabTextActive]}>
              Stroop Reflex
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeGame === 'nback' && styles.tabActive]}
            onPress={() => {
              setActiveGame('nback');
              setSessionScore(null);
            }}
          >
            <Ionicons name="hardware-chip-outline" size={14} color={activeGame === 'nback' ? '#00E699' : '#64748B'} />
            <Text style={[styles.tabText, activeGame === 'nback' && styles.tabTextActive]}>
              N-Back Memory
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeGame === 'matiks' && styles.tabActive]}
            onPress={() => {
              setActiveGame('matiks');
              setSessionScore(null);
            }}
          >
            <Ionicons name="calculator-outline" size={14} color={activeGame === 'matiks' ? '#00E699' : '#64748B'} />
            <Text style={[styles.tabText, activeGame === 'matiks' && styles.tabTextActive]}>
              Matiks Sprint
            </Text>
          </TouchableOpacity>
        </View>

        {/* Game Area */}
        <View style={styles.gameContainer}>
          {sessionScore !== null ? (
            <View style={styles.scoreResultCard}>
              <Ionicons name="trophy" size={56} color="#F59E0B" />
              <Text style={styles.scoreTitle}>Cognitive Session Complete</Text>
              <Text style={styles.scoreValue}>+{sessionScore * 25} Focus XP</Text>
              <Text style={styles.scoreSub}>
                Your prefrontal cortex neural pathways have been activated!
              </Text>
              <TouchableOpacity style={styles.playAgainBtn} onPress={handlePlayAgain}>
                <Text style={styles.playAgainText}>Play Again</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {activeGame === 'stroop' && (
                <StroopTest roundsCount={5} onCompleted={handleGameEnd} />
              )}
              {activeGame === 'nback' && (
                <DualNBackGame n={1} totalSteps={6} onCompleted={handleGameEnd} />
              )}
              {activeGame === 'matiks' && (
                <MathMission difficulty="medium" onCompleted={() => handleGameEnd(3)} />
              )}
            </>
          )}
        </View>
      </ScrollView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backBtn: {
    padding: 6,
  },
  badge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#00E699',
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#F8FAFC',
  },
  scroll: {
    padding: 20,
    gap: 16,
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 20,
  },
  tabActive: {
    backgroundColor: '#0F172A',
  },
  tabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#00E699',
  },
  gameContainer: {
    backgroundColor: '#0F1829',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
    minHeight: 400,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreResultCard: {
    alignItems: 'center',
    padding: 20,
    gap: 12,
  },
  scoreTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: '900',
    color: '#00E699',
  },
  scoreSub: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    maxWidth: 260,
  },
  playAgainBtn: {
    marginTop: 16,
    backgroundColor: '#00E699',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 16,
  },
  playAgainText: {
    color: '#070A11',
    fontWeight: '900',
    fontSize: 15,
  },
});

