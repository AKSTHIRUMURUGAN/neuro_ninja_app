import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  audioVaultEngine,
  type AudioVaultTrack,
  type SoundCategory,
} from '../../services/audio/audio-vault-engine';
import { walletService } from '../../services/wallet/wallet-service';
import { useNinjaAlert } from '../../context/ninja-alert-context';

interface Props {
  visible: boolean;
  activeTrackId: string;
  onDismiss: () => void;
  onSelectTrack: (track: AudioVaultTrack) => void;
}

export function AudioVaultModal({
  visible,
  activeTrackId,
  onDismiss,
  onSelectTrack,
}: Props) {
  const { showAlert, showToast } = useNinjaAlert();
  const [tracks, setTracks] = useState<AudioVaultTrack[]>([]);
  const [coins, setCoins] = useState<number>(0);
  const [selectedCategory, setSelectedCategory] = useState<'all' | SoundCategory>('all');
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const [previewingId, setPreviewingId] = useState<string | null>(null);

  const loadVault = useCallback(async () => {
    try {
      const all = await audioVaultEngine.getAllTracks();
      setTracks(all);
      const bal = await walletService.getBalance();
      setCoins(bal.coins);
    } catch (e) {
      console.warn('[AudioVaultModal] loadVault error:', e);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        void loadVault();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [visible, loadVault]);

  const handleUnlock = async (track: AudioVaultTrack) => {
    if (coins < track.priceCoins) {
      showAlert({
        title: 'Insufficient Focus Coins',
        message: `You need ${track.priceCoins} Focus Coins to unlock "${track.title}". Complete more Deep Work sessions to earn coins!`,
        type: 'warning',
        icon: 'cash-remove',
      });
      return;
    }

    try {
      setUnlockingId(track.trackId);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      const res = await audioVaultEngine.unlockTrackWithCoins(track.trackId);
      if (res.success) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast({
          title: 'Soundscape Unlocked!',
          message: `"${track.title}" is now permanently accessible in your Audio Vault.`,
          type: 'success',
          icon: 'lock-open-variant',
        });
        await loadVault();
      } else {
        showAlert({
          title: 'Unlock Failed',
          message: res.error || 'Could not complete transaction.',
          type: 'error',
          icon: 'alert-circle',
        });
      }
    } finally {
      setUnlockingId(null);
    }
  };

  const handleTogglePreview = async (track: AudioVaultTrack) => {
    await Haptics.selectionAsync();
    if (previewingId === track.trackId) {
      setPreviewingId(null);
    } else {
      setPreviewingId(track.trackId);
      showToast({
        title: 'Previewing Frequency',
        message: `Sampling "${track.title}" for 10 seconds...`,
        type: 'info',
        icon: 'headphones',
      });
    }
  };

  const filteredTracks = tracks.filter((t) => {
    if (selectedCategory === 'all') return true;
    return t.category === selectedCategory;
  });

  const getCategoryColor = (cat: SoundCategory) => {
    switch (cat) {
      case 'neural':
        return '#00E699';
      case 'nature':
        return '#38BDF8';
      case 'lofi':
        return '#F59E0B';
      case 'noise':
        return '#A855F7';
      default:
        return '#00E699';
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.preTitle}>NEURAL ARMORY</Text>
              <Text style={styles.title}>Audio Vault</Text>
            </View>

            {/* Wallet Coin Balance Badge */}
            <View style={styles.headerRight}>
              <View style={styles.coinBadge}>
                <MaterialCommunityIcons name="cash-multiple" size={16} color="#F59E0B" />
                <Text style={styles.coinBadgeText}>{coins} Coins</Text>
              </View>

              <TouchableOpacity style={styles.closeBtn} onPress={onDismiss}>
                <Ionicons name="close" size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Category Tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
            <TouchableOpacity
              style={[styles.tabChip, selectedCategory === 'all' && styles.tabChipActive]}
              onPress={() => {
                void Haptics.selectionAsync();
                setSelectedCategory('all');
              }}
            >
              <Text style={[styles.tabChipText, selectedCategory === 'all' && styles.tabChipTextActive]}>
                All Soundscapes ({tracks.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabChip, selectedCategory === 'neural' && styles.tabChipActive]}
              onPress={() => {
                void Haptics.selectionAsync();
                setSelectedCategory('neural');
              }}
            >
              <MaterialCommunityIcons
                name="brain"
                size={14}
                color={selectedCategory === 'neural' ? '#00E699' : '#64748B'}
              />
              <Text style={[styles.tabChipText, selectedCategory === 'neural' && styles.tabChipTextActive]}>
                Neural Frequencies
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabChip, selectedCategory === 'nature' && styles.tabChipActive]}
              onPress={() => {
                void Haptics.selectionAsync();
                setSelectedCategory('nature');
              }}
            >
              <MaterialCommunityIcons
                name="pine-tree"
                size={14}
                color={selectedCategory === 'nature' ? '#38BDF8' : '#64748B'}
              />
              <Text style={[styles.tabChipText, selectedCategory === 'nature' && styles.tabChipTextActive]}>
                Nature Sanctuaries
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabChip, selectedCategory === 'lofi' && styles.tabChipActive]}
              onPress={() => {
                void Haptics.selectionAsync();
                setSelectedCategory('lofi');
              }}
            >
              <MaterialCommunityIcons
                name="headphones"
                size={14}
                color={selectedCategory === 'lofi' ? '#F59E0B' : '#64748B'}
              />
              <Text style={[styles.tabChipText, selectedCategory === 'lofi' && styles.tabChipTextActive]}>
                Cyber Chillhop
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabChip, selectedCategory === 'noise' && styles.tabChipActive]}
              onPress={() => {
                void Haptics.selectionAsync();
                setSelectedCategory('noise');
              }}
            >
              <MaterialCommunityIcons
                name="waveform"
                size={14}
                color={selectedCategory === 'noise' ? '#A855F7' : '#64748B'}
              />
              <Text style={[styles.tabChipText, selectedCategory === 'noise' && styles.tabChipTextActive]}>
                Noise Spectrum
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Tracks List */}
          <ScrollView contentContainerStyle={styles.trackList} showsVerticalScrollIndicator={false}>
            {filteredTracks.map((track) => {
              const catColor = getCategoryColor(track.category);
              const isActive = activeTrackId === track.trackId;
              const isPreviewing = previewingId === track.trackId;

              return (
                <View
                  key={track.trackId}
                  style={[
                    styles.trackCard,
                    isActive && styles.trackCardActive,
                    !track.isUnlocked && styles.trackCardLocked,
                  ]}
                >
                  {/* Left Icon */}
                  <View style={[styles.trackIconBox, { backgroundColor: catColor + '18', borderColor: catColor + '44' }]}>
                    <MaterialCommunityIcons name={track.icon as any} size={22} color={catColor} />
                  </View>

                  {/* Info */}
                  <View style={styles.trackInfo}>
                    <View style={styles.titleRow}>
                      <Text style={styles.trackTitle}>{track.title}</Text>
                      {track.frequencyHz && (
                        <View style={[styles.freqBadge, { borderColor: catColor + '55' }]}>
                          <Text style={[styles.freqText, { color: catColor }]}>{track.frequencyHz}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.trackDesc} numberOfLines={2}>
                      {track.description}
                    </Text>
                  </View>

                  {/* Actions / Status */}
                  <View style={styles.trackActions}>
                    {track.isUnlocked ? (
                      <TouchableOpacity
                        style={[styles.selectBtn, isActive && styles.selectBtnActive]}
                        onPress={() => {
                          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          onSelectTrack(track);
                          onDismiss();
                        }}
                      >
                        <Text style={[styles.selectBtnText, isActive && styles.selectBtnTextActive]}>
                          {isActive ? 'Active' : 'Play'}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.lockedContainer}>
                        {track.unlockType === 'coins' ? (
                          <TouchableOpacity
                            style={styles.unlockBtn}
                            onPress={() => void handleUnlock(track)}
                            disabled={unlockingId === track.trackId}
                          >
                            {unlockingId === track.trackId ? (
                              <ActivityIndicator size="small" color="#070A11" />
                            ) : (
                              <>
                                <MaterialCommunityIcons name="lock-open-outline" size={14} color="#070A11" />
                                <Text style={styles.unlockBtnText}>{track.priceCoins} 🪙</Text>
                              </>
                            )}
                          </TouchableOpacity>
                        ) : (
                          <View style={styles.milestoneBadge}>
                            <MaterialCommunityIcons name="lock" size={12} color="#94A3B8" />
                            <Text style={styles.milestoneText} numberOfLines={1}>
                              {track.unlockRequirement || 'Locked'}
                            </Text>
                          </View>
                        )}

                        {/* Preview Audio Trigger */}
                        <TouchableOpacity
                          style={[styles.previewBtn, isPreviewing && styles.previewBtnActive]}
                          onPress={() => void handleTogglePreview(track)}
                        >
                          <MaterialCommunityIcons
                            name={isPreviewing ? 'volume-high' : 'volume-medium'}
                            size={16}
                            color={isPreviewing ? '#00E699' : '#64748B'}
                          />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0F1829',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: '#1E293B',
    maxHeight: '90%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  preTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#00E699',
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#F8FAFC',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  coinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#070A11',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F59E0B44',
    gap: 6,
  },
  coinBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F59E0B',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: '#1E293B',
  },
  tabScroll: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B22',
  },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#070A11',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  tabChipActive: {
    backgroundColor: '#1E293B',
    borderColor: '#00E699',
  },
  tabChipText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '700',
  },
  tabChipTextActive: {
    color: '#F8FAFC',
  },
  trackList: {
    padding: 20,
    gap: 12,
  },
  trackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#070A11',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
    gap: 12,
  },
  trackCardActive: {
    borderColor: '#00E699',
    backgroundColor: '#00E69908',
  },
  trackCardLocked: {
    opacity: 0.9,
  },
  trackIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackInfo: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trackTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F8FAFC',
    flex: 1,
  },
  freqBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  freqText: {
    fontSize: 10,
    fontWeight: '800',
  },
  trackDesc: {
    fontSize: 11,
    color: '#94A3B8',
    lineHeight: 15,
  },
  trackActions: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  selectBtn: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  selectBtnActive: {
    backgroundColor: '#00E699',
    borderColor: '#00E699',
  },
  selectBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94A3B8',
  },
  selectBtnTextActive: {
    color: '#070A11',
  },
  lockedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  unlockBtn: {
    backgroundColor: '#F59E0B',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  unlockBtnText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#070A11',
  },
  milestoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
    maxWidth: 100,
  },
  milestoneText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
  },
  previewBtn: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: '#1E293B',
  },
  previewBtnActive: {
    backgroundColor: '#00E69922',
  },
});
