import { Suspense } from "react";
import AdminCustomerDetailClient from "@/components/admin/customers/AdminCustomerDetailClient";

export const metadata = {
  title: "Customer Profile | Admin Console",
  description: "Customer identity summary, purchasing activity, lifetime spend, and account history.",
};

interface AdminCustomerDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminCustomerDetailPage({ params }: AdminCustomerDetailPageProps) {
  const resolvedParams = await params;
  return (
    <Suspense
      fallback={
        <div className="w-full py-16 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="h-6 w-6 border-2 border-stone-800 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-stone-500 font-mono">Loading customer profile...</p>
          </div>
        </div>
      }
    >
      <AdminCustomerDetailClient customerId={resolvedParams.id} />
    </Suspense>
  );
}
