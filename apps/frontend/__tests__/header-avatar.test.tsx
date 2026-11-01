import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Header from "@/components/Header";
import * as authHook from "@/components/AuthProvider";
import * as cartHook from "@/components/CartContext";
import { resolveAvatarUrl } from "@/lib/avatar";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

describe("Header Google PFP & resolveAvatarUrl Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(cartHook, "useCart").mockReturnValue({
      itemCount: 0,
      subtotal: 0,
      openDrawer: vi.fn(),
      closeDrawer: vi.fn(),
      isOpen: false,
      items: [],
      addItem: vi.fn(),
      removeItem: vi.fn(),
      updateQuantity: vi.fn(),
      clearCart: vi.fn(),
      coupon: null,
      couponDiscount: 0,
      finalTotal: 0,
      applyCoupon: vi.fn(),
      removeCoupon: vi.fn(),
      isLoading: false,
      isApplyingCoupon: false,
      couponError: null,
    } as any);
  });

  it("resolves avatar URL from user object", () => {
    const url = resolveAvatarUrl(
      { avatar_url: "https://lh3.googleusercontent.com/user-pfp" } as any,
      null,
      null
    );
    expect(url).toBe("https://lh3.googleusercontent.com/user-pfp");
  });

  it("resolves avatar URL from Supabase user_metadata", () => {
    const url = resolveAvatarUrl(
      null,
      { user_metadata: { avatar_url: "https://lh3.googleusercontent.com/sb-pfp" } } as any,
      null
    );
    expect(url).toBe("https://lh3.googleusercontent.com/sb-pfp");
  });

  it("resolves avatar URL from Google picture field in metadata or session", () => {
    const url = resolveAvatarUrl(
      null,
      null,
      { user: { user_metadata: { picture: "https://lh3.googleusercontent.com/picture-pfp" } } } as any
    );
    expect(url).toBe("https://lh3.googleusercontent.com/picture-pfp");
  });

  it("renders Google profile picture in header when user is authenticated with avatar", () => {
    vi.spyOn(authHook, "useAuth").mockReturnValue({
      user: {
        id: "user-1",
        supabase_user_id: "sb-1",
        email: "priya@gmail.com",
        role: "customer",
        profile: { display_name: "Priya", phone: "" },
        avatar_url: "https://lh3.googleusercontent.com/a/google-pfp-123",
        created_at: "",
        updated_at: "",
      },
      session: null,
      supabaseUser: null,
      loading: false,
      signOut: vi.fn(),
      refreshUser: vi.fn(),
    });

    render(<Header />);

    const pfpImages = screen.getAllByRole("img", { name: "Priya" });
    expect(pfpImages.length).toBeGreaterThanOrEqual(1);
    expect(pfpImages[0]).toHaveAttribute("src", "https://lh3.googleusercontent.com/a/google-pfp-123");
  });

  it("falls back to default person icon when avatar errors in header", () => {
    vi.spyOn(authHook, "useAuth").mockReturnValue({
      user: {
        id: "user-1",
        supabase_user_id: "sb-1",
        email: "priya@gmail.com",
        role: "customer",
        profile: { display_name: "Priya", phone: "" },
        avatar_url: "https://lh3.googleusercontent.com/a/broken-image",
        created_at: "",
        updated_at: "",
      },
      session: null,
      supabaseUser: null,
      loading: false,
      signOut: vi.fn(),
      refreshUser: vi.fn(),
    });

    render(<Header />);

    const pfpImage = screen.getAllByRole("img", { name: "Priya" })[0];
    fireEvent.error(pfpImage);

    // After error, fallback icon appears
    expect(screen.getAllByText("person").length).toBeGreaterThanOrEqual(1);
  });
});

