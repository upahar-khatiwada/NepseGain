import { headers } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { BarChart2Icon, PlusIcon } from "lucide-react"
import { auth } from "@/src/lib/auth"
import { prisma } from "@/src/lib/prisma"
import { SignOutButton } from "./_components/sign-out-button"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/sign-in")

  const portfolios = await prisma.portfolio.findMany({
    where: { ownerId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true },
  })

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="w-56 shrink-0 border-r flex flex-col p-3 gap-1">
        {/* Logo */}
        <div className="flex items-center gap-2 px-2 py-3 mb-1">
          <BarChart2Icon className="size-4 text-primary" />
          <span className="font-semibold text-sm">NEPSE Tracker</span>
        </div>

        {/* All Portfolios */}
        <Link
          href="/dashboard"
          className="flex items-center px-2 py-1.5 rounded-lg hover:bg-muted text-sm font-medium cursor-pointer transition-colors"
        >
          All Portfolios
        </Link>

        {portfolios.length > 0 && (
          <p className="text-xs text-muted-foreground px-2 pt-3 pb-1">Portfolios</p>
        )}

        {/* Portfolio links */}
        {portfolios.map((p) => (
          <Link
            key={p.id}
            href={`/dashboard/portfolio/${p.id}`}
            className="px-2 py-1.5 rounded-lg hover:bg-muted text-sm cursor-pointer transition-colors truncate"
          >
            {p.name}
          </Link>
        ))}

        {portfolios.length === 0 && (
          <p className="text-xs text-muted-foreground px-2 py-1">No portfolios yet</p>
        )}

        {/* Add Portfolio */}
        <Link
          href="/dashboard?new=1"
          className="inline-flex items-center gap-1.5 w-full px-2.5 h-8 mt-2 rounded-lg border border-border bg-background hover:bg-muted text-sm font-medium cursor-pointer transition-colors"
        >
          <PlusIcon className="size-3.5 shrink-0" />
          Add Portfolio
        </Link>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Sign out */}
        <SignOutButton />
      </aside>

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
