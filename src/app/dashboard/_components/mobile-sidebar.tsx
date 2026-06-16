"use client"

import { useState } from "react"
import Link from "next/link"
import { BarChart2Icon, MenuIcon, PlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { SignOutButton } from "./sign-out-button"

type Portfolio = { id: string; name: string }

export function MobileSidebar({ portfolios }: { portfolios: Portfolio[] }) {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon-sm" className="cursor-pointer" />
        }
      >
        <MenuIcon className="size-5" />
        <span className="sr-only">Open navigation</span>
      </SheetTrigger>

      <SheetContent>
        <div className="flex items-center gap-2 px-3 py-4">
          <BarChart2Icon className="size-4 text-primary" />
          <span className="font-semibold text-sm">NEPSE Tracker</span>
        </div>

        <nav className="flex flex-col gap-1 px-2 flex-1 overflow-y-auto">
          <Link
            href="/dashboard"
            onClick={() => setOpen(false)}
            className="flex items-center px-2 py-1.5 rounded-lg hover:bg-muted text-sm font-medium cursor-pointer transition-colors"
          >
            All Portfolios
          </Link>

          {portfolios.length > 0 && (
            <p className="text-xs text-muted-foreground px-2 pt-3 pb-1">Portfolios</p>
          )}

          {portfolios.map((p) => (
            <Link
              key={p.id}
              href={`/dashboard/portfolio/${p.id}`}
              onClick={() => setOpen(false)}
              className="px-2 py-1.5 rounded-lg hover:bg-muted text-sm cursor-pointer transition-colors truncate"
            >
              {p.name}
            </Link>
          ))}

          {portfolios.length === 0 && (
            <p className="text-xs text-muted-foreground px-2 py-1">No portfolios yet</p>
          )}

          <Link
            href="/dashboard?new=1"
            onClick={() => setOpen(false)}
            className="inline-flex items-center gap-1.5 w-full px-2.5 h-8 mt-2 rounded-lg border border-border bg-background hover:bg-muted text-sm font-medium cursor-pointer transition-colors"
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
