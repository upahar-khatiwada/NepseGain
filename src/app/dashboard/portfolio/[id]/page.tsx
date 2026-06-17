import { headers } from "next/headers"
import { redirect, notFound } from "next/navigation"
import { auth } from "@/src/lib/auth"
import { prisma } from "@/src/lib/prisma"
import { calcPortfolioPL } from "@/src/lib/pl-summary"
import { calcStockSummaries } from "@/src/lib/stock-summary"
import { PLSummaryCard } from "@/src/components/PLSummaryCard"
import { DateRangeFilter } from "@/src/components/DateRangeFilter"
import { StockBreakdownTable } from "@/src/components/StockBreakdownTable"
import { PortfolioActions } from "./_components/portfolio-actions"
import { AddTransactionDialog } from "@/src/components/AddTransactionDialog"
import {
  TransactionTable,
  type TransactionRow,
} from "@/src/components/TransactionTable"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

export default async function PortfolioPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  const { id } = await params
  const { from, to } = await searchParams
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/sign-in")

  const portfolio = await prisma.portfolio.findFirst({
    where: { id, ownerId: session.user.id },
  })

  if (!portfolio) notFound()

  const rawTransactions = await prisma.transaction.findMany({
    where: { portfolioId: id },
    orderBy: { transactionDate: "desc" },
  })

  const transactions: TransactionRow[] = rawTransactions.map((t) => ({
    id: t.id,
    type: t.type as "BUY" | "SELL",
    source: t.source as "PRIMARY" | "SECONDARY",
    shareCode: t.shareCode,
    shareName: t.shareName,
    quantity: t.quantity,
    pricePerUnit: t.pricePerUnit,
    buyPricePerUnit: t.buyPricePerUnit,
    avgBuyCostPerUnit: t.avgBuyCostPerUnit,
    transactionDate: t.transactionDate.toISOString(),
    daysHeld: t.daysHeld,
    brokerCommission: t.brokerCommission,
    dpCharge: t.dpCharge,
    sebon: t.sebon,
    capitalGainTax: t.capitalGainTax,
    netAmount: t.netAmount,
    notes: t.notes,
  }))

  const filteredTransactions = transactions.filter((t) => {
    const date = t.transactionDate.slice(0, 10)
    if (from && date < from) return false
    if (to && date > to) return false
    return true
  })

  const plSummary = calcPortfolioPL(filteredTransactions)

  // Holdings always uses all transactions (unfiltered) — positions are a current-state view
  const stockSummaries = calcStockSummaries(transactions)

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{portfolio.name}</h1>
          {portfolio.description && (
            <p className="text-sm text-muted-foreground mt-1">
              {portfolio.description}
            </p>
          )}
          {(portfolio.brokerName || portfolio.dematNumber) && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {[portfolio.brokerName, portfolio.dematNumber]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
        </div>
        <PortfolioActions
          portfolio={{
            id: portfolio.id,
            name: portfolio.name,
            description: portfolio.description,
            brokerName: portfolio.brokerName,
            dematNumber: portfolio.dematNumber,
          }}
        />
      </div>

      <DateRangeFilter from={from} to={to} />

      <PLSummaryCard summary={plSummary} />

      <Tabs defaultValue="holdings">
        <TabsList>
          <TabsTrigger value="holdings">Holdings</TabsTrigger>
          <TabsTrigger value="transactions">
            Transactions
            {filteredTransactions.length > 0 && (
              <span className="ml-1 text-xs font-normal opacity-70">
                ({filteredTransactions.length})
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="holdings" className="mt-4">
          <StockBreakdownTable summaries={stockSummaries} />
        </TabsContent>

        <TabsContent value="transactions" className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium text-sm text-muted-foreground">
              {filteredTransactions.length === 0
                ? "No transactions in this range"
                : `${filteredTransactions.length} transaction${filteredTransactions.length !== 1 ? "s" : ""}`}
            </h2>
            <AddTransactionDialog portfolioId={id} />
          </div>
          <TransactionTable transactions={filteredTransactions} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
