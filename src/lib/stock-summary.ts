import type { TransactionSource } from "@/src/lib/nepse-calc"
import { getWeightedAverageCost } from "@/src/lib/cost-basis"

export interface StockSummary {
  shareCode: string
  shareName: string
  totalBought: number
  totalSold: number
  remainingUnits: number
  totalInvested: number
  totalProceeds: number
  totalTaxPaid: number
  realisedPL: number
  avgBuyCost: number
  avgBuyDate: string | null  // ISO string weighted by quantity; null if no buys
  sources: TransactionSource[]
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
    const totalInvested = buys.reduce((sum, t) => sum + t.netAmount, 0)
    const totalProceeds = sells.reduce((sum, t) => sum + t.netAmount, 0)
    const totalTaxPaid = sells.reduce((sum, t) => sum + t.capitalGainTax, 0)
    const avgBuyCost = getWeightedAverageCost(buys, shareCode)
    const realisedPL =
      totalSold > 0 ? totalProceeds - totalSold * avgBuyCost : 0

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
      avgBuyCost,
      avgBuyDate,
      sources: Array.from(sources),
    })
  }

  return summaries
}
