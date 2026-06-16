import { formatNPR } from "@/src/lib/nepse-calc"
import type { PLSummary } from "@/src/lib/pl-summary"

function PLRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums font-medium">{formatNPR(value)}</span>
    </div>
  )
}

export function PLSummaryCard({ summary }: { summary: PLSummary }) {
  const { netPL, grossPL, totalTax, totalCommissions, totalInvested, totalProceeds, txCount } =
    summary

  const netPLStyle =
    netPL > 0
      ? { color: "#16a34a" }
      : netPL < 0
        ? { color: "#dc2626" }
        : { color: "var(--muted-foreground)" }

  return (
    <div className="rounded-xl border p-5 space-y-4">
      <div>
        <p className="text-sm text-muted-foreground mb-1">
          Net P/L
          {txCount > 0 && (
            <span className="ml-1">· {txCount} transaction{txCount !== 1 ? "s" : ""}</span>
          )}
        </p>
        <p className="text-3xl font-bold tabular-nums" style={netPLStyle}>
          {formatNPR(netPL)}
        </p>
      </div>
      <div className="border-t pt-4 space-y-2.5">
        <PLRow label="Total Invested" value={totalInvested} />
        <PLRow label="Total Proceeds" value={totalProceeds} />
        <div className="flex items-center justify-between text-sm border-t pt-2.5">
          <span className="text-muted-foreground">Net Profit / Loss</span>
          <span className="tabular-nums font-semibold" style={netPLStyle}>
            {formatNPR(netPL)}
          </span>
        </div>
        <div className="border-t pt-2.5 space-y-2.5">
          <PLRow label="Gross P/L (before fees)" value={grossPL} />
          <PLRow label="Total Tax Paid" value={totalTax} />
          <PLRow label="Total Commissions" value={totalCommissions} />
        </div>
      </div>
    </div>
  )
}
