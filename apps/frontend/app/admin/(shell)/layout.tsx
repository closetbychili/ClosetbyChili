import type { Metadata } from "next";
import type { ReactNode } from "react";
import AdminGuard from "@/components/admin/AdminGuard";
import AdminLayoutClient from "@/components/admin/AdminLayoutClient";

export const metadata: Metadata = {
  title: "Admin Console | Closet by Chilli",
  description: "Closet by Chilli administrative operations and management console.",
};

export const dynamic = "force-dynamic";

export default function AuthenticatedAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <AdminGuard>
      <AdminLayoutClient>{children}</AdminLayoutClient>
    </AdminGuard>
  );
}
