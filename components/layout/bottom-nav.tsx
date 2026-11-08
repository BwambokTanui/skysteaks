"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { PlaneIcon } from "@/components/ui/plane-icon"
import { cn } from "@/lib/cn"

const items = [
  { href: "/", label: "Home", id: "home" },
  { href: "/sports", label: "Sports", id: "sports" },
  { href: "/games", label: "Games", id: "games" },
  { href: "/account", label: "Bets", id: "bets" },
  { href: "/account", label: "Me", id: "me" },
] as const

function activeId(path: string) {
  if (path === "/") return "home"
  if (path.startsWith("/sports")) return "sports"
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
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-3 pb-[calc(10px+env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto mx-auto flex h-[58px] max-w-md items-center justify-between rounded-full border border-[var(--line)] bg-white px-2 shadow-[0_12px_40px_rgba(15,23,42,0.14)]">
        {items.map((item) => {
          const active = current === item.id
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "grid h-12 w-12 place-items-center rounded-full transition",
                active ? "bg-[var(--sporty)] text-white shadow-[0_8px_18px_rgba(227,27,35,0.35)]" : "text-[var(--muted)]",
              )}
              aria-label={item.label}
            >
              <NavIcon id={item.id} active={active} />
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

function NavIcon({ id, active }: { id: (typeof items)[number]["id"]; active: boolean }) {
  if (id === "home") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        <path d="M12 3.2 3.5 10.2V21h6.2v-6.2h4.6V21h6.2V10.2L12 3.2Z" />
      </svg>
    )
  }
  if (id === "sports") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 7h16M4 12h16M4 17h10" />
      </svg>
    )
  }
  if (id === "games") {
    return <PlaneIcon className={cn("h-5 w-5", active ? "text-white" : "")} />
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
