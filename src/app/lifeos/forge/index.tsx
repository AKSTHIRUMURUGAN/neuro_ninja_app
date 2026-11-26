import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useNinjaBack } from '../../../hooks/use-ninja-back';
import { useNinjaAlert } from '../../../context/ninja-alert-context';
import { unifiedGamificationEngine } from '../../../services/gamification/unified-gamification-engine';
import { walletService } from '../../../services/wallet/wallet-service';
import type {
  PlayerRpgState,
  WeaponItem,
} from '../../../services/gamification/gamification-types';
import type { WalletBalance } from '../../../services/wallet/wallet-types';

export default function DojoForgeScreen() {
  const router = useRouter();
  const { handleSmartBack } = useNinjaBack({ fallbackRoute: '/lifeos/villains' });
  const { showToast } = useNinjaAlert();

  const [player, setPlayer] = useState<PlayerRpgState | null>(null);
  const [weapons, setWeapons] = useState<WeaponItem[]>([]);
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [busyWeaponId, setBusyWeaponId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [p, w, b] = await Promise.all([
        unifiedGamificationEngine.getPlayerRpgState(),
        unifiedGamificationEngine.getWeapons(),
        walletService.getBalance(),
      ]);
      setPlayer(p);
      setWeapons(w);
      setBalance(b);
    } catch (e) {
      console.warn('[DojoForgeScreen] load error:', e);
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

  const handleEquip = async (weapon: WeaponItem) => {
    if (weapon.isEquipped) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    await unifiedGamificationEngine.equipWeapon(weapon.weaponId);
    showToast({
      title: 'Weapon Equipped! 🗡️',
      message: `Equipped ${weapon.name} (${weapon.multiplier}x Multiplier)`,
      type: 'success',
      icon: 'sword',
    });
    await loadData();
  };

  const handleForge = async (weapon: WeaponItem) => {
    if (busyWeaponId) return;
    setBusyWeaponId(weapon.weaponId);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      const res = await unifiedGamificationEngine.unlockWeapon(weapon.weaponId);
      if (res.success) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast({
          title: 'Weapon Forged! 🔥',
          message: res.message,
          type: 'success',
          icon: 'anvil',
        });
        await loadData();
      } else {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Cannot Forge Weapon', res.message);
      }
    } catch (e) {
      console.warn('[handleForge] error:', e);
    } finally {
      setBusyWeaponId(null);
    }
  };

  const equipped = weapons.find((w) => w.isEquipped) || player?.equippedWeapon;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleSmartBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.badge}>ARMORY & FORGE</Text>
          <Text style={styles.title}>Dojo Weaponry</Text>
        </View>
        <TouchableOpacity
          style={styles.walletBtn}
          onPress={() => router.push('/lifeos/wallet' as any)}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="wallet" size={18} color="#00E699" />
          <Text style={styles.walletCoins}>{balance?.coins ?? 0}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00E699" />}
      >
        {/* Currencies & Player Rank Banner */}
        <View style={styles.statsBanner}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>NINJA RANK</Text>
            <Text style={styles.statVal}>{player?.ninjaBelt || 'White Belt'}</Text>
            <Text style={styles.statSub}>Level {player?.playerLevel || 1}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>CASTLE STONE</Text>
            <Text style={[styles.statVal, { color: '#F59E0B' }]}>
              {player?.castleStone || 0} 🧱
            </Text>
            <Text style={styles.statSub}>For Forge & Keep</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>BASE MULTIPLIER</Text>
            <Text style={[styles.statVal, { color: '#00E699' }]}>
              {equipped?.multiplier ?? 1.0}x
            </Text>
            <Text style={styles.statSub}>Boss Slash Power</Text>
          </View>
        </View>

        {/* Currently Equipped Weapon Hero Card */}
        {equipped && (
          <View style={styles.equippedHero}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroIconBox}>
                <MaterialCommunityIcons name={(equipped.icon as any) || 'sword'} size={36} color="#00E699" />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={styles.heroLabel}>CURRENTLY EQUIPPED</Text>
                <Text style={styles.heroTitle}>{equipped.name}</Text>
                <Text style={styles.heroTier}>Tier {equipped.tier} Katana • {equipped.multiplier}x Multiplier</Text>
              </View>
            </View>
            <Text style={styles.heroDesc}>{equipped.description}</Text>
          </View>
        )}

        {/* Weapons Catalog Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Arsenal Catalog</Text>
          <Text style={styles.sectionSubtitle}>
            Unlock weapons to multiply damage dealt by habits, tasks, and pomodoros
          </Text>
        </View>

        {/* Weapons List */}
        {weapons.map((w) => {
          const canAfford =
            (balance?.coins ?? 0) >= w.costCoins && (player?.castleStone ?? 0) >= w.costStone;
          const meetsLevel = (player?.playerLevel ?? 1) >= w.minPlayerLevel;

          return (
            <View
              key={w.weaponId}
              style={[
                styles.weaponCard,
                w.isEquipped && styles.weaponCardEquipped,
                !w.isUnlocked && styles.weaponCardLocked,
              ]}
            >
              <View style={styles.weaponCardHeader}>
                <View
                  style={[
                    styles.weaponIconBox,
                    w.isEquipped && { backgroundColor: 'rgba(0, 230, 153, 0.15)' },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={(w.icon as any) || 'sword'}
                    size={28}
                    color={w.isEquipped ? '#00E699' : w.isUnlocked ? '#F8FAFC' : '#64748B'}
                  />
                </View>

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.weaponName}>{w.name}</Text>
                    {w.isEquipped && (
                      <View style={styles.equippedTag}>
                        <Text style={styles.equippedTagText}>ACTIVE</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.weaponMultiplier}>{w.multiplier}x Combat Multiplier</Text>
                </View>

                <View style={styles.tierBadge}>
                  <Text style={styles.tierBadgeText}>T{w.tier}</Text>
                </View>
              </View>

              <Text style={styles.weaponDesc}>{w.description}</Text>

              {/* Action row */}
              <View style={styles.weaponActionRow}>
                {!w.isUnlocked ? (
                  <View style={styles.costContainer}>
                    <View style={styles.costItem}>
                      <MaterialCommunityIcons name="circle-multiple" size={16} color="#00E699" />
                      <Text style={[styles.costText, (balance?.coins ?? 0) < w.costCoins && styles.costUnmet]}>
                        {w.costCoins}
                      </Text>
                    </View>
                    <View style={styles.costItem}>
                      <MaterialCommunityIcons name="wall" size={16} color="#F59E0B" />
                      <Text style={[styles.costText, (player?.castleStone ?? 0) < w.costStone && styles.costUnmet]}>
                        {w.costStone}
                      </Text>
                    </View>
                    <View style={styles.costItem}>
                      <MaterialCommunityIcons name="account-arrow-up" size={16} color="#818CF8" />
                      <Text style={[styles.costText, !meetsLevel && styles.costUnmet]}>
                        Lv.{w.minPlayerLevel}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.unlockedNote}>
                    {w.isEquipped ? 'Currently drawn in battle' : 'Forged and ready in Armory'}
                  </Text>
                )}

                {w.isUnlocked ? (
                  <TouchableOpacity
                    style={[styles.actionBtn, w.isEquipped && styles.actionBtnEquipped]}
                    onPress={() => handleEquip(w)}
                    disabled={w.isEquipped}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.actionBtnText, w.isEquipped && { color: '#00E699' }]}>
                      {w.isEquipped ? 'EQUIPPED' : 'EQUIP'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.actionBtn,
                      styles.forgeBtn,
                      (!canAfford || !meetsLevel) && styles.actionBtnDisabled,
                    ]}
                    onPress={() => handleForge(w)}
                    disabled={!canAfford || !meetsLevel || busyWeaponId === w.weaponId}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons name="anvil" size={16} color="#070A11" />
                    <Text style={styles.forgeBtnText}>FORGE</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
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
  walletBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  walletCoins: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00E699',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  statsBanner: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1,
  },
  statVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F8FAFC',
    marginTop: 2,
  },
  statSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#1E293B',
    marginVertical: 4,
  },
  equippedHero: {
    backgroundColor: 'rgba(0, 230, 153, 0.08)',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#00E699',
    padding: 16,
    marginBottom: 20,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroIconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 230, 153, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#00E699',
    letterSpacing: 1.5,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
    marginTop: 2,
  },
  heroTier: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  heroDesc: {
    fontSize: 13,
    color: '#CBD5E1',
    lineHeight: 18,
    marginTop: 12,
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
  weaponCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 16,
    marginBottom: 12,
  },
  weaponCardEquipped: {
    borderColor: '#00E699',
  },
  weaponCardLocked: {
    opacity: 0.85,
  },
  weaponCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weaponIconBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  weaponName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  equippedTag: {
    backgroundColor: 'rgba(0, 230, 153, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  equippedTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#00E699',
  },
  weaponMultiplier: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00E699',
    marginTop: 2,
  },
  tierBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tierBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
  },
  weaponDesc: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 17,
    marginVertical: 10,
  },
  weaponActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  costContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  costItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  costText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  costUnmet: {
    color: '#EF4444',
  },
  unlockedNote: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
  },
  actionBtn: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  actionBtnEquipped: {
    backgroundColor: 'rgba(0, 230, 153, 0.1)',
    borderWidth: 1,
    borderColor: '#00E699',
  },
  actionBtnDisabled: {
    opacity: 0.5,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  forgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#00E699',
  },
  forgeBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#070A11',
  },
});
