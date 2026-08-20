"use client";

import { useState } from "react";
import { fmt, groupTotal, colorFor, ASSET_CLASSES, ASSET_ORDER, assetClassOf } from "@/lib/utils";
import type { AssetClassKey, Group, Subgroup } from "@/lib/types";
import type { WealthStore } from "@/lib/store";

export default function Editor({ store }: { store: WealthStore }) {
  const { groups } = store.data!;
  const [newGroup, setNewGroup] = useState("");

  return (
    <div className="editor">
      <div className="editor-add card">
        <input
          className="input"
          placeholder="Nuevo grupo (p. ej. Bankinter)…"
          value={newGroup}
          onChange={(e) => setNewGroup(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && newGroup.trim()) {
              store.addGroup(newGroup.trim());
              setNewGroup("");
            }
          }}
        />
        <button
          className="btn primary"
          disabled={!newGroup.trim()}
          onClick={() => {
            store.addGroup(newGroup.trim());
            setNewGroup("");
          }}
        >
          + Añadir grupo
        </button>
      </div>

      {groups.map((g, i) => (
        <GroupCard key={g.id} g={g} color={colorFor(i)} store={store} />
      ))}
    </div>
  );
}

function GroupCard({ g, color, store }: { g: Group; color: string; store: WealthStore }) {
  const [name, setName] = useState(g.name);
  const [newSub, setNewSub] = useState("");
  const [newAmount, setNewAmount] = useState("");

  const addSub = () => {
    if (!newSub.trim()) return;
    store.addSubgroup(g.id, newSub.trim(), newAmount);
    setNewSub("");
    setNewAmount("");
  };

  return (
    <div className="card group-card">
      <div className="group-card-head">
        <span className="swatch big" style={{ background: color }} />
        <input
          className="input group-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => {
            if (name.trim() && name !== g.name) store.renameGroup(g.id, name.trim());
          }}
        />
        <span className="group-total">{fmt(groupTotal(g))}</span>
        <button
          className="btn danger ghost"
          onClick={() => {
            if (confirm(`¿Eliminar el grupo "${g.name}" y sus subgrupos?`)) store.removeGroup(g.id);
          }}
        >
          Eliminar
        </button>
      </div>

      {/* Antes una <table> con columnas de ancho fijo (350px), que no cabían en
          móvil. Rejilla: mismas columnas en escritorio, apilada en pantalla estrecha. */}
      <div className="sub-list" role="table" aria-label={`Partidas de ${g.name}`}>
        {g.subgroups.map((s) => (
          <SubRow key={s.id} gid={g.id} s={s} store={store} />
        ))}
      </div>

      <div className="sub-add">
        <input
          className="input"
          placeholder="Nuevo subgrupo…"
          value={newSub}
          onChange={(e) => setNewSub(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addSub()}
        />
        <input
          className="input amount"
          type="number"
          inputMode="decimal"
          step="0.01"
          placeholder="0,00 €"
          value={newAmount}
          onChange={(e) => setNewAmount(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addSub()}
        />
        <button className="btn" disabled={!newSub.trim()} onClick={addSub}>
          + Añadir
        </button>
      </div>
    </div>
  );
}

function SubRow({ gid, s, store }: { gid: string; s: Subgroup; store: WealthStore }) {
  const [name, setName] = useState(s.name);
  const [amount, setAmount] = useState(String(s.amount));

  return (
    <div className="sub-row" role="row">
      <div className="sub-cell name-cell" role="cell">
        <input
          className="input flush"
          aria-label="Nombre de la partida"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => {
            if (name.trim() && name !== s.name) store.updateSubgroup(gid, s.id, { name: name.trim() });
          }}
        />
      </div>
      <div className="sub-cell class-cell" role="cell">
        <select
          className="class-select"
          aria-label="Clase de activo"
          value={assetClassOf(s)}
          onChange={(e) =>
            store.updateSubgroup(gid, s.id, { assetClass: e.target.value as AssetClassKey })
          }
        >
          {ASSET_ORDER.map((c) => (
            <option key={c} value={c}>
              {ASSET_CLASSES[c].label}
            </option>
          ))}
        </select>
      </div>
      <div className="sub-cell amount-cell" role="cell">
        <input
          className="input flush amount"
          type="number"
          inputMode="decimal"
          step="0.01"
          aria-label="Importe"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onBlur={() => {
            const n = Number(amount);
            if (!Number.isNaN(n) && n !== s.amount) store.updateSubgroup(gid, s.id, { amount: n });
          }}
        />
        <span className="euro">€</span>
      </div>
      <div className="sub-cell row-actions" role="cell">
        <button
          className="btn danger ghost sm"
          aria-label={`Eliminar ${s.name}`}
          onClick={() => {
            if (confirm(`¿Eliminar "${s.name}"?`)) store.removeSubgroup(gid, s.id);
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
