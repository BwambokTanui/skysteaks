import { Panel } from "@/components/ui/panel"

export function SetupNotice({ message }: { message?: string | null }) {
  return (
    <Panel className="grid gap-4 p-6">
      <div>
        <p className="text-xs font-semibold tracking-[0.22em] text-[var(--sporty)]">SETUP</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-[var(--text)]">Connect Supabase</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          {message || "SkySteaks keeps accounts, balances, and crash points in Supabase. The browser never receives the crash point early."}
        </p>
      </div>
      <ol className="grid gap-2 text-sm leading-6 text-[var(--muted)]">
        <li>1. Create a Supabase project and run supabase/schema.sql, then supabase/sports.sql.</li>
        <li>2. Copy .env.example to .env.local and fill the URL, anon key, and service role key.</li>
        <li>3. For instant local sign-up, turn off email confirmation under Authentication.</li>
      </ol>
    </Panel>
  )
}
