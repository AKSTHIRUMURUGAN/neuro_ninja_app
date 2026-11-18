import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { authService } from '../../services/auth/auth-service';
import { useNinjaAlert } from '../../context/ninja-alert-context';

export interface SyncAuthModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function SyncAuthModal({ visible, onClose, onSuccess }: SyncAuthModalProps) {
  const { showToast, showAlert } = useNinjaAlert();

  const [authMode, setAuthMode] = useState<'google' | 'email'>('google');
  const [emailSubMode, setEmailSubMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDismiss = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const authUrl = 'https://neuroninja.vercel.app/auth/mobile-connect?returnUrl=neuroninja://auth-callback';
      const redirectUrl = 'neuroninja://auth-callback';

      // Open real Firebase Google OAuth popup via Chrome Custom Tabs
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);

      if (result.type === 'success' && result.url) {
        const parsed = Linking.parse(result.url);
        const token = (parsed.queryParams?.token as string) || '';
        const userJson = (parsed.queryParams?.user as string) || '';
        let user: any = null;
        if (userJson) {
          try {
            user = JSON.parse(decodeURIComponent(userJson));
          } catch {
            user = null;
          }
        }

        if (token && user) {
          await authService.setExternalSession(token, user);
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          showToast({
            title: 'Firebase Connected',
            message: `Signed in as ${user.name || user.email}`,
            type: 'success',
            icon: 'google',
          });
          onSuccess?.();
          onClose();
          return;
        }
      }

      if (result.type === 'dismiss' || result.type === 'cancel') {
        // User closed or dismissed popup
        return;
      }

