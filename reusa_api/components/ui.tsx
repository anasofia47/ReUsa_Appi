import type { ItemStatus, RequestStatus } from "@/lib/types";

export const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 " +
  "outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200 " +
  "dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

export const buttonClass =
  "inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm " +
  "font-medium text-white transition hover:bg-emerald-700 " +
  "disabled:cursor-not-allowed disabled:opacity-50";

export const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-lg border border-zinc-300 px-3 py-1.5 " +
  "text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-50 " +
  "dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800";

export const dangerButtonClass =
  "inline-flex items-center justify-center rounded-lg bg-red-600 px-3 py-1.5 " +
  "text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50";

export const emptyBoxClass =
  "rounded-xl border border-dashed border-zinc-300 p-8 text-center text-zinc-500 " +
  "dark:border-zinc-700";

const ITEM_BADGES: Record<ItemStatus, { label: string; className: string }> = {
  pending_approval: {
    label: "Pendiente de aprobación",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  },
  approved: {
    label: "Aprobado",
    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  },
  rejected: {
    label: "Rechazado",
    className: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
  },
};

const REQUEST_BADGES: Record<RequestStatus, { label: string; className: string }> = {
  requested: {
    label: "Solicitado",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  },
  approved: {
    label: "Aceptado",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
  },
  rejected: {
    label: "Rechazado",
    className: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
  },
  delivered: {
    label: "Entregado",
    className: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  },
};

export function ItemStatusBadge({ status }: { status: ItemStatus }) {
  const { label, className } = ITEM_BADGES[status] ?? { label: status, className: "bg-zinc-200 text-zinc-700" };
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>{label}</span>;
}

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  const { label, className } = REQUEST_BADGES[status] ?? { label: status, className: "bg-zinc-200 text-zinc-700" };
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>{label}</span>;
}

export function Alert({ kind, children }: { kind: "error" | "ok"; children: React.ReactNode }) {
  const styles =
    kind === "error"
      ? "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200"
      : "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200";
  return (
    <p role={kind === "error" ? "alert" : "status"} className={`rounded-lg px-3 py-2 text-sm ${styles}`}>
      {children}
    </p>
  );
}

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
