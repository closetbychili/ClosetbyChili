import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function CategoriesLoading() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-on-surface font-body">
      <Header />

      <main className="flex-1 pt-24 sm:pt-28">
        <header className="w-full max-w-360 mx-auto px-4 sm:px-6 lg:px-12 pt-6 pb-8 sm:pb-12 border-b border-outline-variant/30">
          <div className="h-4 w-32 bg-surface-container rounded mb-5 animate-pulse" />
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="h-4 w-40 bg-surface-container rounded mb-2 animate-pulse" />
              <div className="h-10 w-64 bg-surface-container rounded mb-3 animate-pulse" />
              <div className="h-5 w-96 max-w-full bg-surface-container rounded animate-pulse" />
            </div>
            <div className="h-8 w-44 bg-surface-container rounded-full animate-pulse" />
          </div>
        </header>

        <section className="w-full max-w-360 mx-auto px-4 sm:px-6 lg:px-12 py-10 sm:py-16">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6 lg:gap-8">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center w-full animate-pulse">
                <div className="w-full aspect-[3/4.2] rounded-t-[80px] lg:rounded-t-[100px] bg-surface-container" />
                <div className="mt-3.5 w-3/4 h-5 bg-surface-container rounded" />
                <div className="mt-2 w-1/2 h-4 bg-surface-container rounded" />
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
