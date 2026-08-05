"use client";

// Hook de estado de la app, portado de src/store.js. Conserva las mismas nueve
// mutaciones y el mismo modelo optimista (se pinta el cambio y se persiste
// detrás), pero contra la API multiusuario:
//
//   GET  /api/data            carga inicial (cartera + histórico)
//   PUT  /api/portfolio       guarda el árbol de grupos entero
//   POST /api/snapshots       crea un snapshot
//   PATCH/DELETE /api/snapshots/:id
//
// El usuario no se envía nunca: lo deduce el servidor de la cookie de sesión.

import { useCallback, useEffect, useRef, useState } from "react";
import type { AssetClassKey, Group, Snapshot, WealthData } from "@/lib/types";

const uid = (): string =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : String(Math.random()).slice(2);

export interface SessionInfo {
  email: string;
  name?: string | null;
  image?: string | null;
}

export interface WealthStore {
  data: WealthData | null;
  user: SessionInfo | null;
  saving: boolean;
  error: string | null;
  addGroup: (name: string) => void;
  renameGroup: (gid: string, name: string) => void;
  removeGroup: (gid: string) => void;
  addSubgroup: (gid: string, name: string, amount: string | number) => void;
  updateSubgroup: (gid: string, sid: string, patch: Partial<SubgroupPatch>) => void;
  removeSubgroup: (gid: string, sid: string) => void;
  takeSnapshot: (label?: string) => void;
  removeSnapshot: (sid: string) => void;
  renameSnapshot: (sid: string, label: string) => void;
}

interface SubgroupPatch {
  name: string;
  amount: number;
  assetClass: AssetClassKey;
}

/** Extrae el mensaje de error de una respuesta no-OK de la API. */
async function failure(res: Response): Promise<string> {
  try {
    const body = await res.json();
    return body?.error ?? `Error ${res.status}`;
  } catch {
    return `Error ${res.status}`;
  }
}

export function useWealthData(): WealthStore {
  const [data, setData] = useState<WealthData | null>(null);
  const [user, setUser] = useState<SessionInfo | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/data")
      .then(async (r) => {
        if (!r.ok) throw new Error(await failure(r));
        return r.json();
      })
      .then((body) => {
        if (cancelled) return;
        setData({ groups: body.groups, snapshots: body.snapshots, version: body.version });
        setUser(body.user ?? null);
      })
      .catch((e) => !cancelled && setError(String(e.message ?? e)));
    return () => {
      cancelled = true;
    };
  }, []);

  // `version` se lee dentro de un callback estable: se mantiene en una ref
  // espejo para no recrear persistGroups en cada guardado.
  const versionRef = useRef(0);
  versionRef.current = data?.version ?? 0;

  /**
   * Guarda el árbol de grupos. Pinta primero y persiste después; si el servidor
   * rechaza (409 por edición concurrente, validación…) se muestra el error, que
   * es más que lo que hacía el original: allí un fallo se perdía en silencio.
   */
  const persistGroups = useCallback(
    async (groups: Group[]) => {
      setData((prev) => (prev ? { ...prev, groups } : prev));
      setSaving(true);
      setError(null);
      try {
        const version = versionRef.current;
        const res = await fetch("/api/portfolio", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ groups, version }),
        });
        if (!res.ok) throw new Error(await failure(res));
        const saved = await res.json();
        // La versión avanza en el servidor; hay que seguirla o el siguiente
        // guardado chocaría contra su propio cambio.
        setData((prev) => (prev ? { ...prev, version: saved.version } : prev));
      } catch (e) {
        setError(String((e as Error).message ?? e));
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  const withGroups = (fn: (groups: Group[]) => Group[]) => {
    if (!data) return;
    persistGroups(fn(data.groups));
  };

  // --- mutaciones grupos/subgrupos ---
  const addGroup = (name: string) =>
    withGroups((groups) => [...groups, { id: uid(), name, subgroups: [] }]);

  const renameGroup = (gid: string, name: string) =>
    withGroups((groups) => groups.map((g) => (g.id === gid ? { ...g, name } : g)));

  const removeGroup = (gid: string) => withGroups((groups) => groups.filter((g) => g.id !== gid));

  const addSubgroup = (gid: string, name: string, amount: string | number) =>
    withGroups((groups) =>
      groups.map((g) =>
        g.id === gid
          ? { ...g, subgroups: [...g.subgroups, { id: uid(), name, amount: Number(amount) || 0 }] }
          : g,
      ),
    );

  const updateSubgroup = (gid: string, sid: string, patch: Partial<SubgroupPatch>) =>
    withGroups((groups) =>
      groups.map((g) =>
        g.id === gid
          ? { ...g, subgroups: g.subgroups.map((s) => (s.id === sid ? { ...s, ...patch } : s)) }
          : g,
      ),
    );

  const removeSubgroup = (gid: string, sid: string) =>
    withGroups((groups) =>
      groups.map((g) =>
        g.id === gid ? { ...g, subgroups: g.subgroups.filter((s) => s.id !== sid) } : g,
      ),
    );

  // --- snapshots ---
  const takeSnapshot = async (label?: string) => {
    if (!data) return;
    const values: Record<string, number> = {};
    data.groups.forEach((g) =>
      g.subgroups.forEach((s) => {
        values[s.id] = s.amount;
      }),
    );
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/snapshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: uid(), label: label?.trim() || undefined, values }),
      });
      if (!res.ok) throw new Error(await failure(res));
      const snapshot: Snapshot = await res.json();
      setData((prev) => (prev ? { ...prev, snapshots: [...prev.snapshots, snapshot] } : prev));
    } catch (e) {
      setError(String((e as Error).message ?? e));
    } finally {
      setSaving(false);
    }
  };

  const removeSnapshot = async (sid: string) => {
    if (!data) return;
    const before = data.snapshots;
    setData((prev) =>
      prev ? { ...prev, snapshots: prev.snapshots.filter((s) => s.id !== sid) } : prev,
    );
    setSaving(true);
    try {
      const res = await fetch(`/api/snapshots/${encodeURIComponent(sid)}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await failure(res));
    } catch (e) {
      // Revertir: si el borrado falla, el histórico no debe quedar mutilado
      // solo en pantalla.
      setData((prev) => (prev ? { ...prev, snapshots: before } : prev));
      setError(String((e as Error).message ?? e));
    } finally {
      setSaving(false);
    }
  };

  const renameSnapshot = async (sid: string, label: string) => {
    if (!data) return;
    const before = data.snapshots;
    setData((prev) =>
      prev
        ? { ...prev, snapshots: prev.snapshots.map((s) => (s.id === sid ? { ...s, label } : s)) }
        : prev,
    );
    setSaving(true);
    try {
      const res = await fetch(`/api/snapshots/${encodeURIComponent(sid)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      });
      if (!res.ok) throw new Error(await failure(res));
    } catch (e) {
      setData((prev) => (prev ? { ...prev, snapshots: before } : prev));
      setError(String((e as Error).message ?? e));
    } finally {
      setSaving(false);
    }
  };

  return {
    data,
    user,
    saving,
    error,
    addGroup,
    renameGroup,
    removeGroup,
    addSubgroup,
    updateSubgroup,
    removeSubgroup,
    takeSnapshot,
    removeSnapshot,
    renameSnapshot,
  };
}
