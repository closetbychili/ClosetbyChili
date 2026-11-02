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

export const DEFAULT_REQUEST_TIMEOUT_MS = 8000;
export const DEFAULT_UPLOAD_TIMEOUT_MS = 60000;

/**
 * Checks whether an unknown error is an API request timeout.
 */
export function isTimeoutError(error: unknown): boolean {
  return error instanceof ApiClientError && error.code === 'REQUEST_TIMEOUT';
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
  const { params, headers, timeoutMs: customTimeout, ...fetchOptions } = options;
  const baseUrl = getApiBaseUrl();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const queryString = buildQueryString(params);
  const url = `${baseUrl}${normalizedPath}${queryString}`;

  const defaultHeaders: Record<string, string> = {
    Accept: 'application/json',
  };
  if (typeof FormData === 'undefined' || !(fetchOptions.body instanceof FormData)) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  // Determine effective timeout in ms (0 or negative disables timeout)
  const isFormData = typeof FormData !== 'undefined' && fetchOptions.body instanceof FormData;
  const effectiveTimeoutMs =
    customTimeout !== undefined
      ? (customTimeout <= 0 ? 0 : customTimeout)
      : isFormData
      ? DEFAULT_UPLOAD_TIMEOUT_MS
      : DEFAULT_REQUEST_TIMEOUT_MS;

  const timeoutController = new AbortController();
  let timedOut = false;
  let timerId: ReturnType<typeof setTimeout> | null = null;

  if (effectiveTimeoutMs > 0) {
    timerId = setTimeout(() => {
      timedOut = true;
      timeoutController.abort(new Error(`Request timed out after ${effectiveTimeoutMs}ms`));
    }, effectiveTimeoutMs);
  }

  const callerSignal = fetchOptions.signal;
  let combinedSignal: AbortSignal = timeoutController.signal;

  if (callerSignal) {
    if (callerSignal.aborted) {
      if (timerId) clearTimeout(timerId);
      throw new ApiClientError(
        'Request was aborted by caller',
        0,
        'REQUEST_ABORTED',
        { path }
      );
    }

    if (typeof AbortSignal.any === 'function') {
      combinedSignal = AbortSignal.any([callerSignal, timeoutController.signal]);
    } else {
      callerSignal.addEventListener(
        'abort',
        () => {
          if (timerId) clearTimeout(timerId);
          timeoutController.abort(callerSignal.reason);
        },
        { once: true }
      );
    }
  }

  let response: Response;

  try {
    response = await fetch(url, {
      ...fetchOptions,
      signal: effectiveTimeoutMs > 0 || callerSignal ? combinedSignal : undefined,
      headers: {
        ...defaultHeaders,
        ...headers,
      },
    });
  } catch (error) {
    if (timedOut) {
      throw new ApiClientError(
        `Request timed out after ${effectiveTimeoutMs}ms connecting to API`,
        408,
        'REQUEST_TIMEOUT',
        { timeoutMs: effectiveTimeoutMs, path }
      );
    }

    if (callerSignal?.aborted) {
      throw new ApiClientError(
        'Request was aborted by caller',
        0,
        'REQUEST_ABORTED',
        { path }
      );
    }

    const message =
      error instanceof Error ? error.message : 'Network request failed';
    throw new ApiClientError(
      `Network error connecting to API: ${message}`,
      0,
      'NETWORK_ERROR'
    );
  } finally {
    if (timerId) {
      clearTimeout(timerId);
    }
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

  const responseHeaders = response.headers && typeof response.headers.get === 'function'
    ? response.headers
    : new Headers();
  const contentLength = responseHeaders.get('content-length');
  if (response.status === 204 || contentLength === '0') {
    return undefined as T;
  }

  try {
    if (typeof response.text === 'function') {
      const text = await response.text();
      if (!text) {
        return undefined as T;
      }
      return JSON.parse(text) as T;
    }

    if (typeof response.json === 'function') {
      return (await response.json()) as T;
    }

    return undefined as T;
  } catch (error) {
    throw new ApiClientError(
      `Failed to parse JSON response: ${error instanceof Error ? error.message : 'Unknown parsing error'}`,
      response.status,
      'PARSE_ERROR'
    );
  }
}
