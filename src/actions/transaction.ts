"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { auth } from "@/src/lib/auth"
import { prisma } from "@/src/lib/prisma"
import { calculateCharges } from "@/src/lib/nepse-calc"
import { getWeightedAverageCost } from "@/src/lib/cost-basis"
import type { EnrichedLot } from "@/src/lib/meroshare-api"
import { mapTransactionType } from "@/src/lib/meroshare-api"

const transactionSchema = z
  .object({
    type: z.enum(["BUY", "SELL"]),
    source: z.enum(["PRIMARY", "SECONDARY", "MARKET", "AUCTION", "IPO", "FPO", "RIGHT", "BONUS", "MERGER", "DEMAT"]).default("SECONDARY"),
    shareCode: z.string().min(1, "Share code is required"),
    shareName: z.string().min(1, "Share name is required"),
    quantity: z.coerce.number().positive("Quantity must be positive"),
    pricePerUnit: z.coerce.number().nonnegative("Price must be 0 or more"),
    buyPricePerUnit: z.coerce.number().positive().nullable().optional(),
    transactionDate: z.string().min(1, "Date is required"),
    daysHeld: z.coerce.number().int().nonnegative().nullable().optional(),
    notes: z.string().optional(),
  })
  .refine(
    (data) => data.pricePerUnit > 0 || (data.type === "BUY" && data.source === "BONUS"),
    { message: "Price must be positive", path: ["pricePerUnit"] }
  )

export type TransactionInput = z.infer<typeof transactionSchema>

async function getCurrentUser() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error("Unauthorized")
  return session.user
}

