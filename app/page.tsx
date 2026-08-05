// Página principal. Server component fino: comprueba sesión (el middleware ya
// redirige, esto es el cinturón además de los tirantes) y monta la app cliente
// pasándole la server action de logout.

import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import WealthApp from "@/components/WealthApp";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return <WealthApp signOutAction={signOutAction} />;
}
