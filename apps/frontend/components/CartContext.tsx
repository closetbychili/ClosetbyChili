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
} from "@/lib/api/cart";
import { ApiClientError } from "@/lib/api/client";
import { useAuth } from "./AuthProvider";

interface CartContextValue {
  cart: Cart | null;
  itemCount: number;
  subtotal: string;
  isLoading: boolean;
  error: string | null;
  isDrawerOpen: boolean;
  addToCart: (variantId: string, quantity?: number) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  openDrawer: () => void;
  closeDrawer: () => void;
  clearError: () => void;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user, session } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  const lastMergedTokenRef = useRef<string | null>(null);
  const isMergingRef = useRef<boolean>(false);

  const clearError = useCallback(() => setError(null), []);
  const openDrawer = useCallback(() => setIsDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);

  const refreshCart = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const token = session?.access_token;
      const data = await getCart(token);
      setCart(data);
    } catch (err) {
      console.error("Failed to fetch cart:", err);
      // Fallback to empty cart on failure without crashing UI
      setCart(createEmptyCart());
      if (err instanceof ApiClientError) {
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [session?.access_token]);

  // Handle auth transition: login triggers cart merge once; logout resets cart
  useEffect(() => {
    const token = session?.access_token;
    if (user && token) {
      if (lastMergedTokenRef.current === token || isMergingRef.current) {
        return;
      }
      const guestSession = getStoredCartSession();
      if (guestSession) {
        isMergingRef.current = true;
        lastMergedTokenRef.current = token;
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
        lastMergedTokenRef.current = token;
        void refreshCart();
      }
    } else if (!user && !session) {
      if (lastMergedTokenRef.current) {
        lastMergedTokenRef.current = null;
        isMergingRef.current = false;
        clearStoredCartSession();
        setCart(createEmptyCart());
      }
    }
  }, [user, session, refreshCart]);

  // Initial cart load on client mount for unauthenticated guests
  useEffect(() => {
    let active = true;
    if (!user && !session) {
      getCart()
        .then((data) => {
          if (active) setCart(data);
        })
        .catch((err) => {
          if (active) {
            console.error("Failed to fetch cart:", err);
            setCart(createEmptyCart());
            if (err instanceof ApiClientError) {
              setError(err.message);
            }
          }
        })
        .finally(() => {
          if (active) setIsLoading(false);
        });
    }

    return () => {
      active = false;
    };
  }, []);

  const handleAddToCart = useCallback(
    async (variantId: string, quantity = 1) => {
      try {
        setIsLoading(true);
        setError(null);
        const token = session?.access_token;
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
    [session?.access_token]
  );

  const handleUpdateQuantity = useCallback(
    async (itemId: string, quantity: number) => {
      try {
        setIsLoading(true);
        setError(null);
        const token = session?.access_token;
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
    [session?.access_token]
  );

  const handleRemoveItem = useCallback(
    async (itemId: string) => {
      try {
        setIsLoading(true);
        setError(null);
        const token = session?.access_token;
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
    [session?.access_token]
  );

  const handleClearCart = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const token = session?.access_token;
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
  }, [session?.access_token]);

  const itemCount = cart?.item_count || 0;
  const subtotal = cart?.subtotal || "0.00";

  return (
    <CartContext.Provider
      value={{
        cart,
        itemCount,
        subtotal,
        isLoading,
        error,
        isDrawerOpen,
        addToCart: handleAddToCart,
        updateQuantity: handleUpdateQuantity,
        removeItem: handleRemoveItem,
        clearCart: handleClearCart,
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
  isLoading: false,
  error: null,
  isDrawerOpen: false,
  addToCart: async () => {},
  updateQuantity: async () => {},
  removeItem: async () => {},
  clearCart: async () => {},
  openDrawer: () => {},
  closeDrawer: () => {},
  clearError: () => {},
  refreshCart: async () => {},
};

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  return context || defaultCartContext;
}
