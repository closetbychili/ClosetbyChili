"use client";

import { useState } from "react";
import Link from "next/link";

export default function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail("");
      setTimeout(() => setSubscribed(false), 4000);
    }
  };

  return (
    <footer className="w-full bg-surface-container-low border-t border-outline-variant/30">
      <div className="max-w-360 mx-auto px-4 sm:px-6 lg:px-12 pt-12 sm:pt-16 pb-28 sm:pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-8">
          {/* Column 1: Brand & Bio (4 Cols) */}
          <div className="lg:col-span-4 flex flex-col gap-3.5 text-center sm:text-left items-center sm:items-start">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt="Closet by Chili Logo"
                className="h-10 md:h-12 w-auto object-contain"
                src="/assets/brand/logo.png"
              />
            </div>
            <p className="font-title-editorial text-title-editorial text-tertiary italic">
              Bold. Feminine. Timeless.
            </p>
            <p className="font-body-md text-xs sm:text-body-md text-on-surface-variant max-w-sm leading-relaxed">
              Where style meets confidence. Contemporary silhouettes infused with bold craftsmanship and modern ethnic sensibilities for the discerning muse.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <a
                aria-label="Social Channel"
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 bg-surface border border-outline-variant/50 flex items-center justify-center text-on-surface hover:bg-primary hover:text-on-primary transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">share</span>
              </a>
              <a
                aria-label="Gallery"
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 bg-surface border border-outline-variant/50 flex items-center justify-center text-on-surface hover:bg-primary hover:text-on-primary transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">photo_camera</span>
              </a>
              <a
                aria-label="Community"
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 bg-surface border border-outline-variant/50 flex items-center justify-center text-on-surface hover:bg-primary hover:text-on-primary transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">public</span>
              </a>
            </div>
          </div>

          {/* Column 2 & 3: Grouped in 2 Columns on Mobile for Ergonomic Scanning (4 Cols Desktop) */}
          <div className="lg:col-span-4 grid grid-cols-2 gap-4 sm:gap-8">
            {/* Shop Categories */}
            <div className="flex flex-col gap-2.5 sm:gap-3">
              <h3 className="font-label-caps text-[10.5px] sm:text-label-caps tracking-widest text-on-surface uppercase font-semibold">
                Categories
              </h3>
              <nav className="flex flex-col gap-2 pt-0.5" data-active-classes="text-primary font-medium">
                <Link
                  href="/products?collection=new-arrivals"
                  data-path="new-arrivals"
                  className="font-body-sm text-[12px] sm:text-body-md text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  New In
                </Link>
                <Link
                  href="/products?category=co-ord-sets"
                  data-path="co-ord-sets"
                  className="font-body-sm text-[12px] sm:text-body-md text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  Co-ord Sets
                </Link>
                <Link
                  href="/products?category=kurtis"
                  data-path="kurtas-and-tunics"
                  className="font-body-sm text-[12px] sm:text-body-md text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  Kurtas &amp; Tunics
                </Link>
                <Link
                  href="/products?category=dresses"
                  data-path="dresses"
                  className="font-body-sm text-[12px] sm:text-body-md text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  Dresses
                </Link>
                <Link
                  href="/products?category=anarkali-sets"
                  data-path="festive-sets"
                  className="font-body-sm text-[12px] sm:text-body-md text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  Festive Edit
                </Link>
                <Link
                  href="/#brand-manifesto"
                  data-path="wholesale"
                  className="font-body-sm text-[12px] sm:text-body-md text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  Wholesale
                </Link>
              </nav>
            </div>

            {/* Customer Support */}
            <div className="flex flex-col gap-2.5 sm:gap-3">
              <h3 className="font-label-caps text-[10.5px] sm:text-label-caps tracking-widest text-on-surface uppercase font-semibold">
                Client Care
              </h3>
              <nav className="flex flex-col gap-2 pt-0.5" data-active-classes="text-primary font-medium">
                <Link
                  href="/account?tab=orders"
                  data-path="track-order"
                  className="font-body-sm text-[12px] sm:text-body-md text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  Track Order
                </Link>
                <Link
                  href="/#brand-manifesto"
                  data-path="shipping-and-delivery"
                  className="font-body-sm text-[12px] sm:text-body-md text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  Shipping Info
                </Link>
                <Link
                  href="/#brand-manifesto"
                  data-path="returns-and-exchanges"
                  className="font-body-sm text-[12px] sm:text-body-md text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  Returns Policy
                </Link>
                <Link
                  href="/#brand-manifesto"
                  data-path="size-guide"
                  className="font-body-sm text-[12px] sm:text-body-md text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  Bespoke Sizing
                </Link>
                <Link
                  href="/#brand-manifesto"
                  data-path="contact"
                  className="font-body-sm text-[12px] sm:text-body-md text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  WhatsApp Care
                </Link>
              </nav>
            </div>
          </div>

          {/* Column 4: Newsletter & Quick Links (4 Cols) */}
          <div className="lg:col-span-4 flex flex-col gap-3.5">
            <h3 className="font-label-caps text-label-caps tracking-widest text-on-surface uppercase font-semibold">
              Stay In The Chilli Loop
            </h3>
            <p className="font-body-md text-xs sm:text-body-md text-on-surface-variant">
              Be the first to preview new collections, runway drops, and intimate festive promotions.
            </p>

            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2 pt-1">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="bg-surface border border-outline-variant/60 px-3.5 py-2.5 sm:px-4 sm:py-3 text-body-sm sm:text-body-md font-body-md text-on-surface placeholder:text-outline focus:outline-none focus:border-primary flex-1"
              />
              <button
                type="submit"
                className="bg-primary-container text-on-primary font-label-caps text-label-caps uppercase px-5 py-2.5 sm:px-6 sm:py-3 tracking-widest hover:bg-primary transition-colors shrink-0 font-semibold cursor-pointer"
              >
                Subscribe
              </button>
            </form>

            {subscribed && (
              <p className="text-xs text-primary font-medium animate-fade-in">
                Thank you for subscribing to Closet by Chilli!
              </p>
            )}

            <div className="flex items-center gap-4 pt-2">
              <nav className="flex flex-wrap gap-x-3.5 gap-y-1.5" data-active-classes="text-primary font-medium">
                <Link
                  href="/#brand-manifesto"
                  data-path="our-story"
                  className="font-body-sm text-[11px] sm:text-body-sm text-outline hover:text-on-surface transition-colors"
                >
                  Our Story
                </Link>
                <Link
                  href="/#brand-manifesto"
                  data-path="wholesale"
                  className="font-body-sm text-[11px] sm:text-body-sm text-outline hover:text-on-surface transition-colors"
                >
                  Wholesale &amp; B2B
                </Link>
                <Link
                  href="/#brand-manifesto"
                  data-path="privacy-policy"
                  className="font-body-sm text-[11px] sm:text-body-sm text-outline hover:text-on-surface transition-colors"
                >
                  Privacy Policy
                </Link>
                <Link
                  href="/#brand-manifesto"
                  data-path="terms-of-service"
                  className="font-body-sm text-[11px] sm:text-body-sm text-outline hover:text-on-surface transition-colors"
                >
                  Terms
                </Link>
              </nav>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Payment Badges */}
        <div className="border-t border-outline-variant/30 mt-8 sm:mt-12 pt-6 sm:pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="font-body-sm text-[11px] sm:text-body-sm text-on-surface-variant text-center md:text-left">
            © 2025 Closet by Chili. All rights reserved. Handcrafted with authentic Indian textiles.
          </p>
          <div className="flex items-center gap-1.5 sm:gap-3 text-on-surface-variant font-label-caps text-[9px] sm:text-label-caps flex-wrap justify-center">
            <span className="px-2 py-0.5 bg-surface border border-outline-variant/40">UPI</span>
            <span className="px-2 py-0.5 bg-surface border border-outline-variant/40">VISA</span>
            <span className="px-2 py-0.5 bg-surface border border-outline-variant/40">MASTERCARD</span>
            <span className="px-2 py-0.5 bg-surface border border-outline-variant/40">RAZORPAY</span>
            <span className="px-2 py-0.5 bg-surface border border-outline-variant/40">NET BANKING</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
