import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function ProductsLoading() {
  return (
    <div className="min-h-screen flex flex-col bg-[#fff8f7] text-[#111111] font-body">
      <Header />

      <main className="flex-1 pt-28 sm:pt-32 pb-16 sm:pb-20 lg:pb-24 px-5 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-[1440px]">
          {/* ── Breadcrumb Skeleton ─────────────────────────── */}
          <div className="mb-4 sm:mb-6">
            <div className="h-3.5 w-36 bg-[#111111]/8 rounded-xs animate-pulse" />
          </div>

          {/* ── Page Header Skeleton ───────────────────────── */}
          <div className="mb-8 sm:mb-10 pb-6 border-b border-[#111111]/8">
            <div className="h-3 w-28 bg-[#8b000a]/20 rounded-xs mb-2 animate-pulse" />
            <div className="h-9 sm:h-11 w-64 max-w-full bg-[#111111]/10 rounded-xs animate-pulse" />
            <div className="mt-2 h-4 w-80 max-w-full bg-[#111111]/8 rounded-xs animate-pulse" />
          </div>

          {/* ── Filter Controls Skeleton ───────────────────── */}
          <div className="mb-8 pb-6 border-b border-[#111111]/8 flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex gap-2">
                <div className="h-8 w-20 bg-[#111111]/8 rounded-xs animate-pulse" />
                <div className="h-8 w-24 bg-[#111111]/8 rounded-xs animate-pulse" />
                <div className="h-8 w-24 bg-[#111111]/8 rounded-xs animate-pulse" />
              </div>
              <div className="h-8 w-44 bg-[#111111]/8 rounded-xs animate-pulse" />
            </div>
          </div>

          {/* ── 12-Card Grid Skeleton Matching ProductCard ──── */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="flex flex-col w-full animate-pulse">
                <div className="aspect-[3/4] w-full bg-[#f4ebe6] rounded-xs" />
                <div className="pt-4 space-y-2">
                  <div className="h-2.5 w-16 bg-[#111111]/8 rounded-xs" />
                  <div className="h-4 w-3/4 bg-[#111111]/12 rounded-xs" />
                  <div className="h-3.5 w-20 bg-[#111111]/10 rounded-xs" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