async function computeAvgBuyCost(
  portfolioId: string,
  shareCode: string,
  excludeId?: string
): Promise<number | null> {
  const buys = await prisma.transaction.findMany({
    where: {
      portfolioId,
      type: "BUY",
      shareCode,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: {
      type: true,
      shareCode: true,
      quantity: true,
      pricePerUnit: true,
      brokerCommission: true,
      dpCharge: true,
      sebon: true,
    },
  })
  if (buys.length === 0) return null
  const avg = getWeightedAverageCost(
    buys.map((b) => ({ ...b, type: "BUY" as const })),
    shareCode
  )
  return avg === 0 ? null : avg
}

export async function addTransaction(portfolioId: string, data: TransactionInput) {
  const user = await getCurrentUser()
  const parsed = transactionSchema.parse(data)

  const portfolio = await prisma.portfolio.findFirst({
    where: { id: portfolioId, ownerId: user.id },
  })
  if (!portfolio) throw new Error("Portfolio not found")

  const isSell = parsed.type === "SELL"
  const shareCode = parsed.shareCode.toUpperCase()

  const avgBuyCostPerUnit = isSell
    ? await computeAvgBuyCost(portfolioId, shareCode)
    : null

  const charges = calculateCharges({
    type: parsed.type,
    source: parsed.source,
    quantity: parsed.quantity,
    pricePerUnit: parsed.pricePerUnit,
    buyPricePerUnit: isSell ? (parsed.buyPricePerUnit ?? null) : null,
    avgBuyCostPerUnit: isSell ? avgBuyCostPerUnit : null,
    daysHeld: isSell ? (parsed.daysHeld ?? null) : null,
  })

  await prisma.transaction.create({
    data: {
      portfolioId,
      type: parsed.type,
      source: parsed.source,
      shareCode,
      shareName: parsed.shareName,
      quantity: parsed.quantity,
      pricePerUnit: parsed.pricePerUnit,
      buyPricePerUnit: isSell ? (parsed.buyPricePerUnit ?? null) : null,
      avgBuyCostPerUnit: isSell ? avgBuyCostPerUnit : null,
      transactionDate: new Date(parsed.transactionDate),
      daysHeld: isSell ? (parsed.daysHeld ?? null) : null,
      brokerCommission: charges.brokerCommission,
      dpCharge: charges.dpCharge,
      sebon: charges.sebon,
      capitalGainTax: charges.capitalGainTax,
      netAmount: charges.netAmount,
      notes: parsed.notes || null,
    },
  })

  revalidatePath(`/dashboard/portfolio/${portfolioId}`, "layout")
  revalidatePath("/dashboard", "layout")
}

export async function updateTransaction(id: string, data: TransactionInput) {
  const user = await getCurrentUser()
  const parsed = transactionSchema.parse(data)

  const tx = await prisma.transaction.findFirst({
    where: { id },
    include: { portfolio: { select: { ownerId: true, id: true } } },
  })
  if (!tx || tx.portfolio.ownerId !== user.id) throw new Error("Transaction not found")

  const isSell = parsed.type === "SELL"
  const shareCode = parsed.shareCode.toUpperCase()

  const avgBuyCostPerUnit = isSell
    ? await computeAvgBuyCost(tx.portfolio.id, shareCode)
    : null

  const charges = calculateCharges({
    type: parsed.type,
    source: parsed.source,
    quantity: parsed.quantity,
    pricePerUnit: parsed.pricePerUnit,
    buyPricePerUnit: isSell ? (parsed.buyPricePerUnit ?? null) : null,
    avgBuyCostPerUnit: isSell ? avgBuyCostPerUnit : null,
    daysHeld: isSell ? (parsed.daysHeld ?? null) : null,
  })

  await prisma.transaction.update({
    where: { id },
    data: {
      type: parsed.type,
      source: parsed.source,
      shareCode,
      shareName: parsed.shareName,
      quantity: parsed.quantity,
      pricePerUnit: parsed.pricePerUnit,
      buyPricePerUnit: isSell ? (parsed.buyPricePerUnit ?? null) : null,
      avgBuyCostPerUnit: isSell ? avgBuyCostPerUnit : null,
      transactionDate: new Date(parsed.transactionDate),
      daysHeld: isSell ? (parsed.daysHeld ?? null) : null,
      brokerCommission: charges.brokerCommission,
      dpCharge: charges.dpCharge,
      sebon: charges.sebon,
      capitalGainTax: charges.capitalGainTax,
      netAmount: charges.netAmount,
      notes: parsed.notes || null,
    },
  })

  revalidatePath(`/dashboard/portfolio/${tx.portfolio.id}`, "layout")
  revalidatePath("/dashboard", "layout")
}

export async function deleteTransaction(id: string) {
  const user = await getCurrentUser()

  const tx = await prisma.transaction.findFirst({
    where: { id },
    include: { portfolio: { select: { ownerId: true, id: true } } },
  })
  if (!tx || tx.portfolio.ownerId !== user.id) throw new Error("Transaction not found")

  await prisma.transaction.delete({ where: { id } })

  revalidatePath(`/dashboard/portfolio/${tx.portfolio.id}`, "layout")
  revalidatePath("/dashboard", "layout")
}

export interface ImportLotInput extends EnrichedLot {
  editedRate?: number | null
  selected?: boolean
}

export async function importMeroShareLots(
  portfolioId: string,
  lots: ImportLotInput[]
): Promise<{ imported: number; skipped: number; failed: string[] }> {
  const user = await getCurrentUser()

  const portfolio = await prisma.portfolio.findFirst({
    where: { id: portfolioId, ownerId: user.id },
  })
  if (!portfolio) throw new Error("Portfolio not found")

  let imported = 0
  let skipped = 0
  const failed: string[] = []

  for (const lot of lots) {
    if (lot.selected === false) continue

    const shareCode = lot.scrip.toUpperCase()
    const source = mapTransactionType(lot.transactionType)
    const rate = lot.editedRate ?? lot.rate
    const txDate = new Date(lot.transactionDate)

    // Duplicate check: same portfolio + stock + date + quantity + source
    const existing = await prisma.transaction.findFirst({
      where: {
        portfolioId,
        shareCode,
        transactionDate: txDate,
        quantity: lot.quantity,
        source,
      },
    })
    if (existing) {
      skipped++
      continue
    }

    try {
      const charges = calculateCharges({
        type: "BUY",
        source,
        quantity: lot.quantity,
        pricePerUnit: rate,
      })

      await prisma.transaction.create({
        data: {
          portfolioId,
          type: "BUY",
          source,
          shareCode,
          shareName: lot.companyName,
          quantity: lot.quantity,
          pricePerUnit: rate,
          buyPricePerUnit: null,
          avgBuyCostPerUnit: null,
          transactionDate: txDate,
          daysHeld: null,
          brokerCommission: charges.brokerCommission,
          dpCharge: charges.dpCharge,
          sebon: charges.sebon,
          capitalGainTax: 0,
          netAmount: charges.netAmount,
          notes: lot.history || null,
          importedFrom: "MEROSHARE",
        },
      })
      imported++
    } catch {
      failed.push(`${shareCode} ${lot.transactionDate}`)
    }
  }

  revalidatePath(`/dashboard/portfolio/${portfolioId}`, "layout")
  revalidatePath("/dashboard", "layout")
  return { imported, skipped, failed }
}

export async function getPortfolioTransactions(
  portfolioId: string,
  filters?: { startDate?: Date; endDate?: Date }
) {
  const user = await getCurrentUser()

  const portfolio = await prisma.portfolio.findFirst({
    where: { id: portfolioId, ownerId: user.id },
  })
  if (!portfolio) throw new Error("Portfolio not found")

  return prisma.transaction.findMany({
    where: {
      portfolioId,
      ...(filters?.startDate || filters?.endDate
        ? {
            transactionDate: {
              ...(filters.startDate ? { gte: filters.startDate } : {}),
              ...(filters.endDate ? { lte: filters.endDate } : {}),
            },
          }
        : {}),
    },
    orderBy: { transactionDate: "desc" },
  })
}
