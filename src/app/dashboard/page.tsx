import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/src/lib/auth"
import { prisma } from "@/src/lib/prisma"
import { calcPortfolioPL, calcGroupPL } from "@/src/lib/pl-summary"
import { calcStockSummaries } from "@/src/lib/stock-summary"
import { PLSummaryCard } from "@/src/components/PLSummaryCard"
import { DateRangeFilter } from "@/src/components/DateRangeFilter"
import { StockBreakdownTable } from "@/src/components/StockBreakdownTable"
import { AddPortfolioSection } from "./_components/add-portfolio-section"

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string; from?: string; to?: string }>
}) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/sign-in")

  const portfolios = await prisma.portfolio.findMany({
    where: { ownerId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      transactions: {
        select: {
          type: true,
          transactionDate: true,
          netAmount: true,
          brokerCommission: true,
          dpCharge: true,
          sebon: true,
          capitalGainTax: true,
          quantity: true,
          pricePerUnit: true,
          shareCode: true,
          shareName: true,
          source: true,
        },
      },
    },
  })

  const { new: openNew, from, to } = await searchParams

  const portfoliosWithPL = portfolios.map(({ transactions, ...p }) => {
    const txWithIsoDate = transactions.map((t) => ({
      ...t,
      transactionDate: t.transactionDate.toISOString(),
      source: t.source as "PRIMARY" | "SECONDARY",
    }))
    const pl = calcPortfolioPL(txWithIsoDate, from, to)
    return { ...p, pl, transactions: txWithIsoDate }
  })

  const overallPL = calcGroupPL(portfoliosWithPL.map((p) => p.pl))

  // Aggregate all transactions across every portfolio for the combined holdings view
  const allTransactions = portfoliosWithPL.flatMap((p) => p.transactions)
  const allStockSummaries = calcStockSummaries(allTransactions)

  const portfoliosForSection = portfoliosWithPL.map(({ pl, transactions: _tx, ...p }) => ({
    id: p.id,
    name: p.name,
    brokerName: p.brokerName,
    transactionCount: pl.txCount,
    totalInvested: pl.totalInvested,
    netPL: pl.netPL,
  }))

  return (
    <div className="p-6 space-y-6">
      <DateRangeFilter from={from} to={to} />

      {portfolios.length > 0 && <PLSummaryCard summary={overallPL} />}

      <AddPortfolioSection
        portfolios={portfoliosForSection}
        defaultOpen={openNew === "1"}
      />

      {allStockSummaries.length > 0 && (
        <div>
          <h2 className="font-medium mb-3">Holdings (All Portfolios)</h2>
          <StockBreakdownTable summaries={allStockSummaries} />
        </div>
      )}
    </div>
  )
}
