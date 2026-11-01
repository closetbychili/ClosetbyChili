import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NewArrivals from '@/components/NewArrivals';
import * as catalogApi from '@/lib/api/catalog';
import type { ProductItem } from '@/lib/homepage-data';

const mockAddToCart = vi.fn();
const mockOpenDrawer = vi.fn();

vi.mock('@/components/CartContext', () => ({
  useCart: () => ({
    addToCart: mockAddToCart,
    openDrawer: mockOpenDrawer,
  }),
}));

describe('NewArrivals Quick Add Button (+) Behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockProductWithDefaultVariant: ProductItem = {
    id: 'prod-uuid-1',
    slug: 'sunflower-block-print-kurti',
    name: 'Sunflower Block Print Kurti',
    detail: 'Printed Kurtis',
    price: 1299,
    badge: 'New',
    image: '/assets/products/kurti-1.jpg',
    href: '/products/sunflower-block-print-kurti',
    defaultVariantId: 'variant-uuid-101',
    variants: [
      { id: 'variant-uuid-101', size: 'M', color: 'Yellow', inStock: true },
      { id: 'variant-uuid-102', size: 'L', color: 'Yellow', inStock: true },
    ],
  };

  const mockProductWithoutPreloadedVariant: ProductItem = {
    id: 'prod-uuid-2',
    slug: 'chikankari-embroidered-kurti',
    name: 'Chikankari Embroidered Kurti',
    detail: 'Embroidered Kurtis',
    price: 2199,
    badge: 'New',
    image: '/assets/products/kurti-2.jpg',
    href: '/products/chikankari-embroidered-kurti',
  };

  it('adds the variant_id (not product_id) to the cart when defaultVariantId is preloaded', async () => {
    mockAddToCart.mockResolvedValueOnce(undefined);

    render(<NewArrivals products={[mockProductWithDefaultVariant]} />);

    const addButton = screen.getByRole('button', {
      name: /Add Sunflower Block Print Kurti to bag/i,
    });
    expect(addButton).toBeInTheDocument();

    fireEvent.click(addButton);

    await waitFor(() => {
      // Must call with variant-uuid-101, NEVER prod-uuid-1!
      expect(mockAddToCart).toHaveBeenCalledWith('variant-uuid-101', 1);
    });

    expect(mockOpenDrawer).toHaveBeenCalled();
  });

  it('dynamically resolves variant from API and adds to cart when defaultVariantId is not preloaded', async () => {
    mockAddToCart.mockResolvedValueOnce(undefined);

    vi.spyOn(catalogApi, 'getProduct').mockResolvedValueOnce({
      id: 'prod-uuid-2',
      name: 'Chikankari Embroidered Kurti',
      slug: 'chikankari-embroidered-kurti',
      description: 'Handcrafted Chikankari',
      status: 'active',
      is_active: true,
      category: null,
      collections: [],
      images: [],
      variants: [
        {
          id: 'resolved-variant-201',
          sku: 'CHK-KRT-PNK-M',
          size: 'M',
          color: 'Pink',
          retail_price: '2199.00',
          is_active: true,
          is_in_stock: true,
        },
      ],
      created_at: '',
      updated_at: '',
    });

    render(<NewArrivals products={[mockProductWithoutPreloadedVariant]} />);

    const addButton = screen.getByRole('button', {
      name: /Add Chikankari Embroidered Kurti to bag/i,
    });

    fireEvent.click(addButton);

    await waitFor(() => {
      expect(mockAddToCart).toHaveBeenCalledWith('resolved-variant-201', 1);
    });

    expect(mockOpenDrawer).toHaveBeenCalled();
  });

  it('handles addToCart error by opening drawer to show feedback without unhandled crash', async () => {
    mockAddToCart.mockRejectedValueOnce(new Error('Cart error'));

    render(<NewArrivals products={[mockProductWithDefaultVariant]} />);

    const addButton = screen.getByRole('button', {
      name: /Add Sunflower Block Print Kurti to bag/i,
    });

    fireEvent.click(addButton);

    await waitFor(() => {
      expect(mockAddToCart).toHaveBeenCalledWith('variant-uuid-101', 1);
      expect(mockOpenDrawer).toHaveBeenCalled();
    });
  });
});

