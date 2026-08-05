"use client";

import { useMemo, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { fmt, colorFor, groupTotal } from "@/lib/utils";
import type { WealthStore } from "@/lib/store";

export const tooltipStyle = {
  background: "var(--surface-1)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  color: "var(--text-primary)",
  fontSize: 13,
};

interface Slice {
  id?: string;
  name: string;
  value: number;
  color: string;
}

export default function Dashboard({ store }: { store: WealthStore }) {
  const { groups } = store.data!;
  const [drill, setDrill] = useState<string | null>(null); // groupId o null

  const total = useMemo(() => groups.reduce((a, g) => a + groupTotal(g), 0), [groups]);

  const activeGroup = drill ? groups.find((g) => g.id === drill) : undefined;

  const slices: Slice[] = useMemo(() => {
    if (activeGroup) {
      const gi = groups.findIndex((g) => g.id === activeGroup.id);
      return activeGroup.subgroups
        .map((s) => ({ name: s.name, value: s.amount, color: colorFor(gi) }))
        .filter((s) => s.value > 0);
    }
    return groups
      .map((g, i) => ({
        id: g.id,
        name: g.name,
        value: groupTotal(g),
        color: colorFor(i),
      }))
      .filter((s) => s.value > 0);
  }, [groups, activeGroup]);

  const shown = activeGroup ? groupTotal(activeGroup) : total;

  return (
    <div className="dash">
      <div className="dash-chart card">
        <div className="dash-chart-head">
          {activeGroup ? (
            <button className="back" onClick={() => setDrill(null)}>
              ← Todos los grupos
            </button>
          ) : (
            <span className="muted">Distribución del patrimonio</span>
          )}
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
                onClick={(d: { id?: string }) =>
                  !activeGroup && d?.id ? setDrill(d.id) : null
                }
              >
                {slices.map((s, i) => (
                  <Cell key={i} fill={s.color} cursor={activeGroup ? "default" : "pointer"} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v: number, n: string) => [fmt(v), n]}
                contentStyle={tooltipStyle}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="donut-center">
            <div className="donut-label">{activeGroup ? activeGroup.name : "Total"}</div>
            <div className="donut-value">{fmt(shown)}</div>
            {activeGroup && (
              <div className="donut-sub">{((shown / total) * 100).toFixed(1)}% del total</div>
            )}
          </div>
        </div>
      </div>

      <div className="dash-legend card">
        <h3>{activeGroup ? activeGroup.name : "Grupos"}</h3>
        <ul className="legend-list">
          {slices.map((s, i) => (
            <li
              key={i}
              className={"legend-row" + (!activeGroup ? " clickable" : "")}
              onClick={() => !activeGroup && s.id && setDrill(s.id)}
            >
              <span className="swatch" style={{ background: s.color }} />
              <span className="legend-name">{s.name}</span>
              <span className="legend-bar-track">
                <span
                  className="legend-bar"
                  style={{ width: `${(s.value / shown) * 100}%`, background: s.color }}
                />
              </span>
              <span className="legend-val">{fmt(s.value)}</span>
              <span className="legend-pct">{((s.value / shown) * 100).toFixed(1)}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
