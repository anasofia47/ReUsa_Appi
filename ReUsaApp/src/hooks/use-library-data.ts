import { useEffect, useState } from 'react';
import { deriveListStatus, type ListStatus } from '@/lib/list-status';
import { useAuth } from '@/providers/auth-provider';
import { useData } from '@/providers/data-provider';
import type { Book, Item, LocalLoan, LocalRequest, Sex } from '@/types';

/** Ejecuta una consulta local a SQLite y la repite cuando cambian los datos (dataVersion). */
function useLocalQuery<T>(
  query: () => Promise<T>,
  deps: readonly unknown[],
): { data: T | null; loaded: boolean } {
  const { dataVersion } = useData();
  const [state, setState] = useState<{ data: T | null; loaded: boolean }>({
    data: null,
    loaded: false,
  });

  useEffect(() => {
    let active = true;
    query().then((data) => {
      if (active) setState({ data, loaded: true });
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, dataVersion]);

  return state;
}

// ───────────────────────────── Objetos ReUsa ─────────────────────────────

export function useItems(filters: { q?: string; category?: string | null; sex?: Sex | null } = {}) {
  const { repos, syncing, lastError, lastSyncAt } = useData();
  const { data, loaded } = useLocalQuery(
    () => repos.items.list({ q: filters.q, category: filters.category, sex: filters.sex }),
    [repos, filters.q, filters.category, filters.sex],
  );

  const items: Item[] = data ?? [];
  const status: ListStatus = deriveListStatus({
    loaded,
    count: items.length,
    syncing,
    error: lastError,
    everSynced: lastSyncAt !== null,
  });

  return { items, status };
}

export function useItem(id: string) {
  const { repos } = useData();
  const { data, loaded } = useLocalQuery(() => repos.items.getById(id), [repos, id]);
  return { item: data, loaded };
}

export function useItemCategories(): string[] {
  const { repos } = useData();
  const { data } = useLocalQuery(() => repos.items.categories(), [repos]);
  return data ?? [];
}

export function useRequests() {
  const { repos, syncing, lastError, lastSyncAt } = useData();
  const { user } = useAuth();
  const isSupervisorOrAdmin = user?.role === 'supervisor' || user?.role === 'admin';
  const scope = isSupervisorOrAdmin ? null : (user?.uid ?? '');

  const { data, loaded } = useLocalQuery(() => repos.requests.list(scope), [repos, scope]);
  const requests: LocalRequest[] = data ?? [];
  const status: ListStatus = deriveListStatus({
    loaded,
    count: requests.length,
    syncing,
    error: lastError,
    everSynced: lastSyncAt !== null,
  });

  return { requests, status };
}

export function useMyRequestForItem(itemId: string) {
  const { repos } = useData();
  const { user } = useAuth();
  const uid = user?.uid ?? '';
  const { data } = useLocalQuery(
    () => repos.requests.latestForItem(uid, itemId),
    [repos, uid, itemId],
  );
  return data;
}

// ───────────────────────────── Libros y Préstamos (Guía 2) ─────────────────────────────

export function useBooks(filters: { q: string; category: string | null }) {
  const { repos, syncing, lastError, lastSyncAt } = useData();
  const { data, loaded } = useLocalQuery(
    () => repos.books.list({ q: filters.q, category: filters.category }),
    [repos, filters.q, filters.category],
  );
  const books: Book[] = data ?? [];
  const status: ListStatus = deriveListStatus({
    loaded,
    count: books.length,
    syncing,
    error: lastError,
    everSynced: lastSyncAt !== null,
  });
  return { books, status };
}

export function useCategories(): string[] {
  const { repos } = useData();
  const { data } = useLocalQuery(() => repos.books.categories(), [repos]);
  return data ?? [];
}

export function useBook(id: string) {
  const { repos } = useData();
  const { data, loaded } = useLocalQuery(() => repos.books.getById(id), [repos, id]);
  return { book: data, loaded };
}

export function useLoans() {
  const { repos, syncing, lastError, lastSyncAt } = useData();
  const { user } = useAuth();
  const scope = user?.role === 'librarian' ? null : (user?.uid ?? '');
  const { data, loaded } = useLocalQuery(() => repos.loans.list(scope), [repos, scope]);
  const loans: LocalLoan[] = data ?? [];
  const status: ListStatus = deriveListStatus({
    loaded,
    count: loans.length,
    syncing,
    error: lastError,
    everSynced: lastSyncAt !== null,
  });
  return { loans, status };
}

export function useMyLoanForBook(bookId: string) {
  const { repos } = useData();
  const { user } = useAuth();
  const uid = user?.uid ?? '';
  const { data } = useLocalQuery(
    () => repos.loans.latestForBook(uid, bookId),
    [repos, uid, bookId],
  );
  return data;
}
