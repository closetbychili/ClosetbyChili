"use client";

import { useState } from "react";
import SectionHeading from "./SectionHeading";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubmitted(true);
      setEmail("");
    }
  };

  return (
    <section className="py-20 sm:py-24 lg:py-28 px-5 sm:px-8 lg:px-12 bg-[#faeceb] border-t border-ink/5">
      <div className="mx-auto max-w-2xl text-center">
        {/* Section Heading */}
        <SectionHeading
          eyebrow="Exclusive Access"
          title="Join the Chili List"
          subtitle="Subscribe for early access to new collections and exclusive offers."
          align="center"
        />

        {/* Newsletter Subscription Form */}
        <div className="mt-8 sm:mt-10">
          {submitted ? (
            <div className="p-4 bg-[#fff8f7] border border-gold/40 text-chili font-medium text-sm sm:text-base animate-fade-in">
              Thank you for subscribing to the Chili List. Welcome to our inner circle!
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="flex flex-col sm:flex-row items-stretch gap-3 max-w-xl mx-auto"
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email address"
                aria-label="Your email address"
                className="flex-1 bg-[#fff8f7] border border-ink/15 px-5 py-4 text-xs sm:text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:border-chili transition-colors"
              />
              <button
                type="submit"
                className="bg-[#8b000a] text-[#fff8f7] hover:bg-[#680007] px-8 py-4 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.25em] transition-all duration-300 shadow-sm"
              >
                Subscribe
              </button>
            </form>
          )}

          <p className="mt-4 text-[10px] uppercase tracking-[0.18em] text-ink/45 font-medium">
            We value your privacy · Unsubscribe at any time
          </p>
        </div>
      </div>
    </section>
  );
}
