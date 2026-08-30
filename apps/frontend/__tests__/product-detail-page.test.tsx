import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ProductVariantSelector from '@/components/ProductVariantSelector';
import ProductImageGallery from '@/components/ProductImageGallery';
import { generateMetadata } from '@/app/products/[slug]/page';
import type { ProductVariantSummary } from '@/lib/api/types';
import * as api from '@/lib/api';

describe('Product Detail Page Components', () => {
  const mockVariants: ProductVariantSummary[] = [
    {
      id: 'var-1',
      sku: 'SBP-KRT-YEL-S',
      size: 'S',
      color: 'Yellow',
      retail_price: '1299.00',
      is_active: true,
    },
    {
      id: 'var-2',
      sku: 'SBP-KRT-YEL-M',
      size: 'M',
      color: 'Yellow',
      retail_price: '1299.00',
      is_active: true,
    },
    {
      id: 'var-3',
      sku: 'SBP-KRT-YEL-XL',
      size: 'XL',
      color: 'Yellow',
      retail_price: '1349.00',
      is_active: true,
    },
    {
      id: 'var-4',
      sku: 'SBP-KRT-GRN-M',
      size: 'M',
      color: 'Green',
      retail_price: '1299.00',
      is_active: false, // Inactive variant
    },
  ];

  describe('ProductVariantSelector Component', () => {
    it('renders sizes, colors, dynamic price, and stock status', () => {
      render(
        <ProductVariantSelector
          productName="Sunflower Block Print Kurti"
          productSlug="sunflower-block-print-kurti"
          variants={mockVariants}
        />
      );

      expect(screen.getByText('₹1,299')).toBeInTheDocument();
      expect(screen.getByText(/In Stock — Ready to Ship/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Yellow' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'S' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'M' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'XL' })).toBeInTheDocument();
    });

    it('updates price when selecting variant with different price', () => {
      render(
        <ProductVariantSelector
          productName="Sunflower Block Print Kurti"
          productSlug="sunflower-block-print-kurti"
          variants={mockVariants}
        />
      );

      // Select XL (which costs 1349.00)
      const xlBtn = screen.getByRole('button', { name: 'XL' });
      fireEvent.click(xlBtn);

      expect(screen.getByText('₹1,349')).toBeInTheDocument();
    });

    it('manages quantity stepper with min value of 1', () => {
      render(
        <ProductVariantSelector
          productName="Sunflower Block Print Kurti"
          productSlug="sunflower-block-print-kurti"
          variants={mockVariants}
        />
      );

      const increaseBtn = screen.getByLabelText('Increase quantity');
      const decreaseBtn = screen.getByLabelText('Decrease quantity');

      fireEvent.click(increaseBtn);
      expect(screen.getByText('2')).toBeInTheDocument();

      fireEvent.click(increaseBtn);
      expect(screen.getByText('3')).toBeInTheDocument();

      fireEvent.click(decreaseBtn);
      expect(screen.getByText('2')).toBeInTheDocument();

      fireEvent.click(decreaseBtn);
      expect(screen.getByText('1')).toBeInTheDocument();

      // Decreasing at 1 should keep it at 1
      fireEvent.click(decreaseBtn);
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('triggers onAddToCart callback with selected configuration', () => {
      const handleAddToCart = vi.fn();

      render(
        <ProductVariantSelector
          productName="Sunflower Block Print Kurti"
          productSlug="sunflower-block-print-kurti"
          variants={mockVariants}
          onAddToCart={handleAddToCart}
        />
      );

      const addBtn = screen.getByRole('button', { name: /add to bag/i });
      fireEvent.click(addBtn);

      expect(handleAddToCart).toHaveBeenCalledTimes(1);
      expect(handleAddToCart).toHaveBeenCalledWith({
        productName: 'Sunflower Block Print Kurti',
        productSlug: 'sunflower-block-print-kurti',
        variant: expect.objectContaining({
          sku: 'SBP-KRT-YEL-S',
          size: 'S',
          color: 'Yellow',
        }),
        quantity: 1,
      });

      expect(screen.getByText(/Successfully added 1x/i)).toBeInTheDocument();
    });
  });

  describe('ProductImageGallery Component', () => {
    it('renders main image and thumbnail buttons', () => {
      const images = ['/assets/products/kurti-1.jpg', '/assets/products/kurti-2.jpg'];

      render(
        <ProductImageGallery
          images={images}
          productName="Sunflower Block Print Kurti"
        />
      );

      expect(screen.getByAltText('Sunflower Block Print Kurti view 1')).toBeInTheDocument();
      expect(screen.getByLabelText('View image 2')).toBeInTheDocument();

      // Click second thumbnail
      fireEvent.click(screen.getByLabelText('View image 2'));
      expect(screen.getByAltText('Sunflower Block Print Kurti view 2')).toBeInTheDocument();
    });
  });

  describe('generateMetadata for PDP', () => {
    it('generates dynamic SEO title and description from API product data', async () => {
      vi.spyOn(api, 'getProduct').mockResolvedValue({
        id: 'p-1',
        name: 'Sunflower Block Print Kurti',
        slug: 'sunflower-block-print-kurti',
        description: 'Vibrant yellow kurti in soft cotton.',
        status: 'active',
        is_active: true,
        category: { id: 'c-1', name: 'Printed Kurtis', slug: 'printed-kurtis' },
        collections: [],
        variants: mockVariants,
        created_at: '',
        updated_at: '',
      });

      const meta = await generateMetadata({
        params: Promise.resolve({ slug: 'sunflower-block-print-kurti' }),
      });

      expect(meta.title).toBe(
        'Sunflower Block Print Kurti | Printed Kurtis | Closet by Chilli'
      );
      expect(meta.description).toContain('Vibrant yellow kurti in soft cotton.');
    });
  });
});
