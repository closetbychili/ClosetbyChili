import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AuthForm from "@/components/AuthForm";
import AuthCallbackPage from "@/app/auth/callback/page";
import * as authApi from "@/lib/api/auth";

let mockSearchParams = new URLSearchParams();
const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    refresh: mockRefresh,
    back: vi.fn(),
  }),
  useSearchParams: () => mockSearchParams,
}));

const mockSignInWithOAuth = vi.fn();
const mockExchangeCodeForSession = vi.fn();
const mockGetSession = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    auth: {
      signInWithOAuth: (...args: unknown[]) => mockSignInWithOAuth(...args),
      exchangeCodeForSession: (...args: unknown[]) => mockExchangeCodeForSession(...args),
      getSession: (...args: unknown[]) => mockGetSession(...args),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
    },
  },
}));

vi.mock("@/lib/api/auth", () => ({
  getCurrentUser: vi.fn(),
}));

describe("Google OAuth Integration — AuthForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  it("renders 'Continue with Google' button in login mode", () => {
    render(<AuthForm mode="login" />);
    const googleBtn = screen.getByRole("button", { name: /continue with google/i });
    expect(googleBtn).toBeInTheDocument();
  });

  it("renders 'Continue with Google' button in register mode", () => {
    render(<AuthForm mode="register" />);
    const googleBtn = screen.getByRole("button", { name: /continue with google/i });
    expect(googleBtn).toBeInTheDocument();
  });

  it("initiates Google OAuth with dynamically generated callback redirectTo URL using window.location.origin", async () => {
    mockSignInWithOAuth.mockResolvedValueOnce({ data: { url: "https://accounts.google.com" }, error: null });

    render(<AuthForm mode="login" />);
    const googleBtn = screen.getByRole("button", { name: /continue with google/i });
    fireEvent.click(googleBtn);

    await waitFor(() => {
      expect(mockSignInWithOAuth).toHaveBeenCalledTimes(1);
      expect(mockSignInWithOAuth).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: "google",
          options: expect.objectContaining({
            redirectTo: `${window.location.origin}/auth/callback`,
          }),
        })
      );
    });
  });

  it("verifies local development redirects to http://localhost:3000/auth/callback", async () => {
    const originalLocation = window.location;
    delete (window as unknown as { location?: unknown }).location;
    (window as unknown as { location: unknown }).location = new URL("http://localhost:3000/login");

    mockSignInWithOAuth.mockResolvedValueOnce({ data: { url: "https://accounts.google.com" }, error: null });

    render(<AuthForm mode="login" />);
    const googleBtn = screen.getByRole("button", { name: /continue with google/i });
    fireEvent.click(googleBtn);

    await waitFor(() => {
      expect(mockSignInWithOAuth).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: "google",
          options: expect.objectContaining({
            redirectTo: "http://localhost:3000/auth/callback",
          }),
        })
      );
    });

    (window as unknown as { location: unknown }).location = originalLocation;
  });

  it("verifies production deployment redirects to https://closetby-chili.vercel.app/auth/callback", async () => {
    const originalLocation = window.location;
    delete (window as unknown as { location?: unknown }).location;
    (window as unknown as { location: unknown }).location = new URL("https://closetby-chili.vercel.app/login");

    mockSignInWithOAuth.mockResolvedValueOnce({ data: { url: "https://accounts.google.com" }, error: null });

    render(<AuthForm mode="login" />);
    const googleBtn = screen.getByRole("button", { name: /continue with google/i });
    fireEvent.click(googleBtn);

    await waitFor(() => {
      expect(mockSignInWithOAuth).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: "google",
          options: expect.objectContaining({
            redirectTo: "https://closetby-chili.vercel.app/auth/callback",
          }),
        })
      );
    });

    (window as unknown as { location: unknown }).location = originalLocation;
  });

  it("preserves safe internal next destination parameter in sessionStorage without corrupting callback redirectTo URL", async () => {
    mockSearchParams = new URLSearchParams("next=/checkout");
    mockSignInWithOAuth.mockResolvedValueOnce({ data: { url: "https://accounts.google.com" }, error: null });

    render(<AuthForm mode="login" />);
    const googleBtn = screen.getByRole("button", { name: /continue with google/i });
    fireEvent.click(googleBtn);

    await waitFor(() => {
      expect(mockSignInWithOAuth).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: "google",
          options: expect.objectContaining({
            redirectTo: `${window.location.origin}/auth/callback`,
          }),
        })
      );
      expect(sessionStorage.getItem("auth_redirect_next")).toBe("/checkout");
    });
  });

  it("prevents duplicate submissions and displays loading state while OAuth is in-flight", async () => {
    let resolveOAuth: (val: unknown) => void = () => {};
    mockSignInWithOAuth.mockReturnValue(
      new Promise((resolve) => {
        resolveOAuth = resolve;
      })
    );

    render(<AuthForm mode="login" />);
    const googleBtn = screen.getByRole("button", { name: /continue with google/i });
    fireEvent.click(googleBtn);

    // Button should now be disabled and show loading indicator
    expect(googleBtn).toBeDisabled();
    expect(screen.getByText(/connecting to google/i)).toBeInTheDocument();

    // Clicking again should not trigger duplicate call
    fireEvent.click(googleBtn);
    expect(mockSignInWithOAuth).toHaveBeenCalledTimes(1);

    // Resolve in-flight request
    resolveOAuth({ data: {}, error: null });
  });

  it("displays error message if Supabase OAuth fails to initialize", async () => {
    mockSignInWithOAuth.mockResolvedValueOnce({
      data: null,
      error: new Error("Network timeout contacting Supabase Auth"),
    });

    render(<AuthForm mode="login" />);
    const googleBtn = screen.getByRole("button", { name: /continue with google/i });
    fireEvent.click(googleBtn);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Network timeout contacting Supabase Auth");
    });
  });

  it("displays friendly error message when redirected back with access_denied / cancelled error", async () => {
    mockSearchParams = new URLSearchParams("error=access_denied&error_description=User+cancelled+authorization");

    render(<AuthForm mode="login" />);
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByRole("alert")).toHaveTextContent(/cancelled/i);
    });
  });
});

