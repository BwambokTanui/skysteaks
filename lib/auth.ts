import "server-only"

import { isConfigured } from "@/lib/env"
import { createClient } from "@/lib/supabase/server"

export async function getSessionContext() {
  if (!isConfigured()) {
    return { configured: false, user: null, profile: null }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    return { configured: true, user: null, profile: null }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, balance, is_admin")
    .eq("id", data.user.id)
    .maybeSingle()

  return {
    configured: true,
    user: { id: data.user.id, email: data.user.email ?? "" },
    profile: profile
      ? {
          username: String(profile.username),
          balance: Number(profile.balance),
          isAdmin: Boolean((profile as { is_admin?: boolean }).is_admin),
        }
      : null,
  }
}

export async function getUserId() {
  const session = await getSessionContext()
  return session.user?.id ?? null
}
