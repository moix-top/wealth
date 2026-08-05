// Contrato de la puerta de las rutas de API: sin sesión, 401; con sesión, el
// userId sale del email de la sesión y viene normalizado.
//
// Se usa requireSessionWith (versión inyectable) para no necesitar next-auth.

import { describe, expect, it } from "vitest";
import type { Session } from "next-auth";
import { normalizeEmail, requireSessionWith } from "@/lib/auth";
import { HttpError } from "@/lib/http";

const session = (user: Partial<Session["user"]> | null): (() => Promise<Session | null>) =>
  async () => (user ? ({ user, expires: "" } as Session) : null);

describe("requireSession", () => {
  it("sin sesión lanza 401", async () => {
    await expect(requireSessionWith(session(null))).rejects.toBeInstanceOf(HttpError);
    await expect(requireSessionWith(session(null))).rejects.toMatchObject({ status: 401 });
  });

  it("con sesión sin email lanza 401", async () => {
    await expect(requireSessionWith(session({ name: "Ana" }))).rejects.toMatchObject({
      status: 401,
    });
  });

  it("el userId es el email de la sesión, normalizado", async () => {
    const u = await requireSessionWith(session({ email: "  Ana@Example.COM " }));
    expect(u.userId).toBe("ana@example.com");
    expect(u.email).toBe("ana@example.com");
  });

  it("normalizeEmail es estable: misma entrada en login, API e import", () => {
    expect(normalizeEmail(" RADAMUZ16@Gmail.com ")).toBe("radamuz16@gmail.com");
  });
});
