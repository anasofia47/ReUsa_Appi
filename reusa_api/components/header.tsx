import Link from "next/link";
import { logoutAction } from "@/app/actions";
import { getWebUser } from "@/lib/web/session";
import { NotificationBell } from "./notification-bell";
import { secondaryButtonClass } from "./ui";

export async function Header() {
  const user = await getWebUser();

  const roleLabel =
    user?.role === "admin"
      ? "Administrador"
      : user?.role === "supervisor"
      ? "Supervisor"
      : "Estudiante";

  return (
    <header className="border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href={user ? "/items" : "/login"} className="flex items-center gap-2 font-bold text-lg text-emerald-700 dark:text-emerald-400">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white font-black text-sm">
            ♻
          </span>
          ReUsa
        </Link>

        {user && (
          <nav className="flex items-center gap-4 text-sm font-medium">
            <Link href="/items" className="text-zinc-700 hover:text-emerald-600 dark:text-zinc-300 dark:hover:text-emerald-400">
              Catálogo
            </Link>

            <Link href="/items/new" className="text-zinc-700 hover:text-emerald-600 dark:text-zinc-300 dark:hover:text-emerald-400">
              + Publicar Objeto
            </Link>

            <Link href="/requests" className="text-zinc-700 hover:text-emerald-600 dark:text-zinc-300 dark:hover:text-emerald-400">
              Peticiones
            </Link>

            {(user.role === "supervisor" || user.role === "admin") && (
              <Link href="/supervisor" className="text-amber-700 hover:underline dark:text-amber-400 font-semibold">
                Aprobaciones
              </Link>
            )}

            <Link href="/reports" className="text-indigo-700 hover:underline dark:text-indigo-400 font-semibold">
              {user.role === "student" ? "Mis Reportes" : "Reportes"}
            </Link>

            <NotificationBell />

            <span className="hidden text-zinc-500 sm:inline text-xs bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-md">
              {user.name} · <strong className="text-zinc-700 dark:text-zinc-300">{roleLabel}</strong>
            </span>

            <form action={logoutAction}>
              <button className={secondaryButtonClass}>Salir</button>
            </form>
          </nav>
        )}
      </div>
    </header>
  );
}
