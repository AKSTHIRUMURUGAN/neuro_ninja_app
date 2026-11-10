import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { NinjaPalette } from '../constants/theme';

export interface SoundscapePreset {
  id: string;
  name: string;
  category: 'rain' | 'lofi' | 'nature' | 'waves' | 'space';
  icon: string;
  description: string;
}

export const SOUNDSCAPES: SoundscapePreset[] = [
  { id: 'rain', name: 'Kyoto Bamboo Rain', category: 'rain', icon: 'weather-rainy', description: 'Gentle rainfall on cedar shingles' },
  { id: 'lofi', name: 'Lo-Fi Study Lounge', category: 'lofi', icon: 'headphones', description: 'Mellow vinyl chillhop rhythm' },
  { id: 'nature', name: 'Alpine Pine Forest', category: 'nature', icon: 'pine-tree', description: 'Mountain wind and distant birds' },
  { id: 'waves', name: 'Deep Ocean Flow', category: 'waves', icon: 'water', description: 'Rhythmic white noise surf' },
  { id: 'space', name: 'Cosmic Zen Ambience', category: 'space', icon: 'weather-night', description: 'Warm analog synthesizer drone' },
];

interface Props {
  isTimerRunning?: boolean;
}

export function FocusAudioPlayer({ isTimerRunning = false }: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedId, setSelectedId] = useState('rain');
  const [volumeLevel, setVolumeLevel] = useState<1 | 2 | 3>(2);

  const activeSound = SOUNDSCAPES.find((s) => s.id === selectedId) || SOUNDSCAPES[0];

  const handleTogglePlay = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsPlaying(!isPlaying);
  };

  const handleSelectSound = async (id: string) => {
    await Haptics.selectionAsync();
    setSelectedId(id);
    setIsPlaying(true);
  };

  const handleCycleVolume = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setVolumeLevel((prev) => (prev === 3 ? 1 : ((prev + 1) as 1 | 2 | 3)));
  };

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={[styles.iconBox, (isPlaying || isTimerRunning) && styles.iconBoxActive]}>
            <MaterialCommunityIcons
              name={activeSound.icon as any}
              size={20}
              color={isPlaying || isTimerRunning ? '#00E699' : '#94A3B8'}
            />
          </View>
          <View>
            <Text style={styles.badge}>FOCUS SOUNDSCAPES</Text>
            <Text style={styles.title}>{activeSound.name}</Text>
          </View>
        </View>

        <View style={styles.controlsRow}>
          {/* Volume Cycler */}
          <TouchableOpacity style={styles.volumeBtn} onPress={handleCycleVolume}>
            <MaterialCommunityIcons
              name={volumeLevel === 1 ? 'volume-low' : volumeLevel === 2 ? 'volume-medium' : 'volume-high'}
              size={18}
              color="#94A3B8"
            />
            <Text style={styles.volumeText}>{volumeLevel * 33}%</Text>
          </TouchableOpacity>

          {/* Master Play/Pause */}
          <TouchableOpacity
            style={[styles.playBtn, isPlaying && styles.playBtnActive]}
            onPress={handleTogglePlay}
          >
            <MaterialCommunityIcons
              name={isPlaying ? 'pause' : 'play'}
              size={18}
              color={isPlaying ? '#070A11' : '#00E699'}
            />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.subtext}>{activeSound.description}</Text>

      {/* Preset Soundscape Pills */}
      <View style={styles.pillsRow}>
        {SOUNDSCAPES.map((s) => {
          const isSelected = s.id === selectedId;
          return (
            <TouchableOpacity
              key={s.id}
              style={[styles.pill, isSelected && styles.pillActive]}
              onPress={() => handleSelectSound(s.id)}
            >
              <MaterialCommunityIcons
                name={s.icon as any}
                size={14}
                color={isSelected ? '#00E699' : '#64748B'}
              />
              <Text style={[styles.pillText, isSelected && styles.pillTextActive]}>
                {s.name.split(' ')[0]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0F1829',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 153, 0.2)',
    padding: 18,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxActive: {
    backgroundColor: 'rgba(0, 230, 153, 0.15)',
  },
  badge: {
    color: '#00E699',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 15,
    fontWeight: 'bold',
    color: NinjaPalette.textPrimary,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  volumeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
  },
  volumeText: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '700',
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 230, 153, 0.15)',
    borderWidth: 1,
    borderColor: '#00E699',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtnActive: {
    backgroundColor: '#00E699',
  },
  subtext: {
    fontSize: 11,
    color: NinjaPalette.textSecondary,
    marginBottom: 12,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  pillActive: {
    borderColor: '#00E699',
    backgroundColor: 'rgba(0, 230, 153, 0.08)',
  },
  pillText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  pillTextActive: {
    color: '#00E699',
    fontWeight: 'bold',
  },
});

