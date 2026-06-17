"use client"

import { Fragment, useMemo, useState } from "react"
import { ArrowUpDownIcon, ChevronDownIcon, ChevronRightIcon, Layers2Icon, PencilIcon, Trash2Icon } from "lucide-react"
import type { StockSummary } from "@/src/lib/stock-summary"
import type { TransactionSource } from "@/src/lib/nepse-calc"
import { formatNPR } from "@/src/lib/nepse-calc"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { SellDialog } from "@/src/components/SellDialog"
import { fmtDate, fmtNPR, SourceBadge as TxSourceBadge, type TransactionRow } from "@/src/components/TransactionTable"
import { EditTransactionDialog, DeleteConfirmDialog } from "@/src/components/TransactionEditDialogs"

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

function BuyBreakdownRow({ stock, colSpan }: { stock: StockSummary; colSpan: number }) {
  return (
    <TableRow className="bg-muted/30 hover:bg-muted/30">
      <TableCell colSpan={colSpan} className="py-3">
        <p className="text-xs text-muted-foreground mb-2">
          Buy Price ({formatNPR(stock.avgBuyPrice)}) is blended across {stock.buyBreakdown.length} sources for {stock.totalBought.toLocaleString("en-IN")} units total:
        </p>
        <div className="overflow-x-auto rounded-lg border bg-background">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted-foreground border-b">
                <th className="px-3 py-1.5 font-medium">Source</th>
                <th className="px-3 py-1.5 font-medium text-right">Units</th>
                <th className="px-3 py-1.5 font-medium text-right">Price / Unit</th>
                <th className="px-3 py-1.5 font-medium text-right">Value</th>
              </tr>
            </thead>
            <tbody>
              {stock.buyBreakdown.map((b) => {
                const cfg = SOURCE_BADGE[b.source] ?? { label: b.source, className: "bg-slate-500/10 text-slate-600 border-transparent" }
                return (
                  <tr key={b.source} className="border-b last:border-0">
                    <td className="px-3 py-1.5">
                      <Badge className={cfg.className}>{cfg.label}</Badge>
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{b.quantity.toLocaleString("en-IN")}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{formatNPR(b.avgPrice)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">{formatNPR(b.totalValue)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </TableCell>
    </TableRow>
  )
}

function StockRows({
  rows,
  onSell,
  onEdit,
  portfolioId,
  hasTransactions,
  expandedCodes,
  onToggleExpand,
  colSpan,
}: {
  rows: StockSummary[]
  onSell: (s: StockSummary) => void
  onEdit: (s: StockSummary) => void
  portfolioId?: string
  hasTransactions: boolean
  expandedCodes: Set<string>
  onToggleExpand: (code: string) => void
  colSpan: number
}) {
  return (
    <>
      {rows.map((s) => {
        const isMixed = s.buyBreakdown.length > 1
        const isExpanded = expandedCodes.has(s.shareCode)
        return (
          <Fragment key={s.shareCode}>
            <TableRow>
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
              <TableCell className="max-w-64 truncate text-muted-foreground">
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
              <TableCell className="text-right tabular-nums">
                <div className="flex items-center justify-end gap-1">
                  {isMixed && (
                    <button
                      type="button"
                      onClick={() => onToggleExpand(s.shareCode)}
                      className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                      title="Buy Price is blended across multiple sources — click to see the breakdown"
                    >
                      {isExpanded ? (
                        <ChevronDownIcon className="size-3.5" />
                      ) : (
                        <ChevronRightIcon className="size-3.5" />
                      )}
                    </button>
                  )}
                  <span>{s.avgBuyPrice > 0 ? formatNPR(s.avgBuyPrice) : "—"}</span>
                  {isMixed && (
                    <span title="Blended from multiple sources">
                      <Layers2Icon className="size-3 text-amber-500 shrink-0" />
                    </span>
                  )}
                </div>
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
                  <div className="flex items-center justify-end gap-1.5">
                    {hasTransactions && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="cursor-pointer"
                        onClick={() => onEdit(s)}
                      >
                        <PencilIcon className="size-3.5" />
                        <span className="sr-only">Edit</span>
                      </Button>
                    )}
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
                  </div>
                </TableCell>
              )}
            </TableRow>
            {isMixed && isExpanded && (
              <BuyBreakdownRow stock={s} colSpan={colSpan} />
            )}
          </Fragment>
        )
      })}
    </>
  )
}

// ─── Edit holding dialog — lists & edits underlying lots for one share ──────

function EditHoldingDialog({
  stock,
  transactions,
  onClose,
}: {
  stock: StockSummary
  transactions: TransactionRow[]
  onClose: () => void
}) {
  const [editTx, setEditTx] = useState<TransactionRow | null>(null)
  const [deleteTxId, setDeleteTxId] = useState<string | null>(null)

  const lots = useMemo(
    () =>
      transactions
        .filter((t) => t.shareCode === stock.shareCode)
        .sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()),
    [transactions, stock.shareCode]
  )

  return (
    <>
      <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{stock.shareCode} — Edit Lots</DialogTitle>
          </DialogHeader>

          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Net Amount</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {lots.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="text-muted-foreground">{fmtDate(tx.transactionDate)}</TableCell>
                    <TableCell>
                      {tx.type === "BUY" ? (
                        <Badge className="bg-emerald-500/10 text-emerald-700 border-transparent">BUY</Badge>
                      ) : (
                        <Badge variant="destructive">SELL</Badge>
                      )}
                    </TableCell>
                    <TableCell>{tx.type === "BUY" && <TxSourceBadge source={tx.source} />}</TableCell>
                    <TableCell className="text-right tabular-nums">{tx.quantity.toLocaleString("en-IN")}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtNPR(tx.pricePerUnit)}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{fmtNPR(tx.netAmount)}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="cursor-pointer"
                          onClick={() => setEditTx(tx)}
                        >
                          <PencilIcon className="size-3.5" />
                          <span className="sr-only">Edit</span>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="cursor-pointer text-destructive hover:text-destructive"
                          onClick={() => setDeleteTxId(tx.id)}
                        >
                          <Trash2Icon className="size-3.5" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" className="cursor-pointer" />}>
              Close
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EditTransactionDialog tx={editTx} onClose={() => setEditTx(null)} />
      <DeleteConfirmDialog txId={deleteTxId} onClose={() => setDeleteTxId(null)} />
    </>
  )
}

export function StockBreakdownTable({
  summaries,
  portfolioId,
  transactions,
}: {
  summaries: StockSummary[]
  portfolioId?: string
  transactions?: TransactionRow[]
}) {
  const [sortKey, setSortKey] = useState<SortKey>("shareCode")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [sellTarget, setSellTarget] = useState<StockSummary | null>(null)
  const [editTarget, setEditTarget] = useState<StockSummary | null>(null)
  const [closedOpen, setClosedOpen] = useState(false)
  const [expandedCodes, setExpandedCodes] = useState<Set<string>>(new Set())

  function toggleExpand(code: string) {
    setExpandedCodes((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

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
  const colSpan = 10 + extraCol

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
              <TableHead className="text-right" title="Weighted average price actually paid per unit — excludes fees">Buy Price</TableHead>
              <TableHead className="text-right" title="Weighted average cost per unit including broker commission, DP charge, and SEBON — used for capital gains tax">Avg Cost</TableHead>
              <TableHead className="text-right"><SortButton label="Realised P/L" colKey="realisedPL" /></TableHead>
              <TableHead className="text-right">Tax Paid</TableHead>
              <TableHead>Source</TableHead>
              {portfolioId && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            <StockRows
              rows={open}
              onSell={setSellTarget}
              onEdit={setEditTarget}
              portfolioId={portfolioId}
              hasTransactions={!!transactions}
              expandedCodes={expandedCodes}
              onToggleExpand={toggleExpand}
              colSpan={colSpan}
            />
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
                  <StockRows
                    rows={closed}
                    onSell={setSellTarget}
                    onEdit={setEditTarget}
                    portfolioId={portfolioId}
                    hasTransactions={!!transactions}
                    expandedCodes={expandedCodes}
                    onToggleExpand={toggleExpand}
                    colSpan={colSpan}
                  />
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

      {/* Edit holding dialog */}
      {transactions && editTarget && (
        <EditHoldingDialog
          stock={editTarget}
          transactions={transactions}
          onClose={() => setEditTarget(null)}
        />
      )}
    </>
  )
}
