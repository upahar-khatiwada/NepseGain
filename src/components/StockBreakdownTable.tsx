"use client"

import { useMemo, useState } from "react"
import { ArrowUpDownIcon } from "lucide-react"
import type { StockSummary } from "@/src/lib/stock-summary"
import { formatNPR } from "@/src/lib/nepse-calc"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

function SourceBadge({ sources }: { sources: ("PRIMARY" | "SECONDARY")[] }) {
  const hasPrimary = sources.includes("PRIMARY")
  const hasSecondary = sources.includes("SECONDARY")

  if (hasPrimary && hasSecondary) {
    return (
      <div className="flex flex-wrap gap-1">
        <Badge className="bg-purple-500/10 text-purple-700 dark:text-purple-400 border-transparent">
          IPO
        </Badge>
        <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-transparent">
          Secondary
        </Badge>
      </div>
    )
  }
  if (hasPrimary) {
    return (
      <Badge className="bg-purple-500/10 text-purple-700 dark:text-purple-400 border-transparent">
        IPO
      </Badge>
    )
  }
  if (hasSecondary) {
    return (
      <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-transparent">
        Secondary
      </Badge>
    )
  }
  return null
}

type SortKey = "realisedPL" | "shareCode" | "remainingUnits" | "totalBought"

export function StockBreakdownTable({
  summaries,
}: {
  summaries: StockSummary[]
}) {
  const [sortKey, setSortKey] = useState<SortKey>("realisedPL")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("desc")
    }
  }

  const sorted = useMemo(() => {
    return [...summaries].sort((a, b) => {
      let diff: number
      if (sortKey === "shareCode") {
        diff = a.shareCode.localeCompare(b.shareCode)
      } else {
        diff = a[sortKey] - b[sortKey]
      }
      return sortDir === "asc" ? diff : -diff
    })
  }, [summaries, sortKey, sortDir])

  if (summaries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">
        No transactions yet. Add your first transaction to get started.
      </div>
    )
  }

  function SortButton({
    label,
    colKey,
  }: {
    label: string
    colKey: SortKey
  }) {
    return (
      <button
        type="button"
        onClick={() => handleSort(colKey)}
        className="flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors"
      >
        {label}
        <ArrowUpDownIcon className="size-3.5" />
      </button>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <SortButton label="Code" colKey="shareCode" />
            </TableHead>
            <TableHead>Name</TableHead>
            <TableHead className="text-right">
              <SortButton label="Bought" colKey="totalBought" />
            </TableHead>
            <TableHead className="text-right">Sold</TableHead>
            <TableHead className="text-right">
              <SortButton label="Remaining" colKey="remainingUnits" />
            </TableHead>
            <TableHead className="text-right">Avg Cost</TableHead>
            <TableHead className="text-right">
              <SortButton label="Realised P/L" colKey="realisedPL" />
            </TableHead>
            <TableHead className="text-right">Tax Paid</TableHead>
            <TableHead>Source</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((s) => (
            <TableRow key={s.shareCode}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-1.5">
                  {s.shareCode}
                  {s.remainingUnits > 0 && (
                    <span
                      className="size-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: "#ca8a04" }}
                      title="Open position"
                    />
                  )}
                </div>
              </TableCell>
              <TableCell className="max-w-36 truncate text-muted-foreground">
                {s.shareName}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {s.totalBought.toLocaleString("en-IN")}
              </TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">
                {s.totalSold > 0 ? s.totalSold.toLocaleString("en-IN") : "—"}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {s.remainingUnits.toLocaleString("en-IN")}
              </TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">
                {s.avgBuyCost > 0 ? formatNPR(s.avgBuyCost) : "—"}
              </TableCell>
              <TableCell className="text-right tabular-nums font-medium">
                {s.totalSold > 0 ? (
                  <span
                    style={
                      s.realisedPL > 0
                        ? { color: "#16a34a" }
                        : s.realisedPL < 0
                          ? { color: "#dc2626" }
                          : { color: "var(--muted-foreground)" }
                    }
                  >
                    {s.realisedPL >= 0 ? "+" : ""}
                    {formatNPR(s.realisedPL)}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">
                {s.totalTaxPaid > 0 ? formatNPR(s.totalTaxPaid) : "—"}
              </TableCell>
              <TableCell>
                <SourceBadge sources={s.sources} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
