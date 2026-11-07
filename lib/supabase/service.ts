import "server-only"

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { hasServiceKey } from "@/lib/env"

let client: SupabaseClient | null = null

export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key || !hasServiceKey()) return null
  if (!client) {
    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return client
}
