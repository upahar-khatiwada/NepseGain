"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

type Portfolio = { id: string; name: string }

export function SidebarNav({
  portfolios,
  onNavigate,
}: {
  portfolios: Portfolio[]
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const isAllActive = pathname === "/dashboard"

  return (
    <>
      <Link
        href="/dashboard"
        onClick={onNavigate}
        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all ${
          isAllActive ? "text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"
        }`}
        style={isAllActive ? { backgroundColor: "rgba(59,130,246,0.18)", boxShadow: "inset 2px 0 0 #3b82f6" } : undefined}
      >
        <span
          className="size-1.5 rounded-full shrink-0 transition-colors"
          style={{ backgroundColor: isAllActive ? "#60a5fa" : "transparent" }}
        />
        All Portfolios
      </Link>

      {portfolios.length > 0 && (
        <p className="text-xs text-slate-500 px-3 pt-4 pb-1 uppercase tracking-widest font-medium">
          Portfolios
        </p>
      )}

      {portfolios.map((p) => {
        const isActive = pathname === `/dashboard/portfolio/${p.id}`
        return (
          <Link
            key={p.id}
            href={`/dashboard/portfolio/${p.id}`}
            onClick={onNavigate}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm cursor-pointer transition-all truncate ${
              isActive ? "text-white font-medium" : "text-slate-400 hover:bg-white/5 hover:text-white"
            }`}
            style={isActive ? { backgroundColor: "rgba(59,130,246,0.18)", boxShadow: "inset 2px 0 0 #3b82f6" } : undefined}
          >
            <span
              className="size-1.5 rounded-full shrink-0 transition-colors"
              style={{ backgroundColor: isActive ? "#60a5fa" : "transparent" }}
            />
            <span className="truncate">{p.name}</span>
          </Link>
        )
      })}

      {portfolios.length === 0 && (
        <p className="text-xs text-slate-600 px-3 py-1">No portfolios yet</p>
      )}
    </>
  )
}
