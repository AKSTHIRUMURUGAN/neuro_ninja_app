import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, Platform, type StyleProp, type ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { blockerEngine } from '../../services/blocker/blocker-engine';

interface AppIconProps {
  packageName?: string;
  appName?: string;
  iconBase64?: string | null;
  domain?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
  showBorder?: boolean;
}

// Domain dictionary for known package identifiers to fetch high-res web logos
const PACKAGE_DOMAIN_MAP: Record<string, { domain: string; color: string; iconFallback?: any }> = {
  'com.instagram.android': { domain: 'instagram.com', color: '#E1306C', iconFallback: 'instagram' },
  'com.google.android.youtube': { domain: 'youtube.com', color: '#FF0000', iconFallback: 'youtube' },
  'com.zhiliaoapp.musically': { domain: 'tiktok.com', color: '#00F2FE', iconFallback: 'music-note' },
  'com.twitter.android': { domain: 'x.com', color: '#1DA1F2', iconFallback: 'twitter' },
  'com.reddit.frontpage': { domain: 'reddit.com', color: '#FF4500', iconFallback: 'reddit' },
  'com.whatsapp': { domain: 'whatsapp.com', color: '#25D366', iconFallback: 'whatsapp' },
  'com.facebook.katana': { domain: 'facebook.com', color: '#1877F2', iconFallback: 'facebook' },
  'com.snapchat.android': { domain: 'snapchat.com', color: '#FFFC00', iconFallback: 'snapchat' },
  'com.netflix.mediaclient': { domain: 'netflix.com', color: '#E50914', iconFallback: 'movie-play-outline' },
  'com.spotify.music': { domain: 'spotify.com', color: '#1DB954', iconFallback: 'spotify' },
  'org.telegram.messenger': { domain: 'telegram.org', color: '#2AABEE', iconFallback: 'send' },
  'com.discord': { domain: 'discord.com', color: '#5865F2', iconFallback: 'controller-classic' },
  'com.android.chrome': { domain: 'google.com', color: '#4285F4', iconFallback: 'google-chrome' },
  'com.google.android.apps.messaging': { domain: 'google.com', color: '#1A73E8', iconFallback: 'message-text' },
  'com.google.android.gm': { domain: 'gmail.com', color: '#EA4335', iconFallback: 'gmail' },
  'com.google.android.apps.photos': { domain: 'google.com', color: '#FBBC05', iconFallback: 'image-multiple' },
  'com.linkedin.android': { domain: 'linkedin.com', color: '#0A66C2', iconFallback: 'linkedin' },
  'com.pinterest': { domain: 'pinterest.com', color: '#E60023', iconFallback: 'pinterest' },
  'tv.twitch.android.app': { domain: 'twitch.tv', color: '#9146FF', iconFallback: 'twitch' },
  'com.amazon.mShop.android.shopping': { domain: 'amazon.com', color: '#FF9900', iconFallback: 'cart' },
  'com.chess': { domain: 'chess.com', color: '#81B64C', iconFallback: 'chess-knight' },
  'com.duolingo': { domain: 'duolingo.com', color: '#58CC02', iconFallback: 'school' },
  'com.slack': { domain: 'slack.com', color: '#4A154B', iconFallback: 'slack' },
  'com.microsoft.teams': { domain: 'microsoft.com', color: '#6264A7', iconFallback: 'microsoft-teams' },
  'com.valvesoftware.android.steam.community': { domain: 'steampowered.com', color: '#171A21', iconFallback: 'steam' },
};

const CYBER_COLORS = [
  '#00E699', // Emerald
  '#38BDF8', // Sky Cyan
  '#818CF8', // Indigo
  '#C084FC', // Purple
  '#F472B6', // Pink
  '#F59E0B', // Amber
  '#34D399', // Mint
];

function hashStringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % CYBER_COLORS.length;
  return CYBER_COLORS[index];
}

export function AppIcon({
  packageName,
  appName = 'App',
  iconBase64,
  domain,
  size = 40,
  style,
  showBorder = true,
}: AppIconProps) {
  const [imageError, setImageError] = useState(false);
  const [lazyBase64, setLazyBase64] = useState<string | null>(null);

  const cachedIcon = packageName ? blockerEngine.getCachedIcon(packageName) : null;

  useEffect(() => {
    let mounted = true;
    if (
      Platform.OS === 'android' &&
      packageName &&
      !packageName.startsWith('builtin.') &&
      !iconBase64 &&
      !cachedIcon
    ) {
      void blockerEngine.getAppIcon(packageName).then((icon) => {
        if (mounted && icon) {
          setLazyBase64(icon);
        }
      });
    }
    return () => {
      mounted = false;
    };
  }, [packageName, iconBase64, cachedIcon]);

  // 1. Resolve base64: passed directly, lazy-loaded, or retrieved from engine cache
  const effectiveBase64 = iconBase64 || lazyBase64 || cachedIcon;

  // 2. Resolve domain for CDN favicon
  const brandMeta = packageName ? PACKAGE_DOMAIN_MAP[packageName] : undefined;
  const effectiveDomain = domain || brandMeta?.domain;
  const cdnFaviconUrl = effectiveDomain
    ? `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${effectiveDomain}&size=128`
    : null;

  const borderRadius = Math.round(size * 0.28);

  // If base64 exists, display the 100% exact native app icon from Android PackageManager
  if (effectiveBase64 && !imageError) {
    return (
      <View
        style={[
          styles.container,
          { width: size, height: size, borderRadius },
          showBorder && styles.borderGlow,
          style,
        ]}
      >
        <Image
          source={{ uri: `data:image/png;base64,${effectiveBase64}` }}
          style={{ width: size - 4, height: size - 4, borderRadius: borderRadius - 2 }}
          resizeMode="contain"
          onError={() => setImageError(true)}
        />
      </View>
    );
  }

  // If Web Favicon CDN is available and base64 was not present
  if (cdnFaviconUrl && !imageError) {
    return (
      <View
        style={[
          styles.container,
          { width: size, height: size, borderRadius, backgroundColor: '#0B1120' },
          showBorder && styles.borderGlow,
          style,
        ]}
      >
        <Image
          source={{ uri: cdnFaviconUrl }}
          style={{ width: size - 8, height: size - 8, borderRadius: borderRadius - 2 }}
          resizeMode="contain"
          onError={() => setImageError(true)}
        />
      </View>
    );
  }

  // If brand vector fallback exists
  if (brandMeta?.iconFallback) {
    return (
      <View
        style={[
          styles.container,
          {
            width: size,
            height: size,
            borderRadius,
            backgroundColor: `${brandMeta.color}15`,
            borderColor: `${brandMeta.color}40`,
          },
          style,
        ]}
      >
        <MaterialCommunityIcons
          name={brandMeta.iconFallback}
          size={Math.round(size * 0.55)}
          color={brandMeta.color}
        />
      </View>
    );
  }

  // Deterministic Cyberpunk Monogram Fallback
  const initials = appName
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'A';
  const accentColor = hashStringToColor(packageName || appName);

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius,
          backgroundColor: '#0A0F1D',
          borderColor: `${accentColor}55`,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.monogramText,
          {
            fontSize: Math.round(size * 0.42),
            color: accentColor,
          },
        ]}
      >
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  borderGlow: {
    borderColor: 'rgba(0, 230, 153, 0.25)',
  },
  monogramText: {
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
