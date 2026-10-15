import { apiFetch } from "./client";
import { supabase } from "@/lib/supabase/client";

export interface AdminUser {
  id: string;
  email: string;
  role: "admin";
  is_admin: boolean;
  is_staff: boolean;
  is_active: boolean;
  created_at: string;
}

/**
 * Verify administrative authorization against the backend API.
 * Uses trusted server-side authorization check.
 * Throws ApiClientError (401/403) if unauthenticated or not an admin.
 */
export async function verifyAdminAuth(token?: string): Promise<AdminUser> {
  let accessToken = token;
  if (!accessToken) {
    const { data } = await supabase.auth.getSession();
    accessToken = data.session?.access_token;
  }
  if (!accessToken) {
    throw new Error("Authentication required");
  }

  return apiFetch<AdminUser>("/admin/auth/verify/", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}
