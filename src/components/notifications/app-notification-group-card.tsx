import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { AppIcon } from '../ui/app-icon';
import { sanitizeDopamineAlert } from '../../services/notifications/notification-firewall';
import type { AppNotificationGroup } from '../../services/notifications/notification-grouper';

export interface AppNotificationGroupCardProps {
  group: AppNotificationGroup;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onDismissNotification: (id: string) => void;
  onDismissAllFromApp: (packageName: string, appName: string) => void;
  onLaunchApp: (packageName: string) => void;
  onWhitelistVip: (packageName: string, appName: string) => void;
  isVip: boolean;
  dopamineObfuscation: boolean;
}

export const AppNotificationGroupCard = React.memo(function AppNotificationGroupCard({
  group,
  isExpanded,
  onToggleExpand,
  onDismissNotification,
  onDismissAllFromApp,
  onLaunchApp,
  onWhitelistVip,
  isVip,
  dopamineObfuscation,
}: AppNotificationGroupCardProps) {
  const handleToggle = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggleExpand();
  };

  const getCategoryColor = (cat: AppNotificationGroup['category']) => {
    switch (cat) {
      case 'Communication':
        return '#38BDF8';
      case 'Social':
        return '#EC4899';
      case 'Productivity':
        return '#F59E0B';
      case 'Media':
        return '#A855F7';
      case 'Study':
        return '#10B981';
      case 'Utility':
        return '#64748B';
      default:
        return '#00E699';
    }
  };

  const catColor = getCategoryColor(group.category);

  return (
    <View style={styles.cardContainer}>
      {/* Group Header */}
      <TouchableOpacity
        style={[styles.headerRow, isExpanded && styles.headerRowExpanded]}
        onPress={handleToggle}
        activeOpacity={0.8}
      >
        <View style={styles.iconBox}>
          <AppIcon packageName={group.packageName} appName={group.appName} size={38} />
        </View>

        <View style={styles.headerInfo}>
          <View style={styles.titleLine}>
            <Text style={styles.appName} numberOfLines={1}>
              {group.appName}
            </Text>
            <View style={[styles.categoryBadge, { borderColor: catColor + '40' }]}>
              <Text style={[styles.categoryText, { color: catColor }]}>{group.category}</Text>
            </View>
          </View>

          <View style={styles.subLine}>
            <View style={styles.countPill}>
              <MaterialCommunityIcons name="bell-badge-outline" size={13} color="#00E699" />
              <Text style={styles.countText}>
                {group.count === 1 ? '1 alert' : `${group.count} alerts`}
              </Text>
            </View>
            <Text style={styles.timeText}>• {group.latestFormattedTime}</Text>
          </View>
        </View>

        {/* Chevron Indicator */}
        <View style={[styles.chevronBox, isExpanded && styles.chevronBoxActive]}>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={isExpanded ? '#00E699' : '#94A3B8'}
          />
        </View>
      </TouchableOpacity>

      {/* Expanded Accordion Body */}
      {isExpanded && (
        <View style={styles.expandedContent}>
          {/* Quick Group Actions Toolbar */}
          <View style={styles.groupToolbar}>
            <TouchableOpacity
              style={styles.toolbarBtn}
              onPress={() => onLaunchApp(group.packageName)}
            >
              <Ionicons name="open-outline" size={14} color="#38BDF8" />
              <Text style={[styles.toolbarBtnText, { color: '#38BDF8' }]}>Open App</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toolbarBtn}
              onPress={() => onWhitelistVip(group.packageName, group.appName)}
            >
              <MaterialCommunityIcons
                name={isVip ? 'star' : 'star-outline'}
                size={14}
                color="#F59E0B"
              />
              <Text style={[styles.toolbarBtnText, { color: '#F59E0B' }]}>
                {isVip ? 'VIP Whitelisted' : 'Whitelist VIP'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toolbarBtn, styles.clearGroupBtn]}
              onPress={() => onDismissAllFromApp(group.packageName, group.appName)}
            >
              <MaterialCommunityIcons name="delete-sweep-outline" size={14} color="#F43F5E" />
              <Text style={[styles.toolbarBtnText, { color: '#F43F5E' }]}>Clear All ({group.count})</Text>
            </TouchableOpacity>
          </View>

          {/* Nested Alert Items */}
          <View style={styles.itemsList}>
            {group.items.map((n) => {
              const clean = dopamineObfuscation
                ? sanitizeDopamineAlert(n.title, n.body, n.appName)
                : { cleanTitle: n.title, cleanBody: n.body };

              return (
                <View key={n.id} style={styles.itemRow}>
                  <View style={styles.itemDot} />
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <View style={styles.itemHeader}>
                      <Text style={styles.itemTitle} numberOfLines={1}>
                        {clean.cleanTitle}
                      </Text>
                      <Text style={styles.itemTime}>{n.formattedTime}</Text>
                    </View>
                    {clean.cleanBody ? (
                      <Text style={styles.itemBody} numberOfLines={2}>
                        {clean.cleanBody}
                      </Text>
                    ) : null}
                  </View>

                  {/* Single Item Dismiss Button */}
                  <TouchableOpacity
                    style={styles.dismissItemBtn}
                    onPress={() => onDismissNotification(n.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close" size={16} color="#64748B" />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#0F1829',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 10,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  headerRowExpanded: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    backgroundColor: '#121D33',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  titleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  appName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  categoryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  categoryText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  subLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  countPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 230, 153, 0.12)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00E699',
  },
  timeText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  chevronBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  chevronBoxActive: {
    backgroundColor: 'rgba(0, 230, 153, 0.12)',
  },
  expandedContent: {
    backgroundColor: '#0B1322',
    padding: 12,
  },
  groupToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    gap: 8,
  },
  toolbarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  clearGroupBtn: {
    backgroundColor: 'rgba(244, 63, 94, 0.08)',
  },
  toolbarBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  itemsList: {
    gap: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#0F1829',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  itemDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00E699',
    marginTop: 6,
    marginRight: 8,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F1F5F9',
    flex: 1,
    marginRight: 6,
  },
  itemTime: {
    fontSize: 10,
    color: '#64748B',
  },
  itemBody: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 16,
  },
  dismissItemBtn: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
