import { headers } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { BarChart2Icon, PlusIcon } from "lucide-react"
import { auth } from "@/src/lib/auth"
import { prisma } from "@/src/lib/prisma"
import { SignOutButton } from "./_components/sign-out-button"
import { MobileSidebar } from "./_components/mobile-sidebar"

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
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex w-64 shrink-0 flex-col p-4 gap-0.5"
        style={{ backgroundColor: "#0f172a" }}
      >
        <div className="flex items-center gap-2.5 px-3 py-4 mb-3">
          <BarChart2Icon className="size-5 shrink-0" style={{ color: "#0d9488" }} />
          <span className="font-bold text-white tracking-tight">NEPSE Tracker</span>
        </div>

        <Link
          href="/dashboard"
          className="flex items-center px-3 py-2 rounded-lg text-slate-300 hover:bg-white/5 hover:text-white text-sm font-medium cursor-pointer transition-colors"
        >
          All Portfolios
        </Link>

        {portfolios.length > 0 && (
          <p className="text-xs text-slate-500 px-3 pt-4 pb-1 uppercase tracking-widest font-medium">
            Portfolios
          </p>
        )}

        {portfolios.map((p) => (
          <Link
            key={p.id}
            href={`/dashboard/portfolio/${p.id}`}
            className="px-3 py-2 rounded-lg text-slate-400 hover:bg-white/5 hover:text-white text-sm cursor-pointer transition-colors truncate"
          >
            {p.name}
          </Link>
        ))}

        {portfolios.length === 0 && (
          <p className="text-xs text-slate-600 px-3 py-1">No portfolios yet</p>
        )}

        <Link
          href="/dashboard?new=1"
          className="inline-flex items-center gap-1.5 w-full px-3 h-9 mt-3 rounded-lg text-sm font-medium cursor-pointer transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#0d9488", color: "white" }}
        >
          <PlusIcon className="size-3.5 shrink-0" />
          Add Portfolio
        </Link>

        <div className="flex-1" />
        <SignOutButton />
      </aside>

      {/* Content area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Mobile top bar */}
        <header
          className="md:hidden flex items-center gap-3 px-4 h-12 shrink-0"
          style={{ backgroundColor: "#0f172a" }}
        >
          <MobileSidebar portfolios={portfolios} />
          <div className="flex items-center gap-2">
            <BarChart2Icon className="size-4 shrink-0" style={{ color: "#0d9488" }} />
            <span className="font-bold text-sm text-white">NEPSE Tracker</span>
          </div>
        </header>

        <main className="flex-1 overflow-auto" style={{ backgroundColor: "#f8fafc" }}>
          {children}
        </main>
      </div>
    </div>
  )
}
