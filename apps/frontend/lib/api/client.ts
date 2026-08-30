/**
 * Closet by Chilli — HTTP API Client
 *
 * Lightweight, type-safe API client built on native fetch.
 * Designed for Next.js App Router server and client execution.
 */

import type { ApiErrorResponse, RequestOptions } from './types';

/**
 * Custom error class capturing structured DRF API error responses.
 */
export class ApiClientError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details: Record<string, unknown>;

  constructor(
    message: string,
    status: number,
    code = 'API_ERROR',
    details: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Resolves the API base URL from environment variables with local fallback.
 */
export function getApiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  const rawUrl =
    envUrl && envUrl !== 'undefined'
      ? envUrl
      : 'http://localhost:8000/api/v1';
  return rawUrl.replace(/\/+$/, '');
}

/**
 * Builds a query string from a key-value record, excluding empty/undefined parameters.
 */
export function buildQueryString(
  params?: Record<string, string | number | boolean | undefined | null>
): string {
  if (!params) return '';

  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  }

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

/**
 * Core type-safe request helper.
 *
 * @param path Relative API path (e.g. "/catalog/products/")
 * @param options Request options including query params and Next.js revalidation
 */
export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { params, headers, ...fetchOptions } = options;
  const baseUrl = getApiBaseUrl();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const queryString = buildQueryString(params);
  const url = `${baseUrl}${normalizedPath}${queryString}`;

  const defaultHeaders: HeadersInit = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };

  let response: Response;

  try {
    response = await fetch(url, {
      ...fetchOptions,
      headers: {
        ...defaultHeaders,
        ...headers,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Network request failed';
    throw new ApiClientError(
      `Network error connecting to API: ${message}`,
      0,
      'NETWORK_ERROR'
    );
  }

  if (!response.ok) {
    let errorData: ApiErrorResponse | null = null;
    try {
      errorData = (await response.json()) as ApiErrorResponse;
    } catch {
      // Non-JSON error response (e.g. HTML proxy gateway error)
    }

    if (errorData?.error) {
      throw new ApiClientError(
        errorData.error.message || `API error with status ${response.status}`,
        response.status,
        errorData.error.code || 'API_ERROR',
        (errorData.error.details as Record<string, unknown>) || {}
      );
    }

    throw new ApiClientError(
      `Request failed with status ${response.status}`,
      response.status,
      'HTTP_ERROR'
    );
  }

  try {
    return (await response.json()) as T;
  } catch (error) {
    throw new ApiClientError(
      `Failed to parse JSON response: ${error instanceof Error ? error.message : 'Unknown parsing error'}`,
      response.status,
      'PARSE_ERROR'
    );
  }
}
