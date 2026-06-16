"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { PlusIcon } from "lucide-react"
import { createPortfolio } from "@/src/actions/portfolio"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
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
  realisedPL: number
}

function formatNPR(amount: number) {
  if (amount === 0) return "NPR 0"
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "NPR",
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(amount)
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
      form.reset()
      setOpen(false)
      router.refresh()
    } finally {
      setPending(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">All Portfolios</h1>
        <Button
          onClick={() => setOpen(true)}
          className="gap-1.5 cursor-pointer"
        >
          <PlusIcon className="size-4" />
          Add Portfolio
        </Button>
      </div>

      {portfolios.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <p className="text-muted-foreground text-sm">
            No portfolios yet. Add one to get started.
          </p>
          <Button
            variant="outline"
            onClick={() => setOpen(true)}
            className="cursor-pointer gap-1.5"
          >
            <PlusIcon className="size-4" />
            Add Portfolio
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {portfolios.map((p) => (
            <Link
              key={p.id}
              href={`/dashboard/portfolio/${p.id}`}
              className="cursor-pointer group"
            >
              <Card className="h-full transition-all group-hover:ring-2 group-hover:ring-primary/30">
                <CardHeader>
                  <CardTitle>{p.name}</CardTitle>
                  {p.brokerName && (
                    <CardDescription>{p.brokerName}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="grid gap-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Invested</span>
                    <span className="font-medium tabular-nums">
                      {formatNPR(p.totalInvested)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Realized P/L</span>
                    <span
                      className={`font-medium tabular-nums ${
                        p.realisedPL > 0
                          ? "text-green-600 dark:text-green-400"
                          : p.realisedPL < 0
                            ? "text-destructive"
                            : ""
                      }`}
                    >
                      {formatNPR(p.realisedPL)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Transactions</span>
                    <span className="tabular-nums">{p.transactionCount}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
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
                        <Input
                          placeholder="e.g. Siddhartha Securities"
                          {...field}
                        />
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
                <Button
                  type="submit"
                  disabled={pending}
                  className="cursor-pointer"
                >
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
