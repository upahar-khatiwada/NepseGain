export type PLSummary = {
  totalInvested: number
  totalProceeds: number
  grossPL: number
  totalTax: number
  totalCommissions: number
  netPL: number
  txCount: number
}

type TxForPL = {
  type: "BUY" | "SELL"
  transactionDate: string
  netAmount: number
  brokerCommission: number
  dpCharge: number
  sebon: number
  capitalGainTax: number
  quantity: number
  pricePerUnit: number
}

export function calcPortfolioPL(
  transactions: TxForPL[],
  startDate?: string,
  endDate?: string
): PLSummary {
  const filtered = transactions.filter((t) => {
    const date = t.transactionDate.slice(0, 10)
    if (startDate && date < startDate) return false
    if (endDate && date > endDate) return false
    return true
  })

  let totalInvested = 0
  let totalProceeds = 0
  let totalTax = 0
  let totalCommissions = 0
  let buyTxValue = 0
  let sellTxValue = 0

  for (const t of filtered) {
    const txValue = t.quantity * t.pricePerUnit
    totalCommissions += t.brokerCommission + t.dpCharge + t.sebon

    if (t.type === "BUY") {
      totalInvested += t.netAmount
      buyTxValue += txValue
    } else {
      totalProceeds += t.netAmount
      totalTax += t.capitalGainTax
      sellTxValue += txValue
    }
  }

  return {
    totalInvested,
    totalProceeds,
    grossPL: sellTxValue - buyTxValue,
    totalTax,
    totalCommissions,
    netPL: totalProceeds - totalInvested,
    txCount: filtered.length,
  }
}

export function calcGroupPL(summaries: PLSummary[]): PLSummary {
  return summaries.reduce(
    (acc, s) => ({
      totalInvested: acc.totalInvested + s.totalInvested,
      totalProceeds: acc.totalProceeds + s.totalProceeds,
      grossPL: acc.grossPL + s.grossPL,
      totalTax: acc.totalTax + s.totalTax,
      totalCommissions: acc.totalCommissions + s.totalCommissions,
      netPL: acc.netPL + s.netPL,
      txCount: acc.txCount + s.txCount,
    }),
    {
      totalInvested: 0,
      totalProceeds: 0,
      grossPL: 0,
      totalTax: 0,
      totalCommissions: 0,
      netPL: 0,
      txCount: 0,
    }
  )
}
