import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Image,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';

import { useNinja } from '../../context/ninja-context';
import { useNinjaAlert } from '../../context/ninja-alert-context';
import { NinjaPalette } from '../../constants/theme';
import { NinjaCompanion } from '../../components/ninja-companion';
import { LifeOSTodayBrief } from '../../components/lifeos/today-brief';

export default function DojoScreen() {
  const router = useRouter();
  const { showToast } = useNinjaAlert();
  const {
    settings,
    isArmed,
    isUnlocked,
    unlockRemainingSeconds,
    toggleShield,
    relockNow,
  } = useNinja();

  // Android hardware back & edge swipe back from Dojo root ALWAYS returns to Ghost Launcher
  useFocusEffect(
    React.useCallback(() => {
      if (Platform.OS !== 'android') return;
      const onBackPress = () => {
        router.replace('/focus/ghost-launcher' as any);
        return true;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => sub.remove();
    }, [router])
  );

  const handleSealNow = async () => {
    await relockNow();
    showToast({
      title: 'Focus Pass Sealed',
      message: 'Shield re-engaged across all applications.',
      type: 'shield',
      icon: 'shield-lock',
    });
  };

  const handleToggleShield = async () => {
    const nextState = !isArmed;
    await toggleShield();
    showToast({
      title: nextState ? 'Shield Armed' : 'Shield Disarmed',
      message: nextState
        ? 'All distraction sources sealed behind mindful gates.'
        : 'Shield lowered. Free access granted.',
      type: nextState ? 'shield' : 'warning',
      icon: nextState ? 'shield-check' : 'shield-off-outline',
    });
  };

  const totalAppsCount =
    Platform.OS === 'ios'
      ? settings.iosBlockedItems.length
      : settings.androidBlockedPackages.length;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity
              onPress={() => router.replace('/focus/ghost-launcher' as any)}
              activeOpacity={0.7}
            >
              <Image
                source={require('@/assets/images/logo.png')}
                style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: NinjaPalette.emerald }}
                resizeMode="contain"
              />
            </TouchableOpacity>
            <View>
              <Text style={styles.rankBadge}>NINJA DISCIPLINE</Text>
              <Text style={styles.appTitle}>The Dojo</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              style={styles.launcherBackPill}
              onPress={() => router.replace('/focus/ghost-launcher' as any)}
              activeOpacity={0.7}
              accessibilityLabel="Back to Ghost Launcher"
            >
              <Ionicons name="arrow-back" size={13} color={NinjaPalette.emerald} />
              <MaterialCommunityIcons name="ghost" size={15} color={NinjaPalette.emerald} />
              <Text style={styles.launcherBackText}>Launcher</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.statsPill}
              onPress={() => router.push('/(tabs)/stats' as any)}
            >
              <MaterialCommunityIcons name="lightning-bolt" size={16} color={NinjaPalette.emerald} />
              <Text style={styles.statsPillText}>
                {settings.totalInterceptsCount}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Temporary Unlock Active Banner */}
        {isUnlocked && (
          <View style={styles.unlockBanner}>
            <View style={{ flex: 1 }}>
              <Text style={styles.unlockBannerTitle}>Focus Pass Active</Text>
              <Text style={styles.unlockBannerTime}>
                {unlockRemainingSeconds > 0
                  ? `${formatTime(unlockRemainingSeconds)} remaining`
                  : 'Time running on open apps'}
              </Text>
            </View>
            <TouchableOpacity style={styles.relockButton} onPress={handleSealNow}>
              <MaterialCommunityIcons name="lock" size={16} color="#070A11" />
              <Text style={styles.relockButtonText}>Seal Now</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Regain Parity: Kage Sensei Digital Companion */}
        <NinjaCompanion
          interceptsCount={settings.totalInterceptsCount}
          totalFocusCoins={settings.focusCoins ?? 120}
        />

        {/* LifeOS Today Dashboard Brief */}
        <LifeOSTodayBrief />

        {/* Master Shield Activation Center */}
        <View style={[styles.shieldHeroCard, isArmed && styles.shieldHeroCardArmed]}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleToggleShield}
            style={[styles.shieldOrb, isArmed ? styles.shieldOrbArmed : styles.shieldOrbDisarmed]}
          >
            <MaterialCommunityIcons
              name={isArmed ? 'shield-check' : 'shield-off-outline'}
              size={64}
              color={isArmed ? '#070A11' : NinjaPalette.amber}
            />
          </TouchableOpacity>

          <Text style={styles.shieldStatusText}>
            {isArmed ? 'SHIELD ARMED' : 'SHIELD DISARMED'}
          </Text>
          <Text style={styles.shieldSubtext}>
            {isArmed
              ? `${totalAppsCount} distraction sources are sealed behind mindful gates.`
              : 'Tap the shield orb to engage focus protection.'}
          </Text>

          <TouchableOpacity
            style={[
              styles.toggleActionBtn,
              isArmed ? styles.toggleActionBtnDisarm : styles.toggleActionBtnArm,
            ]}
            onPress={handleToggleShield}
          >
            <Text
              style={[
                styles.toggleActionBtnText,
                isArmed ? styles.toggleActionBtnTextDisarm : styles.toggleActionBtnTextArm,
              ]}
            >
              {isArmed ? 'Disarm Shield' : 'Engage Shield'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Quick Config Cards */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Focus Presets & Status</Text>
        </View>

        <View style={styles.grid}>
          {/* Blocked Apps Summary */}
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push('/(tabs)/blocklist' as any)}
          >
            <View style={styles.cardIconBox}>
              <MaterialCommunityIcons name="apps" size={24} color={NinjaPalette.emerald} />
            </View>
            <Text style={styles.cardNumber}>{totalAppsCount}</Text>
            <Text style={styles.cardLabel}>Sealed Apps</Text>
            <Text style={styles.cardSub}>Configure armory list</Text>
          </TouchableOpacity>

          {/* Active Gate Type */}
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push('/(tabs)/challenges' as any)}
          >
            <View style={styles.cardIconBox}>
              <MaterialCommunityIcons name="brain" size={24} color={NinjaPalette.cyan} />
            </View>
            <Text style={styles.cardNumber}>
              {settings.activeChallenge === 'breathwork'
                ? 'Zen'
                : settings.activeChallenge === 'math'
                ? 'Reflex'
                : 'Intent'}
            </Text>
            <Text style={styles.cardLabel}>Active Gate</Text>
            <Text style={styles.cardSub}>
              {settings.unlockDurationMinutes}m pass budget
            </Text>
          </TouchableOpacity>
        </View>

        {/* Practice Gate Banner */}
        <TouchableOpacity
          style={styles.testGateBanner}
          onPress={() => router.push('/blocked?app=Instagram&reason=opened' as any)}
        >
          <MaterialCommunityIcons name="sword-cross" size={20} color={NinjaPalette.emerald} />
          <View style={{ flex: 1 }}>
            <Text style={styles.testGateTitle}>Test Breach Simulation</Text>
            <Text style={styles.testGateSub}>Preview your active mindful barrier</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color={NinjaPalette.textMuted} />
        </TouchableOpacity>

        {/* Ninja Ecosystem Arsenal Grid */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Ninja Arsenal & Modules</Text>
        </View>

        <View style={styles.arsenalGrid}>
          {/* 1. Smart Mission Alarms */}
          <TouchableOpacity
            style={styles.arsenalCard}
            onPress={() => router.push('/alarms' as any)}
          >
            <View style={[styles.cardIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
              <MaterialCommunityIcons name="alarm" size={24} color="#EF4444" />
            </View>
            <Text style={styles.cardLabel}>Smart Alarms</Text>
            <Text style={styles.cardSub}>Math & Shake Missions</Text>
          </TouchableOpacity>

          {/* 2. Deep Work Pomodoro */}
          <TouchableOpacity
            style={styles.arsenalCard}
            onPress={() => router.push('/focus/pomodoro' as any)}
          >
            <View style={[styles.cardIconBox, { backgroundColor: 'rgba(236, 72, 153, 0.15)' }]}>
              <MaterialCommunityIcons name="timer-outline" size={24} color="#EC4899" />
            </View>
            <Text style={styles.cardLabel}>Deep Focus</Text>
            <Text style={styles.cardSub}>Pomodoro & Detox</Text>
          </TouchableOpacity>

          {/* 3. Habit Matrix */}
          <TouchableOpacity
            style={styles.arsenalCard}
            onPress={() => router.push('/habits' as any)}
          >
            <View style={[styles.cardIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
              <MaterialCommunityIcons name="fire" size={24} color="#F59E0B" />
            </View>
            <Text style={styles.cardLabel}>Habit Matrix</Text>
            <Text style={styles.cardSub}>Streaks & Routines</Text>
          </TouchableOpacity>

          {/* 4. Cognitive Brain Arcade */}
          <TouchableOpacity
            style={styles.arsenalCard}
            onPress={() => router.push('/dojo-games' as any)}
          >
            <View style={[styles.cardIconBox, { backgroundColor: 'rgba(96, 165, 250, 0.15)' }]}>
              <MaterialCommunityIcons name="controller-classic-outline" size={24} color="#60A5FA" />
            </View>
            <Text style={styles.cardLabel}>Brain Arcade</Text>
            <Text style={styles.cardSub}>Stroop & N-Back</Text>
          </TouchableOpacity>

          {/* 5. Smart Reminders */}
          <TouchableOpacity
            style={styles.arsenalCard}
            onPress={() => router.push('/reminders' as any)}
          >
            <View style={[styles.cardIconBox, { backgroundColor: 'rgba(147, 51, 234, 0.15)' }]}>
              <MaterialCommunityIcons name="bell-ring-outline" size={24} color="#A855F7" />
            </View>
            <Text style={styles.cardLabel}>Sentinels</Text>
            <Text style={styles.cardSub}>Hydration & Breaks</Text>
          </TouchableOpacity>

          {/* 6. Ghost Launcher */}
          <TouchableOpacity
            style={styles.arsenalCard}
            onPress={() => router.push('/focus/ghost-launcher' as any)}
          >
            <View style={[styles.cardIconBox, { backgroundColor: 'rgba(148, 163, 184, 0.15)' }]}>
              <MaterialCommunityIcons name="ghost-outline" size={24} color="#94A3B8" />
            </View>
            <Text style={styles.cardLabel}>Ghost Mode</Text>
            <Text style={styles.cardSub}>Zero-Distraction UI</Text>
          </TouchableOpacity>

          {/* 7. Notification Filter (minimalist phone Parity) */}
          <TouchableOpacity
            style={styles.arsenalCard}
            onPress={() => router.push('/notifications' as any)}
          >
            <View style={[styles.cardIconBox, { backgroundColor: 'rgba(6, 182, 212, 0.15)' }]}>
              <MaterialCommunityIcons name="bell-cancel-outline" size={24} color="#06B6D4" />
            </View>
            <Text style={styles.cardLabel}>Notif Filter</Text>
            <Text style={styles.cardSub}>Staged Quiet Inbox</Text>
          </TouchableOpacity>

          {/* 8. Multiplayer Study Lounges (Regain Parity) */}
          <TouchableOpacity
            style={styles.arsenalCard}
            onPress={() => router.push('/focus/study-rooms' as any)}
          >
            <View style={[styles.cardIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
              <MaterialCommunityIcons name="account-group-outline" size={24} color="#EF4444" />
            </View>
            <Text style={styles.cardLabel}>Study Lounges</Text>
            <Text style={styles.cardSub}>JEE, NEET, UPSC Rooms</Text>
          </TouchableOpacity>

          {/* 9. Battle Arenas (Web Parity) */}
          <TouchableOpacity
            style={styles.arsenalCard}
            onPress={() => router.push({ pathname: '/(tabs)/challenges', params: { tab: 'arenas' } } as any)}
          >
            <View style={[styles.cardIconBox, { backgroundColor: 'rgba(234, 88, 12, 0.15)' }]}>
              <MaterialCommunityIcons name="sword-cross" size={24} color="#F97316" />
            </View>
            <Text style={styles.cardLabel}>Battle Arenas</Text>
            <Text style={styles.cardSub}>Stakes & Challenges</Text>
          </TouchableOpacity>

          {/* 10. Safe Internet Guardian (CleanBrowsing DNS Shield) */}
          <TouchableOpacity
            style={styles.arsenalCard}
            onPress={() => router.push('/guardian' as any)}
          >
            <View style={[styles.cardIconBox, { backgroundColor: 'rgba(0, 230, 153, 0.15)' }]}>
              <MaterialCommunityIcons name="shield-check" size={24} color="#00E699" />
            </View>
            <Text style={styles.cardLabel}>Safe Internet</Text>
            <Text style={styles.cardSub}>DNS Threat Firewall</Text>
          </TouchableOpacity>

          {/* 11. Family Safety */}
          <TouchableOpacity
            style={styles.arsenalCard}
            onPress={() => router.push('/family' as any)}
          >
            <View style={[styles.cardIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <MaterialCommunityIcons name="shield-account-outline" size={24} color="#10B981" />
            </View>
            <Text style={styles.cardLabel}>Family Safety</Text>
            <Text style={styles.cardSub}>Curfews & Supervision</Text>
          </TouchableOpacity>
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
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  rankBadge: {
    color: NinjaPalette.emerald,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: NinjaPalette.textPrimary,
  },
  launcherBackPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  launcherBackText: {
    color: NinjaPalette.emerald,
    fontSize: 12,
    fontWeight: '700',
  },
  statsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statsPillText: {
    color: NinjaPalette.emerald,
    fontSize: 12,
    fontWeight: '700',
  },
  unlockBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F261E',
    borderWidth: 1,
    borderColor: NinjaPalette.emerald,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  unlockBannerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: NinjaPalette.textPrimary,
  },
  unlockBannerTime: {
    fontSize: 12,
    color: NinjaPalette.emerald,
    fontWeight: '600',
    marginTop: 2,
  },
  relockButton: {
    backgroundColor: NinjaPalette.emerald,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  relockButtonText: {
    color: '#070A11',
    fontWeight: 'bold',
    fontSize: 12,
  },
  shieldHeroCard: {
    backgroundColor: '#0F1829',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 36,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 28,
  },
  shieldHeroCardArmed: {
    borderColor: 'rgba(16, 185, 129, 0.35)',
    backgroundColor: '#0A1524',
  },
  shieldOrb: {
    width: 130,
    height: 130,
    borderRadius: 65,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  shieldOrbArmed: {
    backgroundColor: NinjaPalette.emerald,
    shadowColor: NinjaPalette.emerald,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 25,
    elevation: 15,
  },
  shieldOrbDisarmed: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  shieldStatusText: {
    fontSize: 20,
    fontWeight: '900',
    color: NinjaPalette.textPrimary,
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  shieldSubtext: {
    fontSize: 13,
    color: NinjaPalette.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
    maxWidth: 260,
  },
  toggleActionBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  toggleActionBtnArm: {
    backgroundColor: NinjaPalette.emerald,
  },
  toggleActionBtnDisarm: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: NinjaPalette.danger,
  },
  toggleActionBtnText: {
    fontWeight: 'bold',
    fontSize: 15,
  },
  toggleActionBtnTextArm: {
    color: '#070A11',
  },
  toggleActionBtnTextDisarm: {
    color: NinjaPalette.danger,
  },
  sectionHeader: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: NinjaPalette.textPrimary,
  },
  grid: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 20,
  },
  arsenalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 24,
  },
  arsenalCard: {
    width: '48%',
    backgroundColor: '#0F1829',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16,
  },
  card: {
    flex: 1,
    backgroundColor: '#0F1829',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16,
  },
  cardIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cardNumber: {
    fontSize: 22,
    fontWeight: '900',
    color: NinjaPalette.textPrimary,
    marginBottom: 2,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: NinjaPalette.textSecondary,
    marginBottom: 2,
  },
  cardSub: {
    fontSize: 11,
    color: NinjaPalette.textMuted,
  },
  testGateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0F1829',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16,
  },
  testGateTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: NinjaPalette.textPrimary,
  },
  testGateSub: {
    fontSize: 12,
    color: NinjaPalette.textMuted,
  },
});
