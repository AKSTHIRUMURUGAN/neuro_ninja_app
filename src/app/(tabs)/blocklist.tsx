import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  TextInput,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  FamilyActivityPickerView,
  BlockedAppsNativeList,
  type FamilyActivityPickerSelectionEvent,
  type AndroidBlockableApp,
} from 'expo-app-blocker';

import { useNinja } from '../../context/ninja-context';
import { NinjaPalette } from '../../constants/theme';
import { blockerEngine } from '../../services/blocker/blocker-engine';
import { AppIcon } from '../../components/ui/app-icon';
import { AppConfigModal } from '../../components/armory/app-config-modal';

const COMMON_DISTRACTIONS = [
  { name: 'Instagram', pkg: 'com.instagram.android' },
  { name: 'TikTok', pkg: 'com.zhiliaoapp.musically' },
  { name: 'YouTube', pkg: 'com.google.android.youtube' },
  { name: 'X / Twitter', pkg: 'com.twitter.android' },
  { name: 'Reddit', pkg: 'com.reddit.frontpage' },
  { name: 'Facebook', pkg: 'com.facebook.katana' },
  { name: 'Snapchat', pkg: 'com.snapchat.android' },
];

export default function BlocklistScreen() {
  const {
    settings,
    setIOSSelection,
    setAndroidSelection,
    updateQuotaPolicy,
  } = useNinja();

  // Android state
  const [installedApps, setInstalledApps] = useState<AndroidBlockableApp[]>([]);
  const [loadingApps, setLoadingApps] = useState(Platform.OS === 'android');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'sealed'>('all');
  const [selectedAppForConfig, setSelectedAppForConfig] = useState<AndroidBlockableApp | null>(null);

  useEffect(() => {
    let active = true;
    if (Platform.OS === 'android') {
      blockerEngine.getInstalledApps().then((apps) => {
        if (active) {
          setInstalledApps(apps);
          setLoadingApps(false);
        }
      });
    }
    return () => {
      active = false;
    };
  }, []);

  // iOS Handlers
  const handleIOSSelectionChange = async (event: FamilyActivityPickerSelectionEvent) => {
    const items = event.items ?? [];
    await setIOSSelection(event.selectionData, items);
  };

  // Android Handlers
  const toggleAndroidPackage = async (packageName: string) => {
    const current = new Set(settings.androidBlockedPackages);
    if (current.has(packageName)) {
      current.delete(packageName);
    } else {
      current.add(packageName);
    }
    await setAndroidSelection(Array.from(current));
  };

  const handleApplyProfile = async (profile: 'work' | 'study' | 'detox' | 'clear') => {
    if (profile === 'clear') {
      await setAndroidSelection([]);
      return;
    }
    const socialPkgs = [
      'com.instagram.android',
      'com.zhiliaoapp.musically',
      'com.google.android.youtube',
      'com.twitter.android',
      'com.reddit.frontpage',
      'com.facebook.katana',
      'com.snapchat.android',
    ];
    if (profile === 'work') {
      await setAndroidSelection(socialPkgs);
    } else if (profile === 'study') {
      const studyPkgs = [...socialPkgs, 'com.netflix.mediaclient', 'com.spotify.music'];
      await setAndroidSelection(studyPkgs);
    } else if (profile === 'detox') {
      // Seal all common distractions + any installed non-system apps
      const allDetected = Array.from(new Set([...socialPkgs, ...installedApps.map(a => a.packageName)]));
      await setAndroidSelection(allDetected);
    }
  };

  const handleSelectCommonPresets = async () => {
    const set = new Set(settings.androidBlockedPackages);
    COMMON_DISTRACTIONS.forEach((d) => set.add(d.pkg));
    await setAndroidSelection(Array.from(set));
  };

  const filteredApps = installedApps.filter((app) => {
    const matchesSearch =
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.packageName.toLowerCase().includes(searchQuery.toLowerCase());
    const isSealed = settings.androidBlockedPackages.includes(app.packageName);
    if (filterMode === 'sealed') return matchesSearch && isSealed;
    return matchesSearch;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View>
          <Text style={styles.badge}>ARMORY INVENTORY</Text>
          <Text style={styles.title}>Sealed Targets</Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>
            {Platform.OS === 'ios'
              ? settings.iosBlockedItems.length
              : settings.androidBlockedPackages.length}{' '}
            Sealed
          </Text>
        </View>
      </View>

      {/* iOS View: Native Screen Time Family Activity Picker */}
      {Platform.OS === 'ios' ? (
        <ScrollView contentContainerStyle={styles.iosScroll}>
          <Text style={styles.instructionText}>
            Select distracting apps or entire categories to shield during focus sessions.
          </Text>

          {/* Active Blocked Preview Native List */}
          {settings.iosBlockedItems.length > 0 && (
            <View style={styles.previewContainer}>
              <Text style={styles.previewTitle}>Active Tokens</Text>
              <BlockedAppsNativeList
                items={settings.iosBlockedItems}
                selectionData={settings.iosSelectionData}
                style={{ minHeight: 60 }}
              />
            </View>
          )}

          {/* Inline Native Picker */}
          <View style={styles.pickerContainer}>
            <FamilyActivityPickerView
              initialSelection={settings.iosSelectionData}
              onSelectionChange={handleIOSSelectionChange}
              theme="dark"
              style={{ height: 480 }}
            />
          </View>
        </ScrollView>
      ) : (
        /* Android View: Categorized Installed Apps */
        <View style={styles.androidContainer}>
          {/* Quick Profile Switcher (Opal / Freedom Parity) */}
          <View style={styles.profilesSection}>
            <Text style={styles.profilesTitle}>DISCIPLINE PROFILES</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.profilesScroll}>
              <TouchableOpacity
                style={styles.profileBtn}
                onPress={() => handleApplyProfile('work')}
              >
                <MaterialCommunityIcons name="briefcase-outline" size={14} color="#60A5FA" />
                <Text style={styles.profileBtnText}>Work Mode</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.profileBtn}
                onPress={() => handleApplyProfile('study')}
              >
                <MaterialCommunityIcons name="book-open-outline" size={14} color="#00E699" />
                <Text style={styles.profileBtnText}>Study Mode</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.profileBtn}
                onPress={() => handleApplyProfile('detox')}
              >
                <MaterialCommunityIcons name="shield-lock-outline" size={14} color="#EF4444" />
                <Text style={styles.profileBtnText}>Total Detox</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.profileBtn, { borderColor: '#334155' }]}
                onPress={() => handleApplyProfile('clear')}
              >
                <MaterialCommunityIcons name="lock-open-outline" size={14} color="#94A3B8" />
                <Text style={[styles.profileBtnText, { color: '#94A3B8' }]}>Unseal All</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          <View style={styles.searchRow}>
            <MaterialCommunityIcons name="magnify" size={20} color={NinjaPalette.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search apps by name..."
              placeholderTextColor={NinjaPalette.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <MaterialCommunityIcons name="close-circle" size={18} color={NinjaPalette.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter Chips & Presets */}
          <View style={styles.chipsRow}>
            <TouchableOpacity
              style={[styles.chip, filterMode === 'all' && styles.chipActive]}
              onPress={() => setFilterMode('all')}
            >
              <Text style={[styles.chipText, filterMode === 'all' && styles.chipTextActive]}>
                All Apps
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.chip, filterMode === 'sealed' && styles.chipActive]}
              onPress={() => setFilterMode('sealed')}
            >
              <Text style={[styles.chipText, filterMode === 'sealed' && styles.chipTextActive]}>
                Sealed ({settings.androidBlockedPackages.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.presetChip} onPress={handleSelectCommonPresets}>
              <MaterialCommunityIcons name="flash" size={14} color={NinjaPalette.amber} />
              <Text style={styles.presetChipText}>Auto-Seal Top 7</Text>
            </TouchableOpacity>
          </View>

          {loadingApps ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={NinjaPalette.emerald} size="large" />
              <Text style={styles.loadingText}>Loading installed apps...</Text>
            </View>
          ) : (
            <ScrollView style={styles.appList}>
              {filteredApps.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>No apps found matching criteria.</Text>
                </View>
              ) : (
                filteredApps.map((app) => {
                  const isBlocked = settings.androidBlockedPackages.includes(app.packageName);
                  const policy = settings.appQuotaPolicies[app.packageName];
                  const isDoom =
                    policy?.protectionMode === 'doom_barrier' ||
                    (!policy?.protectionMode &&
                      (app.name.toLowerCase().includes('instagram') ||
                        app.name.toLowerCase().includes('youtube') ||
                        app.name.toLowerCase().includes('tiktok') ||
                        app.name.toLowerCase().includes('reddit') ||
                        app.name.toLowerCase().includes('snapchat')));
                  const hasCustom = policy?.hasCustomSecurity;

                  return (
                    <TouchableOpacity
                      key={app.packageName}
                      style={[styles.appRow, isBlocked && styles.appRowBlocked]}
                      activeOpacity={0.7}
                      onPress={() => setSelectedAppForConfig(app)}
                    >
                      <AppIcon
                        packageName={app.packageName}
                        appName={app.name}
                        iconBase64={app.iconBase64}
                        size={42}
                      />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <Text style={styles.appLabel}>{app.name}</Text>
                          {isDoom ? (
                            <View style={styles.doomBadge}>
                              <MaterialCommunityIcons name="fire" size={10} color="#EF4444" />
                              <Text style={styles.doomBadgeText}>DOOM</Text>
                            </View>
                          ) : (
                            <View style={styles.vaultBadge}>
                              <MaterialCommunityIcons name="shield-lock" size={10} color="#00E699" />
                              <Text style={styles.vaultBadgeText}>VAULT</Text>
                            </View>
                          )}
                          {hasCustom && (
                            <View style={styles.customBadge}>
                              <Text style={styles.customBadgeText}>CUSTOM LOCK</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.appPackage} numberOfLines={1}>
                          {app.packageName}
                        </Text>
                      </View>
                      <View style={styles.rowActions}>
                        <TouchableOpacity
                          style={styles.gearBtn}
                          onPress={() => setSelectedAppForConfig(app)}
                        >
                          <MaterialCommunityIcons name="shield-edit-outline" size={18} color="#94A3B8" />
                        </TouchableOpacity>
                        <Switch
                          value={isBlocked}
                          onValueChange={() => toggleAndroidPackage(app.packageName)}
                          thumbColor={isBlocked ? NinjaPalette.emerald : '#94A3B8'}
                          trackColor={{ false: '#1E293B', true: 'rgba(0, 230, 153, 0.4)' }}
                        />
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          )}

          <AppConfigModal
            visible={!!selectedAppForConfig}
            app={selectedAppForConfig}
            isSealed={
              selectedAppForConfig
                ? settings.androidBlockedPackages.includes(selectedAppForConfig.packageName)
                : false
            }
            currentPolicy={
              selectedAppForConfig
                ? settings.appQuotaPolicies[selectedAppForConfig.packageName]
                : undefined
            }
            onToggleSeal={toggleAndroidPackage}
            onSavePolicy={updateQuotaPolicy}
            onClose={() => setSelectedAppForConfig(null)}
          />
        </View>
      )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  badge: {
    color: NinjaPalette.emerald,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: NinjaPalette.textPrimary,
  },
  countBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  countBadgeText: {
    color: NinjaPalette.emerald,
    fontWeight: 'bold',
    fontSize: 12,
  },
  iosScroll: {
    padding: 20,
    paddingBottom: 40,
  },
  instructionText: {
    color: NinjaPalette.textSecondary,
    fontSize: 13,
    marginBottom: 16,
  },
  previewContainer: {
    backgroundColor: '#0F1829',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 20,
  },
  previewTitle: {
    color: NinjaPalette.textMuted,
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 10,
  },
  pickerContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#0F1829',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  profilesSection: {
    marginBottom: 16,
  },
  profilesTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  profilesScroll: {
    gap: 8,
  },
  profileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0F1829',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  profileBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: NinjaPalette.textPrimary,
  },
  androidContainer: {
    flex: 1,
    padding: 16,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#0F1829',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    color: NinjaPalette.textPrimary,
    fontSize: 14,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#0F1829',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  chipActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: NinjaPalette.emerald,
  },
  chipText: {
    color: NinjaPalette.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextActive: {
    color: NinjaPalette.emerald,
    fontWeight: 'bold',
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    marginLeft: 'auto',
  },
  presetChipText: {
    color: NinjaPalette.amber,
    fontSize: 12,
    fontWeight: 'bold',
  },
  appList: {
    flex: 1,
  },
  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  appRowBlocked: {
    backgroundColor: 'rgba(0, 230, 153, 0.02)',
  },
  doomBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  doomBadgeText: {
    color: '#EF4444',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  vaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0, 230, 153, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 153, 0.3)',
  },
  vaultBadgeText: {
    color: '#00E699',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  customBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  customBadgeText: {
    color: '#38BDF8',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gearBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#0F172A',
  },
  appIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    color: NinjaPalette.textPrimary,
  },
  appPackage: {
    fontSize: 11,
    color: NinjaPalette.textMuted,
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: NinjaPalette.textSecondary,
    fontSize: 13,
  },
  emptyBox: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: NinjaPalette.textMuted,
    fontSize: 13,
  },
});
