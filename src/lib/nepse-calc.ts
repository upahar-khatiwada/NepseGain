export type TransactionType = "BUY" | "SELL"

export interface ChargeInput {
  type: TransactionType
  quantity: number
  pricePerUnit: number
  daysHeld?: number | null
}

export interface ChargeResult {
  txValue: number
  brokerCommission: number
  dpCharge: number
  sebon: number
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
  const dpCharge = +process.env.NEXT_PUBLIC_DP_CHARGE!
  const sebon = txValue * +process.env.NEXT_PUBLIC_SEBON_RATE!

  let capitalGainTax = 0
  if (input.type === "SELL" && input.daysHeld != null) {
    const cgtRate =
      input.daysHeld <= 365
        ? +process.env.NEXT_PUBLIC_CGT_SHORT_TERM!
        : +process.env.NEXT_PUBLIC_CGT_LONG_TERM!
    capitalGainTax = txValue * cgtRate
  }

  const netAmount =
    input.type === "BUY"
      ? txValue + brokerCommission + dpCharge + sebon
      : txValue - brokerCommission - dpCharge - sebon - capitalGainTax

  return { txValue, brokerCommission, dpCharge, sebon, capitalGainTax, netAmount }
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
