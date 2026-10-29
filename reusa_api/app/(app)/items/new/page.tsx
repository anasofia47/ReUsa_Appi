import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PublishItemForm } from "@/components/item-controls";
import { requireWebUser } from "@/lib/web/session";

export const metadata: Metadata = { title: "Publicar Objeto" };

async function CheckUser() {
  await requireWebUser();
  return null;
}

export default function NewItemPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <Suspense>
        <CheckUser />
      </Suspense>
      <div className="mb-6">
        <Link href="/items" className="text-sm text-emerald-600 hover:underline">
          ← Volver al catálogo
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Publicar un Objeto en ReUsa</h1>
        <p className="text-sm text-zinc-500">
          Tu publicación será revisada por un <strong>supervisor</strong> antes de aparecer en el catálogo para toda la comunidad.
        </p>
      </div>

      <PublishItemForm />
    </div>
  );
}
