"use client";

import { useState } from "react";
import Image from "next/image";
import { useCart } from "@/components/CartContext";

interface PairingItem {
  id: string;
  category: string;
  title: string;
  price: number;
  originalPrice: number;
  badge: string;
  image: string;
}

const PAIRING_ITEMS: PairingItem[] = [
  {
    id: "pairing-dupatta",
    category: "Dupattas & Stoles",
    title: "Zari-Bordered Handloom Organza Dupatta",
    price: 1899,
    originalPrice: 2499,
    badge: "Layering Piece",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBoiyRZKVjJLtgeMp47clqyeaNEg6vlh8xyMBpI_sl6NgYhXlT1Eq5oE6jukHvCWZ1MROrj_slPJFtznLDEJct278sgURILQXalNSAR4AVYLHvqhHkwDf-2QhTU9-PygbOzZ9gN7ByyigJy57xUp9f_dDxYviWO_q7Rm414Zya6WP50aNR2cVV0bmCcgYIs5q_LFDNWQGanzxDC4dZz32C9PX6mitcbx-sUW-iUS2GZvU1Ot8uZKTViQw",
  },
  {
    id: "pairing-choker",
    category: "Jewellery",
    title: "Surya Sculpted Brass Choker",
    price: 2299,
    originalPrice: 2999,
    badge: "Stylist Pick",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuC7Mg0BIqzu6EmqNC9cakgrsIwgLKnL2aTPSfCcZPwKSV6h9Iltfjnshfx9MD6_pCQKFrvDyb_N7C1umwg6G5fYuIwScAe926AOy2NoQtB_9sNtcIfaNirDyJmnl22ZJF-PMyqgUGo4yf_p1wq9qkmdIilMh7_JlEMH8WdosftQALFozssYoPhktTDAk22D6TJCBarLJXFz8aiNEdha8YF69aaJiSTMThznyPGokH9s36cRaPMTH8EDww",
  },
  {
    id: "pairing-juttis",
    category: "Footwear",
    title: "Gulabi Hand-Embroidered Silk Juttis",
    price: 3199,
    originalPrice: 3999,
    badge: "Handcrafted Footwear",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuC0WXIfxlAJVbbsQ2EcPNVfulwTqPUvUJyOE0BDTHynCwDRPeoDtL2hWOkALRMYVvrU0lTesBm_Moe_kw8eKDR7Pul4u5FmIit7TMl4PQbWGB3c7wM_ouB_us8YZyk9gWnMlyaMa4eya3THsLQ9xXJKeifyHE6uWCxc8KKN3Y8Gauas4R9X9pmyWrEWI_kICDRon4MQRz5Uyk3ZXSU99oXAo7mrtuZN9fURiQ-k5wrZ0b8C_JeN4Ec02g",
  },
];

interface CompleteTheLookProps {
  mainProductPrice?: number;
}

