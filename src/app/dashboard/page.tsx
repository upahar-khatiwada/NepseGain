import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/src/lib/auth"
import { prisma } from "@/src/lib/prisma"
import { AddPortfolioSection } from "./_components/add-portfolio-section"

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>
}) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/sign-in")

  const portfolios = await prisma.portfolio.findMany({
    where: { ownerId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      transactions: {
        select: { type: true, netAmount: true },
      },
    },
  })

  const { new: openNew } = await searchParams

  const portfoliosWithStats = portfolios.map(({ transactions, ...p }) => ({
    id: p.id,
    name: p.name,
    brokerName: p.brokerName,
    transactionCount: transactions.length,
    totalInvested: transactions
      .filter((t) => t.type === "BUY")
      .reduce((sum, t) => sum + t.netAmount, 0),
    realisedPL: transactions
      .filter((t) => t.type === "SELL")
      .reduce((sum, t) => sum + t.netAmount, 0),
  }))

  return (
    <div className="p-6">
      <AddPortfolioSection
        portfolios={portfoliosWithStats}
        defaultOpen={openNew === "1"}
      />
    </div>
  )
}
