import Link from "next/link";
import type { Item } from "@/lib/types";
import { ItemStatusBadge } from "./ui";

const placeholderClass =
  "flex items-center justify-center bg-emerald-100 text-3xl font-bold text-emerald-700 " +
  "dark:bg-emerald-950 dark:text-emerald-300";

const cardClass =
  "flex flex-col rounded-xl border border-zinc-200 bg-white p-4 transition shadow-sm " +
  "hover:border-emerald-500 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900";

export function ItemCover({ item, className = "" }: { item: Item; className?: string }) {
  if (item.coverUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={item.coverUrl}
        alt={`Foto de ${item.title}`}
        className={`object-cover ${className}`}
      />
    );
  }
  return (
    <div aria-hidden className={`${placeholderClass} ${className}`}>
      {item.title.charAt(0).toUpperCase()}
    </div>
  );
}

export function ItemCard({ item, showStatus = false }: { item: Item; showStatus?: boolean }) {
  return (
    <Link href={`/items/${item.id}`} className={cardClass}>
      <ItemCover item={item} className="h-44 w-full rounded-lg mb-3" />
      <div className="flex flex-1 flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-semibold text-base leading-snug line-clamp-1">{item.title}</h2>
          {showStatus && <ItemStatusBadge status={item.status} />}
        </div>
        <p className="text-xs text-zinc-500 line-clamp-2">{item.description}</p>
        <div className="mt-auto pt-2 flex flex-col gap-1 border-t border-zinc-100 dark:border-zinc-800 text-xs">
          <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
            <span className="font-medium bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
              {item.category}
            </span>
            <span>Estado: <strong>{item.condition}</strong></span>
          </div>
          <p className="text-emerald-700 dark:text-emerald-400 font-medium truncate">
            📍 {item.deliveryPoint}
          </p>
          <p className="text-zinc-400 text-[11px]">
            Publicado por: {item.publisherName}
          </p>
        </div>
      </div>
    </Link>
  );
}
