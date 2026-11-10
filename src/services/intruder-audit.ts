import AsyncStorage from '@react-native-async-storage/async-storage';

export interface IntruderLogEntry {
  id: string;
  timestamp: number;
  targetPackage: string;
  appName: string;
  failedCount: number;
  triggerType: 'pin' | 'biometric' | 'breach';
}

const INTRUDER_STORAGE_KEY = '@neuroninja_intruder_logs_v1';

export async function logIntruderAttempt(
  targetPackage: string,
  appName: string,
  failedCount: number,
  triggerType: 'pin' | 'biometric' | 'breach' = 'pin'
): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(INTRUDER_STORAGE_KEY);
    const logs: IntruderLogEntry[] = raw ? JSON.parse(raw) : [];

    const newEntry: IntruderLogEntry = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      targetPackage,
      appName,
      failedCount,
      triggerType,
    };

    // Keep last 50 logs
    const updated = [newEntry, ...logs].slice(0, 50);
    await AsyncStorage.setItem(INTRUDER_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to log intruder event:', e);
  }
}

export async function getIntruderLogs(): Promise<IntruderLogEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(INTRUDER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function clearIntruderLogs(): Promise<void> {
  try {
    await AsyncStorage.removeItem(INTRUDER_STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear intruder logs:', e);
  }
}

