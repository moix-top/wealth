"use client";

import { useState } from "react";
import { fmt, fmtDate, fmtSign, groupTotal, snapshotTotal } from "@/lib/utils";
import type { WealthStore } from "@/lib/store";

export default function Snapshots({ store }: { store: WealthStore }) {
  const { groups, snapshots } = store.data!;
  const [label, setLabel] = useState("");

  const allSubIds = groups.flatMap((g) => g.subgroups.map((s) => s.id));
  const currentTotal = groups.reduce((a, g) => a + groupTotal(g), 0);

  // ordenados nuevo→viejo para mostrar
  const ordered = [...snapshots].sort((a, b) => +new Date(b.date) - +new Date(a.date));

  return (
    <div className="snapshots">
      <div className="card snap-create">
        <div>
          <h3>Nuevo snapshot</h3>
          <p className="muted">
            Congela los importes actuales ({fmt(currentTotal)}) como un punto en tu histórico.
          </p>
        </div>
        <div className="snap-create-row">
          <input
            className="input"
            placeholder="Etiqueta (opcional)…"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <button
            className="btn primary"
            onClick={() => {
              store.takeSnapshot(label.trim());
              setLabel("");
            }}
          >
            📸 Tomar snapshot
          </button>
        </div>
      </div>

      <div className="card">
        <h3>Histórico ({ordered.length})</h3>
        <table className="hist-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Etiqueta</th>
              <th className="num">Total</th>
              <th className="num">Δ vs anterior</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {ordered.map((snap, idx) => {
              const total = snapshotTotal(snap, allSubIds);
              const prev = ordered[idx + 1];
              const delta = prev ? total - snapshotTotal(prev, allSubIds) : null;
              return (
                <tr key={snap.id}>
                  <td>{fmtDate(snap.date)}</td>
                  <td>
                    <input
                      className="input flush"
                      defaultValue={snap.label}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v && v !== snap.label) store.renameSnapshot(snap.id, v);
                      }}
                    />
                  </td>
                  <td className="num strong">{fmt(total)}</td>
                  <td className="num">
                    {delta === null ? (
                      <span className="muted">—</span>
                    ) : (
                      <span className={delta >= 0 ? "up" : "down"}>{fmtSign(delta)}</span>
                    )}
                  </td>
                  <td className="num">
                    <button
                      className="btn danger ghost sm"
                      onClick={() => {
                        if (confirm("¿Eliminar este snapshot?")) store.removeSnapshot(snap.id);
                      }}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
