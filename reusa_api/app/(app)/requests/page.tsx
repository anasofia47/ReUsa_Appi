import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { RequestActionButtons } from "@/components/request-controls";
import { RequestStatusBadge, emptyBoxClass, formatDate } from "@/components/ui";
import { listRequests } from "@/lib/data/requests";
import type { ItemRequest } from "@/lib/types";
import { requireWebUser } from "@/lib/web/session";

export const metadata: Metadata = { title: "Peticiones y Entregas" };

async function RequestsContent({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await requireWebUser();
  const params = await searchParams;
  const currentTab = params.tab ?? "received";

  const [receivedRequests, sentRequests] = await Promise.all([
    listRequests(user, { type: "received" }),
    listRequests(user, { type: "sent" }),
  ]);

  const activeList: ItemRequest[] = currentTab === "sent" ? sentRequests : receivedRequests;

  return (
    <>
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 mb-6 gap-6">
        <Link
          href="/requests?tab=received"
          className={`pb-3 text-sm font-semibold transition ${
            currentTab === "received"
              ? "border-b-2 border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400"
              : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          }`}
        >
          Peticiones Recibidas ({receivedRequests.length})
        </Link>
        <Link
          href="/requests?tab=sent"
          className={`pb-3 text-sm font-semibold transition ${
            currentTab === "sent"
              ? "border-b-2 border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400"
              : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          }`}
        >
          Mis Peticiones Realizadas ({sentRequests.length})
        </Link>
      </div>

      {activeList.length === 0 ? (
        <div className={emptyBoxClass}>
          <p className="text-base font-medium">
            {currentTab === "received"
              ? "No tienes peticiones de interesados en tus objetos publicados."
              : "Aún no has solicitado ningún objeto."}
          </p>
          <Link href="/items" className="mt-3 inline-block text-emerald-600 underline text-sm">
            Explorar catálogo de objetos
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {activeList.map((req) => (
            <div
              key={req.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex flex-col gap-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                    <Link href={`/items/${req.itemId}`} className="hover:underline">
                      {req.itemTitle}
                    </Link>
                  </h3>
                  <RequestStatusBadge status={req.status} />
                </div>

                {currentTab === "received" ? (
                  <div className="text-xs text-zinc-600 dark:text-zinc-400">
                    <p>
                      Interesado: <strong>{req.applicantName}</strong> ({req.applicantEmail}) · 📱 WhatsApp:{" "}
                      <a
                        href={`https://wa.me/57${req.applicantPhone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-600 font-semibold underline"
                      >
                        {req.applicantPhone}
                      </a>
                    </p>
                    <p className="italic mt-1 text-zinc-500 bg-zinc-50 dark:bg-zinc-800/50 p-2 rounded border border-zinc-100 dark:border-zinc-700">
                      &quot;{req.message}&quot;
                    </p>
                  </div>
                ) : (
                  <div className="text-xs text-zinc-600 dark:text-zinc-400">
                    <p>
                      Publicador: <strong>{req.publisherName}</strong> ({req.publisherEmail})
                    </p>
                    <p className="italic mt-0.5 text-zinc-500">
                      Mensaje enviado: &quot;{req.message}&quot;
                    </p>
                  </div>
                )}

                <div className="text-[11px] text-zinc-400 flex flex-wrap gap-3 mt-1">
                  <span>Solicitado: {formatDate(req.requestedAt)}</span>
                  {req.resolvedAt && <span>Respondido: {formatDate(req.resolvedAt)}</span>}
                  {req.deliveredAt && (
                    <span className="text-emerald-600 font-medium">
                      ✓ Entregado: {formatDate(req.deliveredAt)}
                    </span>
                  )}
                </div>
              </div>

              {currentTab === "received" && (
                <div className="shrink-0 flex items-center justify-end">
                  <RequestActionButtons requestId={req.id} currentStatus={req.status} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export default function RequestsPage(props: {
  searchParams: Promise<{ tab?: string }>;
}) {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Historial de Peticiones y Entregas</h1>
        <p className="text-sm text-zinc-500">
          Gestiona los interesados en tus objetos donados y revisa el estado de tus solicitudes realizadas.
        </p>
      </div>

      <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />}>
        <RequestsContent searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
