type TxForCostBasis = {
  type: "BUY" | "SELL"
  shareCode: string
  quantity: number
  pricePerUnit: number
  brokerCommission: number
  dpCharge: number
  sebon: number
  transactionDate: string | Date
}

/**
 * Weighted average cost per unit for a given shareCode, matching the standard
 * moving-average method (same as nepsealpha's WACC calculator): transactions are
 * replayed in chronological order, a BUY blends its cost into the running average,
 * and a SELL reduces the held quantity without changing the average. Once the held
 * quantity is fully sold off, the average resets to 0 so a later BUY starts a fresh
 * cost basis instead of blending in the price of a position that no longer exists.
 */
export function getWeightedAverageCost(
  transactions: TxForCostBasis[],
  shareCode: string
): number {
  const rows = transactions
    .filter((t) => t.shareCode === shareCode)
    .slice()
    .sort(
      (a, b) =>
        new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime()
    )

  let qty = 0
  let wacc = 0

  for (const t of rows) {
    if (t.type === "BUY") {
      const cost = t.quantity * t.pricePerUnit + t.brokerCommission + t.dpCharge + t.sebon
      const newQty = qty + t.quantity
      wacc = newQty > 0 ? (qty * wacc + cost) / newQty : 0
      qty = newQty
    } else {
      qty -= t.quantity
      if (qty <= 0) {
        qty = 0
        wacc = 0
      }
    }
  }

  return wacc
}
