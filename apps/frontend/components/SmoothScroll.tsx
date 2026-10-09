"use client";

import { ReactLenis } from "lenis/react";
import { ReactNode } from "react";

interface SmoothScrollProps {
  children: ReactNode;
}

/**
 * SmoothScroll component powered by Lenis.
 * Provides a buttery-smooth luxury scrolling experience across all devices
 * while preserving native scroll accessibility and preventing conflicts in overlay drawers.
 */
export default function SmoothScroll({ children }: SmoothScrollProps) {
  return (
    <ReactLenis
      root
      options={{
        lerp: 0.09,
        duration: 1.2,
        smoothWheel: true,
        wheelMultiplier: 1,
        touchMultiplier: 1.2,
        infinite: false,
      }}
    >
      {children}
    </ReactLenis>
  );
}
