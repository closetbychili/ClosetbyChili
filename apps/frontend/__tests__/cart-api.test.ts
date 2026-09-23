import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  mergeCart,
  getStoredCartSession,
  setStoredCartSession,
  clearStoredCartSession,
  CART_SESSION_STORAGE_KEY,
} from '@/lib/api/cart';
import type { Cart } from '@/lib/api/types';

describe('Cart API Client', () => {
  const mockCart: Cart = {
    id: 'cart-123',
    session_key: 'session-token-xyz',
    items: [
      {
        id: 'item-1',
        variant: {
          id: 'var-1',
          sku: 'CHK-ANAR-S',
          size: 'S',
          color: 'Crimson',
          retail_price: '2999.00',
          product: {
            id: 'prod-1',
            name: 'Silk Anarkali',
            slug: 'silk-anarkali',
            category_name: 'Kurtis',
            category_slug: 'kurtis',
          },
        },
        quantity: 2,
        unit_price: '2999.00',
        line_total: '5998.00',
        created_at: '2026-09-09T00:00:00Z',
        updated_at: '2026-09-09T00:00:00Z',
      },
    ],
    item_count: 2,
    subtotal: '5998.00',
    is_active: true,
    created_at: '2026-09-09T00:00:00Z',
    updated_at: '2026-09-09T00:00:00Z',
  };

  let store: Record<string, string> = {};

  beforeEach(() => {
    store = {};
    const storageMock = {
      getItem: vi.fn((key: string) => store[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value.toString();
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        store = {};
      }),
    };
    Object.defineProperty(window, 'localStorage', {
      value: storageMock,
      writable: true,
      configurable: true,
    });
    vi.restoreAllMocks();
  });

  afterEach(() => {
    clearStoredCartSession();
  });

  describe('Session Persistence', () => {
    it('stores and retrieves session token from localStorage', () => {
      expect(getStoredCartSession()).toBeNull();
      setStoredCartSession('my-test-token');
      expect(getStoredCartSession()).toBe('my-test-token');
      expect(localStorage.getItem(CART_SESSION_STORAGE_KEY)).toBe('my-test-token');
    });

    it('clears session token', () => {
      setStoredCartSession('my-test-token');
      clearStoredCartSession();
      expect(getStoredCartSession()).toBeNull();
      expect(localStorage.getItem(CART_SESSION_STORAGE_KEY)).toBeNull();
    });
  });

  describe('API Methods', () => {
    it('getCart fetches cart and stores session key', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockCart,
      } as Response);

      const cart = await getCart();
      expect(cart.id).toBe('cart-123');
      expect(cart.item_count).toBe(2);
      expect(cart.subtotal).toBe('5998.00');
      expect(getStoredCartSession()).toBe('session-token-xyz');
    });

    it('addToCart sends POST request with variant_id and quantity', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => mockCart,
      } as Response);

      const cart = await addToCart({ variant_id: 'var-1', quantity: 2 });
      expect(cart.items).toHaveLength(1);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/cart/items/'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ variant_id: 'var-1', quantity: 2 }),
        })
      );
    });

    it('updateCartItem sends PATCH request with new quantity', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ ...mockCart, item_count: 5 }),
      } as Response);

      const cart = await updateCartItem('item-1', { quantity: 5 });
      expect(cart.item_count).toBe(5);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/cart/items/item-1/'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ quantity: 5 }),
        })
      );
    });

    it('removeCartItem sends DELETE request for specific item', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ ...mockCart, items: [], item_count: 0, subtotal: '0.00' }),
      } as Response);

      const cart = await removeCartItem('item-1');
      expect(cart.items).toHaveLength(0);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/cart/items/item-1/'),
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });

    it('clearCart sends DELETE request to /cart/ root', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ ...mockCart, items: [], item_count: 0, subtotal: '0.00' }),
      } as Response);

      const cart = await clearCart();
      expect(cart.items).toHaveLength(0);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/cart/'),
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });

    it('mergeCart sends POST request to /cart/merge/ with auth header and clears guest session', async () => {
      setStoredCartSession('guest-to-merge-123');

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ ...mockCart, session_key: null, user_id: 'user-456' }),
      } as Response);

      const cart = await mergeCart('test-auth-token');
      expect(cart.user_id).toBe('user-456');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/cart/merge/'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-auth-token',
            'X-Cart-Session': 'guest-to-merge-123',
          }),
          body: JSON.stringify({ guest_session_key: 'guest-to-merge-123' }),
        })
      );

      // Guest session must be cleared after merge
      expect(getStoredCartSession()).toBeNull();
    });
  });
});
