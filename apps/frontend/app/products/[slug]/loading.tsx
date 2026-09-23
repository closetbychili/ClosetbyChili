import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function ProductDetailLoading() {
  return (
    <div className="min-h-screen flex flex-col bg-[#fff8f7] text-[#111111] font-body">
      <Header />

      <main className="flex-1 pt-28 sm:pt-32 pb-16 sm:pb-24 px-5 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-[1440px]">
          {/* ── Breadcrumb Skeleton ─────────────────────────── */}
          <div className="mb-6 sm:mb-8">
            <div className="h-3.5 w-48 bg-[#111111]/8 rounded-xs animate-pulse" />
          </div>

          {/* ── 2-Column Product Detail Layout ──────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12 lg:gap-16">
            {/* Left Column: Image Gallery placeholder (5/12 cols) */}
            <div className="lg:col-span-6 xl:col-span-5">
              <div className="aspect-[3/4] w-full bg-[#f4ebe6] rounded-xs animate-pulse" />
              <div className="grid grid-cols-4 gap-3 mt-3">
                <div className="aspect-[3/4] bg-[#f4ebe6] rounded-xs animate-pulse" />
                <div className="aspect-[3/4] bg-[#f4ebe6] rounded-xs animate-pulse" />
                <div className="aspect-[3/4] bg-[#f4ebe6] rounded-xs animate-pulse" />
              </div>
            </div>

            {/* Right Column: Product Info & Actions placeholder (7/12 cols) */}
            <div className="lg:col-span-6 xl:col-span-7 flex flex-col justify-start space-y-4">
              <div className="h-3.5 w-24 bg-[#8b000a]/20 rounded-xs animate-pulse" />
              <div className="h-9 sm:h-12 w-3/4 bg-[#111111]/10 rounded-xs animate-pulse" />
              <div className="h-5 w-32 bg-[#111111]/12 rounded-xs animate-pulse" />
              <div className="space-y-2 pt-2">
                <div className="h-3.5 w-full bg-[#111111]/8 rounded-xs animate-pulse" />
                <div className="h-3.5 w-5/6 bg-[#111111]/8 rounded-xs animate-pulse" />
              </div>
              <div className="my-6 border-t border-[#111111]/8" />
              <div className="space-y-3">
                <div className="h-3 w-16 bg-[#111111]/8 rounded-xs animate-pulse" />
                <div className="flex gap-2">
                  <div className="h-9 w-12 bg-[#111111]/8 rounded-xs animate-pulse" />
                  <div className="h-9 w-12 bg-[#111111]/8 rounded-xs animate-pulse" />
                  <div className="h-9 w-12 bg-[#111111]/8 rounded-xs animate-pulse" />
                </div>
              </div>
              <div className="pt-4">
                <div className="h-12 w-full bg-[#111111]/10 rounded-xs animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
