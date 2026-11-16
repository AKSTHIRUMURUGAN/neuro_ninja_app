import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import {
  audioVaultEngine,
  type AudioVaultTrack,
} from '../services/audio/audio-vault-engine';
import { AudioVaultModal } from './focus/audio-vault-modal';

const SOUND_ASSETS: Record<string, any> = {
  'ambient_rain.wav': require('../../assets/sounds/ambient_rain.wav'),
  'ambient_ocean.wav': require('../../assets/sounds/ambient_ocean.wav'),
  'digital_pulse.wav': require('../../assets/sounds/digital_pulse.wav'),
  'gentle_rise.wav': require('../../assets/sounds/gentle_rise.wav'),
  'zen_bell.wav': require('../../assets/sounds/zen_bell.wav'),
  'sensei_call.wav': require('../../assets/sounds/sensei_call.wav'),
};

interface Props {
  isTimerRunning?: boolean;
}

export function FocusAudioPlayer({ isTimerRunning = false }: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [tracks, setTracks] = useState<AudioVaultTrack[]>([]);
  const [activeTrack, setActiveTrack] = useState<AudioVaultTrack | null>(null);
  const [showVaultModal, setShowVaultModal] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState<1 | 2 | 3>(2);

  const playerRef = useRef<AudioPlayer | null>(null);

  // Load vault tracks
  const loadVaultTracks = useCallback(async () => {
    try {
      const all = await audioVaultEngine.getAllTracks();
      setTracks(all);
      const activeId = await audioVaultEngine.getActiveTrackId();
      const current = all.find((t) => t.trackId === activeId) || all.find((t) => t.isUnlocked) || all[0];
      if (current) {
        setActiveTrack(current);
      }
    } catch (e) {
      console.warn('[FocusAudioPlayer] load error:', e);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadVaultTracks();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadVaultTracks]);

  // Audio Player Lifecycle & Track Swapping
  const initAndPlaySound = useCallback(async (assetKey: string, volumeScale: number) => {
    try {
      if (playerRef.current) {
        try {
          playerRef.current.pause();
          playerRef.current.release();
        } catch {}
        playerRef.current = null;
      }

      const asset = SOUND_ASSETS[assetKey] || SOUND_ASSETS['ambient_rain.wav'];
      const player = createAudioPlayer(asset);
      player.loop = true;
      player.volume = volumeScale;
      player.play();
      playerRef.current = player;
    } catch (err) {
      console.warn('[FocusAudioPlayer] Audio playback warning:', err);
    }
  }, []);

  const stopAudio = useCallback(() => {
    try {
      if (playerRef.current) {
        playerRef.current.pause();
      }
    } catch (err) {
      console.warn('[FocusAudioPlayer] Stop audio warning:', err);
    }
  }, []);

  // Sync with timer state
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (isTimerRunning && !isPlaying && activeTrack) {
      const vol = volumeLevel === 1 ? 0.33 : volumeLevel === 2 ? 0.66 : 1.0;
      void initAndPlaySound(activeTrack.assetKey, vol);
      timer = setTimeout(() => {
        setIsPlaying(true);
      }, 0);
    } else if (!isTimerRunning && isPlaying) {
      stopAudio();
      timer = setTimeout(() => {
        setIsPlaying(false);
      }, 0);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isTimerRunning, activeTrack, initAndPlaySound, isPlaying, stopAudio, volumeLevel]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (playerRef.current) {
        try {
          playerRef.current.pause();
          playerRef.current.release();
        } catch {}
      }
    };
  }, []);

  const handleTogglePlay = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isPlaying) {
      stopAudio();
      setIsPlaying(false);
    } else if (activeTrack) {
      const vol = volumeLevel === 1 ? 0.33 : volumeLevel === 2 ? 0.66 : 1.0;
      await initAndPlaySound(activeTrack.assetKey, vol);
      setIsPlaying(true);
    }
  };

  const handleSelectTrack = async (track: AudioVaultTrack) => {
    await Haptics.selectionAsync();
    setActiveTrack(track);
    void audioVaultEngine.setActiveTrackId(track.trackId);

    if (isPlaying || isTimerRunning) {
      const vol = volumeLevel === 1 ? 0.33 : volumeLevel === 2 ? 0.66 : 1.0;
      await initAndPlaySound(track.assetKey, vol);
    }
  };

  const handleCycleVolume = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const nextLevel = (volumeLevel === 3 ? 1 : volumeLevel + 1) as 1 | 2 | 3;
    setVolumeLevel(nextLevel);
    if (playerRef.current) {
      try {
        playerRef.current.volume = nextLevel === 1 ? 0.33 : nextLevel === 2 ? 0.66 : 1.0;
      } catch {}
    }
  };

  const unlockedTracks = tracks.filter((t) => t.isUnlocked);
  const totalCount = tracks.length || 16;
  const unlockedCount = unlockedTracks.length || 3;

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={[styles.iconBox, (isPlaying || isTimerRunning) && styles.iconBoxActive]}>
            <MaterialCommunityIcons
              name={(activeTrack?.icon as any) || 'headphones'}
              size={20}
              color={isPlaying || isTimerRunning ? '#00E699' : '#94A3B8'}
            />
          </View>
          <View>
            <Text style={styles.badge}>FOCUS SOUNDSCAPES</Text>
            <Text style={styles.title} numberOfLines={1}>
              {activeTrack?.title || 'Kyoto Cedar Bamboo Rain'}
            </Text>
          </View>
        </View>

        <View style={styles.controlsRow}>
          {/* Audio Vault Button */}
          <TouchableOpacity
            style={styles.vaultTriggerBtn}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowVaultModal(true);
            }}
          >
            <MaterialCommunityIcons name="safe" size={14} color="#00E699" />
            <Text style={styles.vaultTriggerText}>
              Vault ({unlockedCount}/{totalCount})
            </Text>
          </TouchableOpacity>

          {/* Volume Cycler */}
          <TouchableOpacity style={styles.volumeBtn} onPress={() => void handleCycleVolume()}>
            <MaterialCommunityIcons
              name={volumeLevel === 1 ? 'volume-low' : volumeLevel === 2 ? 'volume-medium' : 'volume-high'}
              size={18}
              color="#94A3B8"
            />
            <Text style={styles.volumeText}>{volumeLevel * 33}%</Text>
          </TouchableOpacity>

          {/* Master Play/Pause */}
          <TouchableOpacity
            style={[styles.playBtn, (isPlaying || isTimerRunning) && styles.playBtnActive]}
            onPress={() => void handleTogglePlay()}
          >
            <MaterialCommunityIcons
              name={isPlaying || isTimerRunning ? 'pause' : 'play'}
              size={18}
              color={isPlaying || isTimerRunning ? '#070A11' : '#00E699'}
            />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.subtext} numberOfLines={1}>
        {activeTrack?.description || 'Gentle binaural rainfall falling over cedar shingles'}
      </Text>

      {/* Preset Soundscape Pills from Unlocked Vault */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsScroll}>
        {unlockedTracks.map((s) => {
          const isSelected = s.trackId === activeTrack?.trackId;
          return (
            <TouchableOpacity
              key={s.trackId}
              style={[styles.pill, isSelected && styles.pillActive]}
              onPress={() => void handleSelectTrack(s)}
            >
              <MaterialCommunityIcons
                name={s.icon as any}
                size={14}
                color={isSelected ? '#00E699' : '#64748B'}
              />
              <Text style={[styles.pillText, isSelected && styles.pillTextActive]}>
                {s.frequencyHz || s.title.split(' ')[0]}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* Trigger Audio Vault */}
        <TouchableOpacity
          style={styles.morePill}
          onPress={() => {
            void Haptics.selectionAsync();
            setShowVaultModal(true);
          }}
        >
          <MaterialCommunityIcons name="lock-open-variant-outline" size={12} color="#F59E0B" />
          <Text style={styles.morePillText}>+ Vault</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Audio Vault Modal */}
      <AudioVaultModal
        visible={showVaultModal}
        activeTrackId={activeTrack?.trackId || ''}
        onDismiss={() => {
          setShowVaultModal(false);
          void loadVaultTracks();
        }}
        onSelectTrack={(t) => void handleSelectTrack(t)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0F1829',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    width: '100%',
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#070A11',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  iconBoxActive: {
    borderColor: '#00E699',
    backgroundColor: '#00E69915',
  },
  badge: {
    fontSize: 9,
    fontWeight: '800',
    color: '#00E699',
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F8FAFC',
    marginTop: 2,
    maxWidth: 160,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  vaultTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#070A11',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#00E69944',
  },
  vaultTriggerText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#00E699',
  },
  volumeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#070A11',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  volumeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
  },
  playBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#070A11',
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
    color: '#64748B',
    lineHeight: 16,
  },
  pillsScroll: {
    flexDirection: 'row',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#070A11',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  pillActive: {
    borderColor: '#00E699',
    backgroundColor: '#00E69915',
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  pillTextActive: {
    color: '#00E699',
  },
  morePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F59E0B12',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F59E0B55',
  },
  morePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F59E0B',
  },
});
