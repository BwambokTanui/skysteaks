import { cn } from "@/lib/cn"

type PageWidth = "sm" | "md" | "lg"

const widths: Record<PageWidth, string> = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-5xl",
}

export function pageClasses({
  width = "md",
  tight = false,
  className,
}: {
  width?: PageWidth
  tight?: boolean
  className?: string
} = {}) {
  return cn(
    "mx-auto grid w-full px-[var(--page-gutter)]",
    tight ? "gap-[var(--space-stack)] pt-4 pb-[var(--page-y)]" : "gap-[var(--space-section)] py-[var(--page-y)]",
    widths[width],
    className,
  )
}

export function Page({
  width = "md",
  tight = false,
  className,
  children,
}: {
  width?: PageWidth
  tight?: boolean
  className?: string
  children: React.ReactNode
}) {
  return <div className={pageClasses({ width, tight, className })}>{children}</div>
}
