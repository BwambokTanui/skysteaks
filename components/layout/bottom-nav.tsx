"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { PlaneIcon } from "@/components/ui/plane-icon"
import { cn } from "@/lib/cn"

const items = [
  { href: "/", label: "Home", id: "home" },
  { href: "/games", label: "Games", id: "games" },
  { href: "/account", label: "Bets", id: "bets" },
  { href: "/account", label: "Me", id: "me" },
] as const

function activeId(path: string) {
  if (path === "/" || path.startsWith("/sports")) return "home"
  if (path === "/games" || path === "/fairness") return "games"
  if (path.startsWith("/aviator")) return "games"
  if (path === "/account") return "bets"
  if (path === "/login" || path === "/signup") return "me"
  return ""
}

export function BottomNav() {
  const path = usePathname() ?? ""
  if (path.startsWith("/aviator")) return null

  const current = activeId(path)

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--line)] bg-white pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex h-14 max-w-lg items-stretch justify-between px-1">
        {items.map((item) => {
          const active = current === item.id
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition",
                active ? "text-[var(--sporty)]" : "text-[var(--muted)]",
              )}
              aria-label={item.label}
            >
              <span
                className={cn(
                  "grid h-8 w-8 place-items-center rounded-xl transition",
                  active && "bg-[#ffe8ea] text-[var(--sporty)]",
                )}
              >
                <NavIcon id={item.id} />
              </span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

function NavIcon({ id }: { id: (typeof items)[number]["id"] }) {
  if (id === "home") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        <path d="M12 3.2 3.5 10.2V21h6.2v-6.2h4.6V21h6.2V10.2L12 3.2Z" />
      </svg>
    )
  }
  if (id === "games") {
    return <PlaneIcon className="h-5 w-5" />
  }
  if (id === "bets") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v8M9.2 10.4c.7-.9 5-.9 5.7 1.1s-3.8 3.1-4.8 2.2" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 19c1.8-3.2 4-4.8 7-4.8S17.2 15.8 19 19" />
    </svg>
  )
}
