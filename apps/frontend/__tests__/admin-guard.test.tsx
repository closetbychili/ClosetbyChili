import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import AdminGuard from "@/components/admin/AdminGuard";
import * as adminApi from "@/lib/api/admin";

const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
    push: vi.fn(),
  }),
  usePathname: () => "/admin/orders",
}));

let mockSession: { access_token: string } | null = null;

vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({
        data: { session: mockSession },
        error: null,
      })),
    },
  },
}));

vi.mock("@/lib/api/admin", () => ({
  verifyAdminAuth: vi.fn(),
}));

describe("AdminGuard Route Protection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession = null;
  });

  it("redirects unauthenticated anonymous visitors to /admin/login preserving safe redirect", async () => {
    mockSession = null;

    render(
      <AdminGuard>
        <div>Protected Admin Secret Content</div>
      </AdminGuard>
    );

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/admin/login?redirect=%2Fadmin%2Forders");
    });

    expect(screen.queryByText("Protected Admin Secret Content")).not.toBeInTheDocument();
  });

  it("denies authenticated customer with 403 access restricted view", async () => {
    mockSession = { access_token: "customer-token" };

    const error403 = new Error("Forbidden");
    (error403 as unknown as { status: number }).status = 403;
    vi.mocked(adminApi.verifyAdminAuth).mockRejectedValueOnce(error403);

    render(
      <AdminGuard>
        <div>Protected Admin Secret Content</div>
      </AdminGuard>
    );

    await waitFor(() => {
      expect(screen.getByText("403 • Access Restricted")).toBeInTheDocument();
      expect(screen.getByText("Administrator Privileges Required")).toBeInTheDocument();
    });

    expect(screen.getByRole("link", { name: /return to store/i })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: /switch account/i })).toHaveAttribute("href", "/admin/login");
    expect(screen.queryByText("Protected Admin Secret Content")).not.toBeInTheDocument();
  });

  it("renders protected child content for verified administrators", async () => {
    mockSession = { access_token: "admin-token-valid" };

    vi.mocked(adminApi.verifyAdminAuth).mockResolvedValueOnce({
      id: "admin-1",
      email: "admin@closetbychilli.com",
      role: "admin",
      is_admin: true,
      is_staff: true,
      is_active: true,
      created_at: "2026-01-01T00:00:00Z",
    });

    render(
      <AdminGuard>
        <div>Protected Admin Secret Content</div>
      </AdminGuard>
    );

    await waitFor(() => {
      expect(screen.getByText("Protected Admin Secret Content")).toBeInTheDocument();
    });

    expect(replaceMock).not.toHaveBeenCalled();
  });
});
