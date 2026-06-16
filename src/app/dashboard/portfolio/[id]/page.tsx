import { headers } from "next/headers"
import { redirect, notFound } from "next/navigation"
import { auth } from "@/src/lib/auth"
import { prisma } from "@/src/lib/prisma"
import { PortfolioActions } from "./_components/portfolio-actions"

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

      {/* Transaction list — built in Prompt 5 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium">Transactions</h2>
        </div>
        <div className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">
          Transaction list coming in the next step.
        </div>
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
