import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import SmoothScroll from "@/components/SmoothScroll";

describe("SmoothScroll Component (Lenis Integration)", () => {
  it("renders child content properly", () => {
    render(
      <SmoothScroll>
        <div data-testid="scroll-content">Luxury Ethnic Wear Content</div>
      </SmoothScroll>
    );

    expect(screen.getByTestId("scroll-content")).toBeInTheDocument();
    expect(screen.getByText("Luxury Ethnic Wear Content")).toBeInTheDocument();
  });

  it("exempts admin console routes to maintain native scroll and modal isolation", async () => {
    const navigation = await import("next/navigation");
    vi.spyOn(navigation, "usePathname").mockReturnValue("/admin/coupons");

    render(
      <SmoothScroll>
        <div data-testid="admin-content">Admin Dashboard Content</div>
      </SmoothScroll>
    );

    expect(screen.getByTestId("admin-content")).toBeInTheDocument();
    expect(screen.getByText("Admin Dashboard Content")).toBeInTheDocument();
  });
});
