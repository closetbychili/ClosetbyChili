import Link from "next/link";
import Image from "next/image";
import {
  SHOP_BY_TYPE,
  SHOP_BY_SET,
  CUSTOMER_LINKS,
} from "@/lib/homepage-data";

export default function Footer() {
  return (
    <footer className="bg-ink text-cream/60">
      {/* ── Main Footer ──────────────────────────────────── */}
      <div className="mx-auto max-w-[1400px] px-6 pt-16 pb-12 lg:px-10 lg:pt-20 lg:pb-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          {/* ── Brand Column ─────────────────────────────── */}
          <div className="lg:col-span-2">
            <Image
              src="/assets/brand/logo.png"
              alt="Closet by Chili"
              width={130}
              height={52}
              className="h-11 w-auto brightness-0 invert"
            />
            <p className="mt-5 max-w-xs text-xs leading-6 text-cream/40">
              Contemporary ethnic wear designed for women who wear confidence as
              beautifully as they wear tradition.
            </p>
            <p className="mt-5 text-[9px] uppercase tracking-[0.3em] text-gold/60">
              Bold · Feminine · Timeless
            </p>
          </div>

          {/* ── Shop by Type ─────────────────────────────── */}
          <div>
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.25em] text-cream/80 mb-5">
              Shop by Type
            </h3>
            <ul className="space-y-2.5">
              {SHOP_BY_TYPE.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="text-xs text-cream/40 hover:text-cream transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Shop by Set ──────────────────────────────── */}
          <div>
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.25em] text-cream/80 mb-5">
              Shop by Set
            </h3>
            <ul className="space-y-2.5">
              {SHOP_BY_SET.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="text-xs text-cream/40 hover:text-cream transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Customer ─────────────────────────────────── */}
          <div>
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.25em] text-cream/80 mb-5">
              Customer Care
            </h3>
            <ul className="space-y-2.5">
              {CUSTOMER_LINKS.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="text-xs text-cream/40 hover:text-cream transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Newsletter */}
            <div className="mt-8">
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-cream/80 mb-3">
                Stay in the know
              </p>
              <p className="text-[10px] text-cream/30 mb-3">
                Sign up for new arrivals, edits and private offers.
              </p>
              <div className="flex border-b border-cream/15 pb-2.5">
                <input
                  type="email"
                  placeholder="Your email"
                  className="min-w-0 flex-1 bg-transparent text-xs text-cream outline-none placeholder:text-cream/25"
                  aria-label="Email for newsletter"
                />
                <button className="text-[9px] font-semibold uppercase tracking-[0.18em] text-cream/60 hover:text-cream transition-colors">
                  Join
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Bar ───────────────────────────────────── */}
      <div className="border-t border-cream/8">
        <div className="mx-auto max-w-[1400px] px-6 py-6 lg:px-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-[9px] uppercase tracking-[0.15em] text-cream/25">
          <p>© {new Date().getFullYear()} Closet by Chili. All rights reserved.</p>
          <p>Bold. Feminine. Timeless.</p>
        </div>
      </div>
    </footer>
  );
}
