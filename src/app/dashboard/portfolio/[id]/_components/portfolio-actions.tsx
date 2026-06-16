"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { PencilIcon, Trash2Icon } from "lucide-react"
import { updatePortfolio, deletePortfolio } from "@/src/actions/portfolio"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  description: string | null
  brokerName: string | null
  dematNumber: string | null
}

export function PortfolioActions({ portfolio }: { portfolio: Portfolio }) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editPending, setEditPending] = useState(false)
  const [deletePending, setDeletePending] = useState(false)
  const router = useRouter()

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: portfolio.name,
      description: portfolio.description ?? "",
      brokerName: portfolio.brokerName ?? "",
      dematNumber: portfolio.dematNumber ?? "",
    },
  })

  async function onEdit(data: FormData) {
    setEditPending(true)
    try {
      await updatePortfolio(portfolio.id, data)
      setEditOpen(false)
      router.refresh()
    } finally {
      setEditPending(false)
    }
  }

  async function onDelete() {
    setDeletePending(true)
    try {
      await deletePortfolio(portfolio.id)
      router.push("/dashboard")
    } finally {
      setDeletePending(false)
    }
  }

  return (
    <div className="flex gap-2 shrink-0">
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 cursor-pointer"
        onClick={() => setEditOpen(true)}
      >
        <PencilIcon className="size-3.5" />
        Edit
      </Button>
      <Button
        variant="destructive"
        size="sm"
        className="gap-1.5 cursor-pointer"
        onClick={() => setDeleteOpen(true)}
      >
        <Trash2Icon className="size-3.5" />
        Delete
      </Button>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onEdit)}>
              <DialogHeader>
                <DialogTitle>Edit Portfolio</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name *</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                        <Input {...field} />
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
                        <Input {...field} />
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
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={editPending}
                  className="cursor-pointer"
                >
                  {editPending ? "Saving…" : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Portfolio</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Permanently delete{" "}
            <span className="font-medium text-foreground">
              &quot;{portfolio.name}&quot;
            </span>{" "}
            and all its transactions? This cannot be undone.
          </p>
          <DialogFooter>
            <DialogClose
              render={
                <Button
                  variant="outline"
                  type="button"
                  className="cursor-pointer"
                />
              }
            >
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              onClick={onDelete}
              disabled={deletePending}
              className="cursor-pointer"
            >
              {deletePending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