      // If URL didn't contain tokens or direct callback failed
      showAlert({
        title: 'Sign-In Incomplete',
        message: 'Could not complete Firebase Google authentication.',
        type: 'warning',
        icon: 'alert-circle',
      });
    } catch (err: any) {
      showAlert({
        title: 'Authentication Error',
        message: err?.message || 'Firebase Google Sign-In encountered an error',
        type: 'error',
        icon: 'alert-circle',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      showAlert({
        title: 'Missing Fields',
        message: 'Please provide both email and password.',
        type: 'warning',
        icon: 'alert-circle',
      });
      return;
    }

    if (emailSubMode === 'register' && !name.trim()) {
      showAlert({
        title: 'Name Required',
        message: 'Please provide your name or ninja moniker.',
        type: 'warning',
        icon: 'alert-circle',
      });
      return;
    }

    setLoading(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      let result;
      if (emailSubMode === 'login') {
        result = await authService.signInWithEmail(email, password);
      } else {
        result = await authService.signUpWithEmail(email, password, name);
      }

      if (result.success) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast({
          title: emailSubMode === 'login' ? 'Welcome Back!' : 'Account Created!',
          message: 'Synced with https://neuroninja.vercel.app',
          type: 'success',
          icon: 'cloud-check',
        });
        onSuccess?.();
        onClose();
      } else {
        showAlert({
          title: emailSubMode === 'login' ? 'Login Failed' : 'Registration Failed',
          message: result.error || 'Server error. Please verify credentials.',
          type: 'error',
          icon: 'alert-circle',
        });
      }
    } catch (err: any) {
      showAlert({
        title: 'Error',
        message: err?.message || 'Network communication error',
        type: 'error',
        icon: 'alert-circle',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleDismiss}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.headerBadgeText}>CLOUD SYNC</Text>
            </View>
            <TouchableOpacity
              onPress={handleDismiss}
              style={styles.closeBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={22} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>Connect Your Account</Text>
            <Text style={styles.subtitle}>
              Keep your habits, tasks, and finance synced seamlessly with{' '}
              <Text style={styles.urlHighlight}>neuroninja.vercel.app</Text>
            </Text>

            {/* Benefits Strip */}
            <View style={styles.benefitsGrid}>
              <View style={styles.benefitItem}>
                <MaterialCommunityIcons name="cellphone-link" size={16} color="#00E699" />
                <Text style={styles.benefitText}>Desktop Web & Mobile Sync</Text>
              </View>
              <View style={styles.benefitItem}>
                <MaterialCommunityIcons name="shield-check" size={16} color="#38BDF8" />
                <Text style={styles.benefitText}>Streak & Data Protection</Text>
              </View>
              <View style={styles.benefitItem}>
                <MaterialCommunityIcons name="sword-cross" size={16} color="#A855F7" />
                <Text style={styles.benefitText}>Multi-Device Boss Battles</Text>
              </View>
            </View>

            {/* Mode Switcher */}
            <View style={styles.modeTabs}>
              <TouchableOpacity
                style={[styles.modeTab, authMode === 'google' && styles.modeTabActive]}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setAuthMode('google');
                }}
              >
                <MaterialCommunityIcons
                  name="google"
                  size={16}
                  color={authMode === 'google' ? '#070A11' : '#94A3B8'}
                />
                <Text
                  style={[styles.modeTabText, authMode === 'google' && styles.modeTabTextActive]}
                >
                  Google
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modeTab, authMode === 'email' && styles.modeTabActive]}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setAuthMode('email');
                }}
              >
                <MaterialCommunityIcons
                  name="email-outline"
                  size={16}
                  color={authMode === 'email' ? '#070A11' : '#94A3B8'}
                />
                <Text
                  style={[styles.modeTabText, authMode === 'email' && styles.modeTabTextActive]}
                >
                  Email & Password
                </Text>
              </TouchableOpacity>
            </View>

            {/* Google Auth Body */}
            {authMode === 'google' ? (
              <View style={styles.authSection}>
                <View style={styles.firebaseInfoBadge}>
                  <MaterialCommunityIcons name="firebase" size={18} color="#FFCA28" />
                  <Text style={styles.firebaseInfoText}>Firebase Cloud Authentication</Text>
                </View>

                <Text style={styles.googleExplainerText}>
                  Connect with your genuine Google account to synchronize your habits, streak milestones, calendar logs, and tasks with neuroninja.vercel.app.
                </Text>

                <TouchableOpacity
                  style={[styles.primaryActionBtn, styles.googleBtn, loading && styles.btnDisabled]}
                  onPress={handleGoogleSignIn}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color="#070A11" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="google" size={22} color="#070A11" />
                      <Text style={styles.googleBtnText}>1-Tap Sign In with Google</Text>
                    </>
                  )}
                </TouchableOpacity>

                <Text style={styles.googleSecurityNotice}>
                  A secure Google account selector popup will open. Select your Gmail account to complete sign-in.
                </Text>
              </View>
            ) : (
              /* Email Auth Body */
              <View style={styles.authSection}>
                {/* Submode toggle */}
                <View style={styles.subModeRow}>
                  <TouchableOpacity
                    style={[styles.subModeBtn, emailSubMode === 'login' && styles.subModeBtnActive]}
                    onPress={() => setEmailSubMode('login')}
                  >
                    <Text
                      style={[
                        styles.subModeText,
                        emailSubMode === 'login' && styles.subModeTextActive,
                      ]}
                    >
                      Sign In
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.subModeBtn,
                      emailSubMode === 'register' && styles.subModeBtnActive,
                    ]}
                    onPress={() => setEmailSubMode('register')}
                  >
                    <Text
                      style={[
                        styles.subModeText,
                        emailSubMode === 'register' && styles.subModeTextActive,
                      ]}
                    >
                      Create Account
                    </Text>
                  </TouchableOpacity>
                </View>

                {emailSubMode === 'register' && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Full Name / Moniker</Text>
                    <View style={styles.inputRow}>
                      <MaterialCommunityIcons name="account" size={18} color="#64748B" />
                      <TextInput
                        style={styles.input}
                        placeholder="e.g. Master Ryu"
                        placeholderTextColor="#475569"
                        value={name}
                        onChangeText={setName}
                      />
                    </View>
                  </View>
                )}

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <View style={styles.inputRow}>
                    <MaterialCommunityIcons name="email-outline" size={18} color="#64748B" />
                    <TextInput
                      style={styles.input}
                      placeholder="ninja@example.com"
                      placeholderTextColor="#475569"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <View style={styles.inputRow}>
                    <MaterialCommunityIcons name="lock-outline" size={18} color="#64748B" />
                    <TextInput
                      style={styles.input}
                      placeholder="••••••••"
                      placeholderTextColor="#475569"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.primaryActionBtn, loading && styles.btnDisabled]}
                  onPress={handleEmailSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#070A11" />
                  ) : (
                    <>
                      <MaterialCommunityIcons
                        name={emailSubMode === 'login' ? 'login' : 'account-plus'}
                        size={20}
                        color="#070A11"
                      />
                      <Text style={styles.primaryActionText}>
                        {emailSubMode === 'login' ? 'Sign In to Cloud' : 'Create Cloud Account'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Offline Local Ninja Exit Option */}
            <TouchableOpacity style={styles.localOptionBtn} onPress={handleDismiss}>
              <MaterialCommunityIcons name="shield-off-outline" size={16} color="#64748B" />
              <Text style={styles.localOptionText}>Continue as Local Ninja (Offline Only)</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#070A11',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 153, 0.25)',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 32,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 230, 153, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 153, 0.25)',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00E699',
  },
  headerBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#00E699',
    letterSpacing: 1.2,
  },
  closeBtn: {
    padding: 6,
    backgroundColor: '#0F1829',
    borderRadius: 14,
  },
  scroll: {
    flexGrow: 0,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
    marginBottom: 16,
  },
  urlHighlight: {
    color: '#38BDF8',
    fontWeight: '700',
  },
  benefitsGrid: {
    backgroundColor: '#0B1220',
    borderRadius: 16,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 18,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  benefitText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E2E8F0',
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: '#0F1829',
    borderRadius: 16,
    padding: 4,
    gap: 6,
    marginBottom: 18,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  modeTabActive: {
    backgroundColor: '#00E699',
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  modeTabTextActive: {
    color: '#070A11',
  },
  authSection: {
    gap: 12,
    marginBottom: 16,
  },
  subModeRow: {
    flexDirection: 'row',
    backgroundColor: '#0B1220',
    borderRadius: 12,
    padding: 3,
    marginBottom: 6,
  },
  subModeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  subModeBtnActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)',
  },
  subModeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  subModeTextActive: {
    color: '#38BDF8',
    fontWeight: '700',
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B1220',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 14,
    height: 48,
    gap: 10,
  },
  input: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '500',
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00E699',
    borderRadius: 16,
    height: 50,
    gap: 8,
    marginTop: 8,
    shadowColor: '#00E699',
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  googleBtn: {
    backgroundColor: '#F8FAFC',
    shadowColor: '#F8FAFC',
  },
  googleBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#070A11',
  },
  primaryActionText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#070A11',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  localOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    marginTop: 6,
  },
  localOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  firebaseInfoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 202, 40, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 202, 40, 0.25)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  firebaseInfoText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFCA28',
  },
  googleExplainerText: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
    marginVertical: 4,
  },
  googleSecurityNotice: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 16,
  },
});
