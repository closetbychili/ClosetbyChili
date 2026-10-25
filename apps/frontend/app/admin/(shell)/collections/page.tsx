import { Suspense } from "react";
import AdminCollectionsClient from "@/components/admin/collections/AdminCollectionsClient";

export const metadata = {
  title: "Collections Management | Admin Console",
  description: "Seasonal curations, festive lookbooks, and editorial drop associations.",
};

export default function AdminCollectionsPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full py-12 flex items-center justify-center text-xs text-[#8C7A78]">
          Loading collections console...
        </div>
      }
    >
      <AdminCollectionsClient />
    </Suspense>
  );
}
