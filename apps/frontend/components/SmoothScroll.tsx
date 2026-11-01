"use client";

import { ReactLenis, useLenis } from "lenis/react";
import { ReactNode, useEffect } from "react";
import { usePathname } from "next/navigation";

interface SmoothScrollProps {
  children: ReactNode;
}

/**
 * Ensures that on client-side route transitions (Next.js Link navigation),
 * both the Lenis virtual scroll engine and window scroll reset cleanly to top.
 */
function ScrollReset() {
  const pathname = usePathname();
  const lenis = useLenis();

  useEffect(() => {
    if (lenis) {
      lenis.scrollTo(0, { immediate: true });
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
    const raf = requestAnimationFrame(() => {
      if (lenis) {
        lenis.scrollTo(0, { immediate: true });
      }
      window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
    });
    return () => cancelAnimationFrame(raf);
  }, [pathname, lenis]);

  return null;
}

/**
 * SmoothScroll component powered by Lenis.
 * Provides a buttery-smooth scrolling experience across the entire application,
 * including storefront pages and administrative console routes.
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
      <ScrollReset />
      {children}
    </ReactLenis>
  );
}
