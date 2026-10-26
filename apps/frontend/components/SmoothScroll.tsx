"use client";

import { ReactLenis } from "lenis/react";
import { ReactNode } from "react";
import { usePathname } from "next/navigation";

interface SmoothScrollProps {
  children: ReactNode;
}

/**
 * SmoothScroll component powered by Lenis.
 * Provides a buttery-smooth luxury scrolling experience across storefront pages
 * while exempting administrative management routes (/admin) to maintain
 * native precision, modal scroll isolation, and enterprise data table performance.
 */
export default function SmoothScroll({ children }: SmoothScrollProps) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  if (isAdmin) {
    return <>{children}</>;
  }

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
