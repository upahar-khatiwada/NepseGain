"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { auth } from "@/src/lib/auth"
import { prisma } from "@/src/lib/prisma"

const portfolioSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  brokerName: z.string().optional(),
  dematNumber: z.string().optional(),
})

export type PortfolioInput = z.infer<typeof portfolioSchema>

async function getCurrentUser() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error("Unauthorized")
  return session.user
}

export async function createPortfolio(data: PortfolioInput) {
  const user = await getCurrentUser()
  const parsed = portfolioSchema.parse(data)

  await prisma.portfolio.create({
    data: {
      ownerId: user.id,
      name: parsed.name,
      description: parsed.description || null,
      brokerName: parsed.brokerName || null,
      dematNumber: parsed.dematNumber || null,
    },
  })

  revalidatePath("/dashboard", "layout")
}

export async function updatePortfolio(id: string, data: PortfolioInput) {
  const user = await getCurrentUser()
  const parsed = portfolioSchema.parse(data)

  const existing = await prisma.portfolio.findFirst({
    where: { id, ownerId: user.id },
  })
  if (!existing) throw new Error("Portfolio not found")

  await prisma.portfolio.update({
    where: { id },
    data: {
      name: parsed.name,
      description: parsed.description || null,
      brokerName: parsed.brokerName || null,
      dematNumber: parsed.dematNumber || null,
    },
  })

  revalidatePath("/dashboard", "layout")
  revalidatePath(`/dashboard/portfolio/${id}`, "layout")
}

export async function deletePortfolio(id: string) {
  const user = await getCurrentUser()

  const existing = await prisma.portfolio.findFirst({
    where: { id, ownerId: user.id },
  })
  if (!existing) throw new Error("Portfolio not found")

  await prisma.portfolio.delete({ where: { id } })

  revalidatePath("/dashboard", "layout")
}

export async function getUserPortfolios() {
  const user = await getCurrentUser()

  const portfolios = await prisma.portfolio.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      transactions: {
        select: { type: true, netAmount: true },
      },
    },
  })

  return portfolios.map(({ transactions, ...p }) => ({
    id: p.id,
    name: p.name,
    brokerName: p.brokerName,
    description: p.description,
    dematNumber: p.dematNumber,
    transactionCount: transactions.length,
    totalInvested: transactions
      .filter((t) => t.type === "BUY")
      .reduce((sum, t) => sum + t.netAmount, 0),
    realisedPL: transactions
      .filter((t) => t.type === "SELL")
      .reduce((sum, t) => sum + t.netAmount, 0),
  }))
}
