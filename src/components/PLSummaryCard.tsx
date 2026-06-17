import { TrendingUpIcon, TrendingDownIcon, MinusIcon, ReceiptIcon, WalletIcon, ActivityIcon, LockIcon } from "lucide-react"
import { formatNPR } from "@/src/lib/nepse-calc"
import type { PLSummary } from "@/src/lib/pl-summary"
import type { HoldingsSummary } from "@/src/lib/stock-summary"

function StatCard({
  label,
  value,
  color,
  icon,
  sub,
}: {
  label: string
  value: string
  color?: string
  icon: React.ReactNode
  sub?: string
}) {
  return (
    <div className="rounded-xl bg-white border border-slate-100 p-5 shadow-sm flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</span>
        <span
          className="flex items-center justify-center w-8 h-8 rounded-lg"
          style={{ backgroundColor: color ? `${color}18` : "#f1f5f9", color: color ?? "#64748b" }}
        >
          {icon}
        </span>
      </div>
      <div>
        <p className="text-2xl font-bold tabular-nums leading-none" style={color ? { color } : { color: "#1e293b" }}>
          {value}
        </p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
    </div>
  )
}

export function PLSummaryCard({
  summary,
  holdings,
}: {
  summary: PLSummary
  holdings?: HoldingsSummary
}) {
  const { netPL, totalInvested, totalTax, txCount } = summary

  const plColor = netPL > 0 ? "#16a34a" : netPL < 0 ? "#dc2626" : "#64748b"
  const plIcon =
    netPL > 0 ? (
      <TrendingUpIcon className="size-4" />
    ) : netPL < 0 ? (
      <TrendingDownIcon className="size-4" />
    ) : (
      <MinusIcon className="size-4" />
    )

  return (
    <div className={`grid grid-cols-2 gap-4 ${holdings ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}>
      <StatCard
        label="Net P/L"
        value={formatNPR(netPL)}
        color={plColor}
        icon={plIcon}
        sub={netPL > 0 ? "Realised profit" : netPL < 0 ? "Realised loss" : "Break even"}
      />
      <StatCard
        label="Total Invested"
        value={formatNPR(totalInvested)}
        icon={<WalletIcon className="size-4" />}
      />
      {holdings && (
        <StatCard
          label="In Hold"
          value={formatNPR(holdings.totalValue)}
          color="#0d9488"
          icon={<LockIcon className="size-4" />}
          sub={`${holdings.totalUnits.toLocaleString("en-IN")} units · ${holdings.stockCount} stock${holdings.stockCount === 1 ? "" : "s"}`}
        />
      )}
      <StatCard
        label="Total Tax Paid"
        value={formatNPR(totalTax)}
        icon={<ReceiptIcon className="size-4" />}
      />
      <StatCard
        label="Transactions"
        value={String(txCount)}
        icon={<ActivityIcon className="size-4" />}
        sub={txCount === 1 ? "transaction" : "transactions"}
      />
    </div>
  )
}
