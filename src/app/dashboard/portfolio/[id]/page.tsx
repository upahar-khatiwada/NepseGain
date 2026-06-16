import { headers } from "next/headers"
import { redirect, notFound } from "next/navigation"
import { auth } from "@/src/lib/auth"
import { prisma } from "@/src/lib/prisma"
import { PortfolioActions } from "./_components/portfolio-actions"
import { AddTransactionDialog } from "@/src/components/AddTransactionDialog"
import {
  TransactionTable,
  type TransactionRow,
} from "@/src/components/TransactionTable"

export default async function PortfolioPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
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
    shareCode: t.shareCode,
    shareName: t.shareName,
    quantity: t.quantity,
    pricePerUnit: t.pricePerUnit,
    transactionDate: t.transactionDate.toISOString(),
    daysHeld: t.daysHeld,
    brokerCommission: t.brokerCommission,
    dpCharge: t.dpCharge,
    sebon: t.sebon,
    capitalGainTax: t.capitalGainTax,
    netAmount: t.netAmount,
    notes: t.notes,
  }))

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-8">
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

      {/* Transactions */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium">
            Transactions
            {transactions.length > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({transactions.length})
              </span>
            )}
          </h2>
          <AddTransactionDialog portfolioId={id} />
        </div>
        <TransactionTable transactions={transactions} />
      </div>

      {/* P/L summary — built in Prompt 6 */}
      <div>
        <h2 className="font-medium mb-3">P/L Summary</h2>
        <div className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">
          P/L summary coming in the next step.
        </div>
      </div>
    </div>
  )
}
