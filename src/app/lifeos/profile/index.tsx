import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useNinjaBack } from '../../../hooks/use-ninja-back';
import { useNinjaAlert } from '../../../context/ninja-alert-context';
import { unifiedGamificationEngine } from '../../../services/gamification/unified-gamification-engine';
import { walletService } from '../../../services/wallet/wallet-service';
import type { PlayerRpgState } from '../../../services/gamification/gamification-types';
import type { WalletBalance } from '../../../services/wallet/wallet-types';

export default function NinjaProfileScreen() {
  const router = useRouter();
  const { handleSmartBack } = useNinjaBack({ fallbackRoute: '/focus/ghost-launcher' });
  const { showToast } = useNinjaAlert();

  const [player, setPlayer] = useState<PlayerRpgState | null>(null);
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const ninjaTag = '#NINJA-8492';

  const loadData = useCallback(async () => {
    try {
      const [p, b] = await Promise.all([
        unifiedGamificationEngine.getPlayerRpgState(),
        walletService.getBalance(),
      ]);
      setPlayer(p);
      setBalance(b);
    } catch (e) {
      console.warn('[NinjaProfileScreen] load error:', e);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleCopyTag = async () => {
    await Clipboard.setStringAsync(ninjaTag);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast({
      title: 'Ninja Tag Copied! 🥷',
      message: `${ninjaTag} copied to clipboard. Share with friends to form a Clan!`,
      type: 'success',
      icon: 'clipboard-check',
    });
  };

  const handleShareProfile = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await Share.share({
        message: `Join my Ninja Clan on NeuroNinja! My tag is ${ninjaTag}. Let's slay distraction bosses together: https://neuroninja.app/join/${ninjaTag}`,
      });
    } catch (e) {
      console.warn('Share error:', e);
    }
  };

  const xpPercent = player
    ? Math.min(100, Math.round((player.currentXp / player.xpToNextLevel) * 100))
    : 0;

  const hpPercent = player
    ? Math.min(100, Math.round((player.currentHp / player.maxHp) * 100))
    : 100;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleSmartBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.badge}>NINJA PASSPORT</Text>
          <Text style={styles.title}>Shinobi Profile</Text>
        </View>
        <TouchableOpacity style={styles.shareBtn} onPress={handleShareProfile} activeOpacity={0.7}>
          <Ionicons name="share-social" size={20} color="#00E699" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00E699" />}
      >
        {/* Avatar Hero Card */}
        <View style={styles.avatarCard}>
          <View style={styles.avatarRing}>
            <MaterialCommunityIcons name="ninja" size={54} color="#00E699" />
          </View>
          <Text style={styles.playerName}>Shadow Disciple</Text>
          <Text style={styles.playerTitle}>{player?.equippedTitle || 'Dojo Initiate'}</Text>

          {/* Ninja Tag Pill */}
          <TouchableOpacity style={styles.tagPill} onPress={handleCopyTag} activeOpacity={0.7}>
            <Text style={styles.tagText}>{ninjaTag}</Text>
            <MaterialCommunityIcons name="content-copy" size={14} color="#00E699" />
          </TouchableOpacity>

          {/* Belt & Level Chips */}
          <View style={styles.beltChipRow}>
            <View style={styles.beltChip}>
              <MaterialCommunityIcons name="karate" size={16} color="#F59E0B" />
              <Text style={styles.beltChipText}>{player?.ninjaBelt || 'White Belt'}</Text>
            </View>
            <View style={styles.beltChip}>
              <MaterialCommunityIcons name="shield-account" size={16} color="#818CF8" />
              <Text style={styles.beltChipText}>Level {player?.playerLevel || 1}</Text>
            </View>
          </View>

          {/* Health Bar */}
          <View style={styles.barContainer}>
            <View style={styles.barLabelRow}>
              <Text style={styles.barLabel}>PLAYER HEALTH</Text>
              <Text style={[styles.barVal, { color: hpPercent < 30 ? '#EF4444' : '#00E699' }]}>
                {player?.currentHp || 100} / {player?.maxHp || 100} HP
              </Text>
            </View>
            <View style={styles.barBg}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${hpPercent}%`,
                    backgroundColor: hpPercent < 30 ? '#EF4444' : '#00E699',
                  },
                ]}
              />
            </View>
          </View>

          {/* XP Progress Bar */}
          <View style={styles.barContainer}>
            <View style={styles.barLabelRow}>
              <Text style={styles.barLabel}>KARMA XP TO LEVEL {(player?.playerLevel || 1) + 1}</Text>
              <Text style={styles.barVal}>
                {player?.currentXp || 0} / {player?.xpToNextLevel || 500} ({xpPercent}%)
              </Text>
            </View>
            <View style={styles.barBg}>
              <View style={[styles.barFill, { width: `${xpPercent}%`, backgroundColor: '#818CF8' }]} />
            </View>
          </View>
        </View>

        {/* Quick Nav Row (Castle & Friends & Forge) */}
        <View style={styles.navTilesRow}>
          <TouchableOpacity
            style={styles.navTile}
            onPress={() => router.push('/lifeos/castle' as any)}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="castle" size={26} color="#00E699" />
            <Text style={styles.navTileTitle}>My Castle</Text>
            <Text style={styles.navTileSub}>Tier {player?.tenshuLevel || 1} Fortress</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navTile}
            onPress={() => router.push('/lifeos/forge' as any)}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="anvil" size={26} color="#F59E0B" />
            <Text style={styles.navTileTitle}>Dojo Forge</Text>
            <Text style={styles.navTileSub}>{player?.equippedWeapon.name || 'Kunai'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navTile}
            onPress={() => router.push('/lifeos/friends' as any)}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="account-group" size={26} color="#38BDF8" />
            <Text style={styles.navTileTitle}>Clan & Raids</Text>
            <Text style={styles.navTileSub}>4 Ninja Buddies</Text>
          </TouchableOpacity>
        </View>

        {/* Lifetime Shinobi Battle Record */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Combat & Life Record</Text>
          <Text style={styles.sectionSubtitle}>Lifetime milestones achieved in NeuroNinja</Text>
        </View>

        <View style={styles.recordGrid}>
          <View style={styles.recordCard}>
            <MaterialCommunityIcons name="sword-cross" size={24} color="#EF4444" />
            <Text style={styles.recordVal}>{player?.dailyDefeatedCount || 0}</Text>
            <Text style={styles.recordLabel}>Daily Bosses Slain</Text>
          </View>

          <View style={styles.recordCard}>
            <MaterialCommunityIcons name="skull" size={24} color="#818CF8" />
            <Text style={styles.recordVal}>{player?.weeklyDefeatedCount || 0}</Text>
            <Text style={styles.recordLabel}>Raid Titans Conquered</Text>
          </View>

          <View style={styles.recordCard}>
            <MaterialCommunityIcons name="diamond-stone" size={24} color="#EC4899" />
            <Text style={styles.recordVal}>{player?.soulShards || 0}</Text>
            <Text style={styles.recordLabel}>Soul Shards</Text>
          </View>

          <View style={styles.recordCard}>
            <MaterialCommunityIcons name="wall" size={24} color="#F59E0B" />
            <Text style={styles.recordVal}>{player?.castleStone || 0}</Text>
            <Text style={styles.recordLabel}>Castle Stones Mined</Text>
          </View>

          <View style={styles.recordCard}>
            <MaterialCommunityIcons name="circle-multiple" size={24} color="#00E699" />
            <Text style={styles.recordVal}>{balance?.coins || 0}</Text>
            <Text style={styles.recordLabel}>Focus Coins in Vault</Text>
          </View>

          <View style={styles.recordCard}>
            <MaterialCommunityIcons name="shield-sun" size={24} color="#38BDF8" />
            <Text style={styles.recordVal}>{balance?.streakShields || 0}</Text>
            <Text style={styles.recordLabel}>Streak Freeze Shields</Text>
          </View>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#00E699',
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  shareBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  avatarCard: {
    backgroundColor: '#0F172A',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#1E293B',
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarRing: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(0, 230, 153, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#00E699',
    marginBottom: 12,
  },
  playerName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  playerTitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 230, 153, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 153, 0.3)',
  },
  tagText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00E699',
    letterSpacing: 1,
  },
  beltChipRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    marginBottom: 18,
  },
  beltChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  beltChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  barContainer: {
    width: '100%',
    marginTop: 12,
  },
  barLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  barLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1,
  },
  barVal: {
    fontSize: 11,
    fontWeight: '700',
    color: '#CBD5E1',
  },
  barBg: {
    height: 7,
    backgroundColor: '#1E293B',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  navTilesRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  navTile: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 14,
    alignItems: 'center',
  },
  navTileTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F8FAFC',
    marginTop: 6,
  },
  navTileSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  recordGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  recordCard: {
    width: '48%',
    backgroundColor: '#0F172A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 14,
    alignItems: 'center',
  },
  recordVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
    marginTop: 6,
  },
  recordLabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
    textAlign: 'center',
  },
});
