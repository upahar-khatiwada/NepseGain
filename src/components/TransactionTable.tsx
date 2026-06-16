"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { ArrowUpDownIcon, PencilIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"
import { updateTransaction, deleteTransaction } from "@/src/actions/transaction"
import { calculateCharges } from "@/src/lib/nepse-calc"
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
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export type TransactionRow = {
  id: string
  type: "BUY" | "SELL"
  shareCode: string
  shareName: string
  quantity: number
  pricePerUnit: number
  transactionDate: string
  daysHeld: number | null
  brokerCommission: number
  dpCharge: number
  sebon: number
  capitalGainTax: number
  netAmount: number
  notes: string | null
}

const editSchema = z.object({
  type: z.enum(["BUY", "SELL"]),
  shareCode: z.string().min(1, "Required"),
  shareName: z.string().min(1, "Required"),
  quantity: z.coerce.number().positive("Must be positive"),
  pricePerUnit: z.coerce.number().positive("Must be positive"),
  transactionDate: z.string().min(1, "Required"),
  daysHeld: z.coerce.number().int().nonnegative("Must be 0 or more").nullable().optional(),
  notes: z.string().optional(),
})
type EditFormData = z.infer<typeof editSchema>

function fmtNPR(n: number) {
  return (
    "NPR " +
    n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  )
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-NP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function toDateInput(iso: string) {
  return iso.split("T")[0]
}

// ─── Edit dialog ─────────────────────────────────────────────────────────────

function EditTransactionDialog({
  tx,
  onClose,
}: {
  tx: TransactionRow | null
  onClose: () => void
}) {
  const [pending, setPending] = useState(false)
  const router = useRouter()

  const form = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      type: "BUY",
      shareCode: "",
      shareName: "",
      quantity: undefined,
      pricePerUnit: undefined,
      transactionDate: "",
      daysHeld: null,
      notes: "",
    },
  })

  useEffect(() => {
    if (tx) {
      form.reset({
        type: tx.type,
        shareCode: tx.shareCode,
        shareName: tx.shareName,
        quantity: tx.quantity,
        pricePerUnit: tx.pricePerUnit,
        transactionDate: toDateInput(tx.transactionDate),
        daysHeld: tx.daysHeld,
        notes: tx.notes ?? "",
      })
    }
  }, [tx, form])

  const watchedType = form.watch("type")
  const watchedQty = form.watch("quantity")
  const watchedPrice = form.watch("pricePerUnit")
  const watchedDaysHeld = form.watch("daysHeld")

  const preview = useMemo(() => {
    const qty = Number(watchedQty)
    const price = Number(watchedPrice)
    if (!qty || !price || isNaN(qty) || isNaN(price) || qty <= 0 || price <= 0) return null
    return calculateCharges({
      type: watchedType,
      quantity: qty,
      pricePerUnit: price,
      daysHeld:
        watchedType === "SELL"
          ? watchedDaysHeld != null
            ? Number(watchedDaysHeld)
            : null
          : null,
    })
  }, [watchedType, watchedQty, watchedPrice, watchedDaysHeld])

  async function onSubmit(data: EditFormData) {
    if (!tx) return
    setPending(true)
    try {
      await updateTransaction(tx.id, {
        ...data,
        daysHeld: data.type === "SELL" ? (data.daysHeld ?? null) : null,
      })
      toast.success("Transaction updated")
      onClose()
      router.refresh()
    } catch {
      toast.error("Failed to update transaction")
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={!!tx} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>Edit Transaction</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* BUY / SELL toggle */}
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => field.onChange("BUY")}
                          className={`flex-1 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
                            field.value === "BUY"
                              ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                              : "border-input bg-background text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          BUY
                        </button>
                        <button
                          type="button"
                          onClick={() => field.onChange("SELL")}
                          className={`flex-1 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
                            field.value === "SELL"
                              ? "border-destructive bg-destructive/10 text-destructive"
                              : "border-input bg-background text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          SELL
                        </button>
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="shareCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Share Code</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="NABIL"
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="transactionDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="shareName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Share Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Nabil Bank Limited" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="100"
                          {...field}
                          onChange={(e) => field.onChange(e.target.valueAsNumber)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="pricePerUnit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price per Unit (NPR)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="1200.00"
                          {...field}
                          onChange={(e) => field.onChange(e.target.valueAsNumber)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {watchedType === "SELL" && (
                <FormField
                  control={form.control}
                  name="daysHeld"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Days Held</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="365"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === "" ? null : e.target.valueAsNumber
                            )
                          }
                        />
                      </FormControl>
                      <FormDescription>
                        Calendar days between buy date and this sell date. Used to
                        determine CGT rate (≤ 365 days → 7.5%, &gt; 365 days → 5%).
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <textarea
                        className="w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 min-h-18 resize-none dark:bg-input/30"
                        placeholder="Optional notes"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {preview && (
                <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                  <p className="mb-2 font-medium text-foreground">Charge Preview</p>
                  <div className="space-y-1 text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Transaction Value</span>
                      <span className="tabular-nums text-foreground">
                        {fmtNPR(preview.txValue)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Broker Commission</span>
                      <span className="tabular-nums">{fmtNPR(preview.brokerCommission)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>DP Charge</span>
                      <span className="tabular-nums">{fmtNPR(preview.dpCharge)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>SEBON Fee</span>
                      <span className="tabular-nums">{fmtNPR(preview.sebon)}</span>
                    </div>
                    {watchedType === "SELL" && (
                      <div className="flex justify-between">
                        <span>Capital Gain Tax</span>
                        <span className="tabular-nums">{fmtNPR(preview.capitalGainTax)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t pt-1 font-medium text-foreground">
                      <span>{watchedType === "BUY" ? "Total Cost" : "Net Proceeds"}</span>
                      <span className="tabular-nums">{fmtNPR(preview.netAmount)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <DialogClose
                render={
                  <Button variant="outline" type="button" className="cursor-pointer" />
                }
              >
                Cancel
              </DialogClose>
              <Button type="submit" disabled={pending} className="cursor-pointer">
                {pending ? "Saving…" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Delete confirmation dialog ───────────────────────────────────────────────

function DeleteConfirmDialog({
  txId,
  onClose,
}: {
  txId: string | null
  onClose: () => void
}) {
  const [pending, setPending] = useState(false)
  const router = useRouter()

  async function onDelete() {
    if (!txId) return
    setPending(true)
    try {
      await deleteTransaction(txId)
      toast.success("Transaction deleted")
      onClose()
      router.refresh()
    } catch {
      toast.error("Failed to delete transaction")
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={!!txId} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Transaction</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Permanently delete this transaction? This cannot be undone.
        </p>
        <DialogFooter>
          <DialogClose
            render={
              <Button variant="outline" type="button" className="cursor-pointer" />
            }
          >
            Cancel
          </DialogClose>
          <Button
            variant="destructive"
            onClick={onDelete}
            disabled={pending}
            className="cursor-pointer"
          >
            {pending ? "Deleting…" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
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
      <div className="rounded-xl border overflow-hidden">
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
                <TableCell className="font-medium">{tx.shareCode}</TableCell>
                <TableCell className="max-w-[140px] truncate text-muted-foreground">
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
