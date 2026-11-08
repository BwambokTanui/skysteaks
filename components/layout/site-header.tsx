"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"
import { useBalance } from "@/components/layout/balance"
import { cn } from "@/lib/cn"
import { ksh } from "@/lib/format"
import { createClient } from "@/lib/supabase/client"

export function SiteHeader({
  configured,
  email,
  username,
}: {
  configured: boolean
  email: string | null
  username: string | null
}) {
  const path = usePathname() ?? ""
  const router = useRouter()
  const { balance, setBalance } = useBalance()
  const [pending, setPending] = useState(false)
  const signedIn = Boolean(email || username)
  const hide = path.startsWith("/aviator")

  if (hide) return null

  async function signOut() {
    if (!configured) return
    setPending(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    setBalance(null)
    setPending(false)
    router.replace("/")
    router.refresh()
  }

  const categories = [
    { href: "/games", label: "Games", match: (p: string) => p === "/games" },
    { href: "/aviator", label: "Aviator", match: (p: string) => p.startsWith("/aviator") },
    { href: "/sports/football", label: "Football", match: (p: string) => p.startsWith("/sports/football") },
    { href: "/sports?live=1", label: "Live", match: (p: string) => p.includes("live=1") },
  ]

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-lg items-center justify-between gap-3 px-3">
        <div className="min-w-0">
          <Link href="/" className="block text-lg font-bold tracking-tight text-[var(--text)]">
            SkySteaks
          </Link>
          <p className="truncate text-xs text-[var(--muted)]">
            {signedIn ? `Welcome back${username ? `, ${username}` : ""}!` : "Welcome back!"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/sports"
            className="grid h-9 w-9 place-items-center rounded-full bg-[var(--bg-elevated)] text-[var(--muted)]"
            aria-label="Search sports"
          >
            <SearchIcon />
          </Link>
          {signedIn ? (
            <Link
              href="/account"
              className="inline-flex items-center rounded-full bg-[var(--bg-elevated)] px-3 py-1.5 text-sm font-semibold text-[var(--text)]"
            >
              {balance == null ? "KSh —" : ksh(balance)}
            </Link>
          ) : (
            <Link
              href="/login"
              className="rounded-full border border-[var(--sporty)] px-3.5 py-1.5 text-sm font-semibold text-[var(--sporty)]"
            >
              Log in
            </Link>
          )}
          {signedIn && (
            <button type="button" onClick={signOut} disabled={pending} className="text-xs text-[var(--muted)] disabled:opacity-50">
              Out
            </button>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-lg px-3 pb-3">
        <div className="scroll-thin flex gap-2 overflow-x-auto">
          {categories.map((link) => {
            const isActive = link.match(path)
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition",
                  isActive ? "bg-[var(--sporty)] text-white shadow-[0_8px_18px_rgba(227,27,35,0.28)]" : "bg-[var(--bg-elevated)] text-[var(--text)]",
                )}
              >
                {link.label}
              </Link>
            )
          })}
        </div>
      </div>
    </header>
  )
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  )
}
