import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNinjaBack } from '../../hooks/use-ninja-back';

export interface NinjaScreenHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  rightAction?: React.ReactNode;
  onBackPress?: () => boolean | void;
  fallbackRoute?: string;
  style?: StyleProp<ViewStyle>;
  showBackButton?: boolean;
}

export function NinjaScreenHeader({
  title,
  subtitle,
  badge,
  rightAction,
  onBackPress,
  fallbackRoute,
  style,
  showBackButton = true,
}: NinjaScreenHeaderProps) {
  const { handleSmartBack } = useNinjaBack({
    onBackOverride: onBackPress,
    fallbackRoute,
  });

  return (
    <View style={[styles.header, style]}>
      {showBackButton && (
        <TouchableOpacity
          style={styles.backBtn}
          onPress={handleSmartBack}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>
      )}

      <View style={[styles.titleWrapper, !showBackButton && { marginLeft: 0 }]}>
        {badge ? <Text style={styles.badge}>{badge.toUpperCase()}</Text> : null}
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {rightAction ? <View style={styles.rightWrapper}>{rightAction}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.07)',
    backgroundColor: '#070A11',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0F1829',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  titleWrapper: {
    flex: 1,
    marginLeft: 12,
  },
  badge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#00E699',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 1,
  },
  rightWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
