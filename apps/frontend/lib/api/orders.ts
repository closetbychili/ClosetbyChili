/**
 * Closet by Chilli — Orders API client
 */

import { apiFetch } from './client';
import type { CheckoutOrder, PaginatedResponse } from './types';

export interface OrderListItem {
  order_number: string;
  status: CheckoutOrder['status'];
  payment_status: CheckoutOrder['payment_status'];
  total: string;
  currency: string;
  created_at: string;
  item_count: number;
}

export async function getOrders(token?: string): Promise<PaginatedResponse<OrderListItem>> {
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return apiFetch<PaginatedResponse<OrderListItem>>('/orders/', {
    headers,
    cache: 'no-store',
  });
}

export async function getOrder(orderNumber: string, token?: string): Promise<CheckoutOrder> {
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return apiFetch<CheckoutOrder>(`/orders/${orderNumber}/`, {
    headers,
    cache: 'no-store',
  });
}
