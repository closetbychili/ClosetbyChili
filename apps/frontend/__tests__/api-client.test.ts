import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ApiClientError,
  apiFetch,
  buildQueryString,
  getApiBaseUrl,
  getCategories,
  getCategory,
  getCollections,
  getCollection,
  getProducts,
  getProduct,
} from '@/lib/api';

describe('API Client Utilities', () => {
  const originalEnv = process.env.NEXT_PUBLIC_API_URL;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.NEXT_PUBLIC_API_URL;
    } else {
      process.env.NEXT_PUBLIC_API_URL = originalEnv;
    }
  });

  describe('getApiBaseUrl', () => {
    it('returns default URL when NEXT_PUBLIC_API_URL is unset', () => {
      delete process.env.NEXT_PUBLIC_API_URL;
      expect(getApiBaseUrl()).toBe('http://localhost:8000/api/v1');
    });

    it('returns custom URL and trims trailing slashes', () => {
      process.env.NEXT_PUBLIC_API_URL = 'https://api.closetbychilli.com/api/v1///';
      expect(getApiBaseUrl()).toBe('https://api.closetbychilli.com/api/v1');
    });
  });

  describe('buildQueryString', () => {
    it('returns empty string for undefined or empty params', () => {
      expect(buildQueryString()).toBe('');
      expect(buildQueryString({})).toBe('');
      expect(buildQueryString({ search: undefined, page: null, category: '' })).toBe('');
    });

    it('correctly constructs query string for valid params', () => {
      const params = {
        category: 'kurtis',
        page: 2,
        page_size: 20,
        search: 'silk',
      };
      const qs = buildQueryString(params);
      expect(qs).toBe('?category=kurtis&page=2&page_size=20&search=silk');
    });
  });
});

describe('apiFetch & Error Handling', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('performs successful GET request and parses JSON response', async () => {
    const mockData = { id: '1', name: 'Kurtis', slug: 'kurtis' };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(mockData),
    });

    const result = await apiFetch('/catalog/categories/1/');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/catalog/categories/1/',
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: 'application/json',
        }),
      })
    );
    expect(result).toEqual(mockData);
  });

  it('throws ApiClientError with structured error envelope on 404', async () => {
    const errorEnvelope = {
      error: {
        code: 'NOT_FOUND',
        message: 'No product found with slug invalid-slug.',
        details: {},
      },
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: vi.fn().mockResolvedValue(errorEnvelope),
    });

    await expect(apiFetch('/catalog/products/invalid-slug/')).rejects.toThrow(
      'No product found with slug invalid-slug.'
    );

    try {
      await apiFetch('/catalog/products/invalid-slug/');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiClientError);
      const apiErr = err as ApiClientError;
      expect(apiErr.status).toBe(404);
      expect(apiErr.code).toBe('NOT_FOUND');
    }
  });

  it('throws ApiClientError on HTTP 500 without structured envelope', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: vi.fn().mockRejectedValue(new Error('HTML 500 page')),
    });

    await expect(apiFetch('/catalog/broken/')).rejects.toThrow(
      'Request failed with status 500'
    );
  });

  it('throws ApiClientError with NETWORK_ERROR on fetch exception', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch'));

    try {
      await apiFetch('/catalog/categories/');
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiClientError);
      const apiErr = err as ApiClientError;
      expect(apiErr.status).toBe(0);
      expect(apiErr.code).toBe('NETWORK_ERROR');
      expect(apiErr.message).toContain('Network error connecting to API');
    }
  });
});

describe('Catalog API Functions', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('getCategories passes params and returns paginated categories', async () => {
    const mockCategoriesResponse = {
      count: 2,
      next: null,
      previous: null,
      results: [
        { id: 'cat-1', name: 'Kurtis', slug: 'kurtis' },
        { id: 'cat-2', name: 'Dresses', slug: 'dresses' },
      ],
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(mockCategoriesResponse),
    });

    const res = await getCategories({ search: 'kurti', page: 1 });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/catalog/categories/?search=kurti&page=1',
      expect.anything()
    );
    expect(res.count).toBe(2);
    expect(res.results[0].slug).toBe('kurtis');
  });

  it('getCategory fetches category by UUID', async () => {
    const mockCategory = { id: 'uuid-123', name: 'Kurtis', slug: 'kurtis' };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(mockCategory),
    });

    const res = await getCategory('uuid-123');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/catalog/categories/uuid-123/',
      expect.anything()
    );
    expect(res.id).toBe('uuid-123');
  });

  it('getCollections fetches collections list', async () => {
    const mockColResponse = {
      count: 1,
      next: null,
      previous: null,
      results: [{ id: 'col-1', name: 'New Arrivals', slug: 'new-arrivals' }],
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(mockColResponse),
    });

    const res = await getCollections({ ordering: 'name' });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/catalog/collections/?ordering=name',
      expect.anything()
    );
    expect(res.count).toBe(1);
  });

  it('getCollection fetches single collection by UUID', async () => {
    const mockCol = { id: 'col-123', name: 'Bestsellers', slug: 'bestsellers' };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(mockCol),
    });

    const res = await getCollection('col-123');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/catalog/collections/col-123/',
      expect.anything()
    );
    expect(res.slug).toBe('bestsellers');
  });

  it('getProducts supports all documented query parameters', async () => {
    const mockProductsResponse = {
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          id: 'prod-1',
          name: 'Silk Kurti',
          slug: 'silk-kurti',
          status: 'active',
          is_active: true,
          min_price: '1299.00',
          variant_count: 3,
        },
      ],
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(mockProductsResponse),
    });

    const res = await getProducts({
      category: 'kurtis',
      collection: 'new-arrivals',
      search: 'silk',
      ordering: '-created_at',
      page: 1,
      page_size: 10,
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/catalog/products/?category=kurtis&collection=new-arrivals&search=silk&ordering=-created_at&page=1&page_size=10',
      expect.anything()
    );
    expect(res.results[0].slug).toBe('silk-kurti');
  });

  it('getProduct fetches product detail by slug with variants', async () => {
    const mockProductDetail = {
      id: 'prod-1',
      name: 'Sunflower Block Print Kurti',
      slug: 'sunflower-block-print-kurti',
      status: 'active',
      is_active: true,
      category: { id: 'cat-1', name: 'Printed Kurtis', slug: 'printed-kurtis' },
      collections: [{ id: 'col-1', name: 'New Arrivals', slug: 'new-arrivals' }],
      variants: [
        {
          id: 'var-1',
          sku: 'SBP-KRT-YEL-S',
          size: 'S',
          color: 'Yellow',
          retail_price: '1299.00',
          is_active: true,
        },
      ],
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(mockProductDetail),
    });

    const res = await getProduct('sunflower-block-print-kurti');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/catalog/products/sunflower-block-print-kurti/',
      expect.anything()
    );
    expect(res.variants).toHaveLength(1);
    expect(res.variants[0].sku).toBe('SBP-KRT-YEL-S');
  });
});
