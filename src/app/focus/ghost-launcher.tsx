import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  ActivityIndicator,
  BackHandler,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useNinja } from '../../context/ninja-context';
import { useNinjaAlert } from '../../context/ninja-alert-context';
import { blockerEngine } from '../../services/blocker/blocker-engine';
import {
  checkLauncherStatus,
  promptSetDefaultLauncher,
  openNormalLauncherSettings,
  launchApplication,
  getRealtimeInstalledLauncherApps,
  subscribeToPackageChanges,
} from '../../services/launcher/launcher-service';
import {
  searchContacts,
  callContact,
  openWhatsAppChat,
  sendSmsToContact,
  isContactPermissionGranted,
  requestContactsPermission,
  type QuickContact,
} from '../../services/launcher/contact-search-service';

export interface GhostApp {
  id: string;
  packageName?: string;
  name: string;
  customName?: string;
  category: 'Communication' | 'Productivity' | 'Study' | 'Utility' | 'Media' | 'General';
  isFavorite: boolean;
  isHidden: boolean;
  delaySeconds?: number;
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
  const { showAlert, showToast } = useNinjaAlert();
  const { settings, setGhostLauncherAsHome } = useNinja();

  const [profile, setProfile] = useState<LauncherProfile>('minimal');
  const [theme, setTheme] = useState<ThemeMode>('oled');
  const [apps, setApps] = useState<GhostApp[]>([]);
  const [isLoadingApps, setIsLoadingApps] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [matchedContacts, setMatchedContacts] = useState<QuickContact[]>([]);
  const [hasContactsPermission, setHasContactsPermission] = useState<boolean>(true);

  // Check initial contact permission
  useEffect(() => {
    void (async () => {
      const granted = await isContactPermissionGranted();
      setHasContactsPermission(granted);
    })();
  }, []);

