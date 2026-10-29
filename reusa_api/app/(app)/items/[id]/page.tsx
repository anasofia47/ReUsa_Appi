import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ItemCover } from "@/components/item-card";
import {
  ItemCoverUpload,
  RequestItemForm,
  SupervisorReviewForm,
} from "@/components/item-controls";
import { ItemStatusBadge } from "@/components/ui";
import { getItem } from "@/lib/data/items";
import { ApiError } from "@/lib/errors";
import { requireWebUser } from "@/lib/web/session";

export const metadata: Metadata = { title: "Detalle del Objeto" };

async function ItemDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireWebUser();
  const { id } = await params;

  const item = await getItem(id).catch((err) => {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  });

  const isOwner = item.publisherId === user.uid;
  const isSupervisorOrAdmin = user.role === "supervisor" || user.role === "admin";

  return (
    <article className="grid gap-8 md:grid-cols-[18rem_1fr]">
      <div className="flex flex-col gap-4">
        <ItemCover item={item} className="aspect-square w-full rounded-2xl object-cover shadow-sm" />

        {(isOwner || isSupervisorOrAdmin) && (
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
              Foto del Objeto
            </h4>
            <ItemCoverUpload itemId={item.id} />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="rounded-md bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                {item.category}
              </span>
              <ItemStatusBadge status={item.status} />
              {!item.available && (
                <span className="rounded-md bg-zinc-200 px-2 py-0.5 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  Ya entregado
                </span>
              )}
            </div>
            <h1 className="text-3xl font-bold tracking-tight">{item.title}</h1>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 rounded-xl border border-zinc-100 bg-zinc-50/70 p-4 text-xs dark:border-zinc-800 dark:bg-zinc-900/60">
          <div>
            <span className="text-zinc-500 block">Condición</span>
            <strong className="text-zinc-800 dark:text-zinc-200 text-sm">{item.condition}</strong>
          </div>
          <div>
            <span className="text-zinc-500 block">Punto de Entrega</span>
            <strong className="text-emerald-700 dark:text-emerald-400 text-sm">📍 {item.deliveryPoint}</strong>
          </div>
          <div>
            <span className="text-zinc-500 block">Publicador</span>
            <strong className="text-zinc-800 dark:text-zinc-200 text-sm">{item.publisherName}</strong>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Descripción</h3>
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 whitespace-pre-line">
            {item.description}
          </p>
        </div>

        {/* Panel de aprobación para el Supervisor */}
        {isSupervisorOrAdmin && item.status === "pending_approval" && (
          <SupervisorReviewForm itemId={item.id} />
        )}

        {/* Formulario de solicitud para estudiantes si el objeto está aprobado y disponible */}
        {item.status === "approved" && item.available && (
          <RequestItemForm itemId={item.id} isOwner={isOwner} />
        )}

        {item.status === "pending_approval" && !isSupervisorOrAdmin && (
          <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-200 dark:border-amber-900">
            ⏳ Esta publicación está en revisión por un supervisor. Podrá ser solicitada una vez aprobada.
          </div>
        )}

        {item.status === "rejected" && (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800 border border-red-200 dark:bg-red-950/30 dark:text-red-200 dark:border-red-900">
            ✕ Publicación rechazada. Motivo: {item.rejectionReason || "No especificado"}
          </div>
        )}

        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <Link href="/items" className="text-sm text-emerald-600 hover:underline">
            ← Volver al catálogo de objetos
          </Link>
        </div>
      </div>
    </article>
  );
}

export default async function ItemPage(props: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />}>
      <ItemDetail params={props.params} />
    </Suspense>
  );
}
