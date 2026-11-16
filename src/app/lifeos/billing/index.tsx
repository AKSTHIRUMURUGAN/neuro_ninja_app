import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { guardianService } from '../../../services/guardian/guardian-service';
import type { SubscriptionInfo, SubscriptionTier } from '../../../services/guardian/guardian-types';

export default function BillingScreen() {
  const router = useRouter();
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState<number | null>(null);
  const [couponMsg, setCouponMsg] = useState('');

  useEffect(() => {
    let isMounted = true;
    guardianService.getSubscription().then(data => {
      if (isMounted) setSubscription(data);
    }).catch(e => {
      console.error('[BillingScreen] load error:', e);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleApplyCoupon = () => {
    if (!couponCode.trim()) return;
    const res = guardianService.applyCoupon(couponCode);
    if (res.valid) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCouponDiscount(res.discountPercent ?? 50);
      setCouponMsg(res.message);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setCouponDiscount(null);
      setCouponMsg(res.message);
    }
  };

  const handleSelectTier = async (tier: SubscriptionTier) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const updated = await guardianService.upgradeSubscription(tier, cycle);
    setSubscription(updated);
    Alert.alert(
      '🌟 Subscription Updated!',
      `You are now active on the ${tier.toUpperCase()} plan. Thank you for empowering your focus.`
    );
  };

  const PLANS = [
    {
      tier: 'free' as SubscriptionTier,
      name: 'Free Ninja',
      priceMonthly: 0,
      priceYearly: 0,
      desc: 'Essential habits, basic overlay blocker, and 3 brain games',
      features: ['Core habits (up to 3)', 'Basic app blocker', 'Top 3 brain games'],
    },
    {
      tier: 'pro' as SubscriptionTier,
      name: 'Pro Cyberpunk',
      priceMonthly: 499,
      priceYearly: 3999,
      desc: 'Full power: all 28 games, floating HUD, and unlimited themes',
      features: [
        'Unlimited Habits & Tasks',
        'All 28 Neuro Arena brain games & Chess bot',
        'Floating Doomscroll HUD overlay with custom thresholds',
        'Unlimited Neuro Store theme downloads',
        'Cloud sync across all your devices',
      ],
      badge: 'MOST POPULAR',
    },
    {
      tier: 'guardian' as SubscriptionTier,
      name: 'Guardian Family',
      priceMonthly: 999,
      priceYearly: 7999,
      desc: 'Complete family oversight, remote locks, and screen time management',
      features: [
        'Everything in Pro Cyberpunk',
        'Up to 5 linked Family members',
        'Remote App Blocker & override approvals',
        'Weekly screen time & habit audit report',
        'Priority accountability verification',
      ],
      badge: 'FAMILY SHIELD',
    },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color="#F8FAFC" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Subscription & Plans</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Active Status Hero */}
        <View style={styles.currentPlanCard}>
          <Text style={styles.currentPlanSub}>CURRENT MEMBERSHIP</Text>
          <View style={styles.planHeaderRow}>
            <Text style={styles.currentPlanName}>
              {subscription?.tier.toUpperCase()} TIER
            </Text>
            <View style={styles.activePill}>
              <Text style={styles.activeText}>ACTIVE</Text>
            </View>
          </View>
          <Text style={styles.renewsText}>
            Auto-renew enabled • Valid until {subscription?.expiresAt?.split('T')[0] || 'Continuous'}
          </Text>
        </View>

        {/* Billing Cycle Toggle */}
        <View style={styles.cycleToggleContainer}>
          <TouchableOpacity
            style={[styles.cycleBtn, cycle === 'monthly' && styles.cycleBtnActive]}
            onPress={() => setCycle('monthly')}
            activeOpacity={0.8}
          >
            <Text style={[styles.cycleText, cycle === 'monthly' && styles.cycleTextActive]}>
              Monthly
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cycleBtn, cycle === 'yearly' && styles.cycleBtnActive]}
            onPress={() => setCycle('yearly')}
            activeOpacity={0.8}
          >
            <Text style={[styles.cycleText, cycle === 'yearly' && styles.cycleTextActive]}>
              Annual (Save 20%)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Promo Coupon Card */}
        <View style={styles.couponCard}>
          <Text style={styles.couponLabel}>HAVE A PROMO CODE?</Text>
          <View style={styles.couponRow}>
            <TextInput
              style={styles.couponInput}
              placeholder="Try CYBER50 or DOJO100"
              placeholderTextColor="#64748B"
              autoCapitalize="characters"
              value={couponCode}
              onChangeText={setCouponCode}
            />
            <TouchableOpacity
              style={styles.applyCouponBtn}
              onPress={handleApplyCoupon}
              activeOpacity={0.8}
            >
              <Text style={styles.applyCouponText}>Apply</Text>
            </TouchableOpacity>
          </View>
          {couponMsg ? (
            <Text
              style={[
                styles.couponMsgText,
                couponDiscount !== null ? { color: '#00E699' } : { color: '#EF4444' },
              ]}
            >
              {couponMsg}
            </Text>
          ) : null}
        </View>

        {/* Tier Pricing Cards */}
        {PLANS.map(plan => {
          const isCurrent = subscription?.tier === plan.tier;
          let rawPrice = cycle === 'monthly' ? plan.priceMonthly : plan.priceYearly;
          if (couponDiscount && rawPrice > 0) {
            rawPrice = Math.round(rawPrice * (1 - couponDiscount / 100));
          }

          return (
            <View
              key={plan.tier}
              style={[
                styles.planCard,
                isCurrent && styles.planCardCurrent,
                plan.tier === 'pro' && !isCurrent && styles.planCardHighlight,
              ]}
            >
              {plan.badge && (
                <View style={styles.badgePill}>
                  <Text style={styles.badgeText}>{plan.badge}</Text>
                </View>
              )}

              <Text style={styles.tierName}>{plan.name}</Text>
              <Text style={styles.tierPrice}>
                {rawPrice === 0 ? 'Free' : `₹${rawPrice}`}
                <Text style={styles.tierCycle}>
                  {rawPrice > 0 ? (cycle === 'monthly' ? '/mo' : '/yr') : ''}
                </Text>
              </Text>
              <Text style={styles.tierDesc}>{plan.desc}</Text>

              <View style={styles.featuresList}>
                {plan.features.map((feat, idx) => (
                  <View key={idx} style={styles.featRow}>
                    <Ionicons name="checkmark-circle" size={16} color="#00E699" />
                    <Text style={styles.featText}>{feat}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[
                  styles.selectPlanBtn,
                  isCurrent && styles.selectPlanBtnCurrent,
                  plan.tier === 'guardian' && !isCurrent && { backgroundColor: '#818CF8' },
                ]}
                onPress={() => handleSelectTier(plan.tier)}
                activeOpacity={0.8}
                disabled={isCurrent}
              >
                <Text
                  style={[styles.selectPlanText, isCurrent && styles.selectPlanTextCurrent]}
                >
                  {isCurrent ? 'Current Plan' : `Upgrade to ${plan.name}`}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
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
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#070A11',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#0F1829',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 60,
  },
  currentPlanCard: {
    backgroundColor: '#0F1829',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 153, 0.3)',
    marginBottom: 20,
  },
  currentPlanSub: {
    color: '#00E699',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  planHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  currentPlanName: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '900',
  },
  activePill: {
    backgroundColor: 'rgba(0, 230, 153, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  activeText: {
    color: '#00E699',
    fontSize: 11,
    fontWeight: '800',
  },
  renewsText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  cycleToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#0F1829',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 20,
  },
  cycleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  cycleBtnActive: {
    backgroundColor: '#00E699',
  },
  cycleText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '700',
  },
  cycleTextActive: {
    color: '#070A11',
    fontWeight: '800',
  },
  couponCard: {
    backgroundColor: '#0F1829',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 24,
  },
  couponLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  couponRow: {
    flexDirection: 'row',
    gap: 10,
  },
  couponInput: {
    flex: 1,
    backgroundColor: '#070A11',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  applyCouponBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyCouponText: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '800',
  },
  couponMsgText: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
  },
  planCard: {
    backgroundColor: '#0F1829',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 20,
    position: 'relative',
  },
  planCardCurrent: {
    borderColor: '#00E699',
  },
  planCardHighlight: {
    borderColor: 'rgba(245, 158, 11, 0.35)',
  },
  badgePill: {
    position: 'absolute',
    top: 18,
    right: 18,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  badgeText: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tierName: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
  },
  tierPrice: {
    color: '#00E699',
    fontSize: 32,
    fontWeight: '900',
    marginBottom: 6,
  },
  tierCycle: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600',
  },
  tierDesc: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 18,
  },
  featuresList: {
    gap: 10,
    marginBottom: 22,
  },
  featRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featText: {
    color: '#CBD5E1',
    fontSize: 13,
  },
  selectPlanBtn: {
    backgroundColor: '#00E699',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  selectPlanBtnCurrent: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  selectPlanText: {
    color: '#070A11',
    fontSize: 14,
    fontWeight: '800',
  },
  selectPlanTextCurrent: {
    color: '#64748B',
  },
});
