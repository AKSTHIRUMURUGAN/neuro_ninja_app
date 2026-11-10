import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Platform,
  Image,
  AppState,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useNinja } from '../../context/ninja-context';
import { blockerEngine } from '../../services/blocker/blocker-engine';
import {
  checkLauncherStatus,
  promptSetDefaultLauncher,
  openNormalLauncherSettings,
  launchApplication,
} from '../../services/launcher/launcher-service';

export interface GhostApp {
  id: string;
  packageName?: string;
  name: string;
  customName?: string;
  category: 'Communication' | 'Productivity' | 'Study' | 'Utility' | 'Media' | 'General';
  isFavorite: boolean;
  isHidden: boolean;
  iconBase64?: string | null;
}

function inferCategory(pkg: string, name: string): GhostApp['category'] {
  const p = (pkg + ' ' + name).toLowerCase();
  if (
    p.includes('whatsapp') ||
    p.includes('telegram') ||
    p.includes('signal') ||
    p.includes('message') ||
    p.includes('chat') ||
    p.includes('phone') ||
    p.includes('contact') ||
    p.includes('dialer')
  ) {
    return 'Communication';
  }
  if (
    p.includes('youtube') ||
    p.includes('netflix') ||
    p.includes('spotify') ||
    p.includes('camera') ||
    p.includes('gallery') ||
    p.includes('photo') ||
    p.includes('video') ||
    p.includes('music') ||
    p.includes('instagram') ||
    p.includes('tiktok')
  ) {
    return 'Media';
  }
  if (
    p.includes('note') ||
    p.includes('calendar') ||
    p.includes('todo') ||
    p.includes('keep') ||
    p.includes('clock') ||
    p.includes('calculator') ||
    p.includes('drive') ||
    p.includes('doc')
  ) {
    return 'Productivity';
  }
  if (
    p.includes('study') ||
    p.includes('learn') ||
    p.includes('book') ||
    p.includes('brain') ||
    p.includes('quiz') ||
    p.includes('read')
  ) {
    return 'Study';
  }
  if (
    p.includes('chrome') ||
    p.includes('browser') ||
    p.includes('settings') ||
    p.includes('map') ||
    p.includes('uber') ||
    p.includes('weather') ||
    p.includes('file')
  ) {
    return 'Utility';
  }
  return 'General';
}

type LauncherProfile = 'minimal' | 'deep_focus' | 'normal';
type ThemeMode = 'oled' | 'slate' | 'paper';

