import { describe, it, expect } from "vitest";
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
});