describe("Google OAuth Integration — AuthCallbackPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  it("exchanges authorization code for session, synchronizes Django customer profile, and redirects to /account", async () => {
    mockSearchParams = new URLSearchParams("code=valid-pkce-auth-code&next=/account");
    const fakeSession = { access_token: "jwt-token-123", user: { id: "sb-user-1", email: "google@example.com" } };
    mockExchangeCodeForSession.mockResolvedValueOnce({
      data: { session: fakeSession },
      error: null,
    });
    vi.mocked(authApi.getCurrentUser).mockResolvedValueOnce({
      id: "django-user-1",
      supabase_user_id: "sb-user-1",
      email: "google@example.com",
      role: "customer",
      profile: { display_name: "Google Muse", phone: "" },
      created_at: "2026-11-01T00:00:00Z",
      updated_at: "2026-11-01T00:00:00Z",
    });

    render(<AuthCallbackPage />);

    await waitFor(() => {
      expect(mockExchangeCodeForSession).toHaveBeenCalledWith("valid-pkce-auth-code");
      expect(authApi.getCurrentUser).toHaveBeenCalledWith("jwt-token-123");
      expect(mockReplace).toHaveBeenCalledWith("/account");
    });
  });

  it("handles cancelled Google authorization and redirects back to /login with helpful error", async () => {
    mockSearchParams = new URLSearchParams("error=access_denied&error_description=Permissions+denied");

    render(<AuthCallbackPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith(
        expect.stringContaining("/login?error=Google%20sign-in%20was%20cancelled.%20Please%20try%20again.")
      );
    });
  });

  it("handles exchange code errors gracefully without leaking tokens", async () => {
    mockSearchParams = new URLSearchParams("code=invalid-code");
    mockExchangeCodeForSession.mockResolvedValueOnce({
      data: { session: null },
      error: { message: "Invalid authorization code or PKCE verifier" },
    });

    render(<AuthCallbackPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith(
        expect.stringContaining("/login?error=Invalid%20authorization%20code%20or%20PKCE%20verifier")
      );
    });
  });

  it("retrieves stored destination from sessionStorage and cleans up storage after code exchange", async () => {
    sessionStorage.setItem("auth_redirect_next", "/checkout");
    mockSearchParams = new URLSearchParams("code=valid-pkce-auth-code");
    const fakeSession = { access_token: "jwt-token-456", user: { id: "sb-user-2", email: "google2@example.com" } };
    mockExchangeCodeForSession.mockResolvedValueOnce({
      data: { session: fakeSession },
      error: null,
    });
    vi.mocked(authApi.getCurrentUser).mockResolvedValueOnce({
      id: "django-user-2",
      supabase_user_id: "sb-user-2",
      email: "google2@example.com",
      role: "customer",
      profile: { display_name: "Google Muse 2", phone: "" },
      created_at: "2026-11-01T00:00:00Z",
      updated_at: "2026-11-01T00:00:00Z",
    });

    render(<AuthCallbackPage />);

    await waitFor(() => {
      expect(mockExchangeCodeForSession).toHaveBeenCalledWith("valid-pkce-auth-code");
      expect(mockReplace).toHaveBeenCalledWith("/checkout");
      expect(sessionStorage.getItem("auth_redirect_next")).toBeNull();
    });
  });
});

