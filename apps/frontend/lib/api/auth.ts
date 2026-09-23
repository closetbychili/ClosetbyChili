import { apiFetch } from "./client";
import type { RequestOptions } from "./types";
import { supabase } from "@/lib/supabase/client";

export interface CustomerProfile {
  display_name: string;
  phone: string;
}

export interface CurrentUser {
  id: string;
  supabase_user_id: string;
  email: string;
  role: "customer" | "wholesale_customer" | "staff" | "admin";
  profile: CustomerProfile;
  created_at: string;
  updated_at: string;
}

async function authenticatedOptions(
  options: RequestOptions = {},
  token?: string
): Promise<RequestOptions> {
  let accessToken = token;
  if (!accessToken) {
    const { data } = await supabase.auth.getSession();
    accessToken = data.session?.access_token;
  }
  if (!accessToken) throw new Error("Authentication required");

  return {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
    },
  };
}

export async function getCurrentUser(token?: string): Promise<CurrentUser> {
  return apiFetch<CurrentUser>("/me/", await authenticatedOptions({}, token));
}


export async function updateCurrentProfile(
  payload: Partial<CustomerProfile>
): Promise<CurrentUser> {
  return apiFetch<CurrentUser>("/me/", await authenticatedOptions({
    method: "PATCH",
    body: JSON.stringify(payload),
  }));
}