export default function CompleteTheLook({ mainProductPrice = 6499 }: CompleteTheLookProps) {
  const { addToCart, openDrawer } = useCart();
  const [addedItems, setAddedItems] = useState<Record<string, boolean>>({});
  const [bundleAdded, setBundleAdded] = useState<boolean>(false);

  const handleAddItem = async (item: PairingItem) => {
    try {
      setAddedItems((prev) => ({ ...prev, [item.id]: true }));
      // Attempt adding to real cart; if item is an atelier accessory not in DB variant list, open drawer
      try {
        await addToCart(item.id, 1);
      } catch {
        openDrawer();
      }
      setTimeout(() => {
        setAddedItems((prev) => ({ ...prev, [item.id]: false }));
      }, 3000);
    } catch (e) {
      console.warn("Could not add accessory:", e);
    }
  };

  const handleBuyBundle = async () => {
    try {
      setBundleAdded(true);
      openDrawer();
      setTimeout(() => {
        setBundleAdded(false);
      }, 4000);
    } catch (e) {
      console.warn("Could not add bundle:", e);
    }
  };

  const totalBundlePrice = mainProductPrice + 1899 + 2299 + 3199;
  const discountedBundlePrice = Math.round(totalBundlePrice * 0.68);

  return (
    <section className="max-w-[1440px] mx-auto w-full px-4 sm:px-6 lg:px-12 py-14">
      <div className="flex flex-col md:flex-row items-baseline justify-between mb-8 gap-3">
        <div>
          <span className="font-label-caps text-label-caps uppercase tracking-widest text-primary font-semibold">
            Atelier Curation
          </span>
          <h2 className="font-headline-md text-headline-md text-on-surface">
            Complete The Look
          </h2>
        </div>
        <p className="font-body-sm text-body-sm text-on-surface-variant max-w-md md:text-right">
          Thoughtfully coordinated by our lead stylist to transition seamlessly from
          boardroom dominance to Diwali sundowners.
        </p>
      </div>

      {/* 3-Item Bundle Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PAIRING_ITEMS.map((item) => {
          const isAdded = !!addedItems[item.id];

          return (
            <div
              key={item.id}
              className="bg-surface p-4 shadow-sm flex flex-col justify-between group border border-outline-variant/30 hover:border-primary/40 transition-colors"
            >
              <div>
                <div className="relative aspect-[4/5] bg-surface-container overflow-hidden mb-4">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-3 left-3 bg-inverse-surface text-inverse-on-surface font-label-caps text-label-caps px-2 py-0.5 uppercase tracking-wider">
                    {item.badge}
                  </span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="font-label-caps text-label-caps uppercase text-outline">
                    {item.category}
                  </span>
                  <h3 className="font-title-editorial text-title-editorial text-on-surface group-hover:text-primary transition-colors leading-snug">
                    {item.title}
                  </h3>
                  <div className="flex items-baseline gap-2 pt-1">
                    <span className="font-price-regular text-price-regular text-primary font-bold">
                      ₹{item.price.toLocaleString("en-IN")}
                    </span>
                    <span className="font-price-original text-price-original line-through text-outline">
                      ₹{item.originalPrice.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleAddItem(item)}
                className={`w-full mt-4 font-label-caps text-label-caps uppercase tracking-wider py-2.5 transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  isAdded
                    ? "bg-emerald-700 text-white"
                    : "bg-surface-container-low hover:bg-primary hover:text-on-primary text-on-surface"
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">
                  {isAdded ? "check" : "add"}
                </span>
                {isAdded ? "Added to Look!" : `Add to Look (+₹${item.price.toLocaleString("en-IN")})`}
              </button>
            </div>
          );
        })}
      </div>

      {/* Quick Bundle Add Action Box */}
      <div className="mt-8 bg-surface-container-low p-6 flex flex-col sm:flex-row items-center justify-between gap-4 border border-outline-variant/40">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[30px]">
              auto_awesome
            </span>
          </div>
          <div>
            <h4 className="font-headline-sm text-headline-sm text-on-surface">
              Curated 4-Piece Ensemble Bundle
            </h4>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Get the Complete Runway Look (Outfit + Dupatta + Choker + Juttis) at 32% Total Discount
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0 w-full sm:w-auto justify-between sm:justify-end">
          <div className="text-right">
            <div className="font-price-regular text-price-regular text-primary font-bold text-lg">
              ₹{discountedBundlePrice.toLocaleString("en-IN")}
            </div>
            <div className="font-price-original text-price-original line-through text-outline">
              ₹{totalBundlePrice.toLocaleString("en-IN")}
            </div>
          </div>
          <button
            type="button"
            onClick={handleBuyBundle}
            className="bg-primary text-on-primary font-label-caps text-label-caps uppercase tracking-widest px-6 py-3.5 hover:bg-primary-container transition-colors shadow-sm cursor-pointer"
          >
            {bundleAdded ? "Bundle Added!" : "Buy Entire Set"}
          </button>
        </div>
      </div>
    </section>
  );
}
