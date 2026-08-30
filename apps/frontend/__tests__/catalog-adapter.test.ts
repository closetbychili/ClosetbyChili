import { describe, expect, it } from 'vitest';
import {
  mapCategoryToUi,
  mapProductToUi,
} from '@/lib/adapters/catalog-adapter';
import type { Category, ProductListItem } from '@/lib/api/types';

describe('Catalog Data Adapters', () => {
  describe('mapProductToUi', () => {
    it('correctly maps ProductListItem to UI ProductItem', () => {
      const mockProduct: ProductListItem = {
        id: 'prod-uuid-1',
        name: 'Sunflower Block Print Kurti',
        slug: 'sunflower-block-print-kurti',
        description: 'Vibrant yellow kurti',
        status: 'active',
        is_active: true,
        category: { id: 'cat-1', name: 'Printed Kurtis', slug: 'printed-kurtis' },
        collections: [
          { id: 'col-1', name: 'New Arrivals', slug: 'new-arrivals' },
        ],
        min_price: '1299.00',
        variant_count: 4,
        created_at: '2026-08-30T12:00:00Z',
        updated_at: '2026-08-30T12:00:00Z',
      };

      const uiItem = mapProductToUi(mockProduct);

      expect(uiItem.id).toBe('prod-uuid-1');
      expect(uiItem.name).toBe('Sunflower Block Print Kurti');
      expect(uiItem.detail).toBe('Printed Kurtis');
      expect(uiItem.price).toBe(1299);
      expect(uiItem.badge).toBe('New');
      expect(uiItem.href).toBe('/products/sunflower-block-print-kurti');
      expect(uiItem.image).toBe('/assets/products/kurti-1.jpg');
    });

    it('handles product without category and min_price gracefully', () => {
      const mockProduct: ProductListItem = {
        id: 'prod-uuid-2',
        name: 'Simple Product',
        slug: 'simple-product',
        description: '',
        status: 'active',
        is_active: true,
        category: null,
        collections: [],
        min_price: null,
        variant_count: 0,
        created_at: '2026-08-30T12:00:00Z',
        updated_at: '2026-08-30T12:00:00Z',
      };

      const uiItem = mapProductToUi(mockProduct);

      expect(uiItem.detail).toBe('Ethnic Wear');
      expect(uiItem.price).toBe(0);
      expect(uiItem.badge).toBeUndefined();
      expect(uiItem.image).toBeUndefined();
    });
  });

  describe('mapCategoryToUi', () => {
    it('correctly maps Category to UI CategoryItem with subtitle and image', () => {
      const mockCategory: Category = {
        id: 'cat-uuid-1',
        name: 'Kurtis',
        slug: 'kurtis',
        description: 'Traditional kurtis',
        parent: null,
        parent_slug: null,
        children: [],
        is_active: true,
        created_at: '2026-08-30T12:00:00Z',
        updated_at: '2026-08-30T12:00:00Z',
      };

      const uiItem = mapCategoryToUi(mockCategory);

      expect(uiItem.id).toBe('cat-uuid-1');
      expect(uiItem.name).toBe('Kurtis');
      expect(uiItem.subtitle).toBe('Everyday cuts & relaxed silhouettes');
      expect(uiItem.image).toBe('/assets/hero/hero-2.jpg');
      expect(uiItem.href).toBe('/products?category=kurtis');
    });
  });
});
