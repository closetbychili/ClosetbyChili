/**
 * Closet by Chilli — Razorpay Payments API client
 */

import { apiFetch } from './client';
import type { CheckoutOrder, RazorpayOrderSession, VerifyPaymentPayload } from './types';

export async function createRazorpayOrder(
  orderNumber: string,
  token?: string
): Promise<RazorpayOrderSession> {
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return apiFetch<RazorpayOrderSession>('/payments/razorpay/create-order/', {
    method: 'POST',
    headers,
    body: JSON.stringify({ order_number: orderNumber }),
    cache: 'no-store',
  });
}

export async function verifyRazorpayPayment(
  payload: VerifyPaymentPayload,
  token?: string
): Promise<CheckoutOrder> {
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return apiFetch<CheckoutOrder>('/payments/razorpay/verify/', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    cache: 'no-store',
  });
}
