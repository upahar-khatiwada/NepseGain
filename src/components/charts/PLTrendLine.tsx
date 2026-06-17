"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
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
      <p className="text-slate-500 text-xs mb-1">{label}</p>
      <p style={{ color: val >= 0 ? "#16a34a" : "#dc2626" }} className="font-semibold tabular-nums">
        {formatNPR(val)}
      </p>
    </div>
  )
}

export function PLTrendLine({ transactions }: { transactions: ChartTx[] }) {
  const sells = transactions
    .filter((t) => t.type === "SELL")
    .sort((a, b) => a.transactionDate.localeCompare(b.transactionDate))

  if (sells.length === 0) return (
    <div className="flex items-center justify-center h-36 text-sm text-slate-400">
      No sell transactions yet
    </div>
  )

  let cumulative = 0
  const data = sells.map((t) => {
    const costBasis = (t.avgBuyCostPerUnit ?? t.buyPricePerUnit ?? 0) * t.quantity
    cumulative += t.netAmount - costBasis
    return { date: t.transactionDate.slice(0, 10), cumPL: cumulative }
  })

  const last = data[data.length - 1].cumPL
  const lineColor = last >= 0 ? "#16a34a" : "#dc2626"

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => v.slice(5)} // show MM-DD
        />
        <YAxis
          tickFormatter={fmtYAxis}
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
          width={48}
        />
        <ReferenceLine y={0} stroke="#e2e8f0" strokeDasharray="4 2" />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#e2e8f0", strokeWidth: 1 }} />
        <Line
          type="monotone"
          dataKey="cumPL"
          stroke={lineColor}
          strokeWidth={2.5}
          dot={{ fill: lineColor, r: 4, strokeWidth: 0 }}
          activeDot={{ r: 5, strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
