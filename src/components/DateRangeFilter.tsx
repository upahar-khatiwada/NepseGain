"use client"

import { useRouter, usePathname } from "next/navigation"
import { useCallback } from "react"

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

const PRESET_BTN =
  "px-2.5 py-1 rounded-md text-sm border border-input bg-background text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"

export function DateRangeFilter({ from = "", to = "" }: { from?: string; to?: string }) {
  const router = useRouter()
  const pathname = usePathname()

  const push = useCallback(
    (newFrom: string, newTo: string) => {
      const params = new URLSearchParams()
      if (newFrom) params.set("from", newFrom)
      if (newTo) params.set("to", newTo)
      const qs = params.toString()
      router.push(qs ? `${pathname}?${qs}` : pathname)
    },
    [router, pathname]
  )

  function setPreset(preset: "month" | "3months" | "year" | "all") {
    if (preset === "all") {
      push("", "")
      return
    }
    const now = new Date()
    const toDate = toDateStr(now)
    let fromDate: string
    if (preset === "month") {
      fromDate = toDateStr(new Date(now.getFullYear(), now.getMonth(), 1))
    } else if (preset === "3months") {
      const d = new Date(now)
      d.setMonth(d.getMonth() - 3)
      fromDate = toDateStr(d)
    } else {
      fromDate = toDateStr(new Date(now.getFullYear(), 0, 1))
    }
    push(fromDate, toDate)
  }

  const inputCls =
    "rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 cursor-pointer"

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <label className="text-sm text-muted-foreground">From</label>
        <input
          type="date"
          value={from}
          onChange={(e) => push(e.target.value, to)}
          className={inputCls}
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-sm text-muted-foreground">To</label>
        <input
          type="date"
          value={to}
          onChange={(e) => push(from, e.target.value)}
          className={inputCls}
        />
      </div>
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => setPreset("month")} className={PRESET_BTN}>
          This Month
        </button>
        <button type="button" onClick={() => setPreset("3months")} className={PRESET_BTN}>
          Last 3 Months
        </button>
        <button type="button" onClick={() => setPreset("year")} className={PRESET_BTN}>
          This Year
        </button>
        <button type="button" onClick={() => setPreset("all")} className={PRESET_BTN}>
          All Time
        </button>
      </div>
    </div>
  )
}
