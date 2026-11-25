import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { syncEngine } from '../sync/sync-engine';

export interface DepositResult {
  success: boolean;
  amount?: number;
  paymentId?: string;
  orderId?: string;
  error?: string;
  cancelled?: boolean;
}

/**
 * Open Razorpay Standard Checkout in secure CustomTab/In-App Browser
 */
export async function openRazorpayDeposit(amountRupees: number): Promise<DepositResult> {
  try {
    const baseUrl = await syncEngine.getApiUrl();
    const token = await syncEngine.getAuthToken();

    const redirectUri = Linking.createURL('wallet/callback');
    const checkoutUrl = `${baseUrl}/checkout?amount=${amountRupees}&redirect=${encodeURIComponent(redirectUri)}${
      token ? `&token=${encodeURIComponent(token)}` : ''
    }`;

    console.log('[RazorpayCheckout] Launching checkout URL:', checkoutUrl);

    // Open in secure browser session with automatic redirect handling
    const result = await WebBrowser.openAuthSessionAsync(checkoutUrl, redirectUri);

    if (result.type === 'success' && result.url) {
      const parsed = Linking.parse(result.url);
      const queryParams = parsed.queryParams || {};

      const status = queryParams.status;
      if (status === 'success') {
        const paymentId = (queryParams.paymentId as string) || '';
        const orderId = (queryParams.orderId as string) || '';
        return {
          success: true,
          amount: amountRupees,
          paymentId,
          orderId,
        };
      } else if (status === 'cancelled') {
        return {
          success: false,
          cancelled: true,
        };
      } else {
        const err = (queryParams.error as string) || 'Payment verification failed';
        return {
          success: false,
          error: err,
        };
      }
    }

    if (result.type === 'cancel' || result.type === 'dismiss') {
      return {
        success: false,
        cancelled: true,
      };
    }

    return {
      success: false,
      error: 'Checkout was closed before completion',
    };
  } catch (err: any) {
    console.error('[RazorpayCheckout] Error launching checkout:', err);
    return {
      success: false,
      error: err.message || 'Failed to initiate Razorpay checkout',
    };
  }
}
