"use client"

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
  TooltipProps,
} from "recharts"
import type { StockSummary } from "@/src/lib/stock-summary"

const PALETTE = [
  "#0d9488", "#2563eb", "#7c3aed", "#d97706",
  "#0891b2", "#16a34a", "#db2777", "#64748b",
]

function CustomTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  const { name, value, payload: inner } = payload[0]
  const total: number = inner?.total ?? 1
  const pct = ((value! / total) * 100).toFixed(1)
  return (
    <div className="rounded-lg border bg-white shadow-md px-3 py-2 text-sm">
      <p className="font-medium text-slate-700">{name}</p>
      <p className="text-slate-500">{inner?.shareName}</p>
      <p className="font-semibold tabular-nums text-slate-800 mt-0.5">
        NPR {value!.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
      </p>
      <p className="text-xs text-slate-400">{pct}% of portfolio</p>
    </div>
  )
}

function renderLegend(props: { payload?: Array<{ color: string; value: string }> }) {
  const items = props.payload ?? []
  return (
    <ul className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-2">
      {items.map((entry, i) => (
        <li key={i} className="flex items-center gap-1 text-xs text-slate-600">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: entry.color }} />
          {entry.value}
        </li>
      ))}
    </ul>
  )
}

export function PortfolioPieChart({ summaries }: { summaries: StockSummary[] }) {
  const data = summaries
    .filter((s) => s.totalInvested > 0)
    .sort((a, b) => b.totalInvested - a.totalInvested)

  if (data.length < 2) return null

  const total = data.reduce((sum, s) => sum + s.totalInvested, 0)
  const chartData = data.map((s) => ({
    name: s.shareCode,
    shareName: s.shareName,
    totalInvested: s.totalInvested,
    total,
  }))

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="totalInvested"
          nameKey="name"
          cx="50%"
          cy="45%"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={2}
          strokeWidth={0}
        >
          {chartData.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend content={renderLegend as unknown as React.ReactElement} />
      </PieChart>
    </ResponsiveContainer>
  )
}
