"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { PlusIcon, TrendingUpIcon, TrendingDownIcon } from "lucide-react"
import { toast } from "sonner"
import { createPortfolio } from "@/src/actions/portfolio"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  brokerName: z.string().optional(),
  dematNumber: z.string().optional(),
})
type FormData = z.infer<typeof schema>

type Portfolio = {
  id: string
  name: string
  brokerName: string | null
  transactionCount: number
  totalInvested: number
  netPL: number
}

function formatNPR(amount: number) {
  if (amount === 0) return "NPR 0"
  const abs = Math.abs(amount)
  const formatted = new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(abs)
  return `${amount < 0 ? "-" : ""}NPR ${formatted}`
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center gap-5">
      {/* Inline SVG illustration */}
      <svg width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="96" height="96" rx="20" fill="#f0fdf4" />
        <rect x="16" y="56" width="14" height="24" rx="3" fill="#0d9488" fillOpacity="0.3" />
        <rect x="36" y="40" width="14" height="40" rx="3" fill="#0d9488" fillOpacity="0.6" />
        <rect x="56" y="28" width="14" height="52" rx="3" fill="#0d9488" />
        <polyline points="23,52 43,36 63,24" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="23" cy="52" r="3" fill="#16a34a" />
        <circle cx="43" cy="36" r="3" fill="#16a34a" />
        <circle cx="63" cy="24" r="3" fill="#16a34a" />
      </svg>

      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-1">No portfolios yet</h2>
        <p className="text-slate-500 text-sm max-w-xs">
          Add your first portfolio to get started tracking your NEPSE investments.
        </p>
      </div>

      <button
        onClick={onAdd}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm text-white cursor-pointer transition-opacity hover:opacity-90"
        style={{ backgroundColor: "#0d9488" }}
      >
        <PlusIcon className="size-4" />
        Add your first portfolio
      </button>
    </div>
  )
}

export function AddPortfolioSection({
  portfolios,
  defaultOpen = false,
}: {
  portfolios: Portfolio[]
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const [pending, setPending] = useState(false)
  const router = useRouter()

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      description: "",
      brokerName: "",
      dematNumber: "",
    },
  })

  async function onSubmit(data: FormData) {
    setPending(true)
    try {
      await createPortfolio(data)
      toast.success("Portfolio created")
      form.reset()
      setOpen(false)
      router.refresh()
    } catch {
      toast.error("Failed to create portfolio")
    } finally {
      setPending(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-slate-800">Portfolios</h2>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 h-9 rounded-xl font-medium text-sm text-white cursor-pointer transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#0d9488" }}
        >
          <PlusIcon className="size-4" />
          Add Portfolio
        </button>
      </div>

      {portfolios.length === 0 ? (
        <EmptyState onAdd={() => setOpen(true)} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {portfolios.map((p) => {
            const isProfit = p.netPL > 0
            const isLoss = p.netPL < 0
            const plColor = isProfit ? "#16a34a" : isLoss ? "#dc2626" : "#64748b"
            const PlIcon = isProfit ? TrendingUpIcon : TrendingDownIcon

            return (
              <Link
                key={p.id}
                href={`/dashboard/portfolio/${p.id}`}
                className="group cursor-pointer"
              >
                <div className="h-full bg-white rounded-2xl border border-slate-100 shadow-sm p-5 transition-all group-hover:shadow-md group-hover:border-slate-200">
                  <div className="flex items-start justify-between mb-4">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-800 truncate">{p.name}</h3>
                      {p.brokerName && (
                        <p className="text-xs text-slate-400 mt-0.5 truncate">{p.brokerName}</p>
                      )}
                    </div>
                    {p.netPL !== 0 && (
                      <span
                        className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ml-2"
                        style={{
                          backgroundColor: `${plColor}18`,
                          color: plColor,
                        }}
                      >
                        <PlIcon className="size-3" />
                        {isProfit ? "+" : ""}{formatNPR(p.netPL)}
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Invested</span>
                      <span className="font-medium text-slate-700 tabular-nums">
                        {formatNPR(p.totalInvested)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Transactions</span>
                      <span className="text-slate-600 tabular-nums">{p.transactionCount}</span>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <DialogHeader>
                <DialogTitle>Add Portfolio</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. My Account" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input placeholder="Optional description" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="brokerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Broker Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Siddhartha Securities" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dematNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>DEMAT Number</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 1234567890123" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={pending} className="cursor-pointer">
                  {pending ? "Creating…" : "Create Portfolio"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
