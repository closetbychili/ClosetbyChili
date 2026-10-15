import AdminPlaceholderPage from "@/components/admin/AdminPlaceholderPage";

export const metadata = {
  title: "Inventory Management | Admin Console",
};

export default function AdminInventoryPage() {
  return (
    <AdminPlaceholderPage
      title="Inventory"
      description="Atelier stock levels, reservation allocations, low-stock thresholds, and ledger movements."
      routePath="/admin/inventory"
    />
  );
}
