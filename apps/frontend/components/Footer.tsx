import Link from "next/link";
import Image from "next/image";
import {
  FOOTER_SHOP,
  FOOTER_SHOP_BY_SET,
  FOOTER_CUSTOMER_CARE,
  FOOTER_ABOUT,
  FOOTER_LEGAL,
} from "@/lib/homepage-data";

export default function Footer() {
  return (
    <footer className="bg-[#8b000a] text-white">
      {/* ── Main Footer Columns ───────────────────────────── */}
      <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12 pt-16 sm:pt-20 pb-12 sm:pb-16 border-b border-white/15">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 sm:gap-10 lg:gap-8">
          {/* Column 1: SHOP */}
          <div>
            <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.28em] text-gold-light mb-4 sm:mb-5 border-b border-white/15 pb-2">
              Shop
            </p>
            <ul className="space-y-2.5">
              {FOOTER_SHOP.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-xs sm:text-[13px] text-white/80 hover:text-gold-light transition-colors block py-0.5"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 2: SHOP BY SET */}
          <div>
            <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.28em] text-gold-light mb-4 sm:mb-5 border-b border-white/15 pb-2">
              Shop by Set
            </p>
            <ul className="space-y-2.5">
              {FOOTER_SHOP_BY_SET.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-xs sm:text-[13px] text-white/80 hover:text-gold-light transition-colors block py-0.5"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: CUSTOMER CARE */}
          <div>
            <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.28em] text-gold-light mb-4 sm:mb-5 border-b border-white/15 pb-2">
              Customer Care
            </p>
            <ul className="space-y-2.5">
              {FOOTER_CUSTOMER_CARE.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-xs sm:text-[13px] text-white/80 hover:text-gold-light transition-colors block py-0.5"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: ABOUT */}
          <div>
            <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.28em] text-gold-light mb-4 sm:mb-5 border-b border-white/15 pb-2">
              About
            </p>
            <ul className="space-y-2.5">
              {FOOTER_ABOUT.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-xs sm:text-[13px] text-white/80 hover:text-gold-light transition-colors block py-0.5"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 5: LEGAL */}
          <div className="col-span-2 sm:col-span-1">
            <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.28em] text-gold-light mb-4 sm:mb-5 border-b border-white/15 pb-2">
              Legal
            </p>
            <ul className="space-y-2.5">
              {FOOTER_LEGAL.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-xs sm:text-[13px] text-white/80 hover:text-gold-light transition-colors block py-0.5"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ── Bottom Footer Area: Actual Logo, Socials, Copyright ── */}
      <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12 py-8 sm:py-10 flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Actual Closet by Chili Logo Asset on Light Plaque */}
        <div className="flex items-center gap-4">
          <div className="relative w-[180px] sm:w-[220px] h-[52px] sm:h-[58px] bg-[#fff8f7] px-4 py-1.5 rounded-xs shadow-sm flex items-center justify-center">
            <Image
              src="/assets/brand/logo.png"
              alt="Closet by Chili"
              fill
              className="object-contain p-1"
            />
          </div>
        </div>

        {/* Social Links */}
        <div className="flex items-center gap-8 text-[11px] font-semibold uppercase tracking-[0.25em] text-white/80">
          <a
            href="https://instagram.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gold-light transition-colors"
          >
            Instagram
          </a>
          <span className="w-1.5 h-1.5 rounded-full bg-gold/50" />
          <a
            href="https://facebook.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gold-light transition-colors"
          >
            Facebook
          </a>
        </div>

        {/* Copyright */}
        <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-white/70 text-center md:text-right font-medium">
          © 2024 CLOSET BY CHILI. HANDCRAFTED IN INDIA.
        </div>
      </div>
    </footer>
  );
}
