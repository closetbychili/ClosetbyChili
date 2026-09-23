/**
 * Closet by Chilli — Cart API Client
 *
 * Provides typed functions for interacting with the backend Cart API.
 * Manages client-side session key persistence across browser navigation and reloads.
 */

import { apiFetch, ApiClientError } from './client';
import { supabase } from '@/lib/supabase/client';
import type {
  Cart,
  AddToCartPayload,
  UpdateCartItemPayload,
} from './types';

export const CART_SESSION_STORAGE_KEY = 'closet_cart_session';

/**
 * Retrieves the stored cart session token from localStorage or document cookies.
 */
export function getStoredCartSession(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    const localVal = localStorage.getItem(CART_SESSION_STORAGE_KEY);
    if (localVal) return localVal;

    // Fallback: parse document.cookie
    const match = document.cookie.match(
      new RegExp(`(?:^|; )${CART_SESSION_STORAGE_KEY}=([^;]*)`)
    );
    if (match) return decodeURIComponent(match[1]);

    const directMatch = document.cookie.match(/(?:^|; )cart_session=([^;]*)/);
    if (directMatch) return decodeURIComponent(directMatch[1]);
  } catch {
    // Graceful degradation if cookies or localStorage are disabled
  }

  return null;
}

/**
 * Persists the cart session key to localStorage and cookie.
 */
export function setStoredCartSession(sessionKey: string): void {
  if (typeof window === 'undefined' || !sessionKey) return;

  try {
    localStorage.setItem(CART_SESSION_STORAGE_KEY, sessionKey);
    document.cookie = `${CART_SESSION_STORAGE_KEY}=${encodeURIComponent(
      sessionKey
    )}; path=/; max-age=2592000; SameSite=Lax`;
  } catch {
    // Ignore storage write errors
  }
}

/**
 * Clears the stored cart session key upon cart expiration, merge, or logout.
 */
export function clearStoredCartSession(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(CART_SESSION_STORAGE_KEY);
    document.cookie = `${CART_SESSION_STORAGE_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
    document.cookie = `cart_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
  } catch {
    // Ignore storage removal errors
  }
}

/**
 * Generates headers for Cart API requests with session identification and optional bearer token.
 */
async function getCartHeaders(token?: string): Promise<HeadersInit> {
  const headers: Record<string, string> = {};
  const session = getStoredCartSession();
  if (session) {
    headers['X-Cart-Session'] = session;
  }

  let accessToken = token;
  if (!accessToken && typeof window !== 'undefined') {
    try {
      const { data } = await supabase.auth.getSession();
      accessToken = data.session?.access_token;
    } catch {
      // Graceful fallback if supabase is uninitialized or in isolated test
    }
  }

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  return headers;
}

/**
 * Syncs session token returned from backend responses.
 */
function handleCartResponse(cart: Cart): Cart {
  if (cart?.session_key) {
    setStoredCartSession(cart.session_key);
  }
  return cart;
}

/**
 * Empty cart fallback structure.
 */
export function createEmptyCart(): Cart {
  return {
    id: null,
    user_id: null,
    session_key: null,
    items: [],
    item_count: 0,
    subtotal: '0.00',
    is_active: true,
    created_at: null,
    updated_at: null,
  };
}

/**
 * Fetches the active cart for the current session or authenticated user.
 */
export async function getCart(token?: string): Promise<Cart> {
  try {
    const res = await apiFetch<Cart>('/cart/', {
      headers: await getCartHeaders(token),
      cache: 'no-store',
    });
    return handleCartResponse(res);
  } catch (err) {
    if (err instanceof ApiClientError && (err.status === 404 || err.code === 'CART_NOT_FOUND')) {
      clearStoredCartSession();
      return createEmptyCart();
    }
    throw err;
  }
}

/**
 * Adds an item to the active cart.
 */
export async function addToCart(
  payload: AddToCartPayload,
  token?: string
): Promise<Cart> {
  const res = await apiFetch<Cart>('/cart/items/', {
    method: 'POST',
    headers: await getCartHeaders(token),
    body: JSON.stringify(payload),
    cache: 'no-store',
  });
  return handleCartResponse(res);
}

/**
 * Updates the quantity of an existing cart line item.
 */
export async function updateCartItem(
  itemId: string,
  payload: UpdateCartItemPayload,
  token?: string
): Promise<Cart> {
  const res = await apiFetch<Cart>(`/cart/items/${itemId}/`, {
    method: 'PATCH',
    headers: await getCartHeaders(token),
    body: JSON.stringify(payload),
    cache: 'no-store',
  });
  return handleCartResponse(res);
}

/**
 * Removes a line item from the cart.
 */
export async function removeCartItem(
  itemId: string,
  token?: string
): Promise<Cart> {
  const res = await apiFetch<Cart>(`/cart/items/${itemId}/`, {
    method: 'DELETE',
    headers: await getCartHeaders(token),
    cache: 'no-store',
  });
  return handleCartResponse(res);
}

/**
 * Clears all items from the current cart.
 */
export async function clearCart(token?: string): Promise<Cart> {
  const res = await apiFetch<Cart>('/cart/', {
    method: 'DELETE',
    headers: await getCartHeaders(token),
    cache: 'no-store',
  });
  return handleCartResponse(res);
}

/**
 * Merges the current guest cart into the authenticated customer's cart.
 */
export async function mergeCart(token?: string): Promise<Cart> {
  const headers = await getCartHeaders(token);
  const session = getStoredCartSession();
  const body = session
    ? JSON.stringify({ guest_session_key: session })
    : JSON.stringify({});

  const res = await apiFetch<Cart>('/cart/merge/', {
    method: 'POST',
    headers,
    body,
    cache: 'no-store',
  });

  clearStoredCartSession();
  return handleCartResponse(res);
}
