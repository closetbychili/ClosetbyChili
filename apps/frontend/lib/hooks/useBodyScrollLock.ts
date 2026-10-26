import { useEffect } from "react";

let activeModalCount = 0;

/**
 * Custom React hook that locks document body scrolling when a modal,
 * drawer, or dialog overlay is active.
 *
 * Uses reference counting so nested or chained modals do not prematurely
 * unlock body scroll when an inner modal is dismissed.
 *
 * @param isLocked Whether the current modal is open/active.
 */
export function useBodyScrollLock(isLocked: boolean = true) {
  useEffect(() => {
    if (!isLocked || typeof document === "undefined") return;

    if (activeModalCount === 0) {
      document.body.style.overflow = "hidden";
    }
    activeModalCount += 1;

    return () => {
      activeModalCount = Math.max(0, activeModalCount - 1);
      if (activeModalCount === 0) {
        document.body.style.overflow = "";
      }
    };
  }, [isLocked]);
}
