import type { Session, User as SupabaseUser } from "@supabase/supabase-js";
import type { CurrentUser } from "@/lib/api/auth";

/**
 * Resolves the Google or third-party profile picture URL from application user,
 * Supabase auth user metadata, or session identity data.
 */
export function resolveAvatarUrl(
  user?: CurrentUser | null,
  supabaseUser?: SupabaseUser | null,
  session?: Session | null
): string | null {
  if (user?.avatar_url) {
    return user.avatar_url;
  }

  const targetUser = supabaseUser ?? session?.user;
  if (!targetUser) return null;

  const meta = targetUser.user_metadata;
  if (meta) {
    if (typeof meta.avatar_url === "string" && meta.avatar_url) {
      return meta.avatar_url;
    }
    if (typeof meta.picture === "string" && meta.picture) {
      return meta.picture;
    }
  }

  const identities = targetUser.identities;
  if (Array.isArray(identities)) {
    for (const identity of identities) {
      const data = identity.identity_data;
      if (data) {
        if (typeof data.avatar_url === "string" && data.avatar_url) {
          return data.avatar_url;
        }
        if (typeof data.picture === "string" && data.picture) {
          return data.picture;
        }
      }
    }
  }

  return null;
}

