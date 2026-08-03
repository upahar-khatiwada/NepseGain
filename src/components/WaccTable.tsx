"use client"

import { Fragment, useMemo, useState } from "react"
import { ArrowUpDownIcon, CalculatorIcon } from "lucide-react"
import type { StockSummary } from "@/src/lib/stock-summary"
import { calculateCharges, formatNPR } from "@/src/lib/nepse-calc"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function computeDaysHeld(avgBuyDate: string | null, asOfDate: string): number | null {
  if (!avgBuyDate) return null
  const diff = new Date(asOfDate).getTime() - new Date(avgBuyDate).getTime()
  return Math.max(0, Math.floor(diff / 86_400_000))
}

type SortKey = "shareCode" | "remainingUnits" | "avgBuyCost" | "costBasisHeld"

function SortButton({
  label,
  colKey,
  onSort,
}: {
  label: string
  colKey: SortKey
  onSort: (key: SortKey) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onSort(colKey)}
      className="flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors"
    >
      {label}
      <ArrowUpDownIcon className="size-3.5" />
    </button>
  )
}

function SaleCalculator({ stock, colSpan }: { stock: StockSummary; colSpan: number }) {
  const [qty, setQty] = useState(stock.remainingUnits > 0 ? String(stock.remainingUnits) : "")
  const [price, setPrice] = useState("")
  const [days, setDays] = useState<string>(() => {
    const auto = computeDaysHeld(stock.avgBuyDate, todayStr())
    return auto != null ? String(auto) : ""
  })

  const preview = useMemo(() => {
    const q = Number(qty)
    const p = Number(price)
    if (!q || isNaN(q) || q <= 0 || !p || isNaN(p) || p < 0) return null
    return calculateCharges({
      type: "SELL",
      quantity: q,
      pricePerUnit: p,
      avgBuyCostPerUnit: stock.avgBuyCost > 0 ? stock.avgBuyCost : null,
      daysHeld: days === "" ? null : parseInt(days, 10),
    })
  }, [qty, price, days, stock.avgBuyCost])

  const daysHeld = days === "" ? null : parseInt(days, 10)
  const cgtLabel =
    daysHeld != null ? (daysHeld <= 365 ? "short-term" : "long-term") : null
  const overSell = Number(qty) > stock.remainingUnits
  const costBasisTotal = stock.avgBuyCost > 0 ? stock.avgBuyCost * Number(qty || 0) : null
  const netProfit = preview && costBasisTotal != null ? preview.netAmount - costBasisTotal : null

  return (
    <TableRow className="bg-muted/30 hover:bg-muted/30">
      <TableCell colSpan={colSpan} className="py-4">
        <div className="rounded-lg border bg-background p-4 space-y-3 max-w-xl">
          <p className="text-xs text-muted-foreground">
            Estimate only — nothing is saved. WACC cost basis used:{" "}
            <span className="font-medium text-foreground">
              {stock.avgBuyCost > 0 ? formatNPR(stock.avgBuyCost) : "n/a"}
            </span>
          </p>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label htmlFor={`qty-${stock.shareCode}`}>Quantity</Label>
              <Input
                id={`qty-${stock.shareCode}`}
                type="number"
                min="1"
                step="1"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                placeholder="e.g. 100"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`price-${stock.shareCode}`}>Sale Price</Label>
              <Input
                id={`price-${stock.shareCode}`}
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g. 1500"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`days-${stock.shareCode}`}>Days Held</Label>
              <Input
                id={`days-${stock.shareCode}`}
                type="number"
                min="0"
                step="1"
                value={days}
                onChange={(e) => setDays(e.target.value)}
                placeholder="e.g. 365"
              />
            </div>
          </div>

          {overSell && (
            <p className="text-xs" style={{ color: "#dc2626" }}>
              Only {stock.remainingUnits.toLocaleString("en-IN")} units remaining in this holding.
            </p>
          )}

          {preview && (
            <div className="text-sm space-y-1 border-t pt-3">
              <div className="flex justify-between text-muted-foreground">
                <span>Gross Proceeds</span>
                <span className="tabular-nums text-foreground">{formatNPR(preview.txValue)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Broker Commission</span>
                <span className="tabular-nums">{formatNPR(preview.brokerCommission)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>DP Charge</span>
                <span className="tabular-nums">{formatNPR(preview.dpCharge)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>SEBON</span>
                <span className="tabular-nums">{formatNPR(preview.sebon)}</span>
              </div>
              {preview.capitalGain > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Capital Gain Tax {cgtLabel ? `(${cgtLabel})` : ""}</span>
                  <span className="tabular-nums">{formatNPR(preview.capitalGainTax)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold border-t pt-1.5">
                <span>Net Receivable</span>
                <span className="tabular-nums">{formatNPR(preview.netAmount)}</span>
              </div>
              {netProfit != null && (
                <div className="flex justify-between font-bold text-base">
                  <span>Net Profit / Loss</span>
                  <span
                    className="tabular-nums"
                    style={{ color: netProfit >= 0 ? "#16a34a" : "#dc2626" }}
                  >
                    {netProfit >= 0 ? "+" : ""}
                    {formatNPR(netProfit)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </TableCell>
    </TableRow>
  )
}

export function WaccTable({ summaries }: { summaries: StockSummary[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("shareCode")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [expanded, setExpanded] = useState<string | null>(null)

  const rows = useMemo(
    () =>
      summaries
        .filter((s) => s.remainingUnits > 0)
        .map((s) => ({ ...s, costBasisHeld: s.remainingUnits * s.avgBuyCost })),
    [summaries]
  )

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const diff =
        sortKey === "shareCode" ? a.shareCode.localeCompare(b.shareCode) : a[sortKey] - b[sortKey]
      return sortDir === "asc" ? diff : -diff
    })
  }, [rows, sortKey, sortDir])

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("desc")
    }
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">
        No open holdings yet — WACC and the sale calculator apply to shares you currently hold.
      </div>
    )
  }

  const colSpan = 6

  return (
    <div className="overflow-x-auto rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead><SortButton label="Code" colKey="shareCode" onSort={handleSort} /></TableHead>
            <TableHead>Name</TableHead>
            <TableHead className="text-right"><SortButton label="Remaining" colKey="remainingUnits" onSort={handleSort} /></TableHead>
            <TableHead
              className="text-right"
              title="Weighted average cost per unit including broker commission, DP charge, and SEBON — the capital gains tax cost basis"
            >
              <SortButton label="WACC" colKey="avgBuyCost" onSort={handleSort} />
            </TableHead>
            <TableHead
              className="text-right"
              title="Remaining units × WACC — total cost basis still tied up in this holding"
            >
              <SortButton label="Cost Basis" colKey="costBasisHeld" onSort={handleSort} />
            </TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((s) => {
            const isOpen = expanded === s.shareCode
            return (
              <Fragment key={s.shareCode}>
                <TableRow>
                  <TableCell className="font-medium">{s.shareCode}</TableCell>
                  <TableCell className="max-w-64 truncate text-muted-foreground">{s.shareName}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {s.remainingUnits.toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {s.avgBuyCost > 0 ? formatNPR(s.avgBuyCost) : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {s.costBasisHeld > 0 ? formatNPR(s.costBasisHeld) : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : s.shareCode)}
                      className="cursor-pointer inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
                      style={{ backgroundColor: "#0d948818", color: "#0d9488", border: "1px solid #0d948840" }}
                    >
                      <CalculatorIcon className="size-3.5" />
                      {isOpen ? "Hide" : "Calculate Sale"}
                    </button>
                  </TableCell>
                </TableRow>
                {isOpen && <SaleCalculator stock={s} colSpan={colSpan} />}
              </Fragment>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
