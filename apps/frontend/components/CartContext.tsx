"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import type { Cart } from "@/lib/api/types";
import {
  getCart,
  addToCart as apiAddToCart,
  updateCartItem as apiUpdateCartItem,
  removeCartItem as apiRemoveCartItem,
  clearCart as apiClearCart,
  mergeCart as apiMergeCart,
  getStoredCartSession,
  clearStoredCartSession,
  createEmptyCart,
  applyCartCoupon as apiApplyCartCoupon,
  removeCartCoupon as apiRemoveCartCoupon,
} from "@/lib/api/cart";
import { ApiClientError } from "@/lib/api/client";
import { useAuth } from "./AuthProvider";

interface CartContextValue {
  cart: Cart | null;
  itemCount: number;
  subtotal: string;
  discount: string;
  total: string;
  couponCode: string | null;
  isLoading: boolean;
  error: string | null;
  isDrawerOpen: boolean;
  addToCart: (variantId: string, quantity?: number) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  applyCoupon: (code: string) => Promise<void>;
  removeCoupon: () => Promise<void>;
  openDrawer: () => void;
  closeDrawer: () => void;
  clearError: () => void;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user, session, loading: authLoading } = useAuth();
  const token = session?.access_token;
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  const lastProcessedTokenRef = useRef<string | null>(null);
  const isMergingRef = useRef<boolean>(false);
  const guestLoadedRef = useRef<boolean>(false);
  const wasAuthenticatedRef = useRef<boolean>(false);

  const clearError = useCallback(() => setError(null), []);
  const openDrawer = useCallback(() => setIsDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);

  const refreshCart = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getCart(token);
      setCart(data);
    } catch (err) {
      console.error("Failed to fetch cart:", err);
      // Preserve the last known-good cart instead of silently replacing it with an empty cart.
      setCart((current) => current ?? createEmptyCart());
      if (err instanceof ApiClientError) {
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // Single authoritative effect to coordinate initial load, auth transition, cart merge, and logout
  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (token) {
      wasAuthenticatedRef.current = true;
      if (lastProcessedTokenRef.current === token || isMergingRef.current) {
        return;
      }
      const guestSession = getStoredCartSession();
      if (guestSession) {
        isMergingRef.current = true;
        lastProcessedTokenRef.current = token;
        setIsLoading(true);
        apiMergeCart(token)
          .then((merged) => {
            setCart(merged);
          })
          .catch((err) => {
            console.error("Failed to merge guest cart:", err);
            void refreshCart();
          })
          .finally(() => {
            isMergingRef.current = false;
            setIsLoading(false);
          });
      } else {
        lastProcessedTokenRef.current = token;
        void refreshCart();
      }
    } else {
      if (wasAuthenticatedRef.current) {
        wasAuthenticatedRef.current = false;
        lastProcessedTokenRef.current = null;
        isMergingRef.current = false;
        clearStoredCartSession();
        setCart(createEmptyCart());
        setIsLoading(false);
        return;
      }

      if (guestLoadedRef.current) {
        return;
      }
      guestLoadedRef.current = true;

      let active = true;
      getCart()
        .then((data) => {
          if (active) setCart(data);
        })
        .catch((err) => {
          if (active) {
            console.error("Failed to fetch cart:", err);
            setCart((current) => current ?? createEmptyCart());
            if (err instanceof ApiClientError) {
              setError(err.message);
            }
          }
        })
        .finally(() => {
          if (active) setIsLoading(false);
        });

      return () => {
        active = false;
      };
    }
  }, [authLoading, token, refreshCart]);

  const handleAddToCart = useCallback(
    async (variantId: string, quantity = 1) => {
      try {
        setIsLoading(true);
        setError(null);
        const updatedCart = await apiAddToCart(
          {
            variant_id: variantId,
            quantity,
          },
          token
        );
        setCart(updatedCart);
        setIsDrawerOpen(true);
      } catch (err) {
        console.error("Failed to add to cart:", err);
        const message =
          err instanceof ApiClientError
            ? err.message
            : "Could not add item to bag. Please try again.";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [token]
  );

  const handleUpdateQuantity = useCallback(
    async (itemId: string, quantity: number) => {
      try {
        setIsLoading(true);
        setError(null);
        if (quantity < 1) {
          const updated = await apiRemoveCartItem(itemId, token);
          setCart(updated);
          return;
        }
        const updated = await apiUpdateCartItem(itemId, { quantity }, token);
        setCart(updated);
      } catch (err) {
        console.error("Failed to update cart quantity:", err);
        const message =
          err instanceof ApiClientError
            ? err.message
            : "Could not update quantity. Please try again.";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [token]
  );

  const handleRemoveItem = useCallback(
    async (itemId: string) => {
      try {
        setIsLoading(true);
        setError(null);
        const updated = await apiRemoveCartItem(itemId, token);
        setCart(updated);
      } catch (err) {
        console.error("Failed to remove item:", err);
        const message =
          err instanceof ApiClientError
            ? err.message
            : "Could not remove item from bag.";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [token]
  );

  const handleClearCart = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const updated = await apiClearCart(token);
      setCart(updated);
    } catch (err) {
      console.error("Failed to clear cart:", err);
      const message =
        err instanceof ApiClientError
          ? err.message
          : "Could not clear bag.";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const handleApplyCoupon = useCallback(
    async (code: string) => {
      try {
        setIsLoading(true);
        setError(null);
        const updated = await apiApplyCartCoupon(code, token);
        setCart(updated);
      } catch (err) {
        console.error("Failed to apply coupon:", err);
        const message =
          err instanceof ApiClientError
            ? err.message
            : "Could not apply coupon.";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [token]
  );

  const handleRemoveCoupon = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const updated = await apiRemoveCartCoupon(token);
      setCart(updated);
    } catch (err) {
      console.error("Failed to remove coupon:", err);
      const message =
        err instanceof ApiClientError
          ? err.message
          : "Could not remove coupon.";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const itemCount = cart?.item_count || 0;
  const subtotal = cart?.subtotal || "0.00";
  const discount = cart?.discount || "0.00";
  const total = cart?.total || cart?.subtotal || "0.00";
  const couponCode = cart?.coupon_code || null;

  return (
    <CartContext.Provider
      value={{
        cart,
        itemCount,
        subtotal,
        discount,
        total,
        couponCode,
        isLoading,
        error,
        isDrawerOpen,
        addToCart: handleAddToCart,
        updateQuantity: handleUpdateQuantity,
        removeItem: handleRemoveItem,
        clearCart: handleClearCart,
        applyCoupon: handleApplyCoupon,
        removeCoupon: handleRemoveCoupon,
        openDrawer,
        closeDrawer,
        clearError,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

const defaultCartContext: CartContextValue = {
  cart: null,
  itemCount: 0,
  subtotal: "0.00",
  discount: "0.00",
  total: "0.00",
  couponCode: null,
  isLoading: false,
  error: null,
  isDrawerOpen: false,
  addToCart: async () => {},
  updateQuantity: async () => {},
  removeItem: async () => {},
  clearCart: async () => {},
  applyCoupon: async () => {},
  removeCoupon: async () => {},
  openDrawer: () => {},
  closeDrawer: () => {},
  clearError: () => {},
  refreshCart: async () => {},
};

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  return context || defaultCartContext;
}
