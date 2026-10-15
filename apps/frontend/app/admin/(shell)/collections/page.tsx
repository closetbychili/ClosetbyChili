import AdminPlaceholderPage from "@/components/admin/AdminPlaceholderPage";

export const metadata = {
  title: "Collections Management | Admin Console",
};

export default function AdminCollectionsPage() {
  return (
    <AdminPlaceholderPage
      title="Collections"
      description="Seasonal curations, festive lookbooks, and editorial drop associations."
      routePath="/admin/collections"
    />
  );
}
