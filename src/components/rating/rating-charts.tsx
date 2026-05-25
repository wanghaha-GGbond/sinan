"use client"

import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import type { Company } from "@/lib/types"

const distributionConfig = {
  count: {
    label: "样本数",
    color: "var(--primary)",
  },
} satisfies ChartConfig

const trendConfig = {
  score: {
    label: "方向分",
    color: "var(--primary)",
  },
} satisfies ChartConfig

export function ScoreDistributionChart({ company }: { company: Company }) {
  return (
    <ChartContainer config={distributionConfig} className="h-64 w-full">
      <BarChart data={company.scoreDistribution}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="score" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="count" fill="var(--color-count)" radius={8} />
      </BarChart>
    </ChartContainer>
  )
}

export function ScoreTrendChart({ company }: { company: Company }) {
  return (
    <ChartContainer config={trendConfig} className="h-64 w-full">
      <LineChart data={company.trend}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} />
        <YAxis domain={[4, 10]} tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line
          type="monotone"
          dataKey="score"
          stroke="var(--color-score)"
          strokeWidth={2}
          dot
        />
      </LineChart>
    </ChartContainer>
  )
}
