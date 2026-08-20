"use client";

import { useMemo, useState } from "react";
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart,
} from "recharts";
import { fmt, fmtCompact, colorFor, snapshotValue as val } from "@/lib/utils";
import { tooltipStyle, tooltipWrapperStyle } from "@/components/Dashboard";
import { useIsMobile } from "@/lib/useMediaQuery";
import type { Group } from "@/lib/types";
import type { WealthStore } from "@/lib/store";

export default function Evolution({ store }: { store: WealthStore }) {
  const { groups, snapshots } = store.data!;
  const allSubIds = useMemo(() => groups.flatMap((g) => g.subgroups.map((s) => s.id)), [groups]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(allSubIds));
  const mobile = useIsMobile();

  const toggleGroup = (g: Group) => {
    const ids = g.subgroups.map((s) => s.id);
    const allOn = ids.every((id) => selected.has(id));
    const next = new Set(selected);
    ids.forEach((id) => (allOn ? next.delete(id) : next.add(id)));
    setSelected(next);
  };

  const ordered = useMemo(
    () => [...snapshots].sort((a, b) => +new Date(a.date) - +new Date(b.date)),
    [snapshots],
  );

  const series = useMemo(
    () =>
      ordered.map((snap) => ({
        name: new Date(snap.date).toLocaleDateString("es-ES", {
          day: "2-digit",
          month: "short",
          year: "2-digit",
        }),
        total: [...selected].reduce((a, id) => a + val(snap, id), 0),
      })),
    [ordered, selected],
  );

  const first = series[0]?.total || 0;
  const lastV = series[series.length - 1]?.total || 0;
  const growth = lastV - first;

  return (
    <div className="evolution">
      <div className="card">
        <div className="evo-head">
          <div>
            <h3>Evolución del patrimonio</h3>
            <span className="muted">
              {series.length} snapshots · crecimiento total{" "}
              <span className={growth >= 0 ? "up" : "down"}>
                {(growth >= 0 ? "+" : "") + fmt(growth)}
              </span>
            </span>
          </div>
          <div className="evo-current">{fmt(lastV)}</div>
        </div>
        {series.length < 2 ? (
          <p className="muted empty">Necesitas al menos 2 snapshots para ver la evolución.</p>
        ) : (
          <ResponsiveContainer width="100%" height={mobile ? 260 : 340}>
            <AreaChart
              data={series}
              margin={{ top: 10, right: mobile ? 8 : 20, left: mobile ? 0 : 10, bottom: 0 }}
            >
              <defs>
                <linearGradient id="evoFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--grid)" vertical={false} />
              {/* minTickGap evita que las fechas se pisen cuando hay muchos snapshots. */}
              <XAxis
                dataKey="name"
                tick={{ fill: "var(--muted)", fontSize: mobile ? 11 : 12 }}
                axisLine={{ stroke: "var(--axis)" }}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={mobile ? 32 : 24}
              />
              <YAxis
                tick={{ fill: "var(--muted)", fontSize: mobile ? 11 : 12 }}
                axisLine={false}
                tickLine={false}
                width={mobile ? 44 : 80}
                tickFormatter={(v: number) =>
                  mobile ? fmtCompact(v) : fmt(v).replace(/\s?€/, "")
                }
              />
              <Tooltip
                formatter={(v: number) => [fmt(v), "Total"]}
                contentStyle={tooltipStyle}
                wrapperStyle={tooltipWrapperStyle}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke="var(--accent)"
                strokeWidth={2}
                fill="url(#evoFill)"
                dot={{ r: 3, fill: "var(--accent)" }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="card evo-filter">
        <h3>Qué incluir</h3>
        <div className="evo-chips">
          {groups.map((g, i) => {
            const ids = g.subgroups.map((s) => s.id);
            const on = ids.length > 0 && ids.every((id) => selected.has(id));
            const some = ids.some((id) => selected.has(id));
            return (
              <button
                key={g.id}
                className={"evo-chip" + (on ? " on" : some ? " some" : "")}
                style={on ? { borderColor: colorFor(i), color: colorFor(i) } : {}}
                onClick={() => toggleGroup(g)}
              >
                <span className="swatch" style={{ background: colorFor(i) }} />
                {g.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
