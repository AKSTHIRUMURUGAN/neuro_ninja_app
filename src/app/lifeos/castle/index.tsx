import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useNinjaBack } from '../../../hooks/use-ninja-back';
import { useNinjaAlert } from '../../../context/ninja-alert-context';
import { unifiedGamificationEngine } from '../../../services/gamification/unified-gamification-engine';
import { walletService } from '../../../services/wallet/wallet-service';
import ChestOpeningModal from '../../../components/gamification/ChestOpeningModal';
import { CitadelDomainCanvas } from '../../../components/gamification/CitadelDomainCanvas';
import type {
  PlayerRpgState,
  CastleBuilding,
  PlayerChest,
} from '../../../services/gamification/gamification-types';
import type { WalletBalance } from '../../../services/wallet/wallet-types';

const CHEST_SPRITES: Record<string, any> = {
  bamboo: require('../../../../assets/game/items/chest_bamboo.png'),
  jade: require('../../../../assets/game/items/chest_jade.png'),
  shadow: require('../../../../assets/game/items/chest_shadow.png'),
  mythic: require('../../../../assets/game/items/chest_mythic.png'),
};

export default function NinjaCastleScreen() {
  const router = useRouter();
  const { handleSmartBack } = useNinjaBack({ fallbackRoute: '/lifeos/villains' });
  const { showToast } = useNinjaAlert();

  const [player, setPlayer] = useState<PlayerRpgState | null>(null);
  const [buildings, setBuildings] = useState<CastleBuilding[]>([]);
  const [chests, setChests] = useState<PlayerChest[]>([]);
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedChest, setSelectedChest] = useState<PlayerChest | null>(null);
  const [showChestModal, setShowChestModal] = useState<boolean>(false);
  const [upgradingId, setUpgradingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [p, b, c, w] = await Promise.all([
        unifiedGamificationEngine.getPlayerRpgState(),
        unifiedGamificationEngine.getCastleBuildings(),
        unifiedGamificationEngine.getChests(),
        walletService.getBalance(),
      ]);
      setPlayer(p);
      setBuildings(b);
      setChests(c);
      setBalance(w);
    } catch (e) {
      console.warn('[NinjaCastleScreen] load error:', e);
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

  const handleUpgrade = async (building: CastleBuilding) => {
    if (upgradingId) return;
    setUpgradingId(building.buildingId);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      const res = await unifiedGamificationEngine.upgradeCastleBuilding(building.buildingId);
      if (res.success) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast({
          title: 'Citadel Upgraded! 🏯',
          message: res.message,
          type: 'success',
          icon: 'castle',
        });
        await loadData();
      } else {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Cannot Upgrade District', res.message);
      }
    } catch (e) {
      console.warn('[handleUpgrade] error:', e);
    } finally {
      setUpgradingId(null);
    }
  };

  const handleOpenChestClick = (chest: PlayerChest) => {
    setSelectedChest(chest);
    setShowChestModal(true);
  };

  const handleRestAtSprings = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newHp = await unifiedGamificationEngine.restoreHealth(20, 'Zen Hot Springs Meditation');
    showToast({
      title: 'Health Restored 🌿',
      message: `Immersed in Zen Springs. Health now at ${newHp}/100 HP!`,
      type: 'success',
      icon: 'water-well',
    });
    await loadData();
  };

  const unopenedChests = chests.filter((c) => c.status === 'unopened');

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleSmartBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.badge}>NINJA CITADEL DOMAIN</Text>
          <Text style={styles.title}>Dojo Sanctuary</Text>
        </View>
        <View style={styles.headerCurrencies}>
          <View style={styles.currencyPill}>
            <MaterialCommunityIcons name="wall" size={16} color="#F59E0B" />
            <Text style={styles.currencyText}>{player?.castleStone ?? 0}</Text>
          </View>
          <TouchableOpacity
            style={styles.currencyPill}
            onPress={() => router.push('/lifeos/wallet' as any)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="circle-multiple" size={16} color="#00E699" />
            <Text style={styles.currencyText}>{balance?.coins ?? 0}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00E699" />}
      >
        {/* Interactive 2D Citadel Domain Canvas */}
        <CitadelDomainCanvas
          tenshuLevel={player?.tenshuLevel || 1}
          sentryGateDurability={player?.sentryGateDurability ?? 100}
          sentryGateMax={player?.sentryGateMax ?? 100}
          castleStone={player?.castleStone ?? 0}
          ninjaBelt={player?.ninjaBelt || 'White Belt'}
          onSelectBuilding={(type) => {
            if (type === 'forge') {
              router.push('/lifeos/forge' as any);
            } else if (type === 'springs') {
              void handleRestAtSprings();
            } else {
              showToast({
                title: type === 'tenshu' ? 'Tenshu Keep 🏯' : 'Sentry Gate ⛩️',
                message: 'Scroll down to Citadel Districts to upgrade this stronghold.',
                type: 'info',
              });
            }
          }}
          onRestAtSprings={handleRestAtSprings}
        />

        {/* Unopened Mystery Chests Vault Bar */}
        <View style={styles.chestsSection}>
          <View style={styles.chestsSectionHeader}>
            <Text style={styles.sectionTitle}>Treasure Vault ({unopenedChests.length})</Text>
            <Text style={styles.sectionSubtitle}>Mystery loot drops from bosses & habits</Text>
          </View>

          {unopenedChests.length === 0 ? (
            <View style={styles.emptyChestBox}>
              <MaterialCommunityIcons name="treasure-chest" size={32} color="#64748B" />
              <Text style={styles.emptyChestText}>
                No unopened chests. Slay Daily Villains or complete focus habits to earn loot!
              </Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chestRow}>
              {unopenedChests.map((c) => (
                <TouchableOpacity
                  key={c.chestId}
                  style={styles.chestCard}
                  onPress={() => handleOpenChestClick(c)}
                  activeOpacity={0.8}
                >
                  <Image
                    source={CHEST_SPRITES[c.tier] || CHEST_SPRITES.bamboo}
                    style={styles.chestSpriteThumb}
                    resizeMode="contain"
                  />
                  <Text style={styles.chestTierName}>{c.tier.toUpperCase()}</Text>
                  <Text style={styles.chestSource} numberOfLines={1}>{c.sourceAction}</Text>
                  <View style={styles.openPill}>
                    <Text style={styles.openPillText}>OPEN</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Quick Quick Access: Dojo Forge & Zen Springs */}
        <View style={styles.quickTilesRow}>
          <TouchableOpacity
            style={styles.quickTile}
            onPress={() => router.push('/lifeos/forge' as any)}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="anvil" size={28} color="#00E699" />
            <Text style={styles.quickTileTitle}>Dojo Forge</Text>
            <Text style={styles.quickTileSub}>Weapons & Multipliers 🗡️</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickTile}
            onPress={handleRestAtSprings}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="water-well" size={28} color="#38BDF8" />
            <Text style={styles.quickTileTitle}>Zen Springs</Text>
            <Text style={styles.quickTileSub}>Restore +20 Health 🌿</Text>
          </TouchableOpacity>
        </View>

        {/* Castle Districts List */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Citadel Districts</Text>
          <Text style={styles.sectionSubtitle}>
            Fortify your domain using Castle Stones and Focus Coins
          </Text>
        </View>

        {buildings.map((b) => {
          const canAfford =
            (player?.castleStone ?? 0) >= b.upgradeStoneCost &&
            (balance?.coins ?? 0) >= b.upgradeCoinCost;

          return (
            <View key={b.buildingId} style={styles.districtCard}>
              <View style={styles.districtHeader}>
                <View style={styles.districtIconBox}>
                  <MaterialCommunityIcons name={(b.icon as any) || 'castle'} size={28} color="#00E699" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.districtName}>{b.name}</Text>
                  <Text style={styles.districtLevel}>Level {b.level} / {b.maxLevel}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.upgradeBtn, !canAfford && styles.upgradeBtnDisabled]}
                  onPress={() => handleUpgrade(b)}
                  disabled={!canAfford || upgradingId === b.buildingId}
                  activeOpacity={0.8}
                >
                  <Text style={styles.upgradeBtnText}>UPGRADE</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.districtDesc}>{b.perkDescription}</Text>

              <View style={styles.costFooter}>
                <View style={styles.costItem}>
                  <MaterialCommunityIcons name="wall" size={14} color="#F59E0B" />
                  <Text style={[styles.costText, (player?.castleStone ?? 0) < b.upgradeStoneCost && styles.costUnmet]}>
                    {b.upgradeStoneCost} Stone
                  </Text>
                </View>
                <View style={styles.costItem}>
                  <MaterialCommunityIcons name="circle-multiple" size={14} color="#00E699" />
                  <Text style={[styles.costText, (balance?.coins ?? 0) < b.upgradeCoinCost && styles.costUnmet]}>
                    {b.upgradeCoinCost} Coins
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Mystery Chest Opening Ceremony Modal */}
      <ChestOpeningModal
        visible={showChestModal}
        chest={selectedChest}
        onClose={() => setShowChestModal(false)}
        onOpened={loadData}
      />
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
  headerCurrencies: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  currencyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  currencyText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  citadelHero: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 18,
    marginBottom: 16,
  },
  citadelIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroTierLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#00E699',
    letterSpacing: 1.5,
  },
  heroCastleName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F8FAFC',
    marginTop: 2,
  },
  heroSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  defenseBox: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  defenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  defenseTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#CBD5E1',
  },
  defenseVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00E699',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#1E293B',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#00E699',
    borderRadius: 3,
  },
  defenseHint: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
  },
  chestsSection: {
    marginBottom: 16,
  },
  chestsSectionHeader: {
    marginBottom: 10,
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
  emptyChestBox: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  emptyChestText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 17,
  },
  chestRow: {
    gap: 12,
  },
  chestSpriteThumb: {
    width: 48,
    height: 48,
    marginBottom: 4,
  },
  chestCard: {
    width: 120,
    backgroundColor: '#0F172A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 14,
    alignItems: 'center',
  },
  chestTierName: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F8FAFC',
    marginTop: 8,
  },
  chestSource: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },
  openPill: {
    backgroundColor: '#00E699',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 10,
  },
  openPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#070A11',
  },
  quickTilesRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  quickTile: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 16,
  },
  quickTileTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F8FAFC',
    marginTop: 8,
  },
  quickTileSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  districtCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 16,
    marginBottom: 12,
  },
  districtHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  districtIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 230, 153, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  districtName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  districtLevel: {
    fontSize: 12,
    color: '#00E699',
    marginTop: 2,
  },
  upgradeBtn: {
    backgroundColor: '#00E699',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  upgradeBtnDisabled: {
    opacity: 0.4,
  },
  upgradeBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#070A11',
  },
  districtDesc: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 17,
    marginVertical: 10,
  },
  costFooter: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  costItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  costText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#CBD5E1',
  },
  costUnmet: {
    color: '#EF4444',
  },
});
