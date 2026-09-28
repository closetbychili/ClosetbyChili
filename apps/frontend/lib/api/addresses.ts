/**
 * Closet by Chilli — Address API client
 */

import { apiFetch } from './client';
import type { Address, CreateAddressPayload, PaginatedResponse } from './types';

export async function getAddresses(token?: string): Promise<PaginatedResponse<Address>> {
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return apiFetch<PaginatedResponse<Address>>('/addresses/', {
    headers,
    cache: 'no-store',
  });
}

export async function getAddress(id: string, token?: string): Promise<Address> {
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return apiFetch<Address>(`/addresses/${id}/`, {
    headers,
    cache: 'no-store',
  });
}

export async function createAddress(
  payload: CreateAddressPayload,
  token?: string
): Promise<Address> {
  const sanitized = { ...payload };
  delete sanitized.user_id;
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return apiFetch<Address>('/addresses/', {
    method: 'POST',
    headers,
    body: JSON.stringify(sanitized),
    cache: 'no-store',
  });
}

export async function updateAddress(
  id: string,
  payload: Partial<CreateAddressPayload>,
  token?: string
): Promise<Address> {
  const sanitized = { ...payload };
  delete sanitized.user_id;
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return apiFetch<Address>(`/addresses/${id}/`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(sanitized),
    cache: 'no-store',
  });
}

export async function deleteAddress(id: string, token?: string): Promise<void> {
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  await apiFetch<void>(`/addresses/${id}/`, {
    method: 'DELETE',
    headers,
    cache: 'no-store',
  });
}
