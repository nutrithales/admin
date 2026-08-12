import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database.types";
import { SUPABASE_URL } from "@/lib/supabase/config";

/** Supabase client for use in Client Components. Uses the public anon key. */
export function createClient() {
  return createBrowserClient<Database>(
    SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
