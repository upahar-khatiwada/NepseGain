"use client"

import { useMemo, useState } from "react"
import { ArrowUpDownIcon, ChevronDownIcon } from "lucide-react"
import type { StockSummary } from "@/src/lib/stock-summary"
import type { TransactionSource } from "@/src/lib/nepse-calc"
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
import { SellDialog } from "@/src/components/SellDialog"

const SOURCE_BADGE: Record<TransactionSource, { label: string; className: string }> = {
  PRIMARY:   { label: "IPO",       className: "bg-purple-500/10 text-purple-700 border-transparent" },
  SECONDARY: { label: "Secondary", className: "bg-blue-500/10 text-blue-700 border-transparent" },
  MARKET:    { label: "Secondary", className: "bg-blue-500/10 text-blue-700 border-transparent" },
  AUCTION:   { label: "Auction",   className: "bg-blue-500/10 text-blue-700 border-transparent" },
  IPO:       { label: "IPO",       className: "bg-purple-500/10 text-purple-700 border-transparent" },
  FPO:       { label: "FPO",       className: "bg-purple-500/10 text-purple-700 border-transparent" },
  RIGHT:     { label: "Rights",    className: "bg-indigo-500/10 text-indigo-700 border-transparent" },
  BONUS:     { label: "Bonus",     className: "bg-emerald-500/10 text-emerald-700 border-transparent" },
  MERGER:    { label: "Merger",    className: "bg-orange-500/10 text-orange-700 border-transparent" },
  DEMAT:     { label: "Demat",     className: "bg-slate-500/10 text-slate-600 border-transparent" },
}

function SourceBadges({ sources }: { sources: TransactionSource[] }) {
  const unique = Array.from(new Set(sources))
  return (
    <div className="flex flex-wrap gap-1">
      {unique.map((src) => {
        const cfg = SOURCE_BADGE[src] ?? { label: src, className: "bg-slate-500/10 text-slate-600 border-transparent" }
        return (
          <Badge key={src} className={cfg.className}>
            {cfg.label}
          </Badge>
        )
      })}
    </div>
  )
}

type SortKey = "realisedPL" | "shareCode" | "remainingUnits" | "totalBought"

function StockRows({
  rows,
  onSell,
  portfolioId,
}: {
  rows: StockSummary[]
  onSell: (s: StockSummary) => void
  portfolioId?: string
}) {
  return (
    <>
      {rows.map((s) => (
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
            <SourceBadges sources={s.sources} />
          </TableCell>
          {portfolioId && (
            <TableCell>
              {s.remainingUnits > 0 && (
                <button
                  type="button"
                  onClick={() => onSell(s)}
                  className="cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
                  style={{ backgroundColor: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = "#dc2626"
                    e.currentTarget.style.color = "white"
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = "#fef2f2"
                    e.currentTarget.style.color = "#dc2626"
                  }}
                >
                  Sell
                </button>
              )}
            </TableCell>
          )}
        </TableRow>
      ))}
    </>
  )
}

export function StockBreakdownTable({
  summaries,
  portfolioId,
}: {
  summaries: StockSummary[]
  portfolioId?: string
}) {
  const [sortKey, setSortKey] = useState<SortKey>("realisedPL")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [sellTarget, setSellTarget] = useState<StockSummary | null>(null)
  const [closedOpen, setClosedOpen] = useState(false)

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

  const open = sorted.filter((s) => s.remainingUnits > 0)
  const closed = sorted.filter((s) => s.remainingUnits <= 0)

  if (summaries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">
        No transactions yet. Add your first transaction to get started.
      </div>
    )
  }

  function SortButton({ label, colKey }: { label: string; colKey: SortKey }) {
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

  const extraCol = portfolioId ? 1 : 0

  return (
    <>
      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead><SortButton label="Code" colKey="shareCode" /></TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="text-right"><SortButton label="Bought" colKey="totalBought" /></TableHead>
              <TableHead className="text-right">Sold</TableHead>
              <TableHead className="text-right"><SortButton label="Remaining" colKey="remainingUnits" /></TableHead>
              <TableHead className="text-right">Avg Cost</TableHead>
              <TableHead className="text-right"><SortButton label="Realised P/L" colKey="realisedPL" /></TableHead>
              <TableHead className="text-right">Tax Paid</TableHead>
              <TableHead>Source</TableHead>
              {portfolioId && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            <StockRows rows={open} onSell={setSellTarget} portfolioId={portfolioId} />
          </TableBody>
        </Table>
      </div>

      {/* Closed Positions */}
      {closed.length > 0 && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setClosedOpen((v) => !v)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground cursor-pointer transition-colors mb-2"
          >
            <ChevronDownIcon
              className={`size-4 transition-transform ${closedOpen ? "rotate-180" : ""}`}
            />
            Closed Positions ({closed.length})
          </button>
          {closedOpen && (
            <div className="overflow-x-auto rounded-xl border border-dashed border-slate-200 opacity-70">
              <Table>
                <TableBody>
                  <StockRows rows={closed} onSell={setSellTarget} portfolioId={portfolioId} />
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {/* Sell dialog */}
      {portfolioId && sellTarget && (
        <SellDialog
          stock={sellTarget}
          portfolioId={portfolioId}
          open={!!sellTarget}
          onClose={() => setSellTarget(null)}
        />
      )}
    </>
  )
}
