import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  loadRazorpayScript,
  launchRazorpayCheckout,
  resetCheckoutState,
  type RazorpayOptions,
} from '@/lib/razorpay';
import type { RazorpayOrderSession } from '@/lib/api/types';

describe('Razorpay Browser Integration', () => {
  const mockSession: RazorpayOrderSession = {
    razorpay_order_id: 'order_test_12345',
    key_id: 'rzp_test_key_abc',
    amount: 900000,
    currency: 'INR',
    order_number: 'CBC-2026-000001',
  };

  beforeEach(() => {
    resetCheckoutState();
    delete (window as any).Razorpay;
    document.querySelectorAll('script[src*="checkout.razorpay.com"]').forEach((s) => s.remove());
  });

  afterEach(() => {
    resetCheckoutState();
  });

  describe('loadRazorpayScript', () => {
    it('returns true immediately if window.Razorpay already exists', async () => {
      (window as any).Razorpay = vi.fn();
      const loaded = await loadRazorpayScript();
      expect(loaded).toBe(true);
    });

    it('injects script tag and resolves true when loaded', async () => {
      const promise = loadRazorpayScript();

      const script = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]') as HTMLScriptElement;
      expect(script).toBeTruthy();

      (window as any).Razorpay = vi.fn();
      script.onload?.(new Event('load'));

      const result = await promise;
      expect(result).toBe(true);
    });

    it('resolves false if the script tag triggers an error', async () => {
      const promise = loadRazorpayScript();

      const script = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]') as HTMLScriptElement;
      expect(script).toBeTruthy();

      script.onerror?.(new Event('error'));

      const result = await promise;
      expect(result).toBe(false);
    });
  });

  describe('launchRazorpayCheckout', () => {
    it('opens Razorpay with correct options without exposing secrets', async () => {
      let capturedOptions: RazorpayOptions | null = null;
      const mockOpen = vi.fn();
      const mockOn = vi.fn();

      (window as any).Razorpay = vi.fn().mockImplementation(function (this: any, options: RazorpayOptions) {
        capturedOptions = options;
        return {
          open: mockOpen,
          on: mockOn,
        };
      });

      const onSuccess = vi.fn();
      const onDismiss = vi.fn();

      const launched = await launchRazorpayCheckout({
        session: mockSession,
        user: { name: 'Aisha Khan', email: 'aisha@example.com', phone: '9876543210' },
        onSuccess,
        onDismiss,
      });

      expect(launched).toBe(true);
      expect(mockOpen).toHaveBeenCalled();
      expect(capturedOptions).toBeTruthy();
      expect(capturedOptions!.key).toBe('rzp_test_key_abc');
      expect(capturedOptions!.order_id).toBe('order_test_12345');
      expect(capturedOptions!.amount).toBe(900000);
      expect(capturedOptions!.currency).toBe('INR');
      expect(capturedOptions!.prefill?.email).toBe('aisha@example.com');

      // Verify no secrets exist in options
      expect((capturedOptions as any).key_secret).toBeUndefined();
      expect((capturedOptions as any).secret).toBeUndefined();
    });

    it('triggers onSuccess callback when handler is called', async () => {
      let capturedOptions: RazorpayOptions | null = null;

      (window as any).Razorpay = vi.fn().mockImplementation(function (this: any, options: RazorpayOptions) {
        capturedOptions = options;
        return {
          open: vi.fn(),
          on: vi.fn(),
        };
      });

      const onSuccess = vi.fn();

      await launchRazorpayCheckout({
        session: mockSession,
        onSuccess,
      });

      capturedOptions!.handler({
        razorpay_order_id: 'order_test_12345',
        razorpay_payment_id: 'pay_test_99999',
        razorpay_signature: 'sig_valid_123',
      });

      expect(onSuccess).toHaveBeenCalledWith({
        razorpay_order_id: 'order_test_12345',
        razorpay_payment_id: 'pay_test_99999',
        razorpay_signature: 'sig_valid_123',
      });
    });

    it('triggers onDismiss callback when modal is closed', async () => {
      let capturedOptions: RazorpayOptions | null = null;

      (window as any).Razorpay = vi.fn().mockImplementation(function (this: any, options: RazorpayOptions) {
        capturedOptions = options;
        return {
          open: vi.fn(),
          on: vi.fn(),
        };
      });

      const onDismiss = vi.fn();

      await launchRazorpayCheckout({
        session: mockSession,
        onSuccess: vi.fn(),
        onDismiss,
      });

      capturedOptions!.modal?.ondismiss?.();
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('triggers onFailure callback on payment.failed event', async () => {
      const eventHandlers: Record<string, (data: any) => void> = {};

      (window as any).Razorpay = vi.fn().mockImplementation(function (this: any) {
        return {
          open: vi.fn(),
          on: (event: string, handler: (data: any) => void) => {
            eventHandlers[event] = handler;
          },
        };
      });

      const onFailure = vi.fn();

      await launchRazorpayCheckout({
        session: mockSession,
        onSuccess: vi.fn(),
        onFailure,
      });

      expect(eventHandlers['payment.failed']).toBeTruthy();
      eventHandlers['payment.failed']({
        error: {
          code: 'BAD_REQUEST_ERROR',
          description: 'Payment was declined by bank',
        },
      });

      expect(onFailure).toHaveBeenCalledWith({
        code: 'BAD_REQUEST_ERROR',
        description: 'Payment was declined by bank',
      });
    });

    it('prevents multiple simultaneous checkout launches', async () => {
      (window as any).Razorpay = vi.fn().mockImplementation(function (this: any) {
        return {
          open: vi.fn(),
          on: vi.fn(),
        };
      });

      const first = await launchRazorpayCheckout({
        session: mockSession,
        onSuccess: vi.fn(),
      });
      expect(first).toBe(true);

      const second = await launchRazorpayCheckout({
        session: mockSession,
        onSuccess: vi.fn(),
      });
      expect(second).toBe(false);
    });
  });
});
