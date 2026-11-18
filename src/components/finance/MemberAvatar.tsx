import React from 'react';
import { View, Text, Image, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { FamilyMember } from '../../services/finance/finance-types';

export interface MemberAvatarProps {
  member?: FamilyMember | { name?: string; avatarEmoji?: string; avatarUrl?: string; color?: string };
  size?: number;
  showLabel?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function MemberAvatar({
  member,
  size = 38,
  showLabel = false,
  style,
}: MemberAvatarProps) {
  const name = member?.name || 'Self';
  const color = member?.color || '#38BDF8';
  const emoji = member?.avatarEmoji || '👤';
  const url = member?.avatarUrl;

  return (
    <View style={[styles.wrapper, style]}>
      <View
        style={[
          styles.circle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: `${color}25`,
            borderColor: color,
          },
        ]}
      >
        {url ? (
          <Image
            source={{ uri: url }}
            style={{ width: size * 0.75, height: size * 0.75, borderRadius: size / 2 }}
            resizeMode="cover"
          />
        ) : (
          <Text style={{ fontSize: size * 0.48 }}>{emoji}</Text>
        )}
      </View>
      {showLabel && (
        <Text style={[styles.label, { color }]} numberOfLines={1}>
          {name}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
});
