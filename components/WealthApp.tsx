"use client";

// Shell de la aplicación: portado de src/App.jsx. Lo añadido respecto al
// original es la barra de sesión (quién eres / salir) y mostrar los errores de
// guardado, que antes se perdían.

import { useState } from "react";
import { useWealthData } from "@/lib/store";
import Dashboard from "@/components/Dashboard";
import AssetClasses from "@/components/AssetClasses";
import Editor from "@/components/Editor";
import Snapshots from "@/components/Snapshots";
import Compare from "@/components/Compare";
import Evolution from "@/components/Evolution";
import TabNav from "@/components/TabNav";
import ThemeToggle from "@/components/ThemeToggle";
import { fmt, groupTotal } from "@/lib/utils";

export default function WealthApp({ signOutAction }: { signOutAction: () => Promise<void> }) {
  const store = useWealthData();
  const [tab, setTab] = useState<string>("dashboard");

  if (!store.data) {
    return <div className="loading">{store.error ? `Error: ${store.error}` : "Cargando…"}</div>;
  }

  const total = store.data.groups.reduce((a, g) => a + groupTotal(g), 0);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-dot" />
          <div>
            <h1>Mi Patrimonio</h1>
            <div className="brand-total">{fmt(total)}</div>
          </div>
        </div>
        <TabNav tab={tab} onSelect={setTab} variant="tabs" />
        <div className="session">
          {store.saving && <span className="saving">Guardando…</span>}
          {store.user && <span className="session-email">{store.user.email}</span>}
          <ThemeToggle />
          <form action={signOutAction}>
            <button className="btn ghost sm" type="submit">
              Salir
            </button>
          </form>
        </div>
      </header>

      {/* Antes un fallo al guardar no se veía en ninguna parte. */}
      {store.error && <div className="banner error">{store.error}</div>}

      <main className="content">
        {tab === "dashboard" && <Dashboard store={store} />}
        {tab === "assets" && <AssetClasses store={store} />}
        {tab === "compare" && <Compare store={store} />}
        {tab === "evolution" && <Evolution store={store} />}
        {tab === "snapshots" && <Snapshots store={store} />}
        {tab === "editor" && <Editor store={store} />}
      </main>

      {/* En móvil las 6 pestañas no caben en la cabecera: pasan a barra inferior. */}
      <TabNav tab={tab} onSelect={setTab} variant="tabbar" />
    </div>
  );
}
