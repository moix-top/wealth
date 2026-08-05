"use client";

import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { fmt, ASSET_CLASSES, ASSET_ORDER, assetClassOf } from "@/lib/utils";
import { tooltipStyle } from "@/components/Dashboard";
import type { AssetClassKey } from "@/lib/types";
import type { WealthStore } from "@/lib/store";

export default function AssetClasses({ store }: { store: WealthStore }) {
  const { groups } = store.data!;

  const { slices, total } = useMemo(() => {
    const sums = {} as Record<AssetClassKey, number>;
    groups.forEach((g) =>
      g.subgroups.forEach((s) => {
        const c = assetClassOf(s, g.name);
        sums[c] = (sums[c] || 0) + (s.amount || 0);
      }),
    );
    const total = Object.values(sums).reduce((a: number, v: number) => a + v, 0);
    const slices = ASSET_ORDER.filter((c) => sums[c] > 0).map((c) => ({
      key: c,
      name: ASSET_CLASSES[c].label,
      color: ASSET_CLASSES[c].color,
      value: sums[c],
    }));
    return { slices, total };
  }, [groups]);

  return (
    <div className="dash">
      <div className="dash-chart card">
        <div className="dash-chart-head">
          <span className="muted">Distribución por clase de activo</span>
        </div>
        <div className="donut-wrap">
          <ResponsiveContainer width="100%" height={360}>
            <PieChart>
              <Pie
                data={slices}
                dataKey="value"
                nameKey="name"
                innerRadius={95}
                outerRadius={140}
                paddingAngle={2}
                stroke="var(--surface-1)"
                strokeWidth={2}
              >
                {slices.map((s, i) => (
                  <Cell key={i} fill={s.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v: number, n: string) => [fmt(v), n]}
                contentStyle={tooltipStyle}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="donut-center">
            <div className="donut-label">Total</div>
            <div className="donut-value">{fmt(total)}</div>
          </div>
        </div>
      </div>

      <div className="dash-legend card">
        <h3>Clases de activo</h3>
        <ul className="legend-list">
          {slices.map((s, i) => (
            <li key={i} className="legend-row">
              <span className="swatch" style={{ background: s.color }} />
              <span className="legend-name">{s.name}</span>
              <span className="legend-bar-track">
                <span
                  className="legend-bar"
                  style={{ width: `${(s.value / total) * 100}%`, background: s.color }}
                />
              </span>
              <span className="legend-val">{fmt(s.value)}</span>
              <span className="legend-pct">{((s.value / total) * 100).toFixed(1)}%</span>
            </li>
          ))}
        </ul>
        <p className="muted" style={{ marginTop: "0.75rem" }}>
          La clase de cada partida se ajusta en la pestaña Editar.
        </p>
      </div>
    </div>
  );
}