export default function GhostLauncherScreen() {
  const router = useRouter();
  const { settings, setGhostLauncherAsHome } = useNinja();

  const [profile, setProfile] = useState<LauncherProfile>('minimal');
  const [theme, setTheme] = useState<ThemeMode>('oled');
  const [apps, setApps] = useState<GhostApp[]>([]);
  const [isLoadingApps, setIsLoadingApps] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Android Launcher State
  const [isDefaultLauncher, setIsDefaultLauncher] = useState<boolean>(false);
  const [isLauncherSupported, setIsLauncherSupported] = useState<boolean>(Platform.OS === 'android');
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showGuidedModal, setShowGuidedModal] = useState<boolean>(false);
  const [bannerDismissed, setBannerDismissed] = useState<boolean>(false);

  // App Renaming Modal
  const [renamingApp, setRenamingApp] = useState<GhostApp | null>(null);
  const [renameInput, setRenameInput] = useState('');

  // Clock
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');

  // Check launcher status and register resume listener
  useEffect(() => {
    let isMounted = true;
    void checkLauncherStatus().then((status) => {
      if (isMounted) {
        setIsDefaultLauncher(status.isDefault);
        setIsLauncherSupported(status.isSupported);
      }
    });

    const sub = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        void checkLauncherStatus().then((status) => {
          if (isMounted) {
            setIsDefaultLauncher(status.isDefault);
            setIsLauncherSupported(status.isSupported);
          }
        });
      }
    });

    return () => {
      isMounted = false;
      sub.remove();
    };
  }, []);

  // Load Real Installed Applications
  useEffect(() => {
    let isMounted = true;
    void (async () => {
      try {
        const [installedApps, savedPrefsRaw] = await Promise.all([
          blockerEngine.getInstalledApps(),
          AsyncStorage.getItem('@ghost_launcher_user_prefs_v2'),
        ]);

        const savedPrefs = savedPrefsRaw
          ? JSON.parse(savedPrefsRaw)
          : { favorites: [], aliases: {}, hidden: [] };

        const builtInPortals: GhostApp[] = [
          {
            id: 'portal_study',
            packageName: 'builtin.study_portal',
            name: 'YouTube Study Mode (Shorts Blocked)',
            category: 'Study',
            isFavorite: true,
            isHidden: false,
          },
          {
            id: 'portal_arcade',
            packageName: 'builtin.dojo_brain',
            name: 'Ninja Brain Arcade',
            category: 'Study',
            isFavorite: true,
            isHidden: false,
          },
        ];

        const realAppItems: GhostApp[] = (installedApps || []).map((app) => ({
          id: app.packageName,
          packageName: app.packageName,
          name: app.name,
          customName: savedPrefs.aliases?.[app.packageName],
          category: inferCategory(app.packageName, app.name),
          isFavorite: savedPrefs.favorites?.includes(app.packageName) ?? false,
          isHidden: savedPrefs.hidden?.includes(app.packageName) ?? false,
          iconBase64: app.iconBase64,
        }));

        if (isMounted) {
          setApps([...builtInPortals, ...realAppItems]);
          setIsLoadingApps(false);
        }
      } catch (err) {
        console.warn('Failed to load installed apps for ghost launcher:', err);
        if (isMounted) {
          setIsLoadingApps(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  // Clock tick
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
      );
      setDateStr(
        now.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const savePreferences = async (updatedApps: GhostApp[]) => {
    try {
      const prefs = {
        favorites: updatedApps.filter((a) => a.isFavorite).map((a) => a.id),
        hidden: updatedApps.filter((a) => a.isHidden).map((a) => a.id),
        aliases: updatedApps.reduce<Record<string, string>>((acc, a) => {
          if (a.customName && a.customName.trim()) acc[a.id] = a.customName.trim();
          return acc;
        }, {}),
      };
      await AsyncStorage.setItem('@ghost_launcher_user_prefs_v2', JSON.stringify(prefs));
    } catch (e) {
      console.warn('Failed to save ghost launcher prefs:', e);
    }
  };

  const themeStyles = useMemo(() => {
    if (theme === 'paper') {
      return {
        bg: '#F4F4F5',
        text: '#18181B',
        subtext: '#71717A',
        border: '#E4E4E7',
        cardBg: '#FFFFFF',
        accent: '#09090B',
      };
    }
    if (theme === 'slate') {
      return {
        bg: '#18181B',
        text: '#FAFAFA',
        subtext: '#A1A1AA',
        border: '#27272A',
        cardBg: '#27272A',
        accent: '#38BDF8',
      };
    }
    return {
      bg: '#000000',
      text: '#FFFFFF',
      subtext: '#71717A',
      border: '#27272A',
      cardBg: '#121214',
      accent: '#00E699',
    };
  }, [theme]);

  const handleStartSetDefault = () => {
    setShowGuidedModal(true);
  };

  const handleConfirmSetDefault = async () => {
    setShowGuidedModal(false);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await setGhostLauncherAsHome(true);
    const triggered = promptSetDefaultLauncher();
    if (!triggered) {
      openNormalLauncherSettings();
    }
  };

  const handleSwitchToNormalLauncher = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await setGhostLauncherAsHome(false);
    const opened = openNormalLauncherSettings();
    if (!opened) {
      Alert.alert(
        'Default Apps',
        'Open Android Settings > Apps > Default Apps > Home App to choose your standard phone launcher.'
      );
    }
  };

  const toggleFavorite = async (id: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setApps((prev) => {
      const next = prev.map((app) =>
        app.id === id ? { ...app, isFavorite: !app.isFavorite } : app
      );
      void savePreferences(next);
      return next;
    });
  };

  const toggleHide = async (id: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setApps((prev) => {
      const next = prev.map((app) =>
        app.id === id ? { ...app, isHidden: !app.isHidden } : app
      );
      void savePreferences(next);
      return next;
    });
  };

  const handleStartRename = (app: GhostApp) => {
    setRenamingApp(app);
    setRenameInput(app.customName || app.name);
  };

  const handleSaveRename = async () => {
    if (!renamingApp) return;
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setApps((prev) => {
      const next = prev.map((app) =>
        app.id === renamingApp.id ? { ...app, customName: renameInput.trim() } : app
      );
      void savePreferences(next);
      return next;
    });
    setRenamingApp(null);
  };

  const handleLaunchApp = async (app: GhostApp) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (app.id === 'portal_study' || app.packageName === 'builtin.study_portal') {
      router.push('/focus/pomodoro' as any);
      return;
    }
    if (app.id === 'portal_arcade' || app.packageName === 'builtin.dojo_brain') {
      router.push('/dojo-games' as any);
      return;
    }
    if (app.packageName && Platform.OS === 'android') {
      const success = launchApplication(app.packageName);
      if (!success) {
        Alert.alert('App Launch', `Could not open ${app.name}.`);
      }
    }
  };

  const filteredApps = useMemo(() => {
    let list = apps.filter((a) => !a.isHidden);

    if (profile === 'deep_focus') {
      list = list.filter((a) => a.isFavorite).slice(0, 3);
      return list;
    }

    if (selectedCategory === 'Favorites') {
      list = list.filter((a) => a.isFavorite);
    } else if (selectedCategory !== 'All') {
      list = list.filter((a) => a.category === selectedCategory);
    }

    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (a) =>
          (a.customName || a.name).toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q)
      );
    }

    return list;
  }, [apps, profile, selectedCategory, searchQuery]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeStyles.bg }]}>
      <View style={styles.container}>
        {/* Brand & Default Launcher Header */}
        <View style={styles.brandRow}>
          <View style={styles.brandLeft}>
            <Image
              source={require('@/assets/images/logo.png')}
              style={styles.brandLogo}
              resizeMode="contain"
            />
            <View>
              <Text style={[styles.brandTitle, { color: themeStyles.text }]}>NeuroNinja Ghost</Text>
              <TouchableOpacity
                style={styles.statusPillRow}
                onPress={handleStartSetDefault}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: isDefaultLauncher ? '#10B981' : '#F59E0B' },
                  ]}
                />
                <Text style={[styles.statusText, { color: themeStyles.subtext }]}>
                  {isDefaultLauncher ? 'Default Home: Active' : 'Default Home: Tap to Enable'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.brandRight}>
            <TouchableOpacity
              style={[styles.settingsIconBtn, { borderColor: themeStyles.border }]}
              onPress={() => setShowSettingsModal(true)}
              accessibilityLabel="Launcher Settings"
            >
              <Ionicons name="settings-sharp" size={18} color={themeStyles.subtext} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Default Launcher Setup Callout Banner (Minimalist Phone style) */}
        {!isDefaultLauncher && !bannerDismissed && isLauncherSupported && (
          <View
            style={[
              styles.defaultBanner,
              { backgroundColor: themeStyles.cardBg, borderColor: '#F59E0B' },
            ]}
          >
            <View style={styles.defaultBannerContent}>
              <Ionicons name="sparkles" size={20} color="#F59E0B" />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[styles.defaultBannerTitle, { color: themeStyles.text }]}>
                  Set as Default Launcher
                </Text>
                <Text style={[styles.defaultBannerSub, { color: themeStyles.subtext }]}>
                  Turn your phone into a distraction-free sanctuary. Swiping up or pressing Home will return here.
                </Text>
              </View>
              <TouchableOpacity onPress={() => setBannerDismissed(true)}>
                <Ionicons name="close" size={18} color={themeStyles.subtext} />
              </TouchableOpacity>
            </View>

            <View style={styles.defaultBannerActions}>
              <TouchableOpacity
                style={[styles.setDefBtn, { backgroundColor: themeStyles.accent }]}
                onPress={handleStartSetDefault}
              >
                <Text
                  style={[
                    styles.setDefBtnText,
                    { color: theme === 'paper' ? '#FFFFFF' : '#070A11' },
                  ]}
                >
                  Set as Default Launcher
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Profile & Theme Switcher Bar */}
        <View style={styles.topControlBar}>
          <View style={styles.profileButtonGroup}>
            <TouchableOpacity
              style={[
                styles.profileTab,
                profile === 'minimal' && {
                  backgroundColor: themeStyles.cardBg,
                  borderColor: themeStyles.accent,
                },
              ]}
              onPress={() => setProfile('minimal')}
            >
              <Text
                style={[
                  styles.profileTabText,
                  { color: profile === 'minimal' ? themeStyles.text : themeStyles.subtext },
                ]}
              >
                Minimal
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.profileTab,
                profile === 'deep_focus' && {
                  backgroundColor: themeStyles.cardBg,
                  borderColor: '#EF4444',
                },
              ]}
              onPress={() => setProfile('deep_focus')}
            >
              <Text
                style={[
                  styles.profileTabText,
                  { color: profile === 'deep_focus' ? '#EF4444' : themeStyles.subtext },
                ]}
              >
                Deep Focus (3)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.profileTab,
                profile === 'normal' && {
                  backgroundColor: themeStyles.cardBg,
                  borderColor: themeStyles.border,
                },
              ]}
              onPress={() => setProfile('normal')}
            >
              <Text
                style={[
                  styles.profileTabText,
                  { color: profile === 'normal' ? themeStyles.text : themeStyles.subtext },
                ]}
              >
                All Apps
              </Text>
            </TouchableOpacity>
          </View>

          {/* Theme Palette Switcher */}
          <TouchableOpacity
            style={styles.themeToggle}
            onPress={() => {
              setTheme((prev) => (prev === 'oled' ? 'slate' : prev === 'slate' ? 'paper' : 'oled'));
            }}
          >
            <Ionicons
              name={theme === 'oled' ? 'moon' : theme === 'slate' ? 'contrast' : 'sunny'}
              size={16}
              color={themeStyles.subtext}
            />
          </TouchableOpacity>
        </View>

        {/* Minimalist Clock & Intention */}
        <View style={styles.clockHeader}>
          <Text style={[styles.clockTime, { color: themeStyles.text }]}>{timeStr}</Text>
          <Text style={[styles.clockDate, { color: themeStyles.subtext }]}>{dateStr}</Text>
          <Text style={[styles.intentionQuote, { color: themeStyles.subtext }]}>
            {profile === 'deep_focus'
              ? '⚡ Deep Work Active: Non-essential dopamine apps are locked out.'
              : '“Silence the noise. Master your attention.”'}
          </Text>
        </View>

        {/* Search Input Bar */}
        {profile !== 'deep_focus' && (
          <View
            style={[
              styles.searchBox,
              { backgroundColor: themeStyles.cardBg, borderColor: themeStyles.border },
            ]}
          >
            <Ionicons name="search" size={16} color={themeStyles.subtext} />
            <TextInput
              style={[styles.searchInput, { color: themeStyles.text }]}
              placeholder="Search distraction-free apps..."
              placeholderTextColor={themeStyles.subtext}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color={themeStyles.subtext} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Category Filter Pills */}
        {profile === 'minimal' && !searchQuery && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScroll}
            contentContainerStyle={styles.categoryRow}
          >
            {['All', 'Favorites', 'Communication', 'Productivity', 'Study', 'Media', 'Utility'].map(
              (cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryPill,
                    { borderColor: themeStyles.border },
                    selectedCategory === cat && {
                      backgroundColor: themeStyles.cardBg,
                      borderColor: themeStyles.accent,
                    },
                  ]}
                  onPress={() => setSelectedCategory(cat)}
                >
                  <Text
                    style={[
                      styles.categoryPillText,
                      { color: selectedCategory === cat ? themeStyles.text : themeStyles.subtext },
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              )
            )}
          </ScrollView>
        )}

        {/* Real Distraction-Free Application Drawer */}
        <ScrollView contentContainerStyle={styles.appList} showsVerticalScrollIndicator={false}>
          {isLoadingApps ? (
            <View style={styles.emptyBox}>
              <ActivityIndicator size="small" color={themeStyles.accent} />
              <Text style={[styles.emptyText, { color: themeStyles.subtext, marginTop: 8 }]}>
                Loading distraction-free drawer...
              </Text>
            </View>
          ) : filteredApps.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={[styles.emptyText, { color: themeStyles.subtext }]}>
                {searchQuery.trim().length > 0
                  ? `No apps found matching "${searchQuery}"`
                  : 'No apps in this category'}
              </Text>
            </View>
          ) : null}

          {filteredApps.map((app) => (
            <View
              key={app.id}
              style={[styles.appRow, { borderBottomColor: themeStyles.border }]}
            >
              <TouchableOpacity
                style={styles.appLaunchTarget}
                onPress={() => void handleLaunchApp(app)}
                activeOpacity={0.7}
              >
                <Text style={[styles.appName, { color: themeStyles.text }]}>
                  {app.customName || app.name}
                </Text>
                {app.customName && (
                  <Text style={[styles.appCategory, { color: themeStyles.subtext }]}>
                    Original: {app.name}
                  </Text>
                )}
                {!app.customName && (
                  <Text style={[styles.appCategory, { color: themeStyles.subtext }]}>
                    {app.category}
                  </Text>
                )}
              </TouchableOpacity>

              {profile !== 'deep_focus' && (
                <View style={styles.rowControls}>
                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => void toggleFavorite(app.id)}
                  >
                    <Ionicons
                      name={app.isFavorite ? 'star' : 'star-outline'}
                      size={18}
                      color={app.isFavorite ? '#F59E0B' : themeStyles.subtext}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => handleStartRename(app)}
                  >
                    <MaterialCommunityIcons
                      name="pencil-outline"
                      size={16}
                      color={themeStyles.subtext}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => void toggleHide(app.id)}
                  >
                    <Ionicons name="eye-off-outline" size={16} color={themeStyles.subtext} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}
        </ScrollView>

        {/* Exit Ghost Mode to Dojo */}
        <TouchableOpacity
          style={[styles.exitBtn, { borderTopColor: themeStyles.border }]}
          onPress={() => router.replace('/(tabs)' as any)}
        >
          <Ionicons name="arrow-back-outline" size={18} color={themeStyles.subtext} />
          <Text style={[styles.exitText, { color: themeStyles.subtext }]}>
            Exit Launcher to Dojo Hub
          </Text>
        </TouchableOpacity>
      </View>

      {/* Guided Walkthrough Modal for Setting Default Launcher */}
      <Modal
        visible={showGuidedModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowGuidedModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.guidedModalBox,
              { backgroundColor: themeStyles.cardBg, borderColor: themeStyles.border },
            ]}
          >
            <View style={styles.guidedIconCircle}>
              <Ionicons name="phone-portrait-outline" size={32} color="#10B981" />
            </View>

            <Text style={[styles.guidedTitle, { color: themeStyles.text }]}>
              Set NeuroNinja as Default Launcher
            </Text>

            <Text style={[styles.guidedStep, { color: themeStyles.subtext }]}>
              1. Tap <Text style={{ fontWeight: 'bold', color: themeStyles.text }}>Continue</Text> below to open Android Default App settings.
            </Text>
            <Text style={[styles.guidedStep, { color: themeStyles.subtext }]}>
              2. Tap <Text style={{ fontWeight: 'bold', color: '#10B981' }}>NeuroNinja</Text> in the list.
            </Text>
            <Text style={[styles.guidedStep, { color: themeStyles.subtext }]}>
              3. Press Back to return. Swiping up or pressing Home will now return directly to this mindful launcher.
            </Text>

            <View style={styles.guidedActions}>
              <TouchableOpacity
                style={[styles.guidedCancelBtn, { borderColor: themeStyles.border }]}
                onPress={() => setShowGuidedModal(false)}
              >
                <Text style={{ color: themeStyles.subtext }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.guidedConfirmBtn, { backgroundColor: themeStyles.accent }]}
                onPress={() => void handleConfirmSetDefault()}
              >
                <Text
                  style={{
                    color: theme === 'paper' ? '#FFFFFF' : '#070A11',
                    fontWeight: 'bold',
                  }}
                >
                  Continue to Settings
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* App Renaming Modal */}
      <Modal
        visible={renamingApp !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setRenamingApp(null)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalBox,
              { backgroundColor: themeStyles.cardBg, borderColor: themeStyles.border },
            ]}
          >
            <Text style={[styles.modalTitle, { color: themeStyles.text }]}>Rename App</Text>
            <Text style={[styles.modalSub, { color: themeStyles.subtext }]}>
              Give this app a mindful alias to introduce cognitive friction.
            </Text>

            <TextInput
              style={[
                styles.modalInput,
                { color: themeStyles.text, borderColor: themeStyles.border },
              ]}
              value={renameInput}
              onChangeText={setRenameInput}
              placeholder="e.g. Mindless Feed"
              placeholderTextColor={themeStyles.subtext}
              autoFocus
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { borderColor: themeStyles.border }]}
                onPress={() => setRenamingApp(null)}
              >
                <Text style={{ color: themeStyles.subtext }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: themeStyles.accent }]}
                onPress={() => void handleSaveRename()}
              >
                <Text
                  style={{
                    color: theme === 'paper' ? '#FFFFFF' : '#070A11',
                    fontWeight: 'bold',
                  }}
                >
                  Save Alias
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Launcher Settings Modal (Minimalist Phone Experience) */}
      <Modal
        visible={showSettingsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.settingsModalBox,
              { backgroundColor: themeStyles.cardBg, borderColor: themeStyles.border },
            ]}
          >
            <View style={styles.settingsModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Image
                  source={require('@/assets/images/logo.png')}
                  style={{ width: 28, height: 28, borderRadius: 14 }}
                  resizeMode="contain"
                />
                <Text style={[styles.modalTitle, { color: themeStyles.text }]}>
                  Launcher Settings
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowSettingsModal(false)}>
                <Ionicons name="close" size={22} color={themeStyles.subtext} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {/* Default Launcher Status */}
              <View style={[styles.settingSection, { borderColor: themeStyles.border }]}>
                <Text style={[styles.settingSectionTitle, { color: themeStyles.accent }]}>
                  DEFAULT SCREEN LAUNCHER
                </Text>
                <Text style={[styles.settingDesc, { color: themeStyles.subtext }]}>
                  {isDefaultLauncher
                    ? 'NeuroNinja is currently your default Android screen launcher. Swiping up or pressing the Home button opens this minimalist interface.'
                    : 'NeuroNinja is not currently your default launcher. Enable it to replace your standard addictive app grid.'}
                </Text>

                {!isDefaultLauncher && (
                  <TouchableOpacity
                    style={[styles.modalActionBtn, { backgroundColor: themeStyles.accent }]}
                    onPress={handleStartSetDefault}
                  >
                    <Ionicons
                      name="phone-portrait-outline"
                      size={16}
                      color={theme === 'paper' ? '#FFF' : '#070A11'}
                    />
                    <Text
                      style={[
                        styles.modalActionBtnText,
                        { color: theme === 'paper' ? '#FFF' : '#070A11' },
                      ]}
                    >
                      Set NeuroNinja as Default Launcher
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Switch to Normal Launcher (Minimalist Phone core feature) */}
                <TouchableOpacity
                  style={[styles.modalSecondaryBtn, { borderColor: themeStyles.border }]}
                  onPress={() => {
                    void handleSwitchToNormalLauncher();
                  }}
                >
                  <Ionicons name="swap-horizontal" size={18} color="#38BDF8" />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.secondaryBtnTitle, { color: themeStyles.text }]}>
                      Switch to Normal / Standard Launcher
                    </Text>
                    <Text style={[styles.secondaryBtnSub, { color: themeStyles.subtext }]}>
                      Change default home app back to your system launcher (Pixel Launcher, Samsung One UI, Moto Home, Nova, etc.)
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Launcher Home Preference */}
              <View style={[styles.settingSection, { borderColor: themeStyles.border }]}>
                <Text style={[styles.settingSectionTitle, { color: themeStyles.accent }]}>
                  HOME BEHAVIOR
                </Text>
                <View style={styles.toggleRow}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={[styles.toggleTitle, { color: themeStyles.text }]}>
                      Default to Ghost Launcher
                    </Text>
                    <Text style={[styles.toggleSub, { color: themeStyles.subtext }]}>
                      Always boot directly into this text-only minimalist launcher when opening NeuroNinja.
                    </Text>
                  </View>
                  <Switch
                    value={settings.ghostLauncherAsHome}
                    onValueChange={(val) => void setGhostLauncherAsHome(val)}
                    trackColor={{ false: '#334155', true: '#10B981' }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>

              {/* Full App Dojo Escape */}
              <View
                style={[
                  styles.settingSection,
                  { borderColor: themeStyles.border, borderBottomWidth: 0 },
                ]}
              >
                <Text style={[styles.settingSectionTitle, { color: themeStyles.accent }]}>
                  NINJA DOJO ESCAPE
                </Text>
                <TouchableOpacity
                  style={[styles.modalSecondaryBtn, { borderColor: themeStyles.border }]}
                  onPress={() => {
                    setShowSettingsModal(false);
                    router.replace('/(tabs)' as any);
                  }}
                >
                  <MaterialCommunityIcons name="sword-cross" size={20} color="#10B981" />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.secondaryBtnTitle, { color: themeStyles.text }]}>
                      Open Full NeuroNinja App (The Dojo)
                    </Text>
                    <Text style={[styles.secondaryBtnSub, { color: themeStyles.subtext }]}>
                      Access Ninja Arsenal, Pomodoro, Forest Grove, Blocklist, and Stats.
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[
                styles.closeModalBtn,
                { backgroundColor: themeStyles.cardBg, borderColor: themeStyles.border },
              ]}
              onPress={() => setShowSettingsModal(false)}
            >
              <Text style={{ color: themeStyles.text, fontWeight: '600' }}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
    justifyContent: 'space-between',
  },
  brandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    marginBottom: 6,
  },
  brandLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandLogo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  statusPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
  },
  brandRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingsIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  defaultBanner: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  defaultBannerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  defaultBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  defaultBannerSub: {
    fontSize: 11,
    marginTop: 3,
    lineHeight: 15,
  },
  defaultBannerActions: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  setDefBtn: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  setDefBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  topControlBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileButtonGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  profileTab: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  profileTabText: {
    fontSize: 11,
    fontWeight: '700',
  },
  themeToggle: {
    padding: 6,
    borderRadius: 8,
  },
  clockHeader: {
    marginTop: 6,
    alignItems: 'flex-start',
  },
  clockTime: {
    fontSize: 48,
    fontWeight: '200',
    letterSpacing: -1,
  },
  clockDate: {
    fontSize: 14,
    fontWeight: '400',
    marginTop: 2,
  },
  intentionQuote: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 6,
    lineHeight: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    padding: 0,
  },
  categoryScroll: {
    height: 44,
    maxHeight: 44,
    marginVertical: 6,
    flexGrow: 0,
    flexShrink: 0,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  categoryPill: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  appList: {
    paddingVertical: 8,
    gap: 4,
  },
  emptyBox: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  appRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  appLaunchTarget: {
    flex: 1,
  },
  appName: {
    fontSize: 18,
    fontWeight: '300',
    letterSpacing: 0.3,
  },
  appCategory: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 2,
  },
  rowControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBtn: {
    padding: 4,
  },
  exitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'android' ? 20 : 14,
    borderTopWidth: 0.5,
  },
  exitText: {
    fontSize: 13,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalBox: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalSub: {
    fontSize: 12,
    marginVertical: 6,
    lineHeight: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginVertical: 14,
    fontSize: 14,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  guidedModalBox: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  guidedIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  guidedTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 14,
  },
  guidedStep: {
    fontSize: 13,
    lineHeight: 19,
    width: '100%',
    marginBottom: 8,
  },
  guidedActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
    width: '100%',
  },
  guidedCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  guidedConfirmBtn: {
    flex: 1.5,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  settingsModalBox: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  settingsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 10,
  },
  settingSection: {
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  settingSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 6,
  },
  settingDesc: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 12,
  },
  modalActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  modalActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  modalSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  secondaryBtnTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  secondaryBtnSub: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  toggleSub: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  closeModalBtn: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
});