  // Fast Contact Search on search query changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!searchQuery.trim()) {
        setMatchedContacts([]);
        return;
      }
      void (async () => {
        const granted = await isContactPermissionGranted();
        setHasContactsPermission(granted);
        if (granted) {
          const results = await searchContacts(searchQuery);
          setMatchedContacts(results);
        }
      })();
    }, 120);
    return () => clearTimeout(timer);
  }, [searchQuery]);


  // Android Launcher State
  const [isDefaultLauncher, setIsDefaultLauncher] = useState<boolean>(false);
  const [isLauncherSupported, setIsLauncherSupported] = useState<boolean>(Platform.OS === 'android');
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showGuidedModal, setShowGuidedModal] = useState<boolean>(false);
  const [bannerDismissed, setBannerDismissed] = useState<boolean>(false);

  // App Renaming & Mindful Delay Modals
  const [renamingApp, setRenamingApp] = useState<GhostApp | null>(null);
  const [renameInput, setRenameInput] = useState('');
  const [delayConfigs, setDelayConfigs] = useState<Record<string, number>>({});
  const [mindfulDelayApp, setMindfulDelayApp] = useState<{
    app: GhostApp;
    countdown: number;
    initial: number;
  } | null>(null);
  const [appContextMenu, setAppContextMenu] = useState<GhostApp | null>(null);

  // Clock
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');

  // Hardware & Gesture BackHandler (Minimalist Phone Parity)
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const onBackPress = () => {
      if (showSettingsModal) {
        setShowSettingsModal(false);
        return true;
      }
      if (showGuidedModal) {
        setShowGuidedModal(false);
        return true;
      }
      if (renamingApp !== null) {
        setRenamingApp(null);
        return true;
      }
      if (mindfulDelayApp !== null) {
        setMindfulDelayApp(null);
        return true;
      }
      if (appContextMenu !== null) {
        setAppContextMenu(null);
        return true;
      }
      if (searchQuery.trim().length > 0) {
        setSearchQuery('');
        return true;
      }
      if (selectedCategory !== 'All') {
        setSelectedCategory('All');
        return true;
      }
      if (profile !== 'minimal') {
        setProfile('minimal');
        return true;
      }

      // Sitting on Minimal Home Desktop: a true launcher NEVER exits on Back press!
      // In NeuroNinja, Ghost Launcher is the home screen desktop.
      return true;
    };

    const backSub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backSub.remove();
  }, [
    showSettingsModal,
    showGuidedModal,
    renamingApp,
    mindfulDelayApp,
    appContextMenu,
    searchQuery,
    selectedCategory,
    profile,
    isDefaultLauncher,
    settings.ghostLauncherAsHome,
  ]);

  // Mindful Delay Countdown Timer
  useEffect(() => {
    if (!mindfulDelayApp || mindfulDelayApp.countdown <= 0) return;
    const timer = setInterval(() => {
      setMindfulDelayApp((prev) => {
        if (!prev) return null;
        if (prev.countdown <= 1) {
          return { ...prev, countdown: 0 };
        }
        return { ...prev, countdown: prev.countdown - 1 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [mindfulDelayApp]);

  // Load Real Installed Applications (Optimized for 0ms Boot & ANR Prevention, auto-refreshed for newly installed apps)
  const loadInstalledApps = useCallback(async (forceRefresh = false) => {
    try {
      // Step 1: Instant hydration from persistent local cache on cold start
      if (!forceRefresh) {
        const cachedRaw = await AsyncStorage.getItem('@ghost_launcher_cached_apps_v3');
        if (cachedRaw) {
          try {
            const cachedList: GhostApp[] = JSON.parse(cachedRaw);
            if (cachedList && cachedList.length > 0) {
              setApps(cachedList);
              setIsLoadingApps(false);
            }
          } catch {}
        }
      }

      // Step 2: Fresh query from native LauncherApps + PackageManager(MATCH_ALL)
      const [installedApps, savedPrefsRaw] = await Promise.all([
        getRealtimeInstalledLauncherApps(),
        AsyncStorage.getItem('@ghost_launcher_user_prefs_v2'),
      ]);

      const savedPrefs = savedPrefsRaw
        ? JSON.parse(savedPrefsRaw)
        : { favorites: [], aliases: {}, hidden: [], delays: {} };

      if (savedPrefs.delays) {
        setDelayConfigs(savedPrefs.delays);
      }

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
        iconBase64: null,
      }));

      const combinedApps = [...builtInPortals, ...realAppItems];
      setApps(combinedApps);
      setIsLoadingApps(false);
      void AsyncStorage.setItem('@ghost_launcher_cached_apps_v3', JSON.stringify(combinedApps));
    } catch (err) {
      console.warn('Failed to load installed apps for ghost launcher:', err);
      setIsLoadingApps(false);
    }
  }, []);

  useEffect(() => {
    void loadInstalledApps(false);
  }, [loadInstalledApps]);

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

  const savePreferences = async (
    updatedApps: GhostApp[],
    customDelays?: Record<string, number>
  ) => {
    try {
      const activeDelays = customDelays !== undefined ? customDelays : delayConfigs;
      const prefs = {
        favorites: updatedApps.filter((a) => a.isFavorite).map((a) => a.id),
        hidden: updatedApps.filter((a) => a.isHidden).map((a) => a.id),
        aliases: updatedApps.reduce<Record<string, string>>((acc, a) => {
          if (a.customName && a.customName.trim()) acc[a.id] = a.customName.trim();
          return acc;
        }, {}),
        delays: activeDelays,
      };
      await AsyncStorage.setItem('@ghost_launcher_user_prefs_v2', JSON.stringify(prefs));
    } catch (e) {
      console.warn('Failed to save ghost launcher prefs:', e);
    }
  };

  const handleSetDelay = async (pkgOrId: string, seconds: number) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const updated = { ...delayConfigs, [pkgOrId]: seconds };
    if (seconds <= 0) {
      delete updated[pkgOrId];
    }
    setDelayConfigs(updated);
    void savePreferences(apps, updated);
    setAppContextMenu(null);
  };

  useFocusEffect(
    useCallback(() => {
      // Auto-refresh installed apps so newly installed apps appear immediately
      void loadInstalledApps(true);
    }, [loadInstalledApps])
  );

  // Check launcher status, AppState resume, and real-time Android package install/uninstall watcher
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
        void loadInstalledApps(true);
      }
    });

    const unsubPkg = subscribeToPackageChanges(() => {
      if (isMounted) {
        void loadInstalledApps(true);
      }
    });

    return () => {
      isMounted = false;
      sub.remove();
      unsubPkg();
    };
  }, [loadInstalledApps]);

  const handleLaunchApp = async (app: GhostApp, bypassDelay = false) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // 0ms PRE-FLIGHT BLOCK CHECK:
    // Intercept immediately before launching so sealed apps never open freely!
    if (app.packageName && Platform.OS === 'android') {
      const isBlocked = blockerEngine.isPackageBlocked(app.packageName);
      if (isBlocked) {
        router.push({
          pathname: '/blocked',
          params: {
            app: app.name,
            package: app.packageName,
            reason: blockerEngine.isCurfewActive() ? 'curfew' : 'opened',
          },
        });
        return;
      }
    }

    // Minimalist Phone Parity: Mindful Delay Cognitive Pause
    const delay = delayConfigs[app.packageName || app.id];
    if (delay && delay > 0 && !bypassDelay) {
      setMindfulDelayApp({ app, countdown: delay, initial: delay });
      return;
    }

    if (app.id === 'portal_study' || app.packageName === 'builtin.study_portal') {
      router.push('/focus/pomodoro' as any);
      return;
    }
    if (app.id === 'portal_arcade' || app.packageName === 'builtin.dojo_brain') {
      router.push('/dojo-games' as any);
      return;
    }
    if (app.packageName && Platform.OS === 'android') {
      // Inverted Accessibility Architecture:
      // Enable accessibility ONLY for designated short video apps right before launch!
      // All other apps keep accessibility OFF so Google Pay and UPI are never blocked.
      const shortVideoPackages = [
        'com.instagram.android',
        'com.google.android.youtube',
        'com.snapchat.android',
        'com.reddit.frontpage',
        'com.twitter.android',
        'com.facebook.katana',
        'com.zhiliaoapp.musically',
        'com.ss.android.ugc.trill',
      ];
      const isShortVideo =
        shortVideoPackages.includes(app.packageName) ||
        app.packageName.includes('instagram') ||
        app.packageName.includes('youtube');

      if (isShortVideo) {
        blockerEngine.setAccessibilityServiceEnabled(true);
      } else {
        blockerEngine.setAccessibilityServiceEnabled(false);
      }

      const success = launchApplication(app.packageName);
      if (!success) {
        showToast({
          title: 'App Launch',
          message: `Could not open ${app.name}.`,
          type: 'error',
          icon: 'alert-circle-outline',
        });
      }
    }
  };

  const filteredApps = useMemo(() => {
    let list = apps.filter((a) => !a.isHidden);

    if (profile === 'deep_focus') {
      list = list.filter((a) => a.isFavorite).slice(0, 3);
      return list;
    }

    // In Minimal Home mode, display curated favorites (Minimalist Phone Home Desktop) when NOT searching
    if (profile === 'minimal' && !searchQuery.trim() && selectedCategory === 'All') {
      const favs = list.filter((a) => a.isFavorite);
      if (favs.length > 0) {
        return favs;
      }
      return list.slice(0, 8);
    }

    // When NOT searching, filter by selected category
    if (!searchQuery.trim()) {
      if (selectedCategory === 'Favorites') {
        list = list.filter((a) => a.isFavorite);
      } else if (selectedCategory !== 'All') {
        list = list.filter((a) => a.category === selectedCategory);
      }
    }

    // When searching, sort strictly by industry-standard multi-tier relevance:
    // 1. Exact match on app name
    // 2. App name STARTS WITH query (e.g. "Play Store", "Play Games" for "play")
    // 3. Word in app name starts with query (e.g. "Google Play Store" -> "Play")
    // 4. App name contains query substring
    // 5. Custom nickname / alias contains query
    // 6. Category name contains query
    // 7. Package name contains query (e.g. FM Radio com.motorola.fmplayer -> lowest tier)
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase().trim();
      const scored: { app: GhostApp; score: number }[] = [];

      for (const a of list) {
        const rawName = (a.customName || a.name || '').toLowerCase();
        const pkg = (a.packageName || '').toLowerCase();
        const cat = (a.category || '').toLowerCase();

        let score = 0;
        if (rawName === q) {
          // Tier 1: Exact App Name
          score = 10000;
        } else if (rawName.startsWith(q)) {
          // Tier 2: Name starts with query
          score = 5000 + (100 - Math.min(90, rawName.length));
        } else {
          // Tier 3: Word in name starts with query ("Google Play Store" -> "Play")
          const words = rawName.split(/[\s\-_\.:\/]+/);
          const wordIndex = words.findIndex((w) => w.startsWith(q));
          if (wordIndex >= 0) {
            score = 3500 - (wordIndex * 50) + (100 - Math.min(90, rawName.length));
          } else if (rawName.includes(q)) {
            // Tier 4: App name contains substring
            const subIndex = rawName.indexOf(q);
            score = 2000 - Math.min(500, subIndex * 15);
          } else if (a.customName && a.customName.toLowerCase().includes(q)) {
            // Tier 5: Custom nickname contains query
            score = 1000;
          } else if (cat.includes(q)) {
            // Tier 6: Category matches query
            score = 500;
          } else if (pkg.includes(q) && q.length >= 2) {
            // Tier 7: Package matches query (e.g. com.motorola.fmplayer) -> lowest priority
            score = 50;
          }
        }

        if (score > 0) {
          scored.push({ app: a, score });
        }
      }

      // Sort by relevance score descending, then favorites, then alphabetical
      scored.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.app.isFavorite !== a.app.isFavorite) {
          return (b.app.isFavorite ? 1 : 0) - (a.app.isFavorite ? 1 : 0);
        }
        return a.app.name.localeCompare(b.app.name);
      });

      return scored.map((item) => item.app);
    }

    return list;
  }, [apps, profile, selectedCategory, searchQuery]);

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
      showAlert({
        title: 'Default Apps',
        message: 'Open Android Settings > Apps > Default Apps > Home App to choose your standard phone launcher.',
        type: 'info',
        icon: 'cog-outline',
      });
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
              ? 'Deep Work Active • Essential apps only'
              : `${apps.filter((a) => !a.isHidden).length} applications installed`}
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
          ) : filteredApps.length === 0 && matchedContacts.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={[styles.emptyText, { color: themeStyles.subtext }]}>
                {searchQuery.trim().length > 0
                  ? `No apps or contacts found matching "${searchQuery}"`
                  : 'No apps in this category'}
              </Text>
            </View>
          ) : null}

          {/* Section header when searching and both apps & contacts exist */}
          {searchQuery.trim().length > 0 && filteredApps.length > 0 && (matchedContacts.length > 0 || !hasContactsPermission) && (
            <View style={styles.contactHeaderRow}>
              <Ionicons name="apps-sharp" size={14} color={themeStyles.subtext} />
              <Text style={[styles.contactHeaderText, { color: themeStyles.subtext }]}>
                Applications ({filteredApps.length})
              </Text>
            </View>
          )}

          {/* 1. APPLICATIONS FIRST */}
          {filteredApps.map((app) => {
            const activeDelay = delayConfigs[app.packageName || app.id] || 0;
            return (
              <View
                key={app.id}
                style={[styles.appRow, { borderBottomColor: themeStyles.border }]}
              >
                <TouchableOpacity
                  style={styles.appLaunchTarget}
                  onPress={() => void handleLaunchApp(app)}
                  onLongPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                    setAppContextMenu(app);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.appName, { color: themeStyles.text }]}>
                    {app.customName || app.name}
                  </Text>
                  <Text style={[styles.appCategory, { color: themeStyles.subtext }]}>
                    {app.customName ? `Original: ${app.name}` : app.category}
                    {activeDelay > 0 ? `  ·  ⏳ ${activeDelay}s Delay` : ''}
                  </Text>
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
                      onPress={() => setAppContextMenu(app)}
                    >
                      <Ionicons
                        name="ellipsis-horizontal"
                        size={16}
                        color={themeStyles.subtext}
                      />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}

          {/* 2. CONTACTS BELOW APPS */}
          {searchQuery.trim().length > 0 && matchedContacts.length > 0 && (
            <View style={[styles.contactsContainer, { marginTop: filteredApps.length > 0 ? 16 : 4 }]}>
              <View style={styles.contactHeaderRow}>
                <Ionicons name="people-sharp" size={14} color="#00E699" />
                <Text style={[styles.contactHeaderText, { color: themeStyles.accent }]}>
                  Contacts ({matchedContacts.length})
                </Text>
              </View>

              {matchedContacts.map((contact) => (
                <View
                  key={contact.id}
                  style={[styles.contactCard, { backgroundColor: themeStyles.cardBg, borderColor: themeStyles.border }]}
                >
                  <View style={styles.contactAvatarCircle}>
                    <Text style={styles.contactAvatarInitials}>{contact.initials}</Text>
                  </View>

                  <View style={styles.contactInfo}>
                    <Text style={[styles.contactNameText, { color: themeStyles.text }]} numberOfLines={1}>
                      {contact.name}
                    </Text>
                    <Text style={[styles.contactPhoneText, { color: themeStyles.subtext }]}>
                      {contact.phone}
                    </Text>
                  </View>

                  {/* 1-Tap Quick Action Buttons: Call, WhatsApp, SMS */}
                  <View style={styles.contactActionButtons}>
                    <TouchableOpacity
                      style={[styles.contactActionPill, { backgroundColor: 'rgba(0, 230, 153, 0.15)' }]}
                      onPress={() => void callContact(contact.phone)}
                      accessibilityLabel={`Call ${contact.name}`}
                    >
                      <Ionicons name="call" size={16} color="#00E699" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.contactActionPill, { backgroundColor: 'rgba(37, 211, 102, 0.15)' }]}
                      onPress={() => void openWhatsAppChat(contact.phone)}
                      accessibilityLabel={`WhatsApp ${contact.name}`}
                    >
                      <MaterialCommunityIcons name="whatsapp" size={18} color="#25D366" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.contactActionPill, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}
                      onPress={() => void sendSmsToContact(contact.phone)}
                      accessibilityLabel={`SMS ${contact.name}`}
                    >
                      <Ionicons name="chatbubble-ellipses" size={16} color="#38BDF8" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Friendly Contact Permission Request Card when ungranted (rendered below apps) */}
          {searchQuery.trim().length > 0 && !hasContactsPermission && (
            <View
              style={[
                styles.contactCard,
                {
                  backgroundColor: themeStyles.cardBg,
                  borderColor: '#10B981',
                  flexDirection: 'column',
                  alignItems: 'stretch',
                  padding: 14,
                  gap: 10,
                  marginTop: filteredApps.length > 0 ? 16 : 4,
                  marginBottom: 12,
                },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="people" size={18} color="#00E699" />
                <Text style={{ color: themeStyles.text, fontSize: 14, fontWeight: '700' }}>
                  Enable Contact Search
                </Text>
              </View>
              <Text style={{ color: themeStyles.subtext, fontSize: 12, lineHeight: 17 }}>
                Find contacts directly in the launcher to call or chat via WhatsApp. Contact data stays private on your phone.
              </Text>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                <TouchableOpacity
                  style={{
                    backgroundColor: '#00E699',
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 8,
                    alignItems: 'center',
                  }}
                  onPress={async () => {
                    const granted = await requestContactsPermission();
                    setHasContactsPermission(granted);
                    if (granted) {
                      const res = await searchContacts(searchQuery);
                      setMatchedContacts(res);
                    } else {
                      await Linking.openSettings();
                    }
                  }}
                >
                  <Text style={{ color: '#000000', fontSize: 12, fontWeight: '800' }}>
                    Allow Contacts Access
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Minimalist Phone Navigation between Favorites Home & Full Alphabetical Drawer */}
          {!isLoadingApps && profile === 'minimal' && !searchQuery.trim() && (
            <TouchableOpacity
              style={[
                styles.drawerSwitchBtn,
                { borderColor: themeStyles.border, backgroundColor: themeStyles.cardBg },
              ]}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setProfile('normal');
              }}
              activeOpacity={0.75}
            >
              <Text style={[styles.drawerSwitchText, { color: themeStyles.text }]}>
                All Apps ({apps.filter((a) => !a.isHidden).length})
              </Text>
              <Ionicons name="arrow-forward" size={16} color={themeStyles.accent} />
            </TouchableOpacity>
          )}

          {!isLoadingApps && profile === 'normal' && (
            <TouchableOpacity
              style={[
                styles.drawerSwitchBtn,
                { borderColor: themeStyles.border, backgroundColor: themeStyles.cardBg },
              ]}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setProfile('minimal');
              }}
              activeOpacity={0.75}
            >
              <Ionicons name="arrow-back" size={16} color={themeStyles.accent} />
              <Text style={[styles.drawerSwitchText, { color: themeStyles.text }]}>
                Back to Minimal Home Favorites
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* Access NeuroNinja Focus Suite */}
        <TouchableOpacity
          style={[styles.exitBtn, { borderTopColor: themeStyles.border }]}
          onPress={() => router.push('/(tabs)' as any)}
        >
          <MaterialCommunityIcons name="shield-half-full" size={18} color={themeStyles.accent} />
          <Text style={[styles.exitText, { color: themeStyles.subtext }]}>
            NeuroNinja Dojo & App Blocker
          </Text>
          <Ionicons name="chevron-forward" size={14} color={themeStyles.subtext} />
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
                    onValueChange={(val) => {
                      void setGhostLauncherAsHome(val);
                      if (val && Platform.OS === 'android') {
                        promptSetDefaultLauncher();
                      }
                    }}
                    trackColor={{ false: '#334155', true: '#10B981' }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                <TouchableOpacity
                  style={[styles.modalSecondaryBtn, { borderColor: themeStyles.border, marginTop: 12 }]}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    openNormalLauncherSettings();
                  }}
                >
                  <MaterialCommunityIcons name="cog-outline" size={20} color="#00E699" />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.secondaryBtnTitle, { color: themeStyles.text }]}>
                      Switch Default Home App
                    </Text>
                    <Text style={[styles.secondaryBtnSub, { color: themeStyles.subtext }]}>
                      Open system settings to select or switch your phone launcher anytime.
                    </Text>
                  </View>
                </TouchableOpacity>
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
                    router.push('/(tabs)' as any);
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

      {/* App Context Menu Modal (Long Press / Ellipsis) */}
      <Modal
        visible={appContextMenu !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setAppContextMenu(null)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalBox,
              { backgroundColor: themeStyles.cardBg, borderColor: themeStyles.border },
            ]}
          >
            <Text style={[styles.modalTitle, { color: themeStyles.text }]}>
              {appContextMenu?.customName || appContextMenu?.name}
            </Text>
            <Text style={[styles.modalSub, { color: themeStyles.subtext, marginBottom: 14 }]}>
              Mindful App Controls
            </Text>

            <TouchableOpacity
              style={[styles.contextRow, { borderColor: themeStyles.border }]}
              onPress={() => {
                if (appContextMenu) {
                  void toggleFavorite(appContextMenu.id);
                  setAppContextMenu(null);
                }
              }}
            >
              <Ionicons
                name={appContextMenu?.isFavorite ? 'star' : 'star-outline'}
                size={18}
                color="#F59E0B"
              />
              <Text style={[styles.contextText, { color: themeStyles.text }]}>
                {appContextMenu?.isFavorite ? 'Remove from Home Favorites' : 'Pin to Home Favorites'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.contextRow, { borderColor: themeStyles.border }]}
              onPress={() => {
                if (appContextMenu) {
                  const target = appContextMenu;
                  setAppContextMenu(null);
                  handleStartRename(target);
                }
              }}
            >
              <MaterialCommunityIcons name="pencil-outline" size={18} color={themeStyles.subtext} />
              <Text style={[styles.contextText, { color: themeStyles.text }]}>
                Rename (Mindful Alias)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.contextRow, { borderColor: themeStyles.border }]}
              onPress={() => {
                if (appContextMenu) {
                  void toggleHide(appContextMenu.id);
                  setAppContextMenu(null);
                }
              }}
            >
              <Ionicons name="eye-off-outline" size={18} color={themeStyles.subtext} />
              <Text style={[styles.contextText, { color: themeStyles.text }]}>
                Hide from App List
              </Text>
            </TouchableOpacity>

            <Text
              style={[
                styles.settingSectionTitle,
                { color: themeStyles.accent, marginTop: 14, marginBottom: 8 },
              ]}
            >
              MINDFUL LAUNCH DELAY
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              {[0, 5, 10, 15].map((sec) => {
                const pkgKey = appContextMenu?.packageName || appContextMenu?.id || '';
                const isSelected = (delayConfigs[pkgKey] || 0) === sec;
                return (
                  <TouchableOpacity
                    key={sec}
                    style={[
                      styles.delayChip,
                      { borderColor: isSelected ? themeStyles.accent : themeStyles.border },
                      isSelected && { backgroundColor: 'rgba(0,230,153,0.12)' },
                    ]}
                    onPress={() => {
                      if (pkgKey) void handleSetDelay(pkgKey, sec);
                    }}
                  >
                    <Text
                      style={{
                        color: isSelected ? themeStyles.accent : themeStyles.subtext,
                        fontSize: 12,
                        fontWeight: '700',
                      }}
                    >
                      {sec === 0 ? 'Off' : `${sec}s`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[styles.modalBtn, { borderColor: themeStyles.border, alignSelf: 'stretch', alignItems: 'center' }]}
              onPress={() => setAppContextMenu(null)}
            >
              <Text style={{ color: themeStyles.subtext }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Mindful Launch Delay Modal (Minimalist Phone Parity) */}
      <Modal
        visible={mindfulDelayApp !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setMindfulDelayApp(null)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.guidedModalBox,
              { backgroundColor: themeStyles.cardBg, borderColor: themeStyles.border },
            ]}
          >
            <View style={styles.guidedIconCircle}>
              <Ionicons name="hourglass-outline" size={32} color="#10B981" />
            </View>

            <Text style={[styles.guidedTitle, { color: themeStyles.text }]}>
              Mindful Pause
            </Text>
            <Text style={[styles.guidedStep, { color: themeStyles.subtext, textAlign: 'center' }]}>
              Take a deep breath. Do you truly want to open{' '}
              <Text style={{ color: themeStyles.text, fontWeight: '700' }}>
                {mindfulDelayApp?.app.customName || mindfulDelayApp?.app.name}
              </Text>
              ?
            </Text>

            <Text
              style={{
                fontSize: 44,
                fontWeight: '200',
                color: mindfulDelayApp?.countdown === 0 ? '#10B981' : themeStyles.text,
                marginVertical: 14,
              }}
            >
              {mindfulDelayApp?.countdown === 0 ? 'Ready' : `${mindfulDelayApp?.countdown}s`}
            </Text>

            <View style={styles.guidedActions}>
              <TouchableOpacity
                style={[styles.guidedCancelBtn, { borderColor: themeStyles.border }]}
                onPress={() => setMindfulDelayApp(null)}
              >
                <Text style={{ color: '#10B981', fontWeight: '700' }}>Stay Focused</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.guidedConfirmBtn,
                  {
                    backgroundColor:
                      mindfulDelayApp?.countdown === 0 ? themeStyles.accent : '#27272A',
                  },
                ]}
                disabled={mindfulDelayApp?.countdown !== 0}
                onPress={() => {
                  if (mindfulDelayApp) {
                    const target = mindfulDelayApp.app;
                    setMindfulDelayApp(null);
                    void handleLaunchApp(target, true);
                  }
                }}
              >
                <Text
                  style={{
                    color:
                      mindfulDelayApp?.countdown === 0
                        ? theme === 'paper'
                          ? '#FFFFFF'
                          : '#070A11'
                        : themeStyles.subtext,
                    fontWeight: 'bold',
                  }}
                >
                  Open App
                </Text>
              </TouchableOpacity>
            </View>
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
  contactsContainer: {
    marginBottom: 12,
    gap: 8,
  },
  contactHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  contactHeaderText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  contactAvatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0, 230, 153, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 153, 0.3)',
  },
  contactAvatarInitials: {
    fontSize: 14,
    fontWeight: '800',
    color: '#00E699',
  },
  contactInfo: {
    flex: 1,
  },
  contactNameText: {
    fontSize: 14,
    fontWeight: '700',
  },
  contactPhoneText: {
    fontSize: 11,
    marginTop: 2,
  },
  contactActionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contactActionPill: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: 11,
    fontWeight: '500',
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
  drawerSwitchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 18,
    marginBottom: 12,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  drawerSwitchText: {
    fontSize: 14,
    fontWeight: '600',
  },
  contextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  contextText: {
    fontSize: 14,
    fontWeight: '500',
  },
  delayChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
});
