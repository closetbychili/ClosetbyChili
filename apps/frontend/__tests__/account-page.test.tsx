import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AccountPage from "@/components/AccountPage";
import * as authHook from "@/components/AuthProvider";
import * as authApi from "@/lib/api/auth";
import * as addressApi from "@/lib/api/addresses";
import * as orderApi from "@/lib/api/orders";

vi.mock("@/components/Header", () => ({
  default: () => <header data-testid="mock-header">Header</header>,
}));

vi.mock("@/components/Footer", () => ({
  default: () => <footer data-testid="mock-footer">Footer</footer>,
}));

describe("AccountPage Redesign Integration", () => {
  const mockSignOut = vi.fn().mockResolvedValue(undefined);
  const mockUser: authApi.CurrentUser = {
    id: "user-123",
    supabase_user_id: "sb-123",
    email: "rhea.sharma@gmail.com",
    role: "customer",
    profile: {
      display_name: "Rhea Sharma",
      phone: "+91 98201 54321",
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(authHook, "useAuth").mockReturnValue({
      user: mockUser,
      session: { access_token: "mock-token" } as any,
      loading: false,
      signOut: mockSignOut,
      supabaseUser: null,
      refreshUser: vi.fn(),
    });

    vi.spyOn(addressApi, "getAddresses").mockResolvedValue({
      count: 1,
      results: [
        {
          id: "addr-1",
          full_name: "Rhea Sharma",
          phone: "+91 98201 54321",
          address_line1: "402 Atelier Heights",
          address_line2: "C-Scheme",
          city: "Jaipur",
          state: "Rajasthan",
          postal_code: "302001",
          country: "India",
          address_type: "HOME",
          is_default: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
    } as any);

    vi.spyOn(orderApi, "getOrders").mockResolvedValue({
      count: 1,
      results: [
        {
          order_number: "CC-90123",
          created_at: new Date().toISOString(),
          status: "DELIVERED",
          payment_status: "PAID",
          currency: "INR",
          total: "4999.00",
          item_count: 2,
        },
      ],
    } as any);
  });

  it("renders user information, completion score, and initial profile view", () => {
    render(<AccountPage />);

    expect(screen.getByText("Rhea Sharma")).toBeInTheDocument();
    expect(screen.getAllByText("rhea.sharma@gmail.com").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/COMPLETED/i)).toBeInTheDocument();
    expect(screen.getAllByText("My Profile").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Basic Information")).toBeInTheDocument();
    expect(screen.getByText("Contact Information")).toBeInTheDocument();
    expect(screen.getByText("+91 98201 54321")).toBeInTheDocument();
  });

  it("toggles basic info inline editing and allows saving", async () => {
    const updateSpy = vi.spyOn(authApi, "updateCurrentProfile").mockResolvedValue({
      id: "user-123",
      supabase_user_id: "sb-123",
      email: "rhea.sharma@gmail.com",
      role: "customer",
      profile: {
        display_name: "Rhea Singhania",
        phone: "+91 98201 54321",
      },
      created_at: "",
      updated_at: "",
    });

    render(<AccountPage />);

    const editBtn = screen.getByRole("button", { name: /edit basic information/i });
    fireEvent.click(editBtn);

    const lastNameInput = screen.getByLabelText(/last name/i);
    fireEvent.change(lastNameInput, { target: { value: "Singhania" } });

    const saveBtn = screen.getByRole("button", { name: /save changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith({
        display_name: "Rhea Singhania",
      });
    });
  });

  it("switches to My Orders tab and shows retrieved orders", async () => {
    render(<AccountPage />);

    const ordersNav = screen.getByRole("button", { name: /my orders/i });
    fireEvent.click(ordersNav);

    await waitFor(() => {
      expect(screen.getByText("#CC-90123")).toBeInTheDocument();
      expect(screen.getByText("DELIVERED")).toBeInTheDocument();
    });
  });

  it("switches to My Addresses tab and displays saved address", async () => {
    render(<AccountPage />);

    const addressesNav = screen.getByRole("button", { name: /my addresses/i });
    fireEvent.click(addressesNav);

    await waitFor(() => {
      expect(screen.getByText(/402 Atelier Heights/i)).toBeInTheDocument();
      expect(screen.getByText(/Jaipur/i)).toBeInTheDocument();
      expect(screen.getByText("Default Address")).toBeInTheDocument();
    });
  });

  it("switches to My Bank Account tab and displays UPI refund registry", () => {
    render(<AccountPage />);

    const bankNav = screen.getByRole("button", { name: /my bank account/i });
    fireEvent.click(bankNav);

    expect(screen.getByText(/Direct Refund Registry/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/yourname@/i)).toBeInTheDocument();
  });

  it("handles sign out when clicking logout", async () => {
    render(<AccountPage />);

    const logoutButtons = screen.getAllByRole("button", { name: /sign out|logout/i });
    fireEvent.click(logoutButtons[0]);

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
    });
  });
});
