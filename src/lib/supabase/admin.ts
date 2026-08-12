import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { SUPABASE_URL } from "@/lib/supabase/config";

/**
 * Service-role Supabase client. Bypasses RLS entirely — only ever import
 * this from server-only code (Server Actions, Route Handlers) that has
 * already verified the caller is an authenticated admin. The
 * `server-only` import makes any accidental client-bundle import a build
 * error instead of a leaked secret.
 */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL não configurados.",
    );
  }

  return createSupabaseClient<Database>(SUPABASE_URL, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
