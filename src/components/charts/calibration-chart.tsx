"use client";

import { CartesianGrid, ComposedChart, Line, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from "recharts";
import { formatPercent } from "@/lib/format";
import { AXIS_TICK, ChartTooltipBox, GRID_STROKE, Legend } from "./chart-parts";

export interface CalibrationPoint {
  label: string;
  predicted: number;
  observed: number;
  count: number;
}

/** Fréquence observée vs probabilité prédite : un modèle bien calibré suit la diagonale. */
export function CalibrationChart({ data, height = 260 }: { data: CalibrationPoint[]; height?: number }) {
  const diagonal = [
    { predicted: 0, ideal: 0 },
    { predicted: 1, ideal: 1 },
  ];
  return (
    <div className="w-full">
      <Legend
        className="mb-2"
        items={[
          { label: "Modèle (taille = nb d'estimations)", color: "var(--home)" },
          { label: "Calibration parfaite", color: "var(--draw)", dashed: true },
        ]}
      />
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
            <CartesianGrid stroke={GRID_STROKE} />
            <XAxis
              type="number"
              dataKey="predicted"
              domain={[0, 1]}
              ticks={[0, 0.2, 0.4, 0.6, 0.8, 1]}
              tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
              tick={AXIS_TICK}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="number"
              domain={[0, 1]}
              ticks={[0, 0.2, 0.4, 0.6, 0.8, 1]}
              tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
              tick={AXIS_TICK}
              axisLine={false}
              tickLine={false}
              width={44}
            />
            <Line data={diagonal} dataKey="ideal" stroke="var(--draw)" strokeDasharray="4 4" strokeWidth={1.5} dot={false} isAnimationActive={false} />
            <Scatter
              data={data}
              dataKey="observed"
              fill="var(--home)"
              shape={(props: { cx?: number; cy?: number; payload?: CalibrationPoint }) => {
                const r = Math.max(4, Math.min(11, Math.sqrt(props.payload?.count ?? 1)));
                return <circle cx={props.cx} cy={props.cy} r={r} fill="var(--home)" fillOpacity={0.85} stroke="var(--surface)" strokeWidth={2} />;
              }}
            />
            <Tooltip
              cursor={false}
              content={({ active, payload }) => {
                const p = payload?.find((x) => x.payload && "count" in x.payload)?.payload as CalibrationPoint | undefined;
                return active && p ? (
                  <ChartTooltipBox
                    title={`Tranche ${p.label}`}
                    rows={[
                      { label: "Probabilité moyenne prédite", value: formatPercent(p.predicted, 1) },
                      { label: "Fréquence observée", value: formatPercent(p.observed, 1), color: "var(--home)" },
                      { label: "Estimations", value: p.count },
                    ]}
                  />
                ) : null;
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
