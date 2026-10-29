import type { Repositories } from '@/db/repositories';
import type { ApiClient } from '@/services/api/client';
import type { Book, Item, Loan, LoanAction, LocalLoan, LocalRequest, ProductRequest, RequestAction, User } from '@/types';

/** Regla de negocio detectada en el dispositivo antes de tocar la red. */
export class LoanRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LoanRuleError';
  }
}

interface Deps {
  api: Pick<ApiClient, 'patch' | 'post'>;
  repos: Pick<Repositories, 'loans' | 'requests' | 'outbox' | 'activity'>;
  newId: () => string;
  now?: () => Date;
}

export function createLoanService({ api, repos, newId, now = () => new Date() }: Deps) {
  return {
    // ─────────────── Solicitud de Objetos ReUsa ───────────────
    async requestItem(user: User, item: Item): Promise<LocalRequest> {
      if (await repos.requests.hasActiveForItem(user.uid, item.id)) {
        throw new LoanRuleError('Ya tienes una solicitud activa para este producto.');
      }
      if (!item.available) {
        throw new LoanRuleError('Este producto ya no se encuentra disponible.');
      }

      const clientRequestId = newId();
      const timestamp = now().toISOString();
      const req: ProductRequest = {
        id: `local-${clientRequestId}`,
        itemId: item.id,
        itemTitle: item.title,
        publisherId: item.publishedBy,
        userId: user.uid,
        userEmail: user.email,
        userName: user.name,
        status: 'requested',
        clientRequestId,
        requestedAt: timestamp,
        resolvedAt: null,
        deliveredAt: null,
        updatedAt: timestamp,
      };

      await repos.outbox.enqueue('request_item', {
        itemId: item.id,
        clientRequestId,
      });
      await repos.requests.insertPending(req);
      await repos.activity.log('request.create', `Solicitud local de producto "${item.title}"`);
      return { ...req, syncState: 'pending', syncError: null };
    },

    async transitionRequest(requestId: string, action: RequestAction): Promise<ProductRequest> {
      const { request } = await api.patch<{ request: ProductRequest }>(
        `/api/requests/${requestId}`,
        { action },
      );
      await repos.requests.upsertFromServer(request);
      await repos.activity.log(
        'request.' + action,
        `Solicitud de "${request.itemTitle}" → ${request.status}`,
      );
      return request;
    },

    // ─────────────── Solicitud de Préstamos (Guía 2) ───────────────
    async requestLoan(user: User, book: Book): Promise<LocalLoan> {
      if (await repos.loans.hasActiveForBook(user.uid, book.id)) {
        throw new LoanRuleError('Ya tienes una solicitud o un préstamo activo de este libro.');
      }
      if (book.availableCopies <= 0) {
        throw new LoanRuleError('No hay ejemplares disponibles de este libro.');
      }

      const clientRequestId = newId();
      const timestamp = now().toISOString();
      const loan: Loan = {
        id: `local-${clientRequestId}`,
        bookId: book.id,
        bookTitle: book.title,
        userId: user.uid,
        userEmail: user.email,
        userName: user.name,
        status: 'requested',
        clientRequestId,
        requestedAt: timestamp,
        resolvedAt: null,
        dueDate: null,
        returnedAt: null,
        updatedAt: timestamp,
      };

      await repos.outbox.enqueue('request_loan', {
        bookId: book.id,
        clientRequestId,
      });
      await repos.loans.insertPending(loan);
      await repos.activity.log('loan.request', `Solicitud local de "${book.title}"`);
      return { ...loan, syncState: 'pending', syncError: null };
    },

    async transition(loanId: string, action: LoanAction): Promise<Loan> {
      const { loan } = await api.patch<{ loan: Loan }>(`/api/loans/${loanId}`, { action });
      await repos.loans.upsertFromServer(loan);
      await repos.activity.log('loan.' + action, `Préstamo de "${loan.bookTitle}" → ${loan.status}`);
      return loan;
    },

    dismiss(id: string): Promise<void> {
      return repos.loans.remove(id);
    },

    dismissRequest(id: string): Promise<void> {
      return repos.requests.remove(id);
    },
  };
}

export type LoanService = ReturnType<typeof createLoanService>;
