import React from 'react';
import { View, Text, Image, StyleSheet, StyleProp, ViewStyle } from 'react-native';

export interface CategoryIconProps {
  iconType?: 'emoji' | 'image' | string;
  iconValue?: string;
  color?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export function CategoryIcon({
  iconType = 'emoji',
  iconValue = '📌',
  color = '#38BDF8',
  size = 36,
  style,
}: CategoryIconProps) {
  const isImage = iconType === 'image' && iconValue && (iconValue.startsWith('http://') || iconValue.startsWith('https://') || iconValue.startsWith('data:image'));

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: Math.round(size / 3.2),
          backgroundColor: color ? `${color}20` : '#38BDF820',
          borderColor: color ? `${color}40` : '#38BDF840',
        },
        style,
      ]}
    >
      {isImage ? (
        <Image
          source={{ uri: iconValue }}
          style={{ width: size * 0.65, height: size * 0.65, borderRadius: 4 }}
          resizeMode="cover"
        />
      ) : (
        <Text style={{ fontSize: size * 0.52 }}>{iconValue || '📌'}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
