import AdminPlaceholderPage from "@/components/admin/AdminPlaceholderPage";

export const metadata = {
  title: "Customers Directory | Admin Console",
};

export default function AdminCustomersPage() {
  return (
    <AdminPlaceholderPage
      title="Customers"
      description="Registered patrons, order histories, saved addresses, and wholesale classifications."
      routePath="/admin/customers"
    />
  );
}
