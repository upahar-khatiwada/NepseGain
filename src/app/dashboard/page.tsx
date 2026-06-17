import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { calcPortfolioPL, calcGroupPL } from "@/src/lib/pl-summary";
import type { TransactionSource } from "@/src/lib/nepse-calc";
import { calcStockSummaries, calcHoldingsSummary } from "@/src/lib/stock-summary";
import { PLSummaryCard } from "@/src/components/PLSummaryCard";
import { DateRangeFilter } from "@/src/components/DateRangeFilter";
import { StockBreakdownTable } from "@/src/components/StockBreakdownTable";
import { PLTrendLine } from "@/src/components/charts/PLTrendLine";
import { PortfolioPieChart } from "@/src/components/charts/PortfolioPieChart";
import { AddPortfolioSection } from "./_components/add-portfolio-section";
import { Greeting } from "./_components/greeting";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string; from?: string; to?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

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
          avgBuyCostPerUnit: true,
          buyPricePerUnit: true,
        },
      },
    },
  });

  const { new: openNew, from, to } = await searchParams;

  const portfoliosWithPL = portfolios.map(({ transactions, ...p }) => {
    const txWithIsoDate = transactions.map((t) => ({
      ...t,
      transactionDate: t.transactionDate.toISOString(),
      source: t.source as TransactionSource,
      avgBuyCostPerUnit: t.avgBuyCostPerUnit,
      buyPricePerUnit: t.buyPricePerUnit,
    }));
    const pl = calcPortfolioPL(txWithIsoDate, from, to);
    return { ...p, pl, transactions: txWithIsoDate };
  });

  const overallPL = calcGroupPL(portfoliosWithPL.map((p) => p.pl));
  const allTransactions = portfoliosWithPL.flatMap((p) => p.transactions);
  const allStockSummaries = calcStockSummaries(allTransactions);
  const holdings = calcHoldingsSummary(allStockSummaries);

  const portfoliosForSection = portfoliosWithPL.map(
    ({ pl, transactions: _tx, ...p }) => ({
      id: p.id,
      name: p.name,
      brokerName: p.brokerName,
      transactionCount: pl.txCount,
      totalInvested: pl.totalInvested,
      netPL: pl.netPL,
    }),
  );

  const hasSells = allTransactions.some((t) => t.type === "SELL");

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <Greeting
        name={session.user.name ?? null}
        image={session.user.image ?? null}
      />

      <DateRangeFilter from={from} to={to} />

      {portfolios.length > 0 && <PLSummaryCard summary={overallPL} holdings={holdings} />}

      {/* Charts row */}
      {hasSells && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl bg-white border border-slate-100 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-4">
              Cumulative P/L
            </h3>
            <PLTrendLine transactions={allTransactions} />
          </div>
          {allStockSummaries.filter((s) => s.totalInvested > 0).length >= 2 && (
            <div className="rounded-xl bg-white border border-slate-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-4">
                Investment Distribution
              </h3>
              <PortfolioPieChart summaries={allStockSummaries} />
            </div>
          )}
        </div>
      )}

      <AddPortfolioSection
        portfolios={portfoliosForSection}
        defaultOpen={openNew === "1"}
      />

      {allStockSummaries.length > 0 && (
        <div>
          <h2 className="font-semibold text-slate-700 mb-3">
            Holdings (All Portfolios)
          </h2>
          <StockBreakdownTable summaries={allStockSummaries} />
        </div>
      )}
    </div>
  );
}
