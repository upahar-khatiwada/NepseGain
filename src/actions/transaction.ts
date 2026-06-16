"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { auth } from "@/src/lib/auth"
import { prisma } from "@/src/lib/prisma"
import { calculateCharges } from "@/src/lib/nepse-calc"

const transactionSchema = z.object({
  type: z.enum(["BUY", "SELL"]),
  shareCode: z.string().min(1, "Share code is required"),
  shareName: z.string().min(1, "Share name is required"),
  quantity: z.coerce.number().positive("Quantity must be positive"),
  pricePerUnit: z.coerce.number().positive("Price must be positive"),
  transactionDate: z.string().min(1, "Date is required"),
  daysHeld: z.coerce.number().int().nonnegative().nullable().optional(),
  notes: z.string().optional(),
})

export type TransactionInput = z.infer<typeof transactionSchema>

async function getCurrentUser() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error("Unauthorized")
  return session.user
}

export async function addTransaction(portfolioId: string, data: TransactionInput) {
  const user = await getCurrentUser()
  const parsed = transactionSchema.parse(data)

  const portfolio = await prisma.portfolio.findFirst({
    where: { id: portfolioId, ownerId: user.id },
  })
  if (!portfolio) throw new Error("Portfolio not found")

  const charges = calculateCharges({
    type: parsed.type,
    quantity: parsed.quantity,
    pricePerUnit: parsed.pricePerUnit,
    daysHeld: parsed.type === "SELL" ? (parsed.daysHeld ?? null) : null,
  })

  await prisma.transaction.create({
    data: {
      portfolioId,
      type: parsed.type,
      shareCode: parsed.shareCode.toUpperCase(),
      shareName: parsed.shareName,
      quantity: parsed.quantity,
      pricePerUnit: parsed.pricePerUnit,
      transactionDate: new Date(parsed.transactionDate),
      daysHeld: parsed.type === "SELL" ? (parsed.daysHeld ?? null) : null,
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

  const charges = calculateCharges({
    type: parsed.type,
    quantity: parsed.quantity,
    pricePerUnit: parsed.pricePerUnit,
    daysHeld: parsed.type === "SELL" ? (parsed.daysHeld ?? null) : null,
  })

  await prisma.transaction.update({
    where: { id },
    data: {
      type: parsed.type,
      shareCode: parsed.shareCode.toUpperCase(),
      shareName: parsed.shareName,
      quantity: parsed.quantity,
      pricePerUnit: parsed.pricePerUnit,
      transactionDate: new Date(parsed.transactionDate),
      daysHeld: parsed.type === "SELL" ? (parsed.daysHeld ?? null) : null,
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
