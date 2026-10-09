"use client";

import { useState } from "react";
import { useCart } from "@/components/CartContext";

interface ProductStickyMobileBarProps {
  price: number;
  variantId?: string;
  defaultSize?: string;
}

export default function ProductStickyMobileBar({
  price,
  variantId,
  defaultSize = "M",
}: ProductStickyMobileBarProps) {
  const { addToCart, openDrawer } = useCart();
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = async () => {
    if (!variantId) {
      // Smooth scroll to size selector
      window.scrollTo({ top: 300, behavior: "smooth" });
      return;
    }
    setIsAdding(true);
    try {
      await addToCart(variantId, 1);
    } catch {
      openDrawer();
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-surface/95 backdrop-blur-md p-3 shadow-xl flex items-center justify-between gap-3 border-t border-outline-variant/40">
      <div>
        <div className="font-price-regular text-price-regular text-primary font-bold text-base">
          ₹{price.toLocaleString("en-IN")}
        </div>
        <div className="text-[11px] text-on-surface-variant font-body-sm">
          Size {defaultSize} • Free Shipping
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsWishlisted(!isWishlisted)}
          className={`font-label-caps text-label-caps uppercase px-3 py-2.5 text-xs transition-colors cursor-pointer ${
            isWishlisted
              ? "bg-primary text-on-primary"
              : "bg-inverse-surface text-inverse-on-surface"
          }`}
        >
          {isWishlisted ? "Saved" : "Wishlist"}
        </button>
        <button
          type="button"
          onClick={handleAdd}
          disabled={isAdding}
          className="bg-primary hover:bg-primary-container text-on-primary font-label-caps text-label-caps uppercase px-4 py-2.5 text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">shopping_bag</span>
          {isAdding ? "Adding..." : "Add to Bag"}
        </button>
      </div>
    </div>
  );
}
