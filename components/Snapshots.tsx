"use client";

import { useState } from "react";
import { fmt, fmtDate, fmtSign, groupTotal, snapshotTotal } from "@/lib/utils";
import { useIsMobile } from "@/lib/useMediaQuery";
import type { WealthStore } from "@/lib/store";

export default function Snapshots({ store }: { store: WealthStore }) {
  const { groups, snapshots } = store.data!;
  const [label, setLabel] = useState("");
  const mobile = useIsMobile();

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
        {/* Si aun así no cabe (importes muy largos), se desplaza dentro de la
            tarjeta en lugar de desbordar la página entera. */}
        <div className="table-scroll">
        <table className="hist-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Etiqueta</th>
              <th className="num">Total</th>
              <th className="num">{mobile ? "Δ" : "Δ vs anterior"}</th>
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
                  <td className="nowrap">{fmtDate(snap.date, mobile)}</td>
                  <td>
                    <input
                      className="input flush"
                      aria-label="Etiqueta del snapshot"
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
                      aria-label="Eliminar snapshot"
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
    </div>
  );
}
