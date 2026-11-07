export function isConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

export function hasServiceKey() {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
}
