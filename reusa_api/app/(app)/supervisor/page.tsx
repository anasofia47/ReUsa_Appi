import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ItemCover } from "@/components/item-card";
import { SupervisorReviewForm } from "@/components/item-controls";
import { emptyBoxClass, formatDate } from "@/components/ui";
import { listItems } from "@/lib/data/items";
import { requireWebUser } from "@/lib/web/session";

export const metadata: Metadata = { title: "Panel del Supervisor · Aprobación de Publicaciones" };

async function SupervisorContent() {
  const user = await requireWebUser(["supervisor", "admin"]);
  const pendingItems = await listItems(user, { status: "pending_approval" });

  if (pendingItems.length === 0) {
    return (
      <div className={emptyBoxClass}>
        <p className="text-base font-medium">¡Al día! No hay publicaciones pendientes de revisión.</p>
        <p className="text-sm mt-1 text-zinc-400">
          Cuando los estudiantes publiquen nuevos artículos, aparecerán aquí para tu aprobación.
        </p>
        <Link href="/items" className="mt-4 inline-block text-emerald-600 underline text-sm">
          Ver catálogo público
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {pendingItems.map((item) => (
        <div
          key={item.id}
          className="flex flex-col md:flex-row gap-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="w-full md:w-48 shrink-0">
            <ItemCover item={item} className="h-44 w-full rounded-xl object-cover" />
          </div>

          <div className="flex flex-1 flex-col gap-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 px-2 py-0.5 text-xs font-semibold">
                  Pendiente de revisión
                </span>
                <h2 className="text-xl font-bold mt-1">
                  <Link href={`/items/${item.id}`} className="hover:underline">
                    {item.title}
                  </Link>
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Publicado por: <strong>{item.publisherName}</strong> ({item.publisherEmail}) · {formatDate(item.createdAt)}
                </p>
              </div>
              <span className="text-xs font-medium bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded">
                {item.category}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <p>Estado del objeto: <strong>{item.condition}</strong></p>
              <p>Punto de entrega: <strong>{item.deliveryPoint}</strong></p>
            </div>

            <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-3">
              {item.description}
            </p>

            <div className="mt-auto pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <SupervisorReviewForm itemId={item.id} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SupervisorPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Panel de Supervisión · Solicitudes de Publicación</h1>
        <p className="text-sm text-zinc-500">
          Los objetos nuevos no aparecen en el catálogo de estudiantes hasta que tú los revises y apruebes.
        </p>
      </div>

      <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />}>
        <SupervisorContent />
      </Suspense>
    </div>
  );
}
