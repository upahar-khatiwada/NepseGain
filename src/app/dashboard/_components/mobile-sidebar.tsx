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

      <SheetContent style={{ backgroundColor: "#0f172a", borderColor: "#1e293b" }}>
        <div className="flex items-center gap-2.5 px-3 py-4">
          <BarChart2Icon className="size-4 shrink-0" style={{ color: "#0d9488" }} />
          <span className="font-bold text-white">NEPSE Tracker</span>
        </div>

        <nav className="flex flex-col gap-0.5 px-2 flex-1 overflow-y-auto">
          <Link
            href="/dashboard"
            onClick={() => setOpen(false)}
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
              onClick={() => setOpen(false)}
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
            onClick={() => setOpen(false)}
            className="inline-flex items-center gap-1.5 w-full px-3 h-9 mt-3 rounded-lg text-sm font-medium cursor-pointer transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#0d9488", color: "white" }}
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
