import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProductFilters from '@/components/ProductFilters';
import ProductPagination from '@/components/ProductPagination';
import { generateMetadata } from '@/app/products/page';
import type { CategorySummary, CollectionSummary } from '@/lib/api/types';

// Mock Next.js navigation hooks
const mockPush = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => '/products',
  useSearchParams: () => mockSearchParams,
}));

describe('Product Listing Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  describe('ProductFilters Component', () => {
    const mockCategories: CategorySummary[] = [
      { id: 'cat-1', name: 'Kurtis', slug: 'kurtis' },
      { id: 'cat-2', name: 'Dresses', slug: 'dresses' },
    ];
    const mockCollections: CollectionSummary[] = [
      { id: 'col-1', name: 'New Arrivals', slug: 'new-arrivals' },
    ];

    it('renders category and collection buttons with search input', () => {
      render(
        <ProductFilters
          categories={mockCategories}
          collections={mockCollections}
          totalCount={15}
        />
      );

      expect(screen.getByPlaceholderText(/search kurtis, sets/i)).toBeInTheDocument();
      expect(screen.getByText('Kurtis')).toBeInTheDocument();
      expect(screen.getByText('Dresses')).toBeInTheDocument();
      expect(screen.getByText('New Arrivals')).toBeInTheDocument();
      expect(screen.getByText(/15 Products/i)).toBeInTheDocument();
    });

    it('submitting search updates URL with search param and resets page', () => {
      render(
        <ProductFilters
          categories={mockCategories}
          collections={mockCollections}
          totalCount={15}
        />
      );

      const input = screen.getByPlaceholderText(/search kurtis, sets/i);
      fireEvent.change(input, { target: { value: 'silk' } });
      fireEvent.submit(input.closest('form')!);

      expect(mockPush).toHaveBeenCalledWith('/products?search=silk');
    });

    it('clicking a category button updates URL with category param', () => {
      render(
        <ProductFilters
          categories={mockCategories}
          collections={mockCollections}
          totalCount={15}
        />
      );

      const kurtiBtn = screen.getByText('Kurtis');
      fireEvent.click(kurtiBtn);

      expect(mockPush).toHaveBeenCalledWith('/products?category=kurtis');
    });

    it('displays active filter tags when filter params are present', () => {
      mockSearchParams = new URLSearchParams('category=kurtis&search=silk');

      render(
        <ProductFilters
          categories={mockCategories}
          collections={mockCollections}
          totalCount={5}
        />
      );

      expect(screen.getByText('Active Filters:')).toBeInTheDocument();
      expect(screen.getByText(/Category:\s*Kurtis/)).toBeInTheDocument();
      expect(screen.getByText(/Search:\s*“\s*silk\s*”/)).toBeInTheDocument();
      expect(screen.getByText('Clear All')).toBeInTheDocument();
    });
  });

  describe('ProductPagination Component', () => {
    it('renders page numbers and next/prev links for multi-page results', () => {
      render(
        <ProductPagination
          totalCount={28}
          pageSize={10}
          currentPage={2}
        />
      );

      // Total pages = ceil(28/10) = 3
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();

      const prevLink = screen.getByLabelText('Previous page');
      expect(prevLink).toHaveAttribute('href', '/products'); // Page 1 omits ?page=1

      const nextLink = screen.getByLabelText('Next page');
      expect(nextLink).toHaveAttribute('href', '/products?page=3');
    });

    it('returns null when total pages is 1 or fewer', () => {
      const { container } = render(
        <ProductPagination
          totalCount={8}
          pageSize={12}
          currentPage={1}
        />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('generateMetadata', () => {
    it('generates default title when no category is specified', async () => {
      const meta = await generateMetadata({
        searchParams: Promise.resolve({}),
      });

      expect(meta.title).toBe('Catalog & Ethnic Wear | Closet by Chilli');
    });

    it('generates dynamic category title when category param is present', async () => {
      const meta = await generateMetadata({
        searchParams: Promise.resolve({ category: 'kurta-sets' }),
      });

      expect(meta.title).toBe('Kurta sets | Closet by Chilli');
    });
  });
});
