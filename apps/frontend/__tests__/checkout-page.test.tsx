/**
 * Closet by Chilli — Checkout page tests (Sprint 1.3.1)
 *
 * Covers the critical user paths:
 *   1. Cart-loading spinner
 *   2. Empty-cart gate (not shown while loading)
 *   3. Address list rendering + default pre-selection
 *   4. Add-address form submission
 *   5. Place order → success state
 *   6. Double-submit prevention
 *   7. API error surface
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Shared fixtures ────────────────────────────────────────────────────────

const mockUser = { id: 'user-abc', email: 'test@closetbychilli.com' };
const mockSession = { access_token: 'tok-xyz' };

const mockAddress = {
  id: 'addr-1',
  user: 'user-abc',
  full_name: 'Aisha Khan',
  phone: '9876543210',
  address_line1: '12 Market Road',
  address_line2: '',
  landmark: '',
  city: 'Bengaluru',
  state: 'Karnataka',
  postal_code: '560001',
  country: 'India',
  address_type: 'HOME',
  is_default: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const mockCart = {
  id: 'cart-1',
  session_key: 'sess-1',
  items: [
    {
      id: 'item-1',
      variant: {
        id: 'var-1',
        sku: 'CBC-ANAR-S',
        size: 'S',
        color: 'Crimson',
        retail_price: '4500.00',
        product: {
          id: 'prod-1',
          name: 'Silk Anarkali',
          slug: 'silk-anarkali',
          category_name: 'Kurtis',
          category_slug: 'kurtis',
        },
      },
      quantity: 2,
      unit_price: '4500.00',
      line_total: '9000.00',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
  ],
  item_count: 2,
  subtotal: '9000.00',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const mockOrderResponse = {
  id: 'order-1',
  order_number: 'CBC-2026-000001',
  status: 'PENDING',
  payment_status: 'PENDING',
  currency: 'INR',
  subtotal: '9000.00',
  discount: '0.00',
  shipping_amount: '0.00',
  tax_amount: '0.00',
  total: '9000.00',
  shipping_address_snapshot: mockAddress,
  billing_address_snapshot: mockAddress,
  item_count: 1,
  items: [],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

// ── Hoisted mocks ──────────────────────────────────────────────────────────

const mockRouterReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: mockRouterReplace, refresh: vi.fn(), back: vi.fn(), forward: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/checkout',
  useParams: () => ({}),
  redirect: vi.fn(),
  notFound: vi.fn(),
}));

vi.mock('@/components/AuthProvider', () => ({
  useAuth: () => ({ user: mockUser, session: mockSession, supabaseUser: null, loading: false, signOut: vi.fn(), refreshUser: vi.fn() }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockRefreshCart = vi.fn().mockResolvedValue(undefined);
let cartCtx = {
  cart: mockCart as typeof mockCart | null,
  itemCount: 2,
  subtotal: '9000.00',
  isLoading: false,
  error: null as string | null,
  isDrawerOpen: false,
  addToCart: vi.fn(),
  updateQuantity: vi.fn(),
  removeItem: vi.fn(),
  clearCart: vi.fn(),
  openDrawer: vi.fn(),
  closeDrawer: vi.fn(),
  clearError: vi.fn(),
  refreshCart: mockRefreshCart,
};
vi.mock('@/components/CartContext', () => ({
  useCart: () => cartCtx,
  CartProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockGetAddresses = vi.fn();
const mockCreateAddress = vi.fn();
const mockPlaceOrder = vi.fn();
const mockCreateRazorpayOrder = vi.fn();
const mockVerifyRazorpayPayment = vi.fn();
vi.mock('@/lib/api', () => ({
  getAddresses: (...a: unknown[]) => mockGetAddresses(...a),
  createAddress: (...a: unknown[]) => mockCreateAddress(...a),
  placeOrder: (...a: unknown[]) => mockPlaceOrder(...a),
  createRazorpayOrder: (...a: unknown[]) => mockCreateRazorpayOrder(...a),
  verifyRazorpayPayment: (...a: unknown[]) => mockVerifyRazorpayPayment(...a),
}));

const mockLaunchRazorpayCheckout = vi.fn();
vi.mock('@/lib/razorpay', () => ({
  launchRazorpayCheckout: (...a: unknown[]) => mockLaunchRazorpayCheckout(...a),
}));

vi.mock('@/components/Header', () => ({ default: () => <header data-testid="header" /> }));
vi.mock('@/components/Footer', () => ({ default: () => <footer data-testid="footer" /> }));

// ── Import SUT after mocks ─────────────────────────────────────────────────
import CheckoutPage from '@/app/checkout/page';
import { ApiClientError } from '@/lib/api/client';

// ── Reset between tests ────────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  cartCtx = {
    cart: mockCart,
    itemCount: 2,
    subtotal: '9000.00',
    isLoading: false,
    error: null,
    isDrawerOpen: false,
    addToCart: vi.fn(),
    updateQuantity: vi.fn(),
    removeItem: vi.fn(),
    clearCart: vi.fn(),
    openDrawer: vi.fn(),
    closeDrawer: vi.fn(),
    clearError: vi.fn(),
    refreshCart: mockRefreshCart,
  };
  mockGetAddresses.mockResolvedValue({ results: [mockAddress], count: 1, next: null, previous: null });
  mockPlaceOrder.mockResolvedValue(mockOrderResponse);
  mockCreateAddress.mockResolvedValue({ ...mockAddress, id: 'addr-2', full_name: 'New User', is_default: false });
  mockCreateRazorpayOrder.mockResolvedValue({
    razorpay_order_id: 'order_rzp_mock',
    key_id: 'rzp_mock_key',
    amount: 900000,
    currency: 'INR',
    order_number: 'CBC-2026-000001',
  });
  mockVerifyRazorpayPayment.mockResolvedValue({
    ...mockOrderResponse,
    payment_status: 'PAID',
    razorpay_order_id: 'order_rzp_mock',
    razorpay_payment_id: 'pay_rzp_mock',
  });
  mockLaunchRazorpayCheckout.mockResolvedValue(true);
});

// ─────────────────────────────────────────────────────────────────────────────
describe('CheckoutPage — cart-loading spinner', () => {
  it('renders a spinner while the cart is still loading', () => {
    cartCtx = { ...cartCtx, cart: null, itemCount: 0, isLoading: true };
    render(<CheckoutPage />);
    expect(screen.getByText(/loading your bag/i)).toBeTruthy();
  });

  it('does NOT show "bag is empty" while cart is loading', () => {
    cartCtx = { ...cartCtx, cart: null, itemCount: 0, isLoading: true };
    render(<CheckoutPage />);
    expect(screen.queryByText(/your bag is empty/i)).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('CheckoutPage — empty-cart gate', () => {
  it('shows empty bag message after loading when cart has no items', () => {
    cartCtx = {
      ...cartCtx,
      cart: { ...mockCart, items: [], item_count: 0, subtotal: '0.00' },
      itemCount: 0,
      subtotal: '0.00',
      isLoading: false,
    };
    render(<CheckoutPage />);
    expect(screen.getByText(/your bag is empty/i)).toBeTruthy();
    expect(screen.getByText(/shop now/i)).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('CheckoutPage — address list', () => {
  it('fetches addresses with the auth token', async () => {
    render(<CheckoutPage />);
    await waitFor(() => expect(mockGetAddresses).toHaveBeenCalledWith('tok-xyz'));
  });

  it('renders the saved address', async () => {
    render(<CheckoutPage />);
    expect(await screen.findByText(/aisha khan/i)).toBeTruthy();
    expect(await screen.findByText(/bengaluru/i)).toBeTruthy();
  });

  it('shows an "Add new address" button', async () => {
    render(<CheckoutPage />);
    expect(await screen.findByRole('button', { name: /add new address/i })).toBeTruthy();
  });

  it('opens the address form when the button is clicked', async () => {
    render(<CheckoutPage />);
    const addBtn = await screen.findByRole('button', { name: /add new address/i });
    fireEvent.click(addBtn);
    // Form uses <label> wrapping <input> (no placeholder attributes)
    expect(screen.getByRole('textbox', { name: /full name/i })).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('CheckoutPage — add new address', () => {
  it('submits the form and does NOT include user_id in the payload', async () => {
    render(<CheckoutPage />);
    const addBtn = await screen.findByRole('button', { name: /add new address/i });
    fireEvent.click(addBtn);

    // Inputs are identified by wrapping <label> text (no placeholder attributes)
    fireEvent.change(screen.getByRole('textbox', { name: /full name/i }), { target: { value: 'New User' } });
    fireEvent.change(screen.getByRole('textbox', { name: /phone/i }), { target: { value: '9000000001' } });
    fireEvent.change(screen.getByRole('textbox', { name: /address line 1/i }), { target: { value: '1 New Street' } });
    fireEvent.change(screen.getByRole('textbox', { name: /city/i }), { target: { value: 'Delhi' } });
    fireEvent.change(screen.getByRole('textbox', { name: /state/i }), { target: { value: 'Delhi' } });
    fireEvent.change(screen.getByRole('textbox', { name: /postal code/i }), { target: { value: '110001' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save address/i }));
    });

    await waitFor(() => expect(mockCreateAddress).toHaveBeenCalledTimes(1));
    const [payload] = mockCreateAddress.mock.calls[0];
    expect(payload).not.toHaveProperty('user_id');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('CheckoutPage — place order', () => {
  it('calls placeOrder with the selected address id and an idempotency key', async () => {
    render(<CheckoutPage />);
    await screen.findByText(/aisha khan/i);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /place order/i }));
    });

    await waitFor(() => expect(mockPlaceOrder).toHaveBeenCalledTimes(1));
    const [payload] = mockPlaceOrder.mock.calls[0];
    expect(payload.shipping_address_id).toBe('addr-1');
    expect(typeof payload.idempotency_key).toBe('string');
    expect(payload.idempotency_key.length).toBeGreaterThan(10);
  });

  it('refreshes the cart after a successful order', async () => {
    render(<CheckoutPage />);
    await screen.findByText(/aisha khan/i);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /place order/i }));
    });

    await waitFor(() => expect(mockRefreshCart).toHaveBeenCalled());
  });

  it('shows the success state with order number after a successful order', async () => {
    render(<CheckoutPage />);
    await screen.findByText(/aisha khan/i);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /place order/i }));
    });

    expect(await screen.findByText(/thank you for your order/i)).toBeTruthy();
    expect(screen.getByText(/CBC-2026-000001/)).toBeTruthy();
  });

  it('ignores duplicate clicks while the first request is in-flight', async () => {
    let resolveOrder!: (v: typeof mockOrderResponse) => void;
    mockPlaceOrder.mockReturnValue(new Promise<typeof mockOrderResponse>((res) => { resolveOrder = res; }));

    render(<CheckoutPage />);
    await screen.findByText(/aisha khan/i);

    const placeBtn = screen.getByRole('button', { name: /place order/i });
    fireEvent.click(placeBtn);
    fireEvent.click(placeBtn); // second click — should be ignored

    await act(async () => { resolveOrder(mockOrderResponse); });

    expect(mockPlaceOrder).toHaveBeenCalledTimes(1);
  });

  it('surfaces an API error message inline', async () => {
    mockPlaceOrder.mockRejectedValue(new ApiClientError('Address not found', 400, 'VALIDATION_ERROR'));

    render(<CheckoutPage />);
    await screen.findByText(/aisha khan/i);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /place order/i }));
    });

    expect(await screen.findByText(/address not found/i)).toBeTruthy();
  });

  it('launches Razorpay checkout after placing order', async () => {
    render(<CheckoutPage />);
    await screen.findByText(/aisha khan/i);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /place order/i }));
    });

    await waitFor(() => expect(mockCreateRazorpayOrder).toHaveBeenCalledWith('CBC-2026-000001', 'tok-xyz'));
    expect(mockLaunchRazorpayCheckout).toHaveBeenCalledTimes(1);
  });

  it('verifies payment and shows PAID status on successful payment callback', async () => {
    mockLaunchRazorpayCheckout.mockImplementation(async ({ onSuccess }) => {
      await onSuccess({
        razorpay_order_id: 'order_rzp_mock',
        razorpay_payment_id: 'pay_rzp_mock',
        razorpay_signature: 'sig_valid',
      });
      return true;
    });

    render(<CheckoutPage />);
    await screen.findByText(/aisha khan/i);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /place order/i }));
    });

    await waitFor(() => expect(mockVerifyRazorpayPayment).toHaveBeenCalledWith(
      {
        razorpay_order_id: 'order_rzp_mock',
        razorpay_payment_id: 'pay_rzp_mock',
        razorpay_signature: 'sig_valid',
      },
      'tok-xyz'
    ));

    expect(await screen.findByText(/thank you for your order/i)).toBeTruthy();
    expect(screen.getByText('PAID')).toBeTruthy();
  });

  it('handles payment dismissal and allows retrying payment for the same order', async () => {
    mockLaunchRazorpayCheckout.mockImplementation(async ({ onDismiss }) => {
      onDismiss();
      return true;
    });

    render(<CheckoutPage />);
    await screen.findByText(/aisha khan/i);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /place order/i }));
    });

    expect(await screen.findByText(/order placed — pending payment/i)).toBeTruthy();
    expect(screen.getByText(/payment window closed/i)).toBeTruthy();

    const retryBtn = screen.getByRole('button', { name: /pay now/i });
    expect(retryBtn).toBeTruthy();

    mockLaunchRazorpayCheckout.mockClear();
    mockCreateRazorpayOrder.mockClear();
    mockPlaceOrder.mockClear();

    await act(async () => {
      fireEvent.click(retryBtn);
    });

    // Does NOT call placeOrder again!
    expect(mockPlaceOrder).not.toHaveBeenCalled();
    // Re-launches Razorpay checkout
    await waitFor(() => expect(mockCreateRazorpayOrder).toHaveBeenCalledWith('CBC-2026-000001', 'tok-xyz'));
    expect(mockLaunchRazorpayCheckout).toHaveBeenCalledTimes(1);
  });
});
