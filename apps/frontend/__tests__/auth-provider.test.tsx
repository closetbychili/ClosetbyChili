import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act, renderHook } from "@testing-library/react";
import React from "react";

vi.unmock("@/components/AuthProvider");
import { AuthProvider, useAuth } from "@/components/AuthProvider";
import * as authApi from "@/lib/api/auth";

import type { Session } from "@supabase/supabase-js";

type AuthListener = (event: string, session: Session | null) => void;
let authStateChangeCallback: AuthListener | null = null;
let mockSession: Session | null = null;

vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({
        data: { session: mockSession },
        error: null,
      })),
      onAuthStateChange: vi.fn((cb) => {
        authStateChangeCallback = cb;
        return {
          data: {
            subscription: {
              unsubscribe: vi.fn(),
            },
          },
        };
      }),
      signOut: vi.fn(async () => {}),
    },
  },
}));

vi.mock("@/lib/api/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/auth")>();
  return {
    ...actual,
    getCurrentUser: vi.fn(),
  };
});

function ConsumerComponent() {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!user) return <div>No user</div>;
  return <div>Welcome {user.profile.display_name}</div>;
}

describe("AuthProvider & useAuth Invariant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authStateChangeCallback = null;
    mockSession = null;
  });

  it("throws when useAuth is invoked outside AuthProvider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => {
      renderHook(() => useAuth());
    }).toThrow("useAuth must be used inside AuthProvider");
    spy.mockRestore();
  });

  it("restores session and makes exactly ONE /me/ request without duplication on INITIAL_SESSION", async () => {
    const fakeToken = "jwt-access-token-123";
    mockSession = {
      access_token: fakeToken,
      user: { id: "sb-user-1", email: "test@example.com" },
    } as unknown as Session;

    const getCurrentUserMock = vi.mocked(authApi.getCurrentUser).mockImplementation(async () => {
      return {
        id: "app-user-1",
        supabase_user_id: "sb-user-1",
        email: "test@example.com",
        role: "customer",
        profile: { display_name: "Chilli Fan", phone: "" },
        created_at: "2026-09-01T00:00:00Z",
        updated_at: "2026-09-01T00:00:00Z",
      };
    });

    render(
      <AuthProvider>
        <ConsumerComponent />
      </AuthProvider>
    );

    // Simulate Supabase emitting INITIAL_SESSION immediately
    if (authStateChangeCallback) {
      await act(async () => {
        authStateChangeCallback!("INITIAL_SESSION", mockSession);
      });
    }

    await waitFor(() => {
      expect(getCurrentUserMock).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.getByText("Welcome Chilli Fan")).toBeInTheDocument();
    });

    expect(getCurrentUserMock).toHaveBeenCalledWith(fakeToken);
  });
});



