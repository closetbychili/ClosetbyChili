/**
 * Closet by Chilli — Checkout API client
 */

import { apiFetch } from './client';
import type { CheckoutOrder, PlaceOrderPayload } from './types';

export async function placeOrder(
  payload: PlaceOrderPayload,
  token?: string
): Promise<CheckoutOrder> {
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return apiFetch<CheckoutOrder>('/checkout/', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    cache: 'no-store',
  });
}
