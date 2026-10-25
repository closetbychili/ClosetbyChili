import AdminPlaceholderPage from "@/components/admin/AdminPlaceholderPage";

export const metadata = {
  title: "Admin Settings | Admin Console",
};

export default function AdminSettingsPage() {
  return (
    <AdminPlaceholderPage
      title="Settings"
      description="Atelier operating variables, payment gateway credentials, shipping zones, and staff access roles."
      routePath="/admin/settings"
    />
  );
}
