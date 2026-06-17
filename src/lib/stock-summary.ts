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
  sources: ("PRIMARY" | "SECONDARY")[]
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
  source: "PRIMARY" | "SECONDARY"
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
      sources: Set<"PRIMARY" | "SECONDARY">
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
      sources: Array.from(sources),
    })
  }

  return summaries
}
