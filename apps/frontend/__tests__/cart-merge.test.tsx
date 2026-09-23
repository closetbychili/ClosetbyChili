import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import React, { useState } from 'react';
import { CartProvider, useCart } from '@/components/CartContext';
import * as cartApi from '@/lib/api/cart';
import type { Cart } from '@/lib/api/types';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import type { CurrentUser } from '@/lib/api/auth';

// Dynamic auth mock controller
let currentAuth: {
  user: CurrentUser | null;
  session: Session | null;
  supabaseUser: SupabaseUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
} = {
  user: null,
  session: null,
  supabaseUser: null,
  loading: false,
  signOut: vi.fn(async () => {}),
  refreshUser: vi.fn(async () => {}),
};

vi.mock('@/components/AuthProvider', () => ({
  useAuth: () => currentAuth,
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockMergedCart: Cart = {
  id: 'user-cart-merged-1',
  user_id: 'user-123',
  session_key: null,
  items: [
    {
      id: 'item-1',
      variant: {
        id: 'var-1',
        sku: 'CHK-ANAR-S',
        size: 'S',
        color: 'Emerald',
        retail_price: '4500.00',
        product: {
          id: 'prod-1',
          name: 'Chanderi Maxi Dress',
          slug: 'chanderi-maxi-dress',
        },
      },
      quantity: 3,
      unit_price: '4500.00',
      line_total: '13500.00',
      created_at: '2026-09-09T00:00:00Z',
      updated_at: '2026-09-09T00:00:00Z',
    },
  ],
  item_count: 3,
  subtotal: '13500.00',
  is_active: true,
  created_at: '2026-09-09T00:00:00Z',
  updated_at: '2026-09-09T00:00:00Z',
};

function TestCartConsumer() {
  const { cart, itemCount, subtotal } = useCart();
  return (
    <div>
      <span data-testid="cart-id">{cart?.id || 'no-cart'}</span>
      <span data-testid="item-count">{itemCount}</span>
      <span data-testid="subtotal">{subtotal}</span>
    </div>
  );
}

describe('Cart Merge & Auth Lifecycle Integration', () => {
  let localStorageStore: Record<string, string> = {};

  beforeEach(() => {
    localStorageStore = {};
    const storageMock = {
      getItem: vi.fn((key: string) => localStorageStore[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        localStorageStore[key] = value.toString();
      }),
      removeItem: vi.fn((key: string) => {
        delete localStorageStore[key];
      }),
      clear: vi.fn(() => {
        localStorageStore = {};
      }),
    };
    Object.defineProperty(window, 'localStorage', {
      value: storageMock,
      writable: true,
      configurable: true,
    });

    currentAuth = {
      user: null,
      session: null,
      supabaseUser: null,
      loading: false,
      signOut: vi.fn(async () => {}),
      refreshUser: vi.fn(async () => {}),
    };

    vi.restoreAllMocks();
  });

  afterEach(() => {
    cartApi.clearStoredCartSession();
  });

  it('triggers merge exactly once when guest cart exists upon login', async () => {
    cartApi.setStoredCartSession('guest-session-prelogin');
    const mergeSpy = vi.spyOn(cartApi, 'mergeCart').mockResolvedValue(mockMergedCart);

    const { rerender } = render(
      <CartProvider>
        <TestCartConsumer />
      </CartProvider>
    );

    // Simulate user login event
    await act(async () => {
      currentAuth = {
        ...currentAuth,
        user: {
          id: 'user-123',
          supabase_user_id: 'sb-123',
          email: 'user@example.com',
          role: 'customer',
          profile: { display_name: 'Test', phone: '' },
          created_at: '2026-09-01T00:00:00Z',
          updated_at: '2026-09-01T00:00:00Z',
        },
        session: {
          access_token: 'auth-jwt-token-xyz',
          user: { id: 'sb-123', email: 'user@example.com' },
        } as unknown as Session,
      };
      rerender(
        <CartProvider>
          <TestCartConsumer />
        </CartProvider>
      );
    });

    await waitFor(() => {
      expect(mergeSpy).toHaveBeenCalledTimes(1);
      expect(mergeSpy).toHaveBeenCalledWith('auth-jwt-token-xyz');
    });

    await waitFor(() => {
      expect(screen.getByTestId('cart-id').textContent).toBe('user-cart-merged-1');
      expect(screen.getByTestId('item-count').textContent).toBe('3');
      expect(screen.getByTestId('subtotal').textContent).toBe('13500.00');
    });

    // Simulate subsequent re-render with identical auth token
    rerender(
      <CartProvider>
        <TestCartConsumer />
      </CartProvider>
    );

    // Merge must NOT be called again
    expect(mergeSpy).toHaveBeenCalledTimes(1);
  });

  it('does not trigger merge when logging in without a guest cart session', async () => {
    const mergeSpy = vi.spyOn(cartApi, 'mergeCart');
    const getCartSpy = vi.spyOn(cartApi, 'getCart').mockResolvedValue(mockMergedCart);

    const { rerender } = render(
      <CartProvider>
        <TestCartConsumer />
      </CartProvider>
    );

    // User logs in with no prior guest session in storage
    await act(async () => {
      currentAuth = {
        ...currentAuth,
        user: {
          id: 'user-123',
          supabase_user_id: 'sb-123',
          email: 'user@example.com',
          role: 'customer',
          profile: { display_name: 'Test', phone: '' },
          created_at: '2026-09-01T00:00:00Z',
          updated_at: '2026-09-01T00:00:00Z',
        },
        session: {
          access_token: 'auth-token-no-guest',
          user: { id: 'sb-123', email: 'user@example.com' },
        } as unknown as Session,
      };
      rerender(
        <CartProvider>
          <TestCartConsumer />
        </CartProvider>
      );
    });

    await waitFor(() => {
      expect(getCartSpy).toHaveBeenCalledWith('auth-token-no-guest');
    });

    expect(mergeSpy).not.toHaveBeenCalled();
  });

  it('resets cart to empty and does not trigger merge upon logout', async () => {
    const mergeSpy = vi.spyOn(cartApi, 'mergeCart');
    vi.spyOn(cartApi, 'getCart').mockResolvedValue(mockMergedCart);

    // Start in logged in state
    currentAuth = {
      ...currentAuth,
      user: {
        id: 'user-123',
        supabase_user_id: 'sb-123',
        email: 'user@example.com',
        role: 'customer',
        profile: { display_name: 'Test', phone: '' },
        created_at: '2026-09-01T00:00:00Z',
        updated_at: '2026-09-01T00:00:00Z',
      },
      session: {
        access_token: 'active-token-logout-test',
        user: { id: 'sb-123', email: 'user@example.com' },
      } as unknown as Session,
    };

    const { rerender } = render(
      <CartProvider>
        <TestCartConsumer />
      </CartProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('cart-id').textContent).toBe('user-cart-merged-1');
    });

    // Simulate logout
    await act(async () => {
      currentAuth = {
        ...currentAuth,
        user: null,
        session: null,
      };
      rerender(
        <CartProvider>
          <TestCartConsumer />
        </CartProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('cart-id').textContent).toBe('no-cart');
      expect(screen.getByTestId('item-count').textContent).toBe('0');
      expect(screen.getByTestId('subtotal').textContent).toBe('0.00');
    });

    expect(mergeSpy).not.toHaveBeenCalled();
    expect(cartApi.getStoredCartSession()).toBeNull();
  });
});
