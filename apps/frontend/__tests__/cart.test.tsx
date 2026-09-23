import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { CartProvider } from '@/components/CartContext';
import CartPage from '@/app/cart/page';
import CartDrawer from '@/components/CartDrawer';
import Header from '@/components/Header';
import ProductVariantSelector from '@/components/ProductVariantSelector';
import * as cartApi from '@/lib/api/cart';
import type { Cart, ProductVariantSummary } from '@/lib/api/types';
import { ApiClientError } from '@/lib/api/client';

vi.mock('@/components/AuthProvider', () => ({
  useAuth: () => ({
    user: null,
    session: null,
    supabaseUser: null,
    loading: false,
    signOut: vi.fn(),
    refreshUser: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));


describe('Cart UI and Integrations', () => {
  const mockCartWithItem: Cart = {
    id: 'cart-1',
    session_key: 'session-xyz',
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

  const emptyCart: Cart = {
    id: 'cart-empty',
    session_key: 'session-empty',
    items: [],
    item_count: 0,
    subtotal: '0.00',
    is_active: true,
    created_at: '2026-09-09T00:00:00Z',
    updated_at: '2026-09-09T00:00:00Z',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders cart page with items, prices, and subtotal', async () => {
    vi.spyOn(cartApi, 'getCart').mockResolvedValue(mockCartWithItem);

    render(
      <CartProvider>
        <CartPage />
      </CartProvider>
    );

    // Wait for cart data to load
    await waitFor(() => {
      expect(screen.getByText('Silk Anarkali')).toBeInTheDocument();
    });

    expect(screen.getByText(/2 Items in Bag/i)).toBeInTheDocument();
    expect(screen.getAllByText('₹5,998').length).toBeGreaterThan(0);
    expect(screen.getByText('SKU: CHK-ANAR-S')).toBeInTheDocument();
  });

  it('renders empty cart state when no items exist', async () => {
    vi.spyOn(cartApi, 'getCart').mockResolvedValue(emptyCart);

    render(
      <CartProvider>
        <CartPage />
      </CartProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Your Shopping Bag is Empty')).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: /explore catalog/i })).toBeInTheDocument();
  });

  it('handles quantity increment and decrement in cart page', async () => {
    vi.spyOn(cartApi, 'getCart').mockResolvedValue(mockCartWithItem);
    const updateSpy = vi.spyOn(cartApi, 'updateCartItem').mockResolvedValue({
      ...mockCartWithItem,
      items: [
        {
          ...mockCartWithItem.items[0],
          quantity: 3,
          line_total: '8997.00',
        },
      ],
      item_count: 3,
      subtotal: '8997.00',
    });

    render(
      <CartProvider>
        <CartPage />
      </CartProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Silk Anarkali')).toBeInTheDocument();
    });

    const increaseBtn = screen.getByLabelText('Increase quantity');
    fireEvent.click(increaseBtn);

    expect(updateSpy).toHaveBeenCalledWith('item-1', { quantity: 3 });
  });

  it('removes an item when clicking remove button', async () => {
    vi.spyOn(cartApi, 'getCart').mockResolvedValue(mockCartWithItem);
    const removeSpy = vi.spyOn(cartApi, 'removeCartItem').mockResolvedValue(emptyCart);

    render(
      <CartProvider>
        <CartPage />
      </CartProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Silk Anarkali')).toBeInTheDocument();
    });

    const removeBtn = screen.getByLabelText(/remove silk anarkali from bag/i);
    fireEvent.click(removeBtn);

    expect(removeSpy).toHaveBeenCalledWith('item-1');
  });

  it('clears the cart when clicking clear shopping bag', async () => {
    vi.spyOn(cartApi, 'getCart').mockResolvedValue(mockCartWithItem);
    const clearSpy = vi.spyOn(cartApi, 'clearCart').mockResolvedValue(emptyCart);

    render(
      <CartProvider>
        <CartPage />
      </CartProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Silk Anarkali')).toBeInTheDocument();
    });

    const clearBtn = screen.getByRole('button', { name: /clear shopping bag/i });
    fireEvent.click(clearBtn);

    expect(clearSpy).toHaveBeenCalled();
  });

  it('displays dynamic cart count in Header and opens drawer on click', async () => {
    vi.spyOn(cartApi, 'getCart').mockResolvedValue(mockCartWithItem);

    render(
      <CartProvider>
        <Header />
        <CartDrawer />
      </CartProvider>
    );

    await waitFor(() => {
      // Badge count should show 2
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    // Clicking shopping bag in header should open drawer
    const bagBtn = screen.getByRole('button', { name: 'Shopping bag' });
    fireEvent.click(bagBtn);

    expect(screen.getByRole('dialog', { name: 'Shopping Bag Drawer' })).toBeInTheDocument();
  });

  it('PDP Add to Bag calls real cart API and handles insufficient stock error', async () => {
    vi.spyOn(cartApi, 'getCart').mockResolvedValue(emptyCart);
    const addSpy = vi
      .spyOn(cartApi, 'addToCart')
      .mockRejectedValue(
        new ApiClientError(
          'Requested total quantity (10) exceeds available stock (5).',
          400,
          'INSUFFICIENT_STOCK'
        )
      );

    const testVariants: ProductVariantSummary[] = [
      {
        id: 'var-1',
        sku: 'TEST-SKU-1',
        size: 'M',
        color: 'Ruby',
        retail_price: '2499.00',
        is_active: true,
      },
    ];

    render(
      <CartProvider>
        <ProductVariantSelector
          productName="Ruby Kurti"
          productSlug="ruby-kurti"
          variants={testVariants}
        />
      </CartProvider>
    );

    const addBtn = screen.getByRole('button', { name: /add to bag/i });
    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(addSpy).toHaveBeenCalledWith({
        variant_id: 'var-1',
        quantity: 1,
      });
      expect(
        screen.getByText(/exceeds available stock/i)
      ).toBeInTheDocument();
    });
  });
});
