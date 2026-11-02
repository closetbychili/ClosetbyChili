"use client";

import { ReactLenis, useLenis } from "lenis/react";
import { ReactNode, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

interface SmoothScrollProps {
  children: ReactNode;
}

/**
 * Ensures that on client-side route transitions (Next.js Link navigation),
 * both the Lenis virtual scroll engine (when active) and window scroll reset cleanly to top.
 */
function ScrollReset({ isLenis }: { isLenis: boolean }) {
  const pathname = usePathname();
  const lenis = useLenis();

  useEffect(() => {
    if (lenis && isLenis) {
      lenis.scrollTo(0, { immediate: true });
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
    const raf = requestAnimationFrame(() => {
      if (lenis && isLenis) {
        lenis.scrollTo(0, { immediate: true });
      }
      window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
    });
    return () => cancelAnimationFrame(raf);
  }, [pathname, lenis, isLenis]);

  return null;
}

/**
 * SmoothScroll component powered by Lenis.
 * Provides a buttery-smooth scrolling experience on desktop while ensuring:
 * 1. Mobile touch devices use 100% native momentum scrolling without gesture interception.
 * 2. Horizontal category & product carousels remain freely swipeable without scroll-locking.
 * 3. Reduced motion preferences are strictly respected.
 */
export default function SmoothScroll({ children }: SmoothScrollProps) {
  const [useNativeScroll, setUseNativeScroll] = useState<boolean>(false);

  useEffect(() => {
    // Check media queries without relying on fragile user-agent sniffing
    const checkScrollPreference = () => {
      const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const isTouchDevice = window.matchMedia("(pointer: coarse)").matches;
      setUseNativeScroll(prefersReduced || isTouchDevice);
    };

    checkScrollPreference();

    const motionMql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const touchMql = window.matchMedia("(pointer: coarse)");

    const listener = () => checkScrollPreference();
    motionMql.addEventListener?.("change", listener);
    touchMql.addEventListener?.("change", listener);

    return () => {
      motionMql.removeEventListener?.("change", listener);
      touchMql.removeEventListener?.("change", listener);
    };
  }, []);

  // On touch devices or reduced motion, bypass Lenis completely for native scrolling
  if (useNativeScroll) {
    return (
      <>
        <ScrollReset isLenis={false} />
        {children}
      </>
    );
  }

  return (
    <ReactLenis
      root
      options={{
        lerp: 0.09,
        duration: 1.2,
        smoothWheel: true,
        wheelMultiplier: 1,
        syncTouch: false,
        touchMultiplier: 0,
        infinite: false,
      }}
    >
      <ScrollReset isLenis={true} />
      {children}
    </ReactLenis>
  );
}
