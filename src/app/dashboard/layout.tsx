import { headers } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { BarChart2Icon, PlusIcon } from "lucide-react"
import { auth } from "@/src/lib/auth"
import { prisma } from "@/src/lib/prisma"
import { SignOutButton } from "./_components/sign-out-button"
import { MobileSidebar } from "./_components/mobile-sidebar"
import { SidebarNav } from "./_components/sidebar-nav"

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
        style={{ background: "linear-gradient(180deg, #0b1437 0%, #0a1130 100%)" }}
      >
        <div className="flex items-center gap-2.5 px-3 py-4 mb-3">
          <BarChart2Icon className="size-5 shrink-0" style={{ color: "#3b82f6" }} />
          <span className="font-bold text-white tracking-tight">NepseGain</span>
        </div>

        <SidebarNav portfolios={portfolios} />

        <Link
          href="/dashboard?new=1"
          className="inline-flex items-center gap-1.5 w-full px-3 h-9 mt-3 rounded-lg text-sm font-medium cursor-pointer transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#2563eb", color: "white" }}
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
          style={{ background: "linear-gradient(180deg, #0b1437 0%, #0a1130 100%)" }}
        >
          <MobileSidebar portfolios={portfolios} />
          <div className="flex items-center gap-2">
            <BarChart2Icon className="size-4 shrink-0" style={{ color: "#3b82f6" }} />
            <span className="font-bold text-sm text-white">NepseGain</span>
          </div>
        </header>

        <main className="flex-1 overflow-auto" style={{ backgroundColor: "#f8fafc" }}>
          {children}
        </main>
      </div>
    </div>
  )
}
