"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart2Icon, MenuIcon, PlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { SignOutButton } from "./sign-out-button"
import { SidebarNav } from "./sidebar-nav"

type Portfolio = { id: string; name: string }

export function MobileSidebar({ portfolios }: { portfolios: Portfolio[] }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Close the drawer once navigation has actually committed, instead of
  // closing it synchronously inside the Link's onClick — closing it eagerly
  // races the destination route's own mount/Suspense boundary and triggers
  // "update on a component that hasn't mounted yet" warnings.
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className="cursor-pointer text-slate-400 hover:text-white hover:bg-white/10"
          />
        }
      >
        <MenuIcon className="size-5" />
        <span className="sr-only">Open navigation</span>
      </SheetTrigger>

      <SheetContent style={{ background: "linear-gradient(180deg, #0b1437 0%, #0a1130 100%)", borderColor: "#1e2a4a" }}>
        <div className="flex items-center gap-2.5 px-3 py-4">
          <BarChart2Icon className="size-4 shrink-0" style={{ color: "#3b82f6" }} />
          <span className="font-bold text-white">NepseGain</span>
        </div>

        <nav className="flex flex-col gap-0.5 px-2 flex-1 overflow-y-auto">
          <SidebarNav portfolios={portfolios} />

          <Link
            href="/dashboard?new=1"
            onClick={() => setOpen(false)}
            className="inline-flex items-center gap-1.5 w-full px-3 h-9 mt-3 rounded-lg text-sm font-medium cursor-pointer transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#2563eb", color: "white" }}
          >
            <PlusIcon className="size-3.5 shrink-0" />
            Add Portfolio
          </Link>
        </nav>

        <div className="p-2 mt-auto">
          <SignOutButton />
        </div>
      </SheetContent>
    </Sheet>
  )
}
