import '@testing-library/jest-dom';
import { vi } from 'vitest';

// ---------------------------------------------------------------------------
// Supabase environment — must be present before any module that imports
// lib/supabase/client.ts is resolved (the Proxy defers the throw to first
// property access, but vitest module resolution happens eagerly).
// ---------------------------------------------------------------------------
process.env.NEXT_PUBLIC_SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://test-project.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key';

// ---------------------------------------------------------------------------
// next/navigation — many components call useRouter() / useSearchParams().
// Provide a consistent stub so tests that render those components (e.g.
// Header, CartPage) do not throw "invariant: app router must be mounted".
// Individual test files can override these with vi.mock() after the fact.
// ---------------------------------------------------------------------------
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
  useParams: () => ({}),
  redirect: vi.fn(),
  notFound: vi.fn(),
}));

// ---------------------------------------------------------------------------
// AuthProvider — tests that render components using useAuth() (e.g. Header)
// need the provider in scope.  We mock the hook with a sensible logged-out
// default; tests that want a logged-in state can override via vi.mock().
// ---------------------------------------------------------------------------
vi.mock('@/components/AuthProvider', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/AuthProvider')>();
  return {
    ...actual,
    useAuth: () => ({
      session: null,
      supabaseUser: null,
      user: null,
      loading: false,
      signOut: vi.fn().mockResolvedValue(undefined),
      refreshUser: vi.fn().mockResolvedValue(undefined),
    }),
  };
});

// ---------------------------------------------------------------------------
// JSDOM Stubs for Browser APIs (matchMedia, ResizeObserver)
// ---------------------------------------------------------------------------
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  if (!window.ResizeObserver) {
    class MockResizeObserver {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    }
    window.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
  }
}

