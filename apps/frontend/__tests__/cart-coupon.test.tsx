import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { CartProvider } from '@/components/CartContext';
import CartPage from '@/app/cart/page';
import CheckoutPage from '@/app/checkout/page';
import * as cartApi from '@/lib/api/cart';
import * as checkoutApi from '@/lib/api/checkout';
import * as addressApi from '@/lib/api/addresses';
import type { Cart, CheckoutOrder, Address } from '@/lib/api/types';
import { ApiClientError } from '@/lib/api/client';

// Mock useRouter
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// Mock AuthProvider
vi.mock('@/components/AuthProvider', () => ({
  useAuth: () => ({
    user: { id: 'usr-1', email: 'muse@closetbychili.com', profile: { display_name: 'Muse' } },
    session: { access_token: 'fake-jwt-token' },
    supabaseUser: null,
    loading: false,
    signOut: vi.fn(),
    refreshUser: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe('Cart and Checkout Coupon Integration', () => {
  const mockCartWithoutCoupon: Cart = {
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
          retail_price: '2000.00',
          product: {
            id: 'prod-1',
            name: 'Silk Anarkali',
            slug: 'silk-anarkali',
            category_name: 'Kurtis',
            category_slug: 'kurtis',
          },
        },
        quantity: 1,
        unit_price: '2000.00',
        line_total: '2000.00',
        created_at: '2026-09-09T00:00:00Z',
        updated_at: '2026-09-09T00:00:00Z',
      },
    ],
    item_count: 1,
    subtotal: '2000.00',
    discount: '0.00',
    total: '2000.00',
    coupon_code: '',
    is_active: true,
    created_at: '2026-09-09T00:00:00Z',
    updated_at: '2026-09-09T00:00:00Z',
  };

  const mockCartWithCoupon: Cart = {
    ...mockCartWithoutCoupon,
    discount: '200.00',
    total: '1800.00',
    coupon_code: 'FESTIVE10',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(cartApi, 'getStoredCartSession').mockReturnValue(null);
  });

  describe('Cart Page Coupon Flows', () => {
    it('applies coupon successfully and displays server discount and total', async () => {
      vi.spyOn(cartApi, 'getCart').mockResolvedValue(mockCartWithoutCoupon);
      const applySpy = vi.spyOn(cartApi, 'applyCartCoupon').mockResolvedValue(mockCartWithCoupon);

      render(
        <CartProvider>
          <CartPage />
        </CartProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Silk Anarkali')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('ENTER CODE');
      fireEvent.change(input, { target: { value: 'festive10' } });

      const applyBtn = screen.getByRole('button', { name: /apply/i });
      fireEvent.click(applyBtn);

      await waitFor(() => {
        expect(applySpy).toHaveBeenCalledWith('FESTIVE10', 'fake-jwt-token');
      });

      // Verify coupon badge and savings display
      await waitFor(() => {
        expect(screen.getByText(/Voucher Savings \(FESTIVE10\)/i)).toBeInTheDocument();
        expect(screen.getByText('-₹200')).toBeInTheDocument();
        expect(screen.getByText('₹1,800')).toBeInTheDocument();
      });
    });

    it('shows error message when coupon application fails', async () => {
      vi.spyOn(cartApi, 'getCart').mockResolvedValue(mockCartWithoutCoupon);
      vi.spyOn(cartApi, 'applyCartCoupon').mockRejectedValue(
        new ApiClientError('Coupon is expired or inactive.', 400, 'COUPON_INACTIVE')
      );

      render(
        <CartProvider>
          <CartPage />
        </CartProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Silk Anarkali')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('ENTER CODE');
      fireEvent.change(input, { target: { value: 'EXPIRED20' } });

      const applyBtn = screen.getByRole('button', { name: /apply/i });
      fireEvent.click(applyBtn);

      await waitFor(() => {
        expect(screen.getAllByText(/Coupon is expired or inactive/i).length).toBeGreaterThan(0);
      });
    });

    it('removes applied coupon when Remove is clicked', async () => {
      vi.spyOn(cartApi, 'getCart').mockResolvedValue(mockCartWithCoupon);
      const removeSpy = vi.spyOn(cartApi, 'removeCartCoupon').mockResolvedValue(mockCartWithoutCoupon);

      render(
        <CartProvider>
          <CartPage />
        </CartProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Voucher Savings \(FESTIVE10\)/i)).toBeInTheDocument();
      });

      const removeBtn = screen.getByRole('button', { name: 'Remove coupon' });
      fireEvent.click(removeBtn);

      await waitFor(() => {
        expect(removeSpy).toHaveBeenCalledWith('fake-jwt-token');
      });

      await waitFor(() => {
        expect(screen.queryByText(/Voucher Savings \(FESTIVE10\)/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Checkout Page Coupon Flows', () => {
    const mockAddress: Address = {
      id: 'addr-1',
      user: 'usr-1',
      full_name: 'Ananya Sharma',
      phone: '9876543210',
      address_line1: '12 Royal Enclave',
      address_line2: 'Banjara Hills',
      landmark: 'Near Lake',
      city: 'Hyderabad',
      state: 'Telangana',
      postal_code: '500034',
      country: 'India',
      address_type: 'HOME' as const,
      is_default: true,
      created_at: '2026-09-09T00:00:00Z',
      updated_at: '2026-09-09T00:00:00Z',
    };

    beforeEach(() => {
      vi.spyOn(addressApi, 'getAddresses').mockResolvedValue({
        count: 1,
        next: null,
        previous: null,
        results: [mockAddress],
      });
    });

    it('renders applied coupon badge and discount row in sidebar', async () => {
      vi.spyOn(cartApi, 'getCart').mockResolvedValue(mockCartWithCoupon);

      render(
        <CartProvider>
          <CheckoutPage />
        </CartProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/COUPON: FESTIVE10/i)).toBeInTheDocument();
        expect(screen.getByText(/Coupon Discount \(FESTIVE10\)/i)).toBeInTheDocument();
        expect(screen.getByText('-₹200')).toBeInTheDocument();
        expect(screen.getByText('₹1,800')).toBeInTheDocument();
      });
    });

    it('passes coupon_code when placing order and renders confirmation with discount', async () => {
      vi.spyOn(cartApi, 'getCart').mockResolvedValue(mockCartWithCoupon);

      const mockOrder: CheckoutOrder = {
        id: 'ord-123',
        order_number: 'CBC-ORD-999',
        status: 'PENDING',
        payment_status: 'PAID',
        currency: 'INR',
        subtotal: '2000.00',
        shipping_amount: '0.00',
        tax_amount: '0.00',
        discount: '200.00',
        coupon_code: 'FESTIVE10',
        total: '1800.00',
        shipping_address_snapshot: {
          id: 'addr-1',
          full_name: 'Ananya Sharma',
        },
        billing_address_snapshot: {
          id: 'addr-1',
          full_name: 'Ananya Sharma',
        },
        item_count: 1,
        created_at: '2026-09-09T00:00:00Z',
        updated_at: '2026-09-09T00:00:00Z',
        items: [],
      };

      const placeOrderSpy = vi.spyOn(checkoutApi, 'placeOrder').mockResolvedValue(mockOrder);

      render(
        <CartProvider>
          <CheckoutPage />
        </CartProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/COUPON: FESTIVE10/i)).toBeInTheDocument();
      });

      const confirmBtn = screen.getByRole('button', { name: /place order/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(placeOrderSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            shipping_address_id: 'addr-1',
            coupon_code: 'FESTIVE10',
          }),
          'fake-jwt-token'
        );
      });

      // Verify order success confirmation screen shows coupon code and discount
      await waitFor(() => {
        expect(screen.getByText(/Thank you for your order/i)).toBeInTheDocument();
        expect(screen.getByText(/Coupon discount \(FESTIVE10\):/i)).toBeInTheDocument();
        expect(screen.getByText('-₹200')).toBeInTheDocument();
        expect(screen.getByText('₹1,800')).toBeInTheDocument();
      });
    });
  });
});
