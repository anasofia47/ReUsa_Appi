import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ItemCard } from "@/components/item-card";
import { Alert, buttonClass, emptyBoxClass, inputClass } from "@/components/ui";
import { listCategories, listItems } from "@/lib/data/items";
import { requireWebUser } from "@/lib/web/session";

export const metadata: Metadata = { title: "Catálogo de Objetos" };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function ItemList({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; published?: string }>;
}) {
  const user = await requireWebUser();
  const params = await searchParams;
  const q = first(params.q)?.trim().slice(0, 100) || undefined;
  const category = first(params.category)?.trim().slice(0, 60) || undefined;
  const wasPublished = first(params.published) === "true";

  const [items, categories] = await Promise.all([
    listItems(user, { q, category, status: "approved" }),
    listCategories(),
  ]);

  return (
    <>
      {wasPublished && (
        <div className="mb-6">
          <Alert kind="ok">
            ¡Tu objeto ha sido enviado a revisión! El supervisor lo evaluará y se publicará en cuanto sea aprobado.
          </Alert>
        </div>
      )}

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <form className="flex flex-1 flex-col gap-3 sm:flex-row" role="search">
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar por título, categoría o descripción..."
            className={inputClass}
            aria-label="Buscar"
          />
          <select
            name="category"
            defaultValue={category ?? ""}
            className={`${inputClass} sm:w-56`}
            aria-label="Categoría"
          >
            <option value="">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button className={buttonClass}>Buscar</button>
        </form>

        <Link
          href="/items/new"
          className="inline-flex items-center justify-center rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 shrink-0"
        >
          + Donar / Publicar Objeto
        </Link>
      </div>

      {items.length === 0 ? (
        <div className={emptyBoxClass}>
          <p className="text-base font-medium">No se encontraron objetos disponibles.</p>
          <p className="text-sm mt-1">Sé el primero en donar un objeto a la comunidad universitaria.</p>
          <Link href="/items/new" className="mt-4 inline-block text-emerald-600 underline font-medium">
            Publicar un objeto ahora
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </>
  );
}

function Skeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="h-64 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
      ))}
    </div>
  );
}

export default async function ItemsPage(props: {
  searchParams: Promise<{ q?: string; category?: string; published?: string }>;
}) {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Catálogo de Objetos Disponibles</h1>
        <p className="text-sm text-zinc-500">
          Encuentra libros, útiles, tecnología y accesorios compartidos por tus compañeros
        </p>
      </div>
      <Suspense fallback={<Skeleton />}>
        <ItemList searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
