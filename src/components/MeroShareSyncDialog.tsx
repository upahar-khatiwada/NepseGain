"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  EyeIcon,
  EyeOffIcon,
  LoaderIcon,
  RefreshCwIcon,
  SearchIcon,
} from "lucide-react"
import { importMeroShareLots } from "@/src/actions/transaction"
import type { EnrichedLot, MeroShareCapital, MeroShareUser } from "@/src/lib/meroshare-api"
import { mapTransactionType, fetchAllHoldingsFromBrowser } from "@/src/lib/meroshare-api"
import { formatNPR } from "@/src/lib/nepse-calc"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

// ─── Types ───────────────────────────────────────────────────────────────────

interface PreviewLot extends EnrichedLot {
  key: string
  editedRate: number | null
  selected: boolean
}

type Step = "credentials" | "preview" | "done"

interface DoneResult {
  imported: number
  skipped: number
  failed: string[]
  totalStocks: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SOURCE_BADGE: Record<string, { label: string; className: string }> = {
  IPO:     { label: "IPO",       className: "bg-purple-500/10 text-purple-700 border-transparent" },
  FPO:     { label: "FPO",       className: "bg-purple-500/10 text-purple-700 border-transparent" },
  RIGHT:   { label: "Rights",    className: "bg-indigo-500/10 text-indigo-700 border-transparent" },
  BONUS:   { label: "Bonus",     className: "bg-emerald-500/10 text-emerald-700 border-transparent" },
  MERGER:  { label: "Merger",    className: "bg-orange-500/10 text-orange-700 border-transparent" },
  DEMAT:   { label: "Demat",     className: "bg-slate-500/10 text-slate-600 border-transparent" },
  AUCTION: { label: "Auction",   className: "bg-blue-500/10 text-blue-700 border-transparent" },
  MARKET:  { label: "Secondary", className: "bg-blue-500/10 text-blue-700 border-transparent" },
}

function lotKey(lot: EnrichedLot): string {
  return `${lot.scrip}|${lot.transactionDate}|${lot.quantity}|${lot.transactionType}`
}

function groupByScrip(lots: PreviewLot[]): Map<string, PreviewLot[]> {
  const map = new Map<string, PreviewLot[]>()
  for (const lot of lots) {
    if (!map.has(lot.scrip)) map.set(lot.scrip, [])
    map.get(lot.scrip)!.push(lot)
  }
  return map
}

// ─── DP Picker (searchable dropdown) ─────────────────────────────────────────

function DPPicker({
  capitals,
  loading,
  selected,
  onSelect,
}: {
  capitals: MeroShareCapital[]
  loading: boolean
  selected: MeroShareCapital | null
  onSelect: (c: MeroShareCapital) => void
}) {
  const [search, setSearch] = useState("")
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return capitals.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.includes(q)
    ).slice(0, 50)
  }, [capitals, search])

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  return (
    <div className="space-y-1.5" ref={containerRef}>
      <Label>Depository Participant (Broker)</Label>
      <button
        type="button"
        disabled={loading}
        onClick={() => { setOpen((v) => !v); setSearch("") }}
        className="w-full flex items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-sm cursor-pointer hover:bg-muted/30 transition-colors disabled:opacity-50"
      >
        {loading ? (
          <span className="flex items-center gap-2 text-muted-foreground">
            <LoaderIcon className="size-3.5 animate-spin" /> Loading broker list…
          </span>
        ) : selected ? (
          <span className="truncate text-left">
            <span className="font-medium">{selected.name}</span>
            <span className="ml-2 text-muted-foreground text-xs">({selected.code})</span>
          </span>
        ) : (
          <span className="text-muted-foreground">Select your broker / DP…</span>
        )}
        <ChevronDownIcon className={`size-4 text-muted-foreground shrink-0 ml-2 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && !loading && (
        <div className="absolute z-50 mt-1 w-[calc(100%-2rem)] max-w-160 rounded-lg border bg-popover shadow-lg">
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <SearchIcon className="size-3.5 text-muted-foreground shrink-0" />
            <input
              autoFocus
              placeholder="Search by broker name or code…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-muted-foreground">No brokers found.</p>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { onSelect(c); setOpen(false); setSearch("") }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted cursor-pointer flex items-center justify-between gap-2"
                >
                  <span className="truncate">{c.name}</span>
                  <span className="text-xs text-muted-foreground shrink-0">{c.code}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Stock section (accordion row in Step 2) ─────────────────────────────────

function StockSection({
  scrip,
  lots,
  onToggleLot,
  onEditRate,
  onSelectAll,
  onDeselectAll,
}: {
  scrip: string
  lots: PreviewLot[]
  onToggleLot: (key: string) => void
  onEditRate: (key: string, rate: number | null) => void
  onSelectAll: (scrip: string) => void
  onDeselectAll: (scrip: string) => void
}) {
  const [open, setOpen] = useState(true)
  const selectedCount = lots.filter((l) => l.selected).length
  const companyName = lots[0]?.companyName ?? ""
  const currentBalance = lots[0]?.currentBalance ?? 0

  return (
    <div className="rounded-lg border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm cursor-pointer hover:bg-muted/30 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-3 min-w-0">
          <ChevronDownIcon
            className={`size-4 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          />
          <span className="font-semibold shrink-0">{scrip}</span>
          <span className="text-muted-foreground truncate">{companyName}</span>
          <Badge className="bg-slate-100 text-slate-600 border-transparent shrink-0">
            {lots.length} lot{lots.length !== 1 ? "s" : ""}
          </Badge>
          {currentBalance > 0 && (
            <span className="text-xs text-muted-foreground shrink-0">
              Balance: {currentBalance.toLocaleString("en-IN")}
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground shrink-0 ml-2">
          {selectedCount}/{lots.length} selected
        </div>
      </button>

      {open && (
        <div className="border-t">
          <div className="flex gap-3 px-4 py-2 border-b bg-muted/20">
            <button type="button" className="text-xs text-blue-600 hover:underline cursor-pointer" onClick={() => onSelectAll(scrip)}>
              Select all
            </button>
            <span className="text-muted-foreground">·</span>
            <button type="button" className="text-xs text-muted-foreground hover:underline cursor-pointer" onClick={() => onDeselectAll(scrip)}>
              Deselect all
            </button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b">
                <th className="px-4 py-2 w-8" />
                <th className="px-2 py-2">Date</th>
                <th className="px-2 py-2">Source</th>
                <th className="px-2 py-2 text-right">Qty</th>
                <th className="px-2 py-2 text-right">Rate (NPR)</th>
                <th className="px-2 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {lots.map((lot) => {
                const src = mapTransactionType(lot.transactionType)
                const badgeCfg = SOURCE_BADGE[src] ?? { label: src, className: "bg-slate-100 text-slate-600 border-transparent" }
                const rate = lot.editedRate ?? lot.rate
                const needsRate = lot.rate === 0
                return (
                  <tr key={lot.key} className={`border-b last:border-0 ${!lot.selected ? "opacity-50" : ""}`}>
                    <td className="px-4 py-2">
                      <input type="checkbox" checked={lot.selected} onChange={() => onToggleLot(lot.key)} className="cursor-pointer" />
                    </td>
                    <td className="px-2 py-2 tabular-nums text-muted-foreground">{lot.transactionDate}</td>
                    <td className="px-2 py-2">
                      <Badge className={badgeCfg.className}>{badgeCfg.label}</Badge>
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">{lot.quantity.toLocaleString("en-IN")}</td>
                    <td className="px-2 py-2 text-right">
                      {needsRate ? (
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Enter rate"
                          className="h-7 w-28 text-xs text-right"
                          style={{ borderColor: "#f59e0b" }}
                          value={lot.editedRate ?? ""}
                          onChange={(e) => onEditRate(lot.key, e.target.value === "" ? null : parseFloat(e.target.value))}
                        />
                      ) : (
                        <span className="tabular-nums">{formatNPR(rate)}</span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">
                      {rate > 0 ? formatNPR(rate * lot.quantity) : "—"}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Main dialog ─────────────────────────────────────────────────────────────

export function MeroShareSyncDialog({
  portfolioId,
  onDone,
}: {
  portfolioId: string
  onDone?: () => void
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>("credentials")

  // DP picker
  const [capitals, setCapitals] = useState<MeroShareCapital[]>([])
  const [capitalsLoading, setCapitalsLoading] = useState(false)
  const [selectedCapital, setSelectedCapital] = useState<MeroShareCapital | null>(null)

  // Credentials
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [fetchStatus, setFetchStatus] = useState<string>("")

  // Step 2
  const [lots, setLots] = useState<PreviewLot[]>([])
  const [failedScrips, setFailedScrips] = useState<string[]>([])
  const [importing, setImporting] = useState(false)

  // Step 3
  const [result, setResult] = useState<DoneResult | null>(null)

  const grouped = useMemo(() => groupByScrip(lots), [lots])
  const selectedCount = lots.filter((l) => l.selected).length

  // Fetch DP list via our server (avoids CORS/proxy issues hitting MeroShare from the browser)
  useEffect(() => {
    if (!open || capitals.length > 0) return
    setCapitalsLoading(true)
    fetch("/api/meroshare/capital")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data.capitals)) setCapitals(data.capitals) })
      .catch(() => {})
      .finally(() => setCapitalsLoading(false))
  }, [open, capitals.length])

  function resetAll() {
    setStep("credentials")
    setSelectedCapital(null)
    setUsername("")
    setPassword("")
    setShowPassword(false)
    setFetching(false)
    setFetchError(null)
    setFetchStatus("")
    setLots([])
    setFailedScrips([])
    setImporting(false)
    setResult(null)
  }

  function handleClose() {
    setOpen(false)
    resetAll()
  }

  async function handleFetch() {
    if (!selectedCapital || !username || !password) {
      setFetchError("All fields are required.")
      return
    }
    setFetching(true)
    setFetchError(null)
    setFetchStatus("Connecting to MeroShare…")

    try {
      const res = await fetch("/api/meroshare/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: selectedCapital.id, username, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setFetchError(data.error ?? "Failed to fetch from MeroShare.")
        return
      }

      setFetchStatus("Fetching your holdings and purchase history…")

      // These two calls run directly in the browser (not via our server) —
      // MeroShare's WAF blocks server-originated requests to these specific
      // endpoints regardless of headers, but allows real browser requests.
      const { lots: rawLots, failedScrips: stockFailures } =
        await fetchAllHoldingsFromBrowser(data.token as string, data.user as MeroShareUser)

      const previewLots: PreviewLot[] = rawLots.map((lot) => ({
        ...lot,
        key: lotKey(lot),
        editedRate: null,
        selected: true,
      }))

      setLots(previewLots)
      setFailedScrips(stockFailures)
      setStep("preview")
    } catch {
      setFetchError("Could not reach MeroShare. Check your internet connection and try again.")
    } finally {
      setFetching(false)
      setFetchStatus("")
    }
  }

  function toggleLot(key: string) {
    setLots((prev) => prev.map((l) => l.key === key ? { ...l, selected: !l.selected } : l))
  }

  function editRate(key: string, rate: number | null) {
    setLots((prev) => prev.map((l) => l.key === key ? { ...l, editedRate: rate } : l))
  }

  function selectAll(scrip: string) {
    setLots((prev) => prev.map((l) => l.scrip === scrip ? { ...l, selected: true } : l))
  }

  function deselectAll(scrip: string) {
    setLots((prev) => prev.map((l) => l.scrip === scrip ? { ...l, selected: false } : l))
  }

  async function handleImport() {
    if (selectedCount === 0) {
      toast.error("Select at least one lot to import.")
      return
    }
    setImporting(true)
    try {
      const res = await importMeroShareLots(portfolioId, lots)
      setResult({ imported: res.imported, skipped: res.skipped, failed: res.failed, totalStocks: grouped.size })
      setStep("done")
      router.refresh()
    } catch {
      toast.error("Import failed. Try again.")
    } finally {
      setImporting(false)
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5 cursor-pointer"
        onClick={() => setOpen(true)}
      >
        <RefreshCwIcon className="size-3.5" />
        Sync from MeroShare
      </Button>

      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
        <DialogContent className={`max-h-[90vh] overflow-y-auto ${step === "preview" ? "sm:max-w-5xl" : "sm:max-w-2xl"}`}>

          {/* ── Step 1: Credentials ── */}
          {step === "credentials" && (
            <>
              <DialogHeader>
                <DialogTitle>Sync from MeroShare</DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-2 relative">
                <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-800">
                  <AlertTriangleIcon className="size-4 shrink-0 mt-0.5" />
                  <span>
                    Your credentials are used only to fetch your portfolio data and are{" "}
                    <strong>never stored</strong>. Only the transaction data is saved.
                  </span>
                </div>

                {/* Searchable DP picker */}
                <DPPicker
                  capitals={capitals}
                  loading={capitalsLoading}
                  selected={selectedCapital}
                  onSelect={setSelectedCapital}
                />

                <div className="space-y-1.5">
                  <Label htmlFor="ms-username">Username</Label>
                  <Input
                    id="ms-username"
                    placeholder="Your MeroShare username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="off"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ms-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="ms-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Your MeroShare password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleFetch() }}
                      autoComplete="current-password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground cursor-pointer"
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      {showPassword ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                    </button>
                  </div>
                </div>

                {fetchError && (
                  <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50/60 p-3 text-xs text-red-700">
                    <AlertTriangleIcon className="size-4 shrink-0 mt-0.5" />
                    {fetchError}
                  </div>
                )}

                {fetching && fetchStatus && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <LoaderIcon className="size-4 animate-spin" />
                    {fetchStatus}
                  </div>
                )}
              </div>

              <DialogFooter>
                <DialogClose render={<Button variant="outline" type="button" className="cursor-pointer" />}>
                  Cancel
                </DialogClose>
                <Button
                  type="button"
                  disabled={fetching || capitalsLoading}
                  className="cursor-pointer"
                  style={{ backgroundColor: "#0d9488", color: "white" }}
                  onClick={handleFetch}
                >
                  {fetching ? (
                    <span className="flex items-center gap-2">
                      <LoaderIcon className="size-4 animate-spin" />
                      Connecting…
                    </span>
                  ) : (
                    "Fetch My Portfolio"
                  )}
                </Button>
              </DialogFooter>
            </>
          )}

          {/* ── Step 2: Preview ── */}
          {step === "preview" && (
            <>
              <DialogHeader>
                <DialogTitle>
                  Review Your Portfolio ({lots.length} lot{lots.length !== 1 ? "s" : ""} across{" "}
                  {grouped.size} stock{grouped.size !== 1 ? "s" : ""})
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-3 py-2">
                {failedScrips.length > 0 && (
                  <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-800">
                    <AlertTriangleIcon className="size-4 shrink-0 mt-0.5" />
                    Could not fetch history for: {failedScrips.join(", ")}. These are skipped.
                  </div>
                )}

                {Array.from(grouped.entries()).map(([scrip, stockLots]) => (
                  <StockSection
                    key={scrip}
                    scrip={scrip}
                    lots={stockLots}
                    onToggleLot={toggleLot}
                    onEditRate={editRate}
                    onSelectAll={selectAll}
                    onDeselectAll={deselectAll}
                  />
                ))}
              </div>

              <DialogFooter className="-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-muted-foreground">
                  {selectedCount} lot{selectedCount !== 1 ? "s" : ""} selected
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="cursor-pointer" onClick={() => setStep("credentials")}>
                    Back
                  </Button>
                  <Button
                    type="button"
                    disabled={importing || selectedCount === 0}
                    className="cursor-pointer"
                    style={{ backgroundColor: "#0d9488", color: "white" }}
                    onClick={handleImport}
                  >
                    {importing ? (
                      <span className="flex items-center gap-2">
                        <LoaderIcon className="size-4 animate-spin" />
                        Importing…
                      </span>
                    ) : (
                      `Import ${selectedCount} Lot${selectedCount !== 1 ? "s" : ""}`
                    )}
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}

          {/* ── Step 3: Done ── */}
          {step === "done" && result && (
            <>
              <DialogHeader>
                <DialogTitle>Import Complete</DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="flex flex-col items-center gap-3 py-4">
                  <CheckCircle2Icon className="size-12" style={{ color: "#16a34a" }} />
                  <p className="text-lg font-semibold text-center">
                    Imported {result.imported} lot{result.imported !== 1 ? "s" : ""} across{" "}
                    {result.totalStocks} stock{result.totalStocks !== 1 ? "s" : ""}
                  </p>
                </div>

                {result.skipped > 0 && (
                  <div className="rounded-lg bg-muted/40 border px-3 py-2.5 text-sm text-muted-foreground">
                    {result.skipped} duplicate lot{result.skipped !== 1 ? "s" : ""} skipped (already in portfolio).
                  </div>
                )}

                {result.failed.length > 0 && (
                  <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50/60 p-3 text-xs text-red-700">
                    <AlertTriangleIcon className="size-4 shrink-0 mt-0.5" />
                    Failed to import: {result.failed.join(", ")}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  className="cursor-pointer"
                  style={{ backgroundColor: "#0d9488", color: "white" }}
                  onClick={() => {
                    handleClose()
                    onDone?.()
                  }}
                >
                  View Holdings
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
