"use client";

import { useMemo, useState } from "react";
import { fmt, fmtSign, fmtDate, pct, colorFor, snapshotValue as val } from "@/lib/utils";
import { useIsMobile } from "@/lib/useMediaQuery";
import type { Group } from "@/lib/types";
import type { WealthStore } from "@/lib/store";

export default function Compare({ store }: { store: WealthStore }) {
  const { groups, snapshots } = store.data!;
  const mobile = useIsMobile();

  const ordered = useMemo(
    () => [...snapshots].sort((a, b) => +new Date(a.date) - +new Date(b.date)),
    [snapshots],
  );

  // Por defecto: B = último (actual), A = anterior.
  const last = ordered[ordered.length - 1];
  const prev = ordered[ordered.length - 2] || ordered[ordered.length - 1];
  const [aId, setAId] = useState<string | undefined>(prev?.id);
  const [bId, setBId] = useState<string | undefined>(last?.id);
  const snapA = ordered.find((s) => s.id === aId) || prev;
  const snapB = ordered.find((s) => s.id === bId) || last;

  // Selección: set de subgroupIds. Por defecto, todo seleccionado.
  const allSubIds = useMemo(() => groups.flatMap((g) => g.subgroups.map((s) => s.id)), [groups]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(allSubIds));

  const toggleSub = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };
  const toggleGroup = (g: Group) => {
    const ids = g.subgroups.map((s) => s.id);
    const allOn = ids.every((id) => selected.has(id));
    const next = new Set(selected);
    ids.forEach((id) => (allOn ? next.delete(id) : next.add(id)));
    setSelected(next);
  };
  const selectAll = () => setSelected(new Set(allSubIds));
  const selectNone = () => setSelected(new Set());

  // Totales de lo SELECCIONADO
  const totalA = [...selected].reduce((a, id) => a + val(snapA, id), 0);
  const totalB = [...selected].reduce((a, id) => a + val(snapB, id), 0);
  const totalDelta = totalB - totalA;

  if (ordered.length === 0) {
    return (
      <div className="card">
        <p className="muted empty">Aún no hay snapshots que comparar. Crea uno en la pestaña Snapshots.</p>
      </div>
    );
  }

  return (
    <div className="compare">
      <div className="cmp-controls card">
        <div className="cmp-snap-pick">
          <label>
            Desde (A)
            <select value={aId} onChange={(e) => setAId(e.target.value)}>
              {ordered.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label} · {fmtDate(s.date, mobile)}
                </option>
              ))}
            </select>
          </label>
          <span className="cmp-arrow">→</span>
          <label>
            Hasta (B)
            <select value={bId} onChange={(e) => setBId(e.target.value)}>
              {ordered.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label} · {fmtDate(s.date, mobile)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="cmp-select-actions">
          <button className="btn sm" onClick={selectAll}>
            Seleccionar todo
          </button>
          <button className="btn sm" onClick={selectNone}>
            Ninguno
          </button>
        </div>
      </div>

      {/* Total de lo seleccionado */}
      <div className="cmp-total card">
        <div className="cmp-total-col">
          <span className="muted">Total seleccionado (A)</span>
          <strong>{fmt(totalA)}</strong>
        </div>
        <div className="cmp-total-col">
          <span className="muted">Total seleccionado (B)</span>
          <strong>{fmt(totalB)}</strong>
        </div>
        <div className="cmp-total-col big">
          <span className="muted">Diferencia</span>
          <strong className={totalDelta >= 0 ? "up" : "down"}>{fmtSign(totalDelta)}</strong>
          <span className={"chip " + (totalDelta >= 0 ? "up" : "down")}>
            {(totalDelta >= 0 ? "▲ " : "▼ ") + Math.abs(pct(totalA, totalB)).toFixed(2) + "%"}
          </span>
        </div>
      </div>

      {/* Detalle por grupo/subgrupo */}
      <div className="cmp-detail card">
        {groups.map((g, gi) => {
          const gSubs = g.subgroups;
          const gSel = gSubs.filter((s) => selected.has(s.id));
          const gA = gSubs.reduce((a, s) => a + (selected.has(s.id) ? val(snapA, s.id) : 0), 0);
          const gB = gSubs.reduce((a, s) => a + (selected.has(s.id) ? val(snapB, s.id) : 0), 0);
          const gd = gB - gA;
          const someOn = gSel.length > 0;
          const allOn = gSubs.length > 0 && gSel.length === gSubs.length;

          return (
            <div key={g.id} className={"cmp-group" + (someOn ? "" : " dim")}>
              <div className="cmp-group-head">
                <label className="chk">
                  <input
                    type="checkbox"
                    checked={allOn}
                    ref={(el) => {
                      if (el) el.indeterminate = someOn && !allOn;
                    }}
                    onChange={() => toggleGroup(g)}
                  />
                  <span className="swatch" style={{ background: colorFor(gi) }} />
                  <span className="cmp-group-name">{g.name}</span>
                </label>
                <span className="cmp-nums">
                  <span className="muted">{fmt(gA)}</span>
                  <span className="cmp-arrow-sm">→</span>
                  <span>{fmt(gB)}</span>
                  <span className={"cmp-delta " + (gd >= 0 ? "up" : "down")}>{fmtSign(gd)}</span>
                </span>
              </div>
              <div className="cmp-subs">
                {gSubs.map((s) => {
                  const a = val(snapA, s.id);
                  const b = val(snapB, s.id);
                  const d = b - a;
                  const on = selected.has(s.id);
                  return (
                    <label key={s.id} className={"cmp-sub" + (on ? "" : " off")}>
                      <input type="checkbox" checked={on} onChange={() => toggleSub(s.id)} />
                      <span className="cmp-sub-name">{s.name}</span>
                      <span className="cmp-sub-nums">
                        <span className="muted">{fmt(a)}</span>
                        <span className="cmp-arrow-sm">→</span>
                        <span>{fmt(b)}</span>
                        <span className={"cmp-delta " + (d >= 0 ? "up" : "down")}>
                          {d === 0 ? "—" : fmtSign(d)}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
