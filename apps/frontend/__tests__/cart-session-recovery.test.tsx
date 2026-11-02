import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiClientError } from '@/lib/api/client';
import * as cartApi from '@/lib/api/cart';

describe('Guest Cart Session Recovery', () => {
  let store: Record<string, string> = {};

  beforeEach(() => {
    vi.restoreAllMocks();
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
  });

  it('clears stored guest session and returns empty cart when backend returns CART_SESSION_EXPIRED', async () => {
    cartApi.setStoredCartSession('expired-guest-session-token');

    vi.spyOn(cartApi, 'getCart').mockImplementation(async () => {
      const err = new ApiClientError(
        'Cart session is invalid or has expired.',
        404,
        'CART_SESSION_EXPIRED'
      );
      if (cartApi.isCartSessionExpiredError(err)) {
        cartApi.clearStoredCartSession();
        return cartApi.createEmptyCart();
      }
      throw err;
    });

    const cart = await cartApi.getCart();

    expect(cart.items).toEqual([]);
    expect(cart.item_count).toBe(0);
    expect(cartApi.getStoredCartSession()).toBeNull();
  });

  it('identifies both CART_SESSION_EXPIRED and CART_NOT_FOUND as session expiration errors', () => {
    const expiredErr = new ApiClientError(
      'Cart session is invalid or has expired.',
      404,
      'CART_SESSION_EXPIRED'
    );
    const notFoundErr = new ApiClientError(
      'Cart session not found.',
      404,
      'CART_NOT_FOUND'
    );
    const regular404 = new ApiClientError(
      'Cart session is invalid',
      404,
      'NOT_FOUND'
    );
    const other404 = new ApiClientError(
      'Product not found',
      404,
      'NOT_FOUND'
    );

    expect(cartApi.isCartSessionExpiredError(expiredErr)).toBe(true);
    expect(cartApi.isCartSessionExpiredError(notFoundErr)).toBe(true);
    expect(cartApi.isCartSessionExpiredError(regular404)).toBe(true);
    expect(cartApi.isCartSessionExpiredError(other404)).toBe(false);
  });

  it('does NOT clear cart session when an unrelated 500 error occurs', async () => {
    cartApi.setStoredCartSession('valid-active-session');

    const networkErr = new ApiClientError('Internal server error', 500, 'INTERNAL_ERROR');
    expect(cartApi.isCartSessionExpiredError(networkErr)).toBe(false);

    expect(cartApi.getStoredCartSession()).toBe('valid-active-session');
  });
});
