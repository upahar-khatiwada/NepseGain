import { headers } from "next/headers"
import { redirect, notFound } from "next/navigation"
import { auth } from "@/src/lib/auth"
import { prisma } from "@/src/lib/prisma"
import { calcPortfolioPL } from "@/src/lib/pl-summary"
import { calcStockSummaries } from "@/src/lib/stock-summary"
import { PLSummaryCard } from "@/src/components/PLSummaryCard"
import { DateRangeFilter } from "@/src/components/DateRangeFilter"
import { StockBreakdownTable } from "@/src/components/StockBreakdownTable"
import { PLBarChart } from "@/src/components/charts/PLBarChart"
import { PLTrendLine } from "@/src/components/charts/PLTrendLine"
import { PortfolioPieChart } from "@/src/components/charts/PortfolioPieChart"
import { PortfolioActions } from "./_components/portfolio-actions"
import { AddTransactionDialog } from "@/src/components/AddTransactionDialog"
import { MeroShareSyncDialog } from "@/src/components/MeroShareSyncDialog"
import {
  TransactionTable,
  type TransactionRow,
} from "@/src/components/TransactionTable"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import type { TransactionSource } from "@/src/lib/nepse-calc"

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
    source: t.source as TransactionSource,
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
  const stockSummaries = calcStockSummaries(transactions)
  const hasSells = transactions.some((t) => t.type === "SELL")

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{portfolio.name}</h1>
          {portfolio.description && (
            <p className="text-sm text-slate-500 mt-1">{portfolio.description}</p>
          )}
          {(portfolio.brokerName || portfolio.dematNumber) && (
            <p className="text-sm text-slate-400 mt-0.5">
              {[portfolio.brokerName, portfolio.dematNumber].filter(Boolean).join(" · ")}
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

      {/* Charts */}
      {hasSells && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl bg-white border border-slate-100 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-4">
              Monthly P/L
            </h3>
            <PLBarChart transactions={transactions} />
          </div>
          <div className="rounded-xl bg-white border border-slate-100 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-4">
              Cumulative P/L
            </h3>
            <PLTrendLine transactions={transactions} />
          </div>
        </div>
      )}

      {stockSummaries.filter((s) => s.totalInvested > 0).length >= 2 && (
        <div className="rounded-xl bg-white border border-slate-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-4">
            Investment Distribution
          </h3>
          <PortfolioPieChart summaries={stockSummaries} />
        </div>
      )}

      {/* Tabs */}
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
          <div className="flex items-center justify-end gap-2 mb-3">
            <MeroShareSyncDialog portfolioId={id} />
            <AddTransactionDialog portfolioId={id} />
          </div>
          {stockSummaries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="64" height="64" rx="14" fill="#f8fafc" />
                <rect x="10" y="38" width="10" height="16" rx="2" fill="#cbd5e1" />
                <rect x="24" y="28" width="10" height="26" rx="2" fill="#94a3b8" />
                <rect x="38" y="18" width="10" height="36" rx="2" fill="#64748b" />
                <path d="M15 35 L29 25 L43 15" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <p className="text-sm text-slate-500">No transactions yet. Add your first buy or sell.</p>
            </div>
          ) : (
            <StockBreakdownTable summaries={stockSummaries} portfolioId={id} />
          )}
        </TabsContent>

        <TabsContent value="transactions" className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium text-sm text-slate-500">
              {filteredTransactions.length === 0
                ? "No transactions in this range"
                : `${filteredTransactions.length} transaction${filteredTransactions.length !== 1 ? "s" : ""}`}
            </h2>
            <AddTransactionDialog portfolioId={id} />
          </div>
          {filteredTransactions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 py-14 text-center">
              <p className="text-sm text-slate-400">No transactions yet. Add your first buy or sell.</p>
            </div>
          ) : (
            <TransactionTable transactions={filteredTransactions} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
