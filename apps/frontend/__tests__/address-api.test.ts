import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  placeOrder,
} from '@/lib/api';

describe('Address and Checkout API clients', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches the authenticated user address list', async () => {
    const mockAddresses = {
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          id: 'addr-1',
          user: 'user-123',
          full_name: 'Aisha',
          phone: '9876543210',
          address_line1: '12 Market Road',
          address_line2: '',
          landmark: 'Near Metro',
          city: 'Bengaluru',
          state: 'Karnataka',
          postal_code: '560001',
          country: 'India',
          address_type: 'HOME',
          is_default: true,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockAddresses,
    } as Response);

    const result = await getAddresses('test-auth-token');
    expect(result.count).toBe(1);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/addresses/'),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer test-auth-token' }),
      })
    );
  });

  it('creates a new address without trusting client user_id', async () => {
    const payload = {
      full_name: 'Aisha Khan',
      phone: '9988776655',
      address_line1: '34 Main Road',
      city: 'Pune',
      state: 'Maharashtra',
      postal_code: '411001',
      country: 'India',
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        id: 'addr-2',
        user: 'user-123',
        ...payload,
        address_line2: '',
        landmark: '',
        address_type: 'HOME',
        is_default: true,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      }),
    } as Response);

    const created = await createAddress(payload, 'test-auth-token');
    expect(created.user).toBe('user-123');
    expect(JSON.parse((global.fetch as any).mock.calls[0][1].body)).not.toHaveProperty('user_id');
  });

  it('places a checkout order using the authenticated address and idempotency key', async () => {
    const mockOrder = {
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
      shipping_address_snapshot: {
        id: 'addr-1',
        full_name: 'Aisha Khan',
        city: 'Bengaluru',
      },
      billing_address_snapshot: {
        id: 'addr-1',
        full_name: 'Aisha Khan',
        city: 'Bengaluru',
      },
      item_count: 1,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      items: [
        {
          id: 'line-1',
          product: 'prod-1',
          variant: 'var-1',
          product_name: 'Silk Anarkali',
          variant_name: 'S / Crimson',
          sku: 'CHK-ANAR-S',
          unit_price: '4500.00',
          quantity: 2,
          line_total: '9000.00',
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => mockOrder,
    } as Response);

    const result = await placeOrder(
      { shipping_address_id: 'addr-1', idempotency_key: 'checkout-1' },
      'test-auth-token'
    );

    expect(result.order_number).toBe('CBC-2026-000001');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/checkout/'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer test-auth-token' }),
        body: JSON.stringify({ shipping_address_id: 'addr-1', idempotency_key: 'checkout-1' }),
      })
    );
  });

  it('deletes an address by id', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      json: async () => ({}),
    } as Response);

    await expect(deleteAddress('addr-1', 'test-auth-token')).resolves.toBeUndefined();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/addresses/addr-1/'),
      expect.objectContaining({ method: 'DELETE' })
    );
  });
});
