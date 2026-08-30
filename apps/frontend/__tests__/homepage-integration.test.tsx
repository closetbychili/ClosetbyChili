import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import NewArrivals from '@/components/NewArrivals';
import Bestsellers from '@/components/Bestsellers';
import ShopByCategory from '@/components/ShopByCategory';
import type { CategoryItem, ProductItem } from '@/lib/homepage-data';

describe('Homepage Connected Components Integration', () => {
  const mockProducts: ProductItem[] = [
    {
      id: 'p-1',
      name: 'Sunflower Block Print Kurti',
      detail: 'Printed Kurtis',
      price: 1299,
      badge: 'New',
      image: '/assets/products/kurti-1.jpg',
      href: '/products/sunflower-block-print-kurti',
    },
    {
      id: 'p-2',
      name: 'Chikankari Embroidered Kurti',
      detail: 'Embroidered Kurtis',
      price: 2199,
      badge: 'New',
      image: '/assets/products/kurti-2.jpg',
      href: '/products/chikankari-embroidered-kurti',
    },
  ];

  const mockCategories: CategoryItem[] = [
    {
      id: 'c-1',
      name: 'Kurtis',
      subtitle: 'Everyday cuts & relaxed silhouettes',
      image: '/assets/hero/hero-2.jpg',
      href: '/categories/kurtis',
    },
    {
      id: 'c-2',
      name: 'Kurta Sets',
      subtitle: 'Coordinated elegance for every day',
      image: '/assets/hero/hero-3.jpg',
      href: '/categories/kurta-sets',
    },
  ];

  describe('NewArrivals Component', () => {
    it('renders live product items when provided via props', () => {
      render(<NewArrivals products={mockProducts} />);

      expect(screen.getByText('New Arrivals')).toBeInTheDocument();
      expect(screen.getByText('Sunflower Block Print Kurti')).toBeInTheDocument();
      expect(screen.getByText('Chikankari Embroidered Kurti')).toBeInTheDocument();
      expect(screen.getByText('₹1,299')).toBeInTheDocument();
      expect(screen.getByText('₹2,199')).toBeInTheDocument();
    });

    it('renders graceful empty state when empty product array is provided', () => {
      render(<NewArrivals products={[]} />);

      expect(screen.getByText('New Arrivals')).toBeInTheDocument();
      expect(
        screen.getByText(/New arrivals are currently being updated/i)
      ).toBeInTheDocument();
    });
  });

  describe('Bestsellers Component', () => {
    it('renders live product items when provided via props', () => {
      render(<Bestsellers products={mockProducts} />);

      expect(screen.getByText('Bestsellers')).toBeInTheDocument();
      expect(screen.getByText('Sunflower Block Print Kurti')).toBeInTheDocument();
      expect(screen.getByText('Chikankari Embroidered Kurti')).toBeInTheDocument();
    });

    it('renders graceful empty state when empty array is provided', () => {
      render(<Bestsellers products={[]} />);

      expect(screen.getByText('Bestsellers')).toBeInTheDocument();
      expect(
        screen.getByText(/Bestseller catalog is being refreshed/i)
      ).toBeInTheDocument();
    });
  });

  describe('ShopByCategory Component', () => {
    it('renders live categories when provided via props', () => {
      render(<ShopByCategory categories={mockCategories} />);

      expect(screen.getByText('Shop By Category')).toBeInTheDocument();
      expect(screen.getByText('Kurtis')).toBeInTheDocument();
      expect(screen.getByText('Kurta Sets')).toBeInTheDocument();
      expect(
        screen.getByText('Everyday cuts & relaxed silhouettes')
      ).toBeInTheDocument();
    });

    it('renders graceful empty state when empty category array is provided', () => {
      render(<ShopByCategory categories={[]} />);

      expect(screen.getByText('Shop By Category')).toBeInTheDocument();
      expect(
        screen.getByText(/Categories are currently being updated/i)
      ).toBeInTheDocument();
    });
  });
});
