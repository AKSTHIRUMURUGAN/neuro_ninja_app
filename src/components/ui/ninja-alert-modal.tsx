import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Pressable,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { NinjaPalette } from '../../constants/theme';

export type NinjaAlertType = 'success' | 'warning' | 'error' | 'info' | 'shield';

export interface NinjaAlertButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

export interface NinjaAlertOptions {
  title: string;
  message?: string;
  type?: NinjaAlertType;
  icon?: string;
  buttons?: NinjaAlertButton[];
}

interface NinjaAlertModalProps {
  visible: boolean;
  options: NinjaAlertOptions | null;
  onDismiss: () => void;
}

const TYPE_CONFIG: Record<
  NinjaAlertType,
  { borderColor: string; iconBg: string; iconColor: string; defaultIcon: string }
> = {
  success: {
    borderColor: NinjaPalette.emerald,
    iconBg: 'rgba(16, 185, 129, 0.15)',
    iconColor: NinjaPalette.emerald,
    defaultIcon: 'check-circle-outline',
  },
  shield: {
    borderColor: NinjaPalette.emerald,
    iconBg: 'rgba(16, 185, 129, 0.2)',
    iconColor: NinjaPalette.emerald,
    defaultIcon: 'shield-check',
  },
  info: {
    borderColor: NinjaPalette.cyan,
    iconBg: 'rgba(6, 182, 212, 0.15)',
    iconColor: NinjaPalette.cyan,
    defaultIcon: 'information-outline',
  },
  warning: {
    borderColor: NinjaPalette.amber,
    iconBg: 'rgba(245, 158, 11, 0.15)',
    iconColor: NinjaPalette.amber,
    defaultIcon: 'alert-outline',
  },
  error: {
    borderColor: '#EF4444',
    iconBg: 'rgba(239, 68, 68, 0.15)',
    iconColor: '#EF4444',
    defaultIcon: 'alert-circle-outline',
  },
};

export function NinjaAlertModal({ visible, options, onDismiss }: NinjaAlertModalProps) {
  const [scaleAnim] = useState(() => new Animated.Value(0.85));
  const [opacityAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      void Haptics.notificationAsync(
        options?.type === 'error'
          ? Haptics.NotificationFeedbackType.Error
          : options?.type === 'warning'
          ? Haptics.NotificationFeedbackType.Warning
          : Haptics.NotificationFeedbackType.Success
      );

      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
    }
  }, [visible, options?.type, opacityAnim, scaleAnim]);

  if (!visible || !options) return null;

  const type = options.type || 'info';
  const config = TYPE_CONFIG[type];
  const iconName = options.icon || config.defaultIcon;
  const buttons = options.buttons && options.buttons.length > 0
    ? options.buttons
    : [{ text: 'OK', style: 'default' as const, onPress: onDismiss }];

  const handleButtonPress = (btn: NinjaAlertButton) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDismiss();
    if (btn.onPress) {
      btn.onPress();
    }
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onDismiss}
    >
      <Pressable style={styles.overlay} onPress={onDismiss}>
        <Animated.View
          style={[
            styles.card,
            {
              borderColor: config.borderColor,
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          {/* Header Icon */}
          <View style={[styles.iconWrapper, { backgroundColor: config.iconBg, borderColor: config.borderColor }]}>
            <MaterialCommunityIcons name={iconName as any} size={32} color={config.iconColor} />
          </View>

          {/* Title & Message */}
          <Text style={styles.title}>{options.title}</Text>
          {!!options.message && <Text style={styles.message}>{options.message}</Text>}

          {/* Action Buttons */}
          <View style={[styles.btnRow, buttons.length > 2 && styles.btnCol]}>
            {buttons.map((btn, idx) => {
              const isCancel = btn.style === 'cancel';
              const isDestructive = btn.style === 'destructive';
              const isPrimary = !isCancel && !isDestructive;

              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.btn,
                    isPrimary && { backgroundColor: config.borderColor },
                    isCancel && styles.cancelBtn,
                    isDestructive && styles.destructiveBtn,
                    buttons.length > 2 && { width: '100%' },
                  ]}
                  onPress={() => handleButtonPress(btn)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.btnText,
                      isPrimary && styles.primaryBtnText,
                      isCancel && styles.cancelBtnText,
                      isDestructive && styles.destructiveBtnText,
                    ]}
                  >
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(7, 10, 17, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#0F172A',
    borderRadius: 22,
    borderWidth: 1.5,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 20,
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    marginBottom: 16,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  message: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 22,
  },
  btnRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
    justifyContent: 'center',
  },
  btnCol: {
    flexDirection: 'column',
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  destructiveBtn: {
    backgroundColor: '#EF4444',
  },
  btnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  primaryBtnText: {
    color: '#070A11',
    fontWeight: '900',
  },
  cancelBtnText: {
    color: '#94A3B8',
  },
  destructiveBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
