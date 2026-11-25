import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NinjaPalette } from '../constants/theme';

interface ProminentDisclosureModalProps {
  visible: boolean;
  onAgree: () => void;
  onDecline: () => void;
}

/**
 * Mandatory Google Play Accessibility Policy Prominent Disclosure Modal.
 * Must be presented to the user BEFORE requesting Android Accessibility Service.
 * Complies with Google Play Developer Policy Section 4.3 (Accessibility API).
 */
export const ProminentDisclosureModal: React.FC<ProminentDisclosureModalProps> = ({
  visible,
  onAgree,
  onDecline,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDecline}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header Icon */}
          <View style={styles.iconBadge}>
            <MaterialCommunityIcons
              name="shield-check"
              size={36}
              color={NinjaPalette.emerald}
            />
          </View>

          <Text style={styles.title}>Prominent Disclosure</Text>
          <Text style={styles.subtitle}>Accessibility Service Permission</Text>

          <ScrollView
            style={styles.scrollArea}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.sectionHeading}>Why NeuroNinja needs this access</Text>
            <Text style={styles.bodyText}>
              NeuroNinja uses the Android <Text style={styles.bold}>AccessibilityService API</Text> exclusively to power the <Text style={styles.bold}>Reels Guardian &amp; Doomscroll Counter</Text>.
            </Text>

            <View style={styles.bulletItem}>
              <MaterialCommunityIcons
                name="movie-play-outline"
                size={20}
                color={NinjaPalette.emerald}
                style={styles.bulletIcon}
              />
              <Text style={styles.bulletText}>
                <Text style={styles.bold}>Short-Video Detection:</Text> Reads screen element identifiers within short-form video players (such as Instagram Reels and YouTube Shorts) to track the number of reels you scroll through.
              </Text>
            </View>

            <View style={styles.bulletItem}>
              <MaterialCommunityIcons
                name="timer-sand"
                size={20}
                color={NinjaPalette.emerald}
                style={styles.bulletIcon}
              />
              <Text style={styles.bulletText}>
                <Text style={styles.bold}>Dwell Time Filtering:</Text> Measures dwell duration (1.8s threshold) to differentiate intentional video watching from rapid flicks.
              </Text>
            </View>

            <View style={styles.bulletItem}>
              <MaterialCommunityIcons
                name="hand-back-right-outline"
                size={20}
                color={NinjaPalette.emerald}
                style={styles.bulletIcon}
              />
              <Text style={styles.bulletText}>
                <Text style={styles.bold}>Surgical Break Enforcement:</Text> Intercepts addictive endless feeds when your daily reel budget is exceeded, while leaving chats and regular videos accessible.
              </Text>
            </View>

            <View style={styles.privacyCard}>
              <View style={styles.privacyHeader}>
                <MaterialCommunityIcons name="lock-outline" size={18} color="#10B981" />
                <Text style={styles.privacyTitle}>Your Privacy Guarantee</Text>
              </View>
              <Text style={styles.privacyText}>
                • Data is processed <Text style={styles.bold}>100% locally on your device in real-time</Text>.{'\n'}
                • NeuroNinja <Text style={styles.bold}>never collects, stores, or transmits</Text> your screen text, personal messages, keystrokes, or account information to any server.
              </Text>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.agreeButton}
              onPress={onAgree}
              activeOpacity={0.8}
            >
              <Text style={styles.agreeButtonText}>I Agree &amp; Continue</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.declineButton}
              onPress={onDecline}
              activeOpacity={0.7}
            >
              <Text style={styles.declineButtonText}>Not Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: '#0B111E',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    padding: 24,
    alignItems: 'center',
  },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1.5,
    borderColor: NinjaPalette.emerald,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: NinjaPalette.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 13,
    color: NinjaPalette.emerald,
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scrollArea: {
    width: '100%',
    marginVertical: 8,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: NinjaPalette.textPrimary,
    marginBottom: 8,
  },
  bodyText: {
    fontSize: 13,
    color: NinjaPalette.textSecondary,
    lineHeight: 19,
    marginBottom: 16,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  bulletIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  bulletText: {
    flex: 1,
    fontSize: 12.5,
    color: NinjaPalette.textSecondary,
    lineHeight: 18,
  },
  bold: {
    fontWeight: '700',
    color: NinjaPalette.textPrimary,
  },
  privacyCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    padding: 14,
    marginTop: 12,
    marginBottom: 8,
  },
  privacyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  privacyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10B981',
  },
  privacyText: {
    fontSize: 12,
    color: NinjaPalette.textSecondary,
    lineHeight: 17,
  },
  actions: {
    width: '100%',
    marginTop: 18,
    gap: 10,
  },
  agreeButton: {
    backgroundColor: NinjaPalette.emerald,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: NinjaPalette.emerald,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  agreeButtonText: {
    color: '#070A11',
    fontWeight: '800',
    fontSize: 15,
  },
  declineButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  declineButtonText: {
    color: NinjaPalette.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
});
