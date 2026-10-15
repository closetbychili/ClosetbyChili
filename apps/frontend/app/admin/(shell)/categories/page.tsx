import AdminPlaceholderPage from "@/components/admin/AdminPlaceholderPage";

export const metadata = {
  title: "Categories Management | Admin Console",
};

export default function AdminCategoriesPage() {
  return (
    <AdminPlaceholderPage
      title="Categories"
      description="Hierarchical taxonomy, parent-child category relationships, and silhouette sorting."
      routePath="/admin/categories"
    />
  );
}
