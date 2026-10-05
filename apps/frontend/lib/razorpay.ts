/**
 * Closet by Chilli — Razorpay Browser Checkout Helper
 */

import type { RazorpayOrderSession, VerifyPaymentPayload } from './api/types';

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

export interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  image?: string;
  order_id: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
  handler: (response: RazorpayResponse) => void;
  modal?: {
    ondismiss?: () => void;
    escape?: boolean;
    animation?: boolean;
  };
}

export interface RazorpayInstance {
  open: () => void;
  close?: () => void;
  on: (event: string, handler: (data: unknown) => void) => void;
}

const SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';
let scriptLoadingPromise: Promise<boolean> | null = null;
let isCheckoutOpen = false;

/**
 * Safely and idempotently load the Razorpay checkout.js script.
 */
export function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === 'undefined') {
    return Promise.resolve(false);
  }

  if (window.Razorpay) {
    return Promise.resolve(true);
  }

  if (scriptLoadingPromise) {
    return scriptLoadingPromise;
  }

  scriptLoadingPromise = new Promise<boolean>((resolve) => {
    const existing = document.querySelector(`script[src="${SCRIPT_URL}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(true), { once: true });
      existing.addEventListener('error', () => resolve(false), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      scriptLoadingPromise = null;
      resolve(false);
    };

    document.body.appendChild(script);
  });

  return scriptLoadingPromise;
}

export interface LaunchRazorpayCheckoutParams {
  session: RazorpayOrderSession;
  user?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  onSuccess: (payment: VerifyPaymentPayload) => Promise<void> | void;
  onFailure?: (error: { code?: string; description?: string }) => void;
  onDismiss?: () => void;
}

/**
 * Open the Razorpay Standard Checkout popup.
 * Guards against multiple simultaneous launches.
 */
export async function launchRazorpayCheckout({
  session,
  user,
  onSuccess,
  onFailure,
  onDismiss,
}: LaunchRazorpayCheckoutParams): Promise<boolean> {
  if (isCheckoutOpen) {
    return false;
  }

  const loaded = await loadRazorpayScript();
  if (!loaded || !window.Razorpay) {
    throw new Error('Could not load payment checkout script. Please check your internet connection.');
  }

  isCheckoutOpen = true;

  const options: RazorpayOptions = {
    key: session.key_id,
    amount: session.amount,
    currency: session.currency,
    name: 'Closet by Chilli',
    description: `Order #${session.order_number}`,
    order_id: session.razorpay_order_id,
    prefill: {
      name: user?.name || '',
      email: user?.email || '',
      contact: user?.phone || '',
    },
    theme: {
      color: '#8b000a',
    },
    handler: async (response: RazorpayResponse) => {
      isCheckoutOpen = false;
      await onSuccess({
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature,
      });
    },
    modal: {
      ondismiss: () => {
        isCheckoutOpen = false;
        onDismiss?.();
      },
    },
  };

  const instance = new window.Razorpay(options);

  if (onFailure) {
    instance.on('payment.failed', (resp: unknown) => {
      isCheckoutOpen = false;
      const errorObj = (resp as { error?: { code?: string; description?: string } })?.error;
      onFailure({
        code: errorObj?.code,
        description: errorObj?.description || 'Payment was declined or cancelled.',
      });
    });
  }

  instance.open();
  return true;
}

/**
 * For test resets.
 */
export function resetCheckoutState(): void {
  isCheckoutOpen = false;
  scriptLoadingPromise = null;
}
