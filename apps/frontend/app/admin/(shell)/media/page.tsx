import { Suspense } from "react";
import MediaLibraryView from "@/components/admin/media/MediaLibraryView";

export const metadata = {
  title: "Media Library | Admin Console",
  description: "Centralized catalog media storage, Cloudinary CDN delivery, usage tracking, and asset lifecycle.",
};

export default function AdminMediaPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full py-16 flex items-center justify-center text-xs text-[#8C7A78]">
          Loading media library...
        </div>
      }
    >
      <MediaLibraryView />
    </Suspense>
  );
}

