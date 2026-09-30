"use client";

import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatUnits } from "@/lib/format";
import { AXIS_TICK, ChartTooltipBox, GRID_STROKE } from "./chart-parts";

export interface PerformancePoint {
  date: string;
  cumulative: number;
  profit: number;
  picks: number;
}

const fmtDay = (d: string) => {
  const [, m, day] = d.split("-");
  return `${Number(day)}/${Number(m)}`;
};

/** Profit cumulé (unités, mise fixe de 1) du backtest. Une seule série : pas de légende. */
export function PerformanceChart({ data, height = 260 }: { data: PerformancePoint[]; height?: number }) {
  const color = "var(--home)";
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id="perf-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID_STROKE} vertical={false} />
          <XAxis dataKey="date" tickFormatter={fmtDay} tick={AXIS_TICK} axisLine={false} tickLine={false} minTickGap={28} />
          <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={44} tickFormatter={(v: number) => `${v > 0 ? "+" : ""}${v}`} />
          <ReferenceLine y={0} stroke="var(--border-strong)" />
          <Tooltip
            cursor={{ stroke: "var(--border-strong)" }}
            content={({ active, payload }) =>
              active && payload?.length ? (
                <ChartTooltipBox
                  title={fmtDay(String(payload[0].payload.date))}
                  rows={[
                    { label: "Profit cumulé", value: formatUnits(payload[0].payload.cumulative), color },
                    { label: "Profit du jour", value: formatUnits(payload[0].payload.profit) },
                    { label: "Sélections", value: payload[0].payload.picks },
                  ]}
                />
              ) : null
            }
          />
          <Area type="monotone" dataKey="cumulative" stroke={color} strokeWidth={2} fill="url(#perf-fill)" activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
