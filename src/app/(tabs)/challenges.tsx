import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useNinja } from '../../context/ninja-context';
import { NinjaPalette } from '../../constants/theme';
import type { ChallengeType } from '../../services/storage';

const PASS_OPTIONS = [5, 10, 15, 20];

export default function ChallengesScreen() {
  const router = useRouter();
  const {
    settings,
    setChallengeType,
    setUnlockDuration,
    setStrictMode,
  } = useNinja();

  const handleSelectGate = async (type: ChallengeType) => {
    await setChallengeType(type);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.badge}>MINDFUL FRICTION</Text>
          <Text style={styles.title}>Focus Gates</Text>
          <Text style={styles.subtitle}>
            Choose what challenge confronts you when you attempt to open a sealed app.
          </Text>
        </View>

        {/* Gate Option 1: Zen Breathwork */}
        <TouchableOpacity
          style={[
            styles.gateCard,
            settings.activeChallenge === 'breathwork' && styles.gateCardSelected,
          ]}
          onPress={() => handleSelectGate('breathwork')}
        >
          <View style={styles.cardTop}>
            <View
              style={[
                styles.iconBox,
                settings.activeChallenge === 'breathwork' && styles.iconBoxSelected,
              ]}
            >
              <MaterialCommunityIcons
                name="weather-windy"
                size={26}
                color={
                  settings.activeChallenge === 'breathwork'
                    ? NinjaPalette.emerald
                    : NinjaPalette.textSecondary
                }
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.gateTitle}>Zen Breathwork</Text>
              <Text style={styles.gateSub}>
                16s Box Breathing (Inhale, Hold, Exhale, Pause)
              </Text>
            </View>
            <View
              style={[
                styles.checkCircle,
                settings.activeChallenge === 'breathwork' && styles.checkCircleSelected,
              ]}
            >
              {settings.activeChallenge === 'breathwork' && (
                <MaterialCommunityIcons name="check" size={14} color="#070A11" />
              )}
            </View>
          </View>
          <Text style={styles.gateDesc}>
            Breaks dopamine autopilot by calming your heart rate and re-routing neural attention to the present moment.
          </Text>
        </TouchableOpacity>

        {/* Gate Option 2: Prefrontal Reflex Math */}
        <TouchableOpacity
          style={[
            styles.gateCard,
            settings.activeChallenge === 'math' && styles.gateCardSelected,
          ]}
          onPress={() => handleSelectGate('math')}
        >
          <View style={styles.cardTop}>
            <View
              style={[
                styles.iconBox,
                settings.activeChallenge === 'math' && styles.iconBoxSelected,
              ]}
            >
              <MaterialCommunityIcons
                name="calculator-variant"
                size={26}
                color={
                  settings.activeChallenge === 'math'
                    ? NinjaPalette.cyan
                    : NinjaPalette.textSecondary
                }
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.gateTitle}>Reflex Math Sprint</Text>
              <Text style={styles.gateSub}>
                2-4 Rapid Mental Arithmetic Problems
              </Text>
            </View>
            <View
              style={[
                styles.checkCircle,
                settings.activeChallenge === 'math' && styles.checkCircleSelected,
              ]}
            >
              {settings.activeChallenge === 'math' && (
                <MaterialCommunityIcons name="check" size={14} color="#070A11" />
              )}
            </View>
          </View>
          <Text style={styles.gateDesc}>
            Forces blood flow into your prefrontal cortex, immediately shutting off subconscious muscle memory.
          </Text>
        </TouchableOpacity>

        {/* Gate Option 3: Intention Journal */}
        <TouchableOpacity
          style={[
            styles.gateCard,
            settings.activeChallenge === 'intent' && styles.gateCardSelected,
          ]}
          onPress={() => handleSelectGate('intent')}
        >
          <View style={styles.cardTop}>
            <View
              style={[
                styles.iconBox,
                settings.activeChallenge === 'intent' && styles.iconBoxSelected,
              ]}
            >
              <MaterialCommunityIcons
                name="notebook-edit"
                size={26}
                color={
                  settings.activeChallenge === 'intent'
                    ? NinjaPalette.amber
                    : NinjaPalette.textSecondary
                }
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.gateTitle}>Intention Reflection</Text>
              <Text style={styles.gateSub}>
                Purpose declaration with reflection delay
              </Text>
            </View>
            <View
              style={[
                styles.checkCircle,
                settings.activeChallenge === 'intent' && styles.checkCircleSelected,
              ]}
            >
              {settings.activeChallenge === 'intent' && (
                <MaterialCommunityIcons name="check" size={14} color="#070A11" />
              )}
            </View>
          </View>
          <Text style={styles.gateDesc}>
            Mandatory prompt asking why you are entering the app, with an unskippable reflection pause.
          </Text>
        </TouchableOpacity>

        {/* Focus Pass Duration Setting */}
        <View style={styles.configSection}>
          <Text style={styles.sectionHeading}>EARNED FOCUS PASS DURATION</Text>
          <Text style={styles.sectionSub}>
            How much screen time is granted upon passing a mindful gate. The budget pauses when you leave the app.
          </Text>

          <View style={styles.passRow}>
            {PASS_OPTIONS.map((mins) => {
              const isSelected = settings.unlockDurationMinutes === mins;
              return (
                <TouchableOpacity
                  key={mins}
                  style={[styles.passButton, isSelected && styles.passButtonSelected]}
                  onPress={() => setUnlockDuration(mins)}
                >
                  <Text style={[styles.passText, isSelected && styles.passTextSelected]}>
                    {mins}m
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Strict Mode Setting */}
        <View style={styles.strictCard}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <MaterialCommunityIcons name="shield-sword" size={18} color={NinjaPalette.danger} />
              <Text style={styles.strictTitle}>Iron Will (Strict Mode)</Text>
            </View>
            <Text style={styles.strictSub}>
              Doubles challenge duration and reflection timers.
            </Text>
          </View>
          <Switch
            value={settings.strictMode}
            onValueChange={setStrictMode}
            thumbColor={settings.strictMode ? NinjaPalette.danger : '#94A3B8'}
            trackColor={{ false: '#1E293B', true: 'rgba(239, 68, 68, 0.4)' }}
          />
        </View>

        {/* Test Run Button */}
        <TouchableOpacity
          style={styles.previewButton}
          onPress={() => router.push('/blocked?app=Instagram&reason=opened' as any)}
        >
          <MaterialCommunityIcons name="play-circle" size={20} color="#070A11" />
          <Text style={styles.previewButtonText}>Practice Active Gate</Text>
        </TouchableOpacity>
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
    marginBottom: 24,
  },
  badge: {
    color: NinjaPalette.emerald,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: NinjaPalette.textPrimary,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: NinjaPalette.textSecondary,
    lineHeight: 18,
  },
  gateCard: {
    backgroundColor: '#0F1829',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 18,
    marginBottom: 16,
  },
  gateCardSelected: {
    borderColor: NinjaPalette.emerald,
    backgroundColor: '#0C1C2B',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 12,
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxSelected: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  gateTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: NinjaPalette.textPrimary,
  },
  gateSub: {
    fontSize: 12,
    color: NinjaPalette.textSecondary,
    marginTop: 2,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleSelected: {
    borderColor: NinjaPalette.emerald,
    backgroundColor: NinjaPalette.emerald,
  },
  gateDesc: {
    fontSize: 12,
    color: NinjaPalette.textMuted,
    lineHeight: 17,
  },
  configSection: {
    backgroundColor: '#0F1829',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 18,
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: NinjaPalette.emerald,
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  sectionSub: {
    fontSize: 12,
    color: NinjaPalette.textSecondary,
    lineHeight: 16,
    marginBottom: 16,
  },
  passRow: {
    flexDirection: 'row',
    gap: 10,
  },
  passButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
  },
  passButtonSelected: {
    borderColor: NinjaPalette.emerald,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  passText: {
    color: NinjaPalette.textSecondary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  passTextSelected: {
    color: NinjaPalette.emerald,
  },
  strictCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F1829',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 18,
    marginBottom: 24,
  },
  strictTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: NinjaPalette.textPrimary,
  },
  strictSub: {
    fontSize: 12,
    color: NinjaPalette.textSecondary,
    marginTop: 2,
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: NinjaPalette.emerald,
    paddingVertical: 16,
    borderRadius: 14,
  },
  previewButtonText: {
    color: '#070A11',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
