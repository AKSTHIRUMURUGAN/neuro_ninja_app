import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { QueensGame } from '../../../components/arena/QueensGame';
import { TangoGame } from '../../../components/arena/TangoGame';
import { MindSnapGame } from '../../../components/arena/MindSnapGame';
import { MathBlitzGame } from '../../../components/arena/MathBlitzGame';
import { ChessTacticsGame } from '../../../components/arena/ChessTacticsGame';

export default function GamePlayerScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();

  const renderGame = () => {
    switch (slug) {
      case 'queens':
        return <QueensGame onBack={() => router.back()} />;
      case 'tango':
        return <TangoGame onBack={() => router.back()} />;
      case 'mindsnap':
        return <MindSnapGame onBack={() => router.back()} />;
      case 'math-blitz':
        return <MathBlitzGame onBack={() => router.back()} />;
      case 'chess-tactics':
        return <ChessTacticsGame onBack={() => router.back()} />;
      default:
        // Default to MindSnap if unspecified
        return <MindSnapGame onBack={() => router.back()} />;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color="#F8FAFC" />
        </TouchableOpacity>
        <Text style={styles.titleText}>Match Arena</Text>
        <View style={{ width: 38 }} />
      </View>

      <View style={styles.content}>{renderGame()}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070A11',
  },
  header: {
    paddingTop: 52,
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#070A11',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#0F1829',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
});
