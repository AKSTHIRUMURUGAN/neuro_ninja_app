import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { NinjaPalette } from '../constants/theme';
import { useNinjaAlert } from '../context/ninja-alert-context';

export interface StudyChannel {
  id: string;
  name: string;
  category: string;
  icon: string;
  url: string;
  color: string;
}

export const STUDY_CHANNELS: StudyChannel[] = [
  { id: 'khan', name: 'Khan Academy', category: 'Math & Sciences', icon: 'school-outline', url: 'https://www.youtube.com/@khanacademy', color: '#00E699' },
  { id: 'mit', name: 'MIT OpenCourseWare', category: 'Engineering & Physics', icon: 'book-education-outline', url: 'https://www.youtube.com/@mitocw', color: '#EF4444' },
  { id: '3b1b', name: '3Blue1Brown', category: 'Calculus & Neural Nets', icon: 'math-compass', url: 'https://www.youtube.com/@3blue1brown', color: '#60A5FA' },
  { id: 'fcc', name: 'freeCodeCamp.org', category: 'Fullstack Coding', icon: 'code-tags', url: 'https://www.youtube.com/@freecodecamp', color: '#F59E0B' },
  { id: 'huberman', name: 'Huberman Lab', category: 'Neuroscience & Focus', icon: 'brain', url: 'https://www.youtube.com/@hubermanlab', color: '#A855F7' },
];

export function YouTubeStudyPortal() {
  const { showToast } = useNinjaAlert();
  const handleOpenChannel = async (channel: StudyChannel) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const canOpen = await Linking.canOpenURL(channel.url);
    if (canOpen) {
      await Linking.openURL(channel.url);
    } else {
      showToast({
        title: 'Cannot Open URL',
        message: channel.url,
        type: 'error',
        icon: 'link-variant-off',
      });
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconBox}>
          <MaterialCommunityIcons name="youtube" size={24} color="#EF4444" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.badge}>REGAIN STUDY MODE</Text>
          <Text style={styles.title}>Approved YouTube Portals</Text>
        </View>
        <View style={styles.shortsBlockedPill}>
          <MaterialCommunityIcons name="cancel" size={12} color="#EF4444" />
          <Text style={styles.shortsBlockedText}>Shorts Blocked</Text>
        </View>
      </View>

      <Text style={styles.subtext}>
        Unchecked YouTube algorithms promote endless scrolling. In Study Mode, entertainment feeds and Shorts are sealed while pre-approved academic channels remain open.
      </Text>

      <View style={styles.channelList}>
        {STUDY_CHANNELS.map((ch) => (
          <TouchableOpacity
            key={ch.id}
            style={styles.channelRow}
            onPress={() => handleOpenChannel(ch)}
          >
            <View style={[styles.channelIconBox, { backgroundColor: `${ch.color}20` }]}>
              <MaterialCommunityIcons name={ch.icon as any} size={20} color={ch.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.channelName}>{ch.name}</Text>
              <Text style={styles.channelCategory}>{ch.category}</Text>
            </View>
            <MaterialCommunityIcons name="open-in-new" size={16} color="#64748B" />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0F1829',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    padding: 18,
    width: '100%',
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: NinjaPalette.textPrimary,
  },
  shortsBlockedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  shortsBlockedText: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '700',
  },
  subtext: {
    fontSize: 11,
    color: NinjaPalette.textSecondary,
    marginBottom: 14,
    lineHeight: 16,
  },
  channelList: {
    gap: 10,
  },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 14,
    padding: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  channelIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelName: {
    fontSize: 13,
    fontWeight: '700',
    color: NinjaPalette.textPrimary,
  },
  channelCategory: {
    fontSize: 10,
    color: NinjaPalette.textMuted,
    marginTop: 1,
  },
});

