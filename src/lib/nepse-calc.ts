export type TransactionType = "BUY" | "SELL"
export type TransactionSource = "PRIMARY" | "SECONDARY"

export interface ChargeInput {
  type: TransactionType
  quantity: number
  pricePerUnit: number
  source?: TransactionSource | null
  buyPricePerUnit?: number | null      // user-entered buy price — SELL only, used as fallback for CGT
  avgBuyCostPerUnit?: number | null    // server-computed weighted avg — SELL only, takes priority over buyPricePerUnit
  daysHeld?: number | null
}

export interface ChargeResult {
  txValue: number
  brokerCommission: number
  dpCharge: number
  sebon: number
  capitalGain: number  // profit before tax (0 for BUY or when no gain)
  capitalGainTax: number
  netAmount: number
}

export function calculateCharges(input: ChargeInput): ChargeResult {
  const txValue = input.quantity * input.pricePerUnit

  const brokerRate =
    txValue <= 50_000
      ? +process.env.NEXT_PUBLIC_BROKER_RATE_UPTO_50K!
      : txValue <= 500_000
        ? +process.env.NEXT_PUBLIC_BROKER_RATE_50K_500K!
        : +process.env.NEXT_PUBLIC_BROKER_RATE_ABOVE_500K!

  const brokerCommission = txValue * brokerRate
  // IPO (PRIMARY) allotments have DP charge waived
  const dpCharge =
    input.source === "PRIMARY" && input.type === "BUY"
      ? 0
      : +process.env.NEXT_PUBLIC_DP_CHARGE!
  const sebon = txValue * +process.env.NEXT_PUBLIC_SEBON_RATE!

  // avgBuyCostPerUnit takes priority; fall back to user-entered buyPricePerUnit
  const costBasis = input.avgBuyCostPerUnit ?? input.buyPricePerUnit ?? null

  let capitalGain = 0
  let capitalGainTax = 0
  if (input.type === "SELL" && input.daysHeld != null && costBasis != null) {
    const cgtRate =
      input.daysHeld <= 365
        ? +process.env.NEXT_PUBLIC_CGT_SHORT_TERM!
        : +process.env.NEXT_PUBLIC_CGT_LONG_TERM!
    capitalGain = Math.max(0, (input.pricePerUnit - costBasis) * input.quantity)
    capitalGainTax = capitalGain * cgtRate
  }

  const netAmount =
    input.type === "BUY"
      ? txValue + brokerCommission + dpCharge + sebon
      : txValue - brokerCommission - dpCharge - sebon - capitalGainTax

  return { txValue, brokerCommission, dpCharge, sebon, capitalGain, capitalGainTax, netAmount }
}

export function formatNPR(amount: number): string {
  return (
    "NPR " +
    amount.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  )
}
