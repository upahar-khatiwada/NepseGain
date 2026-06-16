type TxForCostBasis = {
  type: "BUY" | "SELL"
  shareCode: string
  quantity: number
  pricePerUnit: number
  brokerCommission: number
  dpCharge: number
  sebon: number
}

/**
 * Weighted average cost per unit for a given shareCode, including all buy-side fees.
 * Returns 0 if no BUY transactions exist for the shareCode.
 */
export function getWeightedAverageCost(
  transactions: TxForCostBasis[],
  shareCode: string
): number {
  const buys = transactions.filter(
    (t) => t.type === "BUY" && t.shareCode === shareCode
  )

  let totalCost = 0
  let totalQty = 0

  for (const buy of buys) {
    totalCost += buy.quantity * buy.pricePerUnit + buy.brokerCommission + buy.dpCharge + buy.sebon
    totalQty += buy.quantity
  }

  if (totalQty === 0) return 0
  return totalCost / totalQty
}
