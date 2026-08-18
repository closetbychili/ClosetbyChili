import { Star } from "lucide-react";
import SectionHeading from "./SectionHeading";
import { REVIEWS } from "@/lib/homepage-data";

export default function CustomerReviews() {
  return (
    <section className="py-20 sm:py-24 lg:py-28 px-5 sm:px-8 lg:px-12 bg-[#faeceb]/40 border-y border-ink/5">
      <div className="mx-auto max-w-[1440px]">
        {/* Section Heading */}
        <SectionHeading
          eyebrow="Testimonials"
          title="Loved by You"
          subtitle="Real stories from women who make our silhouettes part of their memorable moments."
          align="center"
        />

        {/* 3 Review Cards Grid */}
        <div className="mt-12 sm:mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 lg:gap-10">
          {REVIEWS.map((review) => (
            <div
              key={review.id}
              className="bg-[#fff8f7] border border-ink/8 p-8 sm:p-10 flex flex-col justify-between shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:border-gold/50 transition-colors duration-300"
            >
              <div>
                {/* 5 Gold Stars */}
                <div className="flex items-center gap-1.5 text-gold mb-6">
                  {[...Array(review.rating)].map((_, i) => (
                    <Star
                      key={i}
                      size={16}
                      className="fill-gold text-gold"
                      strokeWidth={1.5}
                    />
                  ))}
                </div>

                {/* Review Text */}
                <p className="text-sm sm:text-base text-ink/80 leading-relaxed italic font-light">
                  &ldquo;{review.text}&rdquo;
                </p>
              </div>

              {/* Author Info */}
              <div className="mt-8 pt-6 border-t border-ink/8 flex items-center justify-between">
                <div>
                  <h3 className="font-display text-sm font-semibold text-ink tracking-wide">
                    {review.author}
                  </h3>
                  {review.location && (
                    <p className="text-[10px] uppercase tracking-[0.2em] text-ink/40 font-medium mt-0.5">
                      {review.location}, Verified Buyer
                    </p>
                  )}
                </div>
                <div className="w-6 h-px bg-gold/70" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
