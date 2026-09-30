"use client";

import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency, formatDate } from "@/lib/format";
import { AXIS_TICK, ChartTooltipBox, GRID_STROKE } from "./chart-parts";

export function BankrollChart({
  data,
  initial,
  currency,
  timezone,
  height = 260,
}: {
  data: { date: string; balance: number; cumulativeProfit: number }[];
  initial: number;
  currency: string;
  timezone: string;
  height?: number;
}) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="bk-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--home)" stopOpacity={0.25} />
              <stop offset="100%" stopColor="var(--home)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID_STROKE} vertical={false} />
          <XAxis dataKey="date" tickFormatter={(v: string) => formatDate(v, timezone)} tick={AXIS_TICK} axisLine={false} tickLine={false} minTickGap={32} />
          <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={56} domain={["auto", "auto"]} tickFormatter={(v: number) => Math.round(v).toString()} />
          <ReferenceLine y={initial} stroke="var(--border-strong)" strokeDasharray="4 4" />
          <Tooltip
            cursor={{ stroke: "var(--border-strong)" }}
            content={({ active, payload }) =>
              active && payload?.length ? (
                <ChartTooltipBox
                  title={formatDate(String(payload[0].payload.date), timezone, { day: "numeric", month: "short", year: "numeric" })}
                  rows={[
                    { label: "Solde", value: formatCurrency(payload[0].payload.balance, currency), color: "var(--home)" },
                    { label: "Profit cumulé", value: formatCurrency(payload[0].payload.cumulativeProfit, currency, true) },
                  ]}
                />
              ) : null
            }
          />
          <Area type="monotone" dataKey="balance" stroke="var(--home)" strokeWidth={2} fill="url(#bk-fill)" activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
