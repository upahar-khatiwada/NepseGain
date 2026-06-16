"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { PlusIcon } from "lucide-react"
import { toast } from "sonner"
import { addTransaction } from "@/src/actions/transaction"
import { calculateCharges } from "@/src/lib/nepse-calc"
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

const schema = z.object({
  type: z.enum(["BUY", "SELL"]),
  shareCode: z.string().min(1, "Required"),
  shareName: z.string().min(1, "Required"),
  quantity: z.coerce.number().positive("Must be positive"),
  pricePerUnit: z.coerce.number().positive("Must be positive"),
  transactionDate: z.string().min(1, "Required"),
  daysHeld: z.coerce.number().int().nonnegative("Must be 0 or more").nullable().optional(),
  notes: z.string().optional(),
})
type FormData = z.infer<typeof schema>

function fmtNPR(n: number) {
  return (
    "NPR " +
    n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  )
}

export function AddTransactionDialog({ portfolioId }: { portfolioId: string }) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const router = useRouter()

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
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

  async function onSubmit(data: FormData) {
    setPending(true)
    try {
      await addTransaction(portfolioId, {
        ...data,
        daysHeld: data.type === "SELL" ? (data.daysHeld ?? null) : null,
      })
      toast.success("Transaction added")
      setOpen(false)
      form.reset()
      router.refresh()
    } catch {
      toast.error("Failed to add transaction")
    } finally {
      setPending(false)
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next) form.reset()
    setOpen(next)
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-1.5 cursor-pointer" size="sm">
        <PlusIcon />
        Add Transaction
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <DialogHeader>
                <DialogTitle>Add Transaction</DialogTitle>
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
                            onChange={(e) =>
                              field.onChange(e.target.value.toUpperCase())
                            }
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

                {/* Live charge preview */}
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
                        <span>
                          {watchedType === "BUY" ? "Total Cost" : "Net Proceeds"}
                        </span>
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
                  {pending ? "Adding…" : "Add Transaction"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  )
}
