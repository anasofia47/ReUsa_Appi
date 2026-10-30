import type { Repositories } from '@/db/repositories';
import { ApiRequestError, NetworkError, type ApiClient } from '@/services/api/client';
import type { Book, Item, Loan, ProductRequest } from '@/types';

export const MAX_ATTEMPTS = 5;
const CURSOR_OVERLAP_MS = 1000;
const KEYS = {
  booksCursor: 'books.cursor',
  itemsCursor: 'items.cursor',
  lastSyncAt: 'sync.lastSyncAt',
} as const;

export interface SyncResult {
  pushed: number;
  conflicts: number;
  booksPulled: number;
  loansPulled: number;
  itemsPulled?: number;
  requestsPulled?: number;
}

export interface SyncDeps {
  api: Pick<ApiClient, 'get' | 'post'>;
  repos: Pick<Repositories, 'books' | 'loans' | 'items' | 'requests' | 'outbox' | 'meta' | 'activity'>;
  now?: () => Date;
}

export function conflictMessage(err: ApiRequestError): string {
  switch (err.code) {
    case 'ALREADY_ACTIVE':
      return 'Ya tenías una solicitud activa para este producto/libro.';
    case 'NO_COPIES':
      return 'Cuando se envió tu solicitud ya no quedaban ejemplares o unidades disponibles.';
    case 'NOT_FOUND':
      return 'El producto o libro ya no existe en el catálogo.';
    case 'FORBIDDEN':
      return 'Tu cuenta no tiene permiso para solicitar este elemento.';
    default:
      return err.message;
  }
}

export function createSyncService({ api, repos, now = () => new Date() }: SyncDeps) {
  const { books, loans, items, requests, outbox, meta, activity } = repos;

  async function pushOutbox(): Promise<{ pushed: number; conflicts: number }> {
    let pushed = 0;
    let conflicts = 0;

    for (const item of await outbox.pending()) {
      try {
        if (item.kind === 'request_item') {
          const { request } = await api.post<{ request: ProductRequest }>(
            '/api/requests',
            item.payload,
          );
          if (requests) await requests.upsertFromServer(request);
          await outbox.remove(item.id);
          pushed++;
          await activity.log('sync.push', `Solicitud de producto enviada`);
        } else {
          // request_loan (Guía 2)
          const { loan } = await api.post<{ loan: Loan }>('/api/loans', item.payload);
          if (loans) await loans.upsertFromServer(loan);
          await outbox.remove(item.id);
          pushed++;
          await activity.log('sync.push', `Solicitud de "${loan.bookTitle}" enviada`);
        }
      } catch (err) {
        if (err instanceof NetworkError) throw err;
        if (err instanceof ApiRequestError) {
          if (err.status === 401) throw err;
          const retryable = err.status >= 500 || err.status === 429;
          if (retryable && item.attempts + 1 < MAX_ATTEMPTS) {
            await outbox.recordFailure(item.id, err.message);
            throw err;
          }
          const message = retryable
            ? 'El servidor no pudo procesar la solicitud. Inténtalo de nuevo.'
            : conflictMessage(err);

          if (item.kind === 'request_item') {
            if (requests) await requests.markConflict(item.payload.clientRequestId, message);
          } else {
            if (loans) await loans.markConflict(item.payload.clientRequestId, message);
          }

          await outbox.remove(item.id);
          conflicts++;
          await activity.log('sync.conflict', `${err.code}: ${message}`);
          continue;
        }
        throw err;
      }
    }
    return { pushed, conflicts };
  }

  async function pullBooks(): Promise<number> {
    if (!books) return 0;
    try {
      const cursor = await meta.get(KEYS.booksCursor);
      const query = cursor ? `?updatedSince=${encodeURIComponent(cursor)}` : '';
      const res = await api.get<{ books: Book[]; serverTime: string }>(`/api/books${query}`);
      await books.upsertMany(res.books);
      const next = new Date(new Date(res.serverTime).getTime() - CURSOR_OVERLAP_MS).toISOString();
      await meta.set(KEYS.booksCursor, next);
      return res.books.length;
    } catch (err) {
      if (err instanceof NetworkError) throw err;
      return 0;
    }
  }

  async function pullLoans(): Promise<number> {
    if (!loans) return 0;
    try {
      const res = await api.get<{ loans: Loan[] }>('/api/loans');
      await loans.upsertManyFromServer(res.loans);
      return res.loans.length;
    } catch {
      return 0;
    }
  }

  async function pullItems(): Promise<number> {
    if (!items) return 0;
    try {
      const res = await api.get<{ items: Item[] }>('/api/items');
      if (Array.isArray(res.items)) {
        await items.upsertMany(res.items);
        return res.items.length;
      }
      return 0;
    } catch (err) {
      if (err instanceof NetworkError) throw err;
      console.warn('[sync] error al sincronizar objetos:', err);
      return 0;
    }
  }

  async function pullRequests(): Promise<number> {
    if (!requests) return 0;
    try {
      const res = await api.get<{ requests: ProductRequest[] }>('/api/requests');
      if (Array.isArray(res.requests)) {
        await requests.upsertManyFromServer(res.requests);
        return res.requests.length;
      }
      return 0;
    } catch (err) {
      if (err instanceof NetworkError) throw err;
      console.warn('[sync] error al sincronizar solicitudes:', err);
      return 0;
    }
  }

  return {
    async run(): Promise<SyncResult> {
      const { pushed, conflicts } = await pushOutbox();
      const booksPulled = await pullBooks();
      const loansPulled = await pullLoans();
      const itemsPulled = await pullItems();
      const requestsPulled = await pullRequests();
      await meta.set(KEYS.lastSyncAt, now().toISOString());
      return { pushed, conflicts, booksPulled, loansPulled, itemsPulled, requestsPulled };
    },

    async lastSyncAt(): Promise<string | null> {
      return meta.get(KEYS.lastSyncAt);
    },
  };
}

export type SyncService = ReturnType<typeof createSyncService>;
