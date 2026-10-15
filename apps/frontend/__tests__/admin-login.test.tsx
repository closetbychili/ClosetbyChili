import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AdminLoginForm from "@/components/admin/AdminLoginForm";
import * as adminApi from "@/lib/api/admin";

const pushMock = vi.fn();
const refreshMock = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
    replace: vi.fn(),
  }),
  useSearchParams: () => mockSearchParams,
}));

const signInWithPasswordMock = vi.fn();
const signOutMock = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args: unknown[]) => signInWithPasswordMock(...args),
      signOut: (...args: unknown[]) => signOutMock(...args),
      getSession: vi.fn(),
    },
  },
}));

vi.mock("@/lib/api/admin", () => ({
  verifyAdminAuth: vi.fn(),
}));

describe("AdminLoginForm UI & Authentication Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  it("renders the Stitch admin login design elements faithfully", () => {
    render(<AdminLoginForm />);

    expect(screen.getByText("Closet by Chilli")).toBeInTheDocument();
    expect(screen.getByText("Admin Console")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Sign In" })).toBeInTheDocument();
    expect(screen.getByText(/Enter your credentials to access the admin console/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/work email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^sign in$/i })).toBeInTheDocument();
    expect(screen.getByText("Authorized personnel only")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /return to store/i })).toHaveAttribute("href", "/");
    expect(screen.getByText(/© 2024 Closet by Chilli. Atelier Operations./i)).toBeInTheDocument();
  });

  it("toggles password visibility with accessible button", () => {
    render(<AdminLoginForm />);

    const passwordInput = screen.getByLabelText(/^password$/i) as HTMLInputElement;
    const toggleButton = screen.getByRole("button", { name: /toggle password visibility/i });

    expect(passwordInput.type).toBe("password");

    fireEvent.click(toggleButton);
    expect(passwordInput.type).toBe("text");

    fireEvent.click(toggleButton);
    expect(passwordInput.type).toBe("password");
  });

  it("validates empty and invalid email and password inline", async () => {
    render(<AdminLoginForm />);

    const submitBtn = screen.getByRole("button", { name: /^sign in$/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText("Work email is required.")).toBeInTheDocument();
    expect(await screen.findByText("Password is required.")).toBeInTheDocument();
    expect(signInWithPasswordMock).not.toHaveBeenCalled();

    // Invalid email format
    const emailInput = screen.getByLabelText(/work email/i);
    fireEvent.change(emailInput, { target: { value: "invalid-email" } });
    fireEvent.click(submitBtn);

    expect(await screen.findByText("Please enter a valid email address.")).toBeInTheDocument();
    expect(signInWithPasswordMock).not.toHaveBeenCalled();
  });

  it("displays helpful error alert when Supabase credentials are invalid", async () => {
    signInWithPasswordMock.mockResolvedValueOnce({
      data: { session: null },
      error: { message: "Invalid login credentials" },
    });

    render(<AdminLoginForm />);

    fireEvent.change(screen.getByLabelText(/work email/i), {
      target: { value: "admin@closetbychilli.com" },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: "WrongPassword" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));

    expect(
      await screen.findByText("Invalid email or password. Please verify your credentials.")
    ).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("denies access, signs out, and warns when customer logs into admin console", async () => {
    signInWithPasswordMock.mockResolvedValueOnce({
      data: {
        session: { access_token: "customer-token-123" },
      },
      error: null,
    });

    const error403 = new Error("Admin privileges required");
    (error403 as unknown as { status: number }).status = 403;
    vi.mocked(adminApi.verifyAdminAuth).mockRejectedValueOnce(error403);

    render(<AdminLoginForm />);

    fireEvent.change(screen.getByLabelText(/work email/i), {
      target: { value: "customer@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: "CustomerPass123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));

    await waitFor(() => {
      expect(signOutMock).toHaveBeenCalled();
    });

    expect(
      await screen.findByText("Access denied. Your account does not have administrative privileges.")
    ).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("successfully signs in verified admin and redirects to /admin", async () => {
    signInWithPasswordMock.mockResolvedValueOnce({
      data: {
        session: { access_token: "admin-jwt-valid" },
      },
      error: null,
    });

    vi.mocked(adminApi.verifyAdminAuth).mockResolvedValueOnce({
      id: "admin-uuid-1",
      email: "admin@closetbychilli.com",
      role: "admin",
      is_admin: true,
      is_staff: true,
      is_active: true,
      created_at: "2026-01-01T00:00:00Z",
    });

    render(<AdminLoginForm />);

    fireEvent.change(screen.getByLabelText(/work email/i), {
      target: { value: "admin@closetbychilli.com" },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: "AtelierAdmin@2026" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));

    await waitFor(() => {
      expect(adminApi.verifyAdminAuth).toHaveBeenCalledWith("admin-jwt-valid");
      expect(pushMock).toHaveBeenCalledWith("/admin");
    });
  });

  it("respects safe internal redirect parameter after successful admin login", async () => {
    mockSearchParams = new URLSearchParams("redirect=/admin/inventory");

    signInWithPasswordMock.mockResolvedValueOnce({
      data: {
        session: { access_token: "admin-jwt-valid" },
      },
      error: null,
    });

    vi.mocked(adminApi.verifyAdminAuth).mockResolvedValueOnce({
      id: "admin-uuid-1",
      email: "admin@closetbychilli.com",
      role: "admin",
      is_admin: true,
      is_staff: true,
      is_active: true,
      created_at: "2026-01-01T00:00:00Z",
    });

    render(<AdminLoginForm />);

    fireEvent.change(screen.getByLabelText(/work email/i), {
      target: { value: "admin@closetbychilli.com" },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: "AtelierAdmin@2026" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/admin/inventory");
    });
  });
});
