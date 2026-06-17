import type { TransactionSource } from "@/src/lib/nepse-calc"
import { getWeightedAverageCost } from "@/src/lib/cost-basis"

export interface BuyBreakdownEntry {
  source: TransactionSource
  quantity: number
  avgPrice: number    // raw weighted avg price per unit for this source — no fees
  totalValue: number  // quantity × avgPrice (raw)
}

export interface StockSummary {
  shareCode: string
  shareName: string
  totalBought: number
  totalSold: number
  remainingUnits: number
  totalInvested: number       // raw qty × price across all buys — no fees rolled in
  totalProceeds: number
  totalTaxPaid: number
  realisedPL: number
  avgBuyPrice: number         // weighted avg raw price per unit paid — no fees (the "actual price")
  avgBuyCost: number          // weighted avg cost per unit incl. fees — CGT cost basis
  avgBuyDate: string | null   // ISO string weighted by quantity; null if no buys
  remainingValue: number      // remainingUnits × avgBuyPrice — capital still tied up, unsold
  sources: TransactionSource[]
  buyBreakdown: BuyBreakdownEntry[]  // per-source quantity/price split — explains a blended avgBuyPrice
}

type TxForStockSummary = {
  type: "BUY" | "SELL"
  shareCode: string
  shareName: string
  quantity: number
  pricePerUnit: number
  brokerCommission: number
  dpCharge: number
  sebon: number
  netAmount: number
  capitalGainTax: number
  source: TransactionSource
  transactionDate?: string  // ISO string; used to compute avgBuyDate
}

export function calcStockSummaries(
  transactions: TxForStockSummary[]
): StockSummary[] {
  const map = new Map<
    string,
    {
      shareName: string
      buys: TxForStockSummary[]
      sells: TxForStockSummary[]
      sources: Set<TransactionSource>
    }
  >()

  for (const tx of transactions) {
    if (!map.has(tx.shareCode)) {
      map.set(tx.shareCode, {
        shareName: tx.shareName,
        buys: [],
        sells: [],
        sources: new Set(),
      })
    }
    const entry = map.get(tx.shareCode)!
    if (tx.type === "BUY") {
      entry.buys.push(tx)
      entry.sources.add(tx.source)
    } else {
      entry.sells.push(tx)
    }
  }

  const summaries: StockSummary[] = []

  for (const [shareCode, { shareName, buys, sells, sources }] of map) {
    const totalBought = buys.reduce((sum, t) => sum + t.quantity, 0)
    const totalSold = sells.reduce((sum, t) => sum + t.quantity, 0)
    const remainingUnits = totalBought - totalSold
    const totalInvested = buys.reduce((sum, t) => sum + t.quantity * t.pricePerUnit, 0)
    const totalProceeds = sells.reduce((sum, t) => sum + t.netAmount, 0)
    const totalTaxPaid = sells.reduce((sum, t) => sum + t.capitalGainTax, 0)
    const avgBuyPrice = totalBought > 0 ? totalInvested / totalBought : 0
    const avgBuyCost = getWeightedAverageCost(buys, shareCode)
    const realisedPL =
      totalSold > 0 ? totalProceeds - totalSold * avgBuyCost : 0
    const remainingValue = remainingUnits > 0 ? remainingUnits * avgBuyPrice : 0

    // Per-source quantity/price split — lets the UI explain a blended avgBuyPrice
    // (e.g. a real secondary-market purchase plus several free/cheap bonus lots)
    const bySource = new Map<TransactionSource, { quantity: number; value: number }>()
    for (const b of buys) {
      const entry = bySource.get(b.source) ?? { quantity: 0, value: 0 }
      entry.quantity += b.quantity
      entry.value += b.quantity * b.pricePerUnit
      bySource.set(b.source, entry)
    }
    const buyBreakdown: BuyBreakdownEntry[] = Array.from(bySource.entries())
      .map(([source, { quantity, value }]) => ({
        source,
        quantity,
        avgPrice: quantity > 0 ? value / quantity : 0,
        totalValue: value,
      }))
      .sort((a, b) => b.quantity - a.quantity)

    // Weighted average buy date (by quantity)
    let avgBuyDate: string | null = null
    const buysWithDate = buys.filter((b) => b.transactionDate)
    if (buysWithDate.length > 0 && totalBought > 0) {
      const weightedMs = buysWithDate.reduce(
        (sum, b) => sum + new Date(b.transactionDate!).getTime() * b.quantity,
        0
      )
      const totalQtyWithDate = buysWithDate.reduce((sum, b) => sum + b.quantity, 0)
      avgBuyDate = new Date(weightedMs / totalQtyWithDate).toISOString()
    }

    summaries.push({
      shareCode,
      shareName,
      totalBought,
      totalSold,
      remainingUnits,
      totalInvested,
      totalProceeds,
      totalTaxPaid,
      realisedPL,
      avgBuyPrice,
      avgBuyCost,
      avgBuyDate,
      remainingValue,
      sources: Array.from(sources),
      buyBreakdown,
    })
  }

  return summaries
}

export interface HoldingsSummary {
  stockCount: number
  totalUnits: number
  totalValue: number  // sum of remainingValue across all open positions
}

export function calcHoldingsSummary(summaries: StockSummary[]): HoldingsSummary {
  const open = summaries.filter((s) => s.remainingUnits > 0)
  return {
    stockCount: open.length,
    totalUnits: open.reduce((sum, s) => sum + s.remainingUnits, 0),
    totalValue: open.reduce((sum, s) => sum + s.remainingValue, 0),
  }
}
