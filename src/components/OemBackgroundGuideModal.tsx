import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NinjaPalette } from '../constants/theme';
import { blockerEngine } from '../services/blocker/blocker-engine';

interface OemBackgroundGuideModalProps {
  visible: boolean;
  onClose: () => void;
}

export const OemBackgroundGuideModal: React.FC<OemBackgroundGuideModalProps> = ({
  visible,
  onClose,
}) => {
  const brand = blockerEngine.getDeviceManufacturer().toLowerCase();

  const getBrandDetails = () => {
    if (brand.includes('xiaomi') || brand.includes('redmi') || brand.includes('poco')) {
      return {
        brandName: 'Xiaomi / Redmi / Poco (MIUI / HyperOS)',
        steps: [
          '1. Enable Autostart: Security App → Permissions → Autostart → Toggle NeuroNinja ON.',
          '2. Background Popups: App Info → Other Permissions → Allow "Display pop-up windows while running in the background".',
          '3. Battery Saver: App Info → Battery Saver → Select "No restrictions".',
        ],
      };
    }
    if (brand.includes('samsung')) {
      return {
        brandName: 'Samsung (One UI)',
        steps: [
          '1. Never Sleeping Apps: Settings → Battery & Device Care → Battery → Background usage limits → Add NeuroNinja to "Never sleeping apps".',
          '2. Unrestricted Battery: Long-press NeuroNinja app icon → App Info → Battery → Select "Unrestricted".',
        ],
      };
    }
    if (brand.includes('oppo') || brand.includes('realme') || brand.includes('oneplus')) {
      return {
        brandName: 'OnePlus / Oppo / Realme (OxygenOS / ColorOS)',
        steps: [
          '1. Auto-launch: Settings → Apps → Auto-launch → Toggle NeuroNinja ON.',
          '2. Background Activity: App Info → Battery Usage → Enable "Allow background activity" & "Allow auto-launch".',
        ],
      };
    }
    if (brand.includes('vivo') || brand.includes('iqoo')) {
      return {
        brandName: 'Vivo / iQOO (Funtouch OS)',
        steps: [
          '1. High Power Mode: Settings → Battery → Background power consumption management → Set NeuroNinja to "High background power consumption".',
          '2. Autostart: Settings → Applications and Permissions → Autostart → Enable NeuroNinja.',
        ],
      };
    }
    return {
      brandName: 'Stock Android / Motorola / Pixel',
      steps: [
        '1. Unrestricted Battery: Settings → Apps → NeuroNinja → App Battery Usage → Select "Unrestricted".',
        '2. Pause App Activity: Ensure "Pause app activity if unused" is turned OFF.',
      ],
    };
  };

  const details = getBrandDetails();

  const handleOpenSettings = () => {
    blockerEngine.openAutostartSettings();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.iconBadge}>
            <MaterialCommunityIcons name="cellphone-cog" size={32} color="#60A5FA" />
          </View>

          <Text style={styles.title}>Background Protection</Text>
          <Text style={styles.subtitle}>{details.brandName}</Text>

          <Text style={styles.desc}>
            Device manufacturers often shut down background focus monitors aggressively to save battery. Follow these steps so the Dojo Shield stays alive:
          </Text>

          <ScrollView style={styles.stepsList} showsVerticalScrollIndicator={false}>
            {details.steps.map((step, index) => (
              <View key={index} style={styles.stepCard}>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={handleOpenSettings}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="cog-outline" size={18} color="#070A11" />
              <Text style={styles.actionBtnText}>Open System Manager</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: '#0F172A',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(96, 165, 250, 0.3)',
    padding: 22,
    alignItems: 'center',
  },
  iconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(96, 165, 250, 0.12)',
    borderWidth: 1.5,
    borderColor: '#60A5FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: NinjaPalette.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: '#60A5FA',
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 12,
    textAlign: 'center',
  },
  desc: {
    fontSize: 12.5,
    color: NinjaPalette.textSecondary,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 16,
  },
  stepsList: {
    width: '100%',
    marginVertical: 4,
  },
  stepCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 12,
    marginBottom: 10,
  },
  stepText: {
    fontSize: 12.5,
    color: NinjaPalette.textPrimary,
    lineHeight: 18,
  },
  actions: {
    width: '100%',
    marginTop: 16,
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#60A5FA',
    paddingVertical: 14,
    borderRadius: 14,
  },
  actionBtnText: {
    color: '#070A11',
    fontWeight: '800',
    fontSize: 14,
  },
  closeBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  closeBtnText: {
    color: NinjaPalette.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
});
