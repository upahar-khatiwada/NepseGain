"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { addTransaction } from "@/src/actions/transaction"
import { calculateCharges, formatNPR } from "@/src/lib/nepse-calc"
import type { StockSummary } from "@/src/lib/stock-summary"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function computeDaysHeld(avgBuyDate: string | null, sellDate: string): number | null {
  if (!avgBuyDate || !sellDate) return null
  const diff = new Date(sellDate).getTime() - new Date(avgBuyDate).getTime()
  return Math.max(0, Math.floor(diff / 86_400_000))
}

export function SellDialog({
  stock,
  portfolioId,
  open,
  onClose,
}: {
  stock: StockSummary
  portfolioId: string
  open: boolean
  onClose: () => void
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [qty, setQty] = useState("")
  const [price, setPrice] = useState("")
  const [sellDate, setSellDate] = useState(todayStr)
  const [daysOverride, setDaysOverride] = useState<string>("")
  const [overrideDays, setOverrideDays] = useState(false)

  const autoDays = useMemo(
    () => computeDaysHeld(stock.avgBuyDate, sellDate),
    [stock.avgBuyDate, sellDate]
  )
  const daysHeld = overrideDays
    ? daysOverride === "" ? null : parseInt(daysOverride, 10)
    : autoDays

  const preview = useMemo(() => {
    const q = Number(qty)
    const p = Number(price)
    if (!q || !p || isNaN(q) || isNaN(p) || q <= 0 || p <= 0) return null
    return calculateCharges({
      type: "SELL",
      quantity: q,
      pricePerUnit: p,
      avgBuyCostPerUnit: stock.avgBuyCost > 0 ? stock.avgBuyCost : null,
      daysHeld,
    })
  }, [qty, price, stock.avgBuyCost, daysHeld])

  const cgtLabel =
    daysHeld != null
      ? daysHeld <= 365
        ? "Short-term (≤365 days, 7.5%)"
        : "Long-term (>365 days, 5.0%)"
      : ""

  function reset() {
    setQty("")
    setPrice("")
    setSellDate(todayStr())
    setDaysOverride("")
    setOverrideDays(false)
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function handleSubmit() {
    const q = Number(qty)
    const p = Number(price)
    if (!q || !p || q <= 0 || p <= 0) {
      toast.error("Enter valid quantity and price.")
      return
    }
    if (q > stock.remainingUnits) {
      toast.error(`You only hold ${stock.remainingUnits} units.`)
      return
    }
    setPending(true)
    try {
      await addTransaction(portfolioId, {
        type: "SELL",
        source: "SECONDARY",
        shareCode: stock.shareCode,
        shareName: stock.shareName,
        quantity: q,
        pricePerUnit: p,
        buyPricePerUnit: stock.avgBuyCost > 0 ? stock.avgBuyCost : null,
        transactionDate: sellDate,
        daysHeld: daysHeld ?? undefined,
        notes: undefined,
      })
      const netProfit = preview ? preview.netAmount - (stock.avgBuyCost * q) : 0
      const sign = netProfit >= 0 ? "+" : ""
      toast.success(
        `Sold ${q} units of ${stock.shareCode} · ${sign}${formatNPR(netProfit)}`
      )
      reset()
      onClose()
      router.refresh()
    } catch {
      toast.error("Failed to record sell. Try again.")
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sell {stock.shareCode}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Read-only stock info */}
          <div className="rounded-lg bg-muted/40 border px-3 py-2.5 space-y-1 text-sm">
            <div className="font-medium">{stock.shareCode} — {stock.shareName}</div>
            <div className="text-muted-foreground">
              You hold <span className="font-medium text-foreground">{stock.remainingUnits.toLocaleString("en-IN")}</span> units
              {stock.avgBuyCost > 0 && (
                <> · Avg cost <span className="font-medium text-foreground">{formatNPR(stock.avgBuyCost)}</span></>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sell-qty">Quantity to Sell</Label>
              <Input
                id="sell-qty"
                type="number"
                min="1"
                max={stock.remainingUnits}
                step="1"
                placeholder={`1 – ${stock.remainingUnits}`}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sell-price">Sell Price (NPR)</Label>
              <Input
                id="sell-price"
                type="number"
                min="0"
                step="0.01"
                placeholder="1500.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sell-date">Sell Date</Label>
            <Input
              id="sell-date"
              type="date"
              value={sellDate}
              onChange={(e) => setSellDate(e.target.value)}
            />
          </div>

          {/* Days held row */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Days Held</Label>
              <button
                type="button"
                className="text-xs text-blue-600 hover:underline cursor-pointer"
                onClick={() => {
                  setOverrideDays((v) => !v)
                  if (!overrideDays && autoDays != null) setDaysOverride(String(autoDays))
                }}
              >
                {overrideDays ? "Use auto" : "Override"}
              </button>
            </div>
            {overrideDays ? (
              <Input
                type="number"
                min="0"
                step="1"
                value={daysOverride}
                onChange={(e) => setDaysOverride(e.target.value)}
                placeholder="e.g. 365"
              />
            ) : (
              <div className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm text-muted-foreground bg-muted/30">
                {autoDays != null ? `~${autoDays} days held` : "No avg buy date available"}
              </div>
            )}
          </div>

          {/* Live P/L preview */}
          {preview && (
            <div className="rounded-lg border bg-muted/40 p-3 text-sm space-y-1">
              <p className="font-medium mb-2">P/L Preview</p>
              <div className="space-y-1 text-muted-foreground">
                <div className="flex justify-between">
                  <span>Gross Proceeds</span>
                  <span className="tabular-nums text-foreground">{formatNPR(preview.txValue)}</span>
                </div>
                {stock.avgBuyCost > 0 && (
                  <div className="flex justify-between">
                    <span>Avg Buy Cost</span>
                    <span className="tabular-nums">{formatNPR(stock.avgBuyCost * Number(qty || 0))}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Broker Commission</span>
                  <span className="tabular-nums">{formatNPR(preview.brokerCommission)}</span>
                </div>
                <div className="flex justify-between">
                  <span>DP Charge</span>
                  <span className="tabular-nums">{formatNPR(preview.dpCharge)}</span>
                </div>
                <div className="flex justify-between">
                  <span>SEBON</span>
                  <span className="tabular-nums">{formatNPR(preview.sebon)}</span>
                </div>
                {preview.capitalGain > 0 && (
                  <div className="flex justify-between">
                    <span>Capital Gain Tax {cgtLabel ? `(${cgtLabel})` : ""}</span>
                    <span className="tabular-nums">{formatNPR(preview.capitalGainTax)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-1 font-semibold">
                  <span>Net Proceeds</span>
                  <span
                    className="tabular-nums"
                    style={
                      preview.netAmount >= preview.txValue * 0.9
                        ? { color: "#16a34a" }
                        : { color: "#dc2626" }
                    }
                  >
                    {formatNPR(preview.netAmount)}
                  </span>
                </div>
                {stock.avgBuyCost > 0 && (
                  <div className="flex justify-between font-bold text-base border-t pt-1">
                    <span>NET PROFIT</span>
                    <span
                      className="tabular-nums"
                      style={
                        preview.netAmount - stock.avgBuyCost * Number(qty || 0) >= 0
                          ? { color: "#16a34a" }
                          : { color: "#dc2626" }
                      }
                    >
                      {formatNPR(preview.netAmount - stock.avgBuyCost * Number(qty || 0))}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <DialogClose
            render={<Button variant="outline" type="button" className="cursor-pointer" />}
          >
            Cancel
          </DialogClose>
          <Button
            type="button"
            disabled={pending}
            className="cursor-pointer"
            style={{ backgroundColor: "#dc2626", color: "white" }}
            onClick={handleSubmit}
          >
            {pending ? "Selling…" : "Confirm Sell"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
