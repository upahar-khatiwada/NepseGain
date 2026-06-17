"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  TooltipProps,
} from "recharts"
import { formatNPR } from "@/src/lib/nepse-calc"

type ChartTx = {
  type: "BUY" | "SELL"
  transactionDate: string
  netAmount: number
  quantity: number
  avgBuyCostPerUnit: number | null
  buyPricePerUnit: number | null
}

function getMonthKey(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.toLocaleString("en", { month: "short" })} '${String(d.getFullYear()).slice(2)}`
}

function fmtYAxis(v: number) {
  const abs = Math.abs(v)
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${(v / 1_000).toFixed(0)}k`
  return String(v)
}

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  const val = payload[0].value ?? 0
  return (
    <div className="rounded-lg border bg-white shadow-md px-3 py-2 text-sm">
      <p className="font-medium text-slate-700 mb-1">{label}</p>
      <p style={{ color: val >= 0 ? "#16a34a" : "#dc2626" }} className="font-semibold tabular-nums">
        {formatNPR(val)}
      </p>
    </div>
  )
}

export function PLBarChart({ transactions }: { transactions: ChartTx[] }) {
  const monthMap = new Map<string, { pl: number; order: number }>()

  const sells = transactions
    .filter((t) => t.type === "SELL")
    .sort((a, b) => a.transactionDate.localeCompare(b.transactionDate))

  for (const t of sells) {
    const key = getMonthKey(t.transactionDate)
    const costBasis = (t.avgBuyCostPerUnit ?? t.buyPricePerUnit ?? 0) * t.quantity
    const pl = t.netAmount - costBasis
    const order = new Date(t.transactionDate).getTime()
    const existing = monthMap.get(key)
    if (existing) {
      existing.pl += pl
    } else {
      monthMap.set(key, { pl, order })
    }
  }

  const data = Array.from(monthMap.entries())
    .sort(([, a], [, b]) => a.order - b.order)
    .map(([month, { pl }]) => ({ month, pl }))

  if (data.length === 0) return (
    <div className="flex items-center justify-center h-36 text-sm text-slate-400">
      No sell transactions yet
    </div>
  )

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
        <YAxis
          tickFormatter={fmtYAxis}
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
          width={48}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(148,163,184,0.1)" }} />
        <Bar dataKey="pl" radius={[4, 4, 0, 0]} maxBarSize={40}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.pl >= 0 ? "#16a34a" : "#dc2626"} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
