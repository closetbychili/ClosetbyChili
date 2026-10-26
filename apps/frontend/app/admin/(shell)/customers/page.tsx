import { Suspense } from "react";
import AdminCustomersClient from "@/components/admin/customers/AdminCustomersClient";

export const metadata = {
  title: "Customer Directory | Admin Console",
  description: "Registered patrons, commerce profiles, lifetime spend analytics, and purchasing history.",
};

export default function AdminCustomersPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full py-12 flex items-center justify-center text-xs text-stone-500">
          Loading customer directory console...
        </div>
      }
    >
      <AdminCustomersClient />
    </Suspense>
  );
}
