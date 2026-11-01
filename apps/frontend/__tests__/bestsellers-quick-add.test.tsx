import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Bestsellers from '@/components/Bestsellers';
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

describe('Bestsellers Section & Card Design', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockBestseller: ProductItem = {
    id: 'prod-bs-1',
    slug: 'royal-silk-anarkali-set',
    name: 'Royal Silk Anarkali Set',
    detail: 'Anarkali Sets',
    price: 3499,
    badge: 'Bestseller',
    image: '/assets/products/kurti-3.jpg',
    href: '/products/royal-silk-anarkali-set',
    defaultVariantId: 'var-bs-101',
    rating: 4.9,
    reviewsCount: 52,
    variants: [
      { id: 'var-bs-101', size: 'M', color: 'Navy', inStock: true },
    ],
  };

  it('renders star rating and reviews count on the product card', () => {
    render(<Bestsellers products={[mockBestseller]} />);

    expect(screen.getByText('Bestsellers')).toBeInTheDocument();
    expect(screen.getByText('Royal Silk Anarkali Set')).toBeInTheDocument();
    expect(screen.getByText('4.9')).toBeInTheDocument();
    expect(screen.getByText('(52)')).toBeInTheDocument();
    expect(screen.getByText('₹3,499')).toBeInTheDocument();
  });

  it('adds variant to bag when clicking + quick add button', async () => {
    mockAddToCart.mockResolvedValueOnce(undefined);

    render(<Bestsellers products={[mockBestseller]} />);

    const addButton = screen.getByRole('button', {
      name: /Add Royal Silk Anarkali Set to bag/i,
    });
    expect(addButton).toBeInTheDocument();

    fireEvent.click(addButton);

    await waitFor(() => {
      expect(mockAddToCart).toHaveBeenCalledWith('var-bs-101', 1);
    });

    expect(mockOpenDrawer).toHaveBeenCalled();
  });
});

