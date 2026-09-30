"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { OddsSnapshot } from "@/lib/domain/types";
import { formatDateTime, formatOdds } from "@/lib/format";
import { AXIS_TICK, ChartTooltipBox, GRID_STROKE, Legend } from "./chart-parts";

export function OddsMovementChart({
  history,
  homeName,
  awayName,
  timezone,
  height = 220,
}: {
  history: OddsSnapshot[];
  homeName: string;
  awayName: string;
  timezone: string;
  height?: number;
}) {
  const data = history.map((h) => ({
    t: h.timestamp,
    home: h.odds["1X2_HOME"] ?? null,
    draw: h.odds["1X2_DRAW"] ?? null,
    away: h.odds["1X2_AWAY"] ?? null,
  }));
  const series = [
    { key: "home", label: homeName, color: "var(--home)" },
    { key: "draw", label: "Nul", color: "var(--draw)" },
    { key: "away", label: awayName, color: "var(--away)" },
  ] as const;
  return (
    <div className="w-full">
      <Legend className="mb-2" items={series.map((s) => ({ label: s.label, color: s.color }))} />
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
            <CartesianGrid stroke={GRID_STROKE} vertical={false} />
            <XAxis
              dataKey="t"
              tickFormatter={(v: string) => new Intl.DateTimeFormat("fr-FR", { timeZone: timezone, day: "numeric", hour: "2-digit" }).format(new Date(v))}
              tick={AXIS_TICK}
              axisLine={false}
              tickLine={false}
              minTickGap={24}
            />
            <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={48} domain={["auto", "auto"]} tickFormatter={(v: number) => v.toFixed(2)} />
            <Tooltip
              cursor={{ stroke: "var(--border-strong)" }}
              content={({ active, payload }) =>
                active && payload?.length ? (
                  <ChartTooltipBox
                    title={formatDateTime(String(payload[0].payload.t), timezone)}
                    rows={series.map((s) => ({ label: s.label, value: formatOdds(payload[0].payload[s.key] as number | null), color: s.color }))}
                  />
                ) : null
              }
            />
            {series.map((s) => (
              <Line key={s.key} type="stepAfter" dataKey={s.key} stroke={s.color} strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: "var(--surface)", strokeWidth: 2 }} connectNulls />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
