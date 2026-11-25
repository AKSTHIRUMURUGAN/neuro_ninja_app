import * as Contacts from 'expo-contacts/legacy';
import { Linking } from 'react-native';

export interface QuickContact {
  id: string;
  name: string;
  phone: string;
  cleanPhone: string;
  initials: string;
}

let cachedContacts: QuickContact[] | null = null;
let isPermissionGranted = false;

/**
 * Format initials from contact name (e.g. "John Doe" -> "JD")
 */
function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Normalize phone number to only digits and optional leading '+'
 */
export function normalizePhoneNumber(raw: string): string {
  if (!raw) return '';
  // Keep leading + if present, strip all other non-digits
  const hasPlus = raw.trim().startsWith('+');
  const digits = raw.replace(/\D/g, '');
  return hasPlus ? `+${digits}` : digits;
}

/**
 * Clean phone number specifically for WhatsApp wa.me links
 * WhatsApp requires country code without + or leading zeros
 */
export function getWhatsAppPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  // If 10 digits (standard Indian mobile without country code), prepend 91
  if (digits.length === 10) {
    return `91${digits}`;
  }
  return digits;
}

/**
 * Check if contacts permission is currently granted
 */
export async function isContactPermissionGranted(): Promise<boolean> {
  try {
    const { status } = await Contacts.getPermissionsAsync();
    isPermissionGranted = status === 'granted';
    return isPermissionGranted;
  } catch {
    return false;
  }
}

/**
 * Request contacts permission and pre-cache contacts in memory
 */
export async function requestContactsPermission(): Promise<boolean> {
  try {
    const { status } = await Contacts.requestPermissionsAsync();
    isPermissionGranted = status === 'granted';
    if (isPermissionGranted) {
      await initContacts();
    }
    return isPermissionGranted;
  } catch (error) {
    console.warn('Failed to request contacts permission:', error);
    return false;
  }
}

/**
 * Request contacts permission and pre-cache contacts in memory
 */
export async function initContacts(): Promise<boolean> {
  try {
    let { status } = await Contacts.getPermissionsAsync();
    if (status !== 'granted') {
      const res = await Contacts.requestPermissionsAsync();
      status = res.status;
    }
    isPermissionGranted = status === 'granted';

    if (isPermissionGranted) {
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
      });

      const list: QuickContact[] = [];
      for (const c of (data || [])) {
        const contactName =
          c.name ||
          [c.firstName, c.middleName, c.lastName].filter(Boolean).join(' ') ||
          c.nickname ||
          '';
        if (!contactName) continue;
        const primaryPhone =
          c.phoneNumbers && c.phoneNumbers.length > 0 ? (c.phoneNumbers[0]?.number || '') : '';
        if (!primaryPhone) continue;

        list.push({
          id: c.id || String(Math.random()),
          name: contactName,
          phone: primaryPhone,
          cleanPhone: normalizePhoneNumber(primaryPhone),
          initials: getInitials(contactName),
        });
      }

      // Sort alphabetically by name
      list.sort((a, b) => a.name.localeCompare(b.name));
      cachedContacts = list;
      return true;
    }
    return false;
  } catch (error) {
    console.warn('Failed to load contacts:', error);
    return false;
  }
}

/**
 * Search contacts by name or phone query
 */
export async function searchContacts(query: string): Promise<QuickContact[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  if (!cachedContacts || cachedContacts.length === 0) {
    await initContacts();
  }

  if (!cachedContacts) return [];

  const matched = cachedContacts.filter((c) => {
    return c.name.toLowerCase().includes(q) || c.cleanPhone.includes(q);
  });

  return matched.slice(0, 15); // limit to top 15 results for performance
}

/**
 * 1-Tap Quick Action Deep Links
 */
export async function callContact(phone: string): Promise<void> {
  const url = `tel:${phone}`;
  const supported = await Linking.canOpenURL(url);
  if (supported) {
    await Linking.openURL(url);
  }
}

export async function openWhatsAppChat(phone: string, text = ''): Promise<void> {
  const clean = getWhatsAppPhone(phone);
  const encodedText = encodeURIComponent(text);
  // Try whatsapp:// deep link first, then fallback to wa.me
  const appUrl = `whatsapp://send?phone=${clean}${text ? `&text=${encodedText}` : ''}`;
  const webUrl = `https://wa.me/${clean}${text ? `?text=${encodedText}` : ''}`;

  try {
    const canOpen = await Linking.canOpenURL(appUrl);
    if (canOpen) {
      await Linking.openURL(appUrl);
    } else {
      await Linking.openURL(webUrl);
    }
  } catch {
    await Linking.openURL(webUrl);
  }
}

export async function sendSmsToContact(phone: string): Promise<void> {
  const clean = normalizePhoneNumber(phone);
  const url = `sms:${clean}`;
  try {
    await Linking.openURL(url);
  } catch (e) {
    console.warn('Could not launch SMS app:', e);
  }
}
