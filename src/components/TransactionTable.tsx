"use client"

import { useMemo, useState } from "react"
import { ArrowUpDownIcon, PencilIcon, Trash2Icon } from "lucide-react"
import type { TransactionSource } from "@/src/lib/nepse-calc"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { EditTransactionDialog, DeleteConfirmDialog } from "@/src/components/TransactionEditDialogs"

export type TransactionRow = {
  id: string
  type: "BUY" | "SELL"
  source: TransactionSource
  shareCode: string
  shareName: string
  quantity: number
  pricePerUnit: number
  buyPricePerUnit: number | null
  avgBuyCostPerUnit: number | null
  transactionDate: string
  daysHeld: number | null
  brokerCommission: number
  dpCharge: number
  sebon: number
  capitalGainTax: number
  netAmount: number
  notes: string | null
}

const SOURCE_LABEL: Record<TransactionSource, { label: string; className: string }> = {
  PRIMARY:   { label: "IPO",       className: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-transparent" },
  SECONDARY: { label: "Secondary", className: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-transparent" },
  MARKET:    { label: "Secondary", className: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-transparent" },
  AUCTION:   { label: "Auction",   className: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-transparent" },
  IPO:       { label: "IPO",       className: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-transparent" },
  FPO:       { label: "FPO",       className: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-transparent" },
  RIGHT:     { label: "Rights",    className: "bg-indigo-500/10 text-indigo-700 border-transparent" },
  BONUS:     { label: "Bonus",     className: "bg-emerald-500/10 text-emerald-700 border-transparent" },
  MERGER:    { label: "Merger",    className: "bg-orange-500/10 text-orange-700 border-transparent" },
  DEMAT:     { label: "Demat",     className: "bg-slate-500/10 text-slate-600 border-transparent" },
}

export function SourceBadge({ source }: { source: TransactionSource }) {
  const cfg = SOURCE_LABEL[source] ?? { label: source, className: "bg-slate-500/10 text-slate-600 border-transparent" }
  return <Badge className={cfg.className}>{cfg.label}</Badge>
}

export function fmtNPR(n: number) {
  return (
    "NPR " +
    n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  )
}

export function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-NP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

// ─── Main table ───────────────────────────────────────────────────────────────

export function TransactionTable({
  transactions,
}: {
  transactions: TransactionRow[]
}) {
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [editTx, setEditTx] = useState<TransactionRow | null>(null)
  const [deleteTxId, setDeleteTxId] = useState<string | null>(null)

  const sorted = useMemo(() => {
    return [...transactions].sort((a, b) => {
      const diff =
        new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime()
      return sortDir === "asc" ? diff : -diff
    })
  }, [transactions, sortDir])

  if (transactions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">
        No transactions yet. Add your first transaction to get started.
      </div>
    )
  }

  return (
    <>
      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <button
                  type="button"
                  onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                  className="flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors"
                >
                  Date
                  <ArrowUpDownIcon className="size-3.5" />
                </button>
              </TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Net Amount</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((tx) => (
              <TableRow key={tx.id}>
                <TableCell className="text-muted-foreground">
                  {fmtDate(tx.transactionDate)}
                </TableCell>
                <TableCell>
                  {tx.type === "BUY" ? (
                    <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-transparent">
                      BUY
                    </Badge>
                  ) : (
                    <Badge variant="destructive">SELL</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {tx.type === "BUY" && <SourceBadge source={tx.source} />}
                </TableCell>
                <TableCell className="font-medium">{tx.shareCode}</TableCell>
                <TableCell className="max-w-35 truncate text-muted-foreground">
                  {tx.shareName}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {tx.quantity.toLocaleString("en-IN")}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {fmtNPR(tx.pricePerUnit)}
                </TableCell>
                <TableCell className="text-right tabular-nums font-medium">
                  {fmtNPR(tx.netAmount)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="cursor-pointer"
                      onClick={() => setEditTx(tx)}
                    >
                      <PencilIcon className="size-3.5" />
                      <span className="sr-only">Edit</span>
                    </Button>
                    <Button
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

      <EditTransactionDialog tx={editTx} onClose={() => setEditTx(null)} />
      <DeleteConfirmDialog txId={deleteTxId} onClose={() => setDeleteTxId(null)} />
    </>
  )
}
