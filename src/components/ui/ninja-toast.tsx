import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  PanResponder,
  Modal,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { NinjaPalette } from '../../constants/theme';
import { NinjaAlertType } from './ninja-alert-modal';

export interface NinjaToastOptions {
  title: string;
  message?: string;
  type?: NinjaAlertType;
  icon?: string;
  duration?: number;
}

interface NinjaToastProps {
  toast: NinjaToastOptions | null;
  onDismiss: () => void;
}

const TOAST_THEMES: Record<
  NinjaAlertType,
  { bg: string; border: string; iconColor: string; defaultIcon: string }
> = {
  success: {
    bg: '#0F172A',
    border: NinjaPalette.emerald,
    iconColor: NinjaPalette.emerald,
    defaultIcon: 'check-circle',
  },
  shield: {
    bg: '#0F172A',
    border: NinjaPalette.emerald,
    iconColor: NinjaPalette.emerald,
    defaultIcon: 'shield-check',
  },
  info: {
    bg: '#0F172A',
    border: NinjaPalette.cyan,
    iconColor: NinjaPalette.cyan,
    defaultIcon: 'information',
  },
  warning: {
    bg: '#0F172A',
    border: NinjaPalette.amber,
    iconColor: NinjaPalette.amber,
    defaultIcon: 'alert',
  },
  error: {
    bg: '#0F172A',
    border: '#EF4444',
    iconColor: '#EF4444',
    defaultIcon: 'alert-circle',
  },
};

export function NinjaToast({ toast, onDismiss }: NinjaToastProps) {
  const [translateY] = useState(() => new Animated.Value(-120));
  const [opacity] = useState(() => new Animated.Value(0));

  const dismissToast = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  }, [opacity, translateY, onDismiss]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy < -10,
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy < -20) {
            dismissToast();
          }
        },
      }),
    [dismissToast]
  );

  useEffect(() => {
    if (toast) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 50,
          friction: 7,
          tension: 70,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        dismissToast();
      }, toast.duration || 3200);

      return () => clearTimeout(timer);
    }
  }, [toast, translateY, opacity, dismissToast]);

  if (!toast) return null;

  const type = toast.type || 'info';
  const theme = TOAST_THEMES[type];
  const icon = toast.icon || theme.defaultIcon;

  return (
    <Modal
      visible={Boolean(toast)}
      transparent
      animationType="none"
      onRequestClose={dismissToast}
      statusBarTranslucent
    >
      <View style={styles.modalBackdrop} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.container,
            {
              transform: [{ translateY }],
              opacity,
              borderColor: theme.border,
              backgroundColor: theme.bg,
            },
          ]}
          {...panResponder.panHandlers}
        >
          <TouchableOpacity
            style={styles.touchArea}
            onPress={dismissToast}
            activeOpacity={0.9}
          >
            <View style={[styles.iconBox, { backgroundColor: `${theme.iconColor}22` }]}>
              <MaterialCommunityIcons name={icon as any} size={20} color={theme.iconColor} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.title} numberOfLines={1}>
                {toast.title}
              </Text>
              {!!toast.message && (
                <Text style={styles.message} numberOfLines={2}>
                  {toast.message}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    position: 'absolute',
    top: 10,
    left: 20,
    right: 20,
    zIndex: 99999,
    borderRadius: 18,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 25,
  },
  touchArea: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  message: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
});
