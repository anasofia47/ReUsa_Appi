import type { SQLiteDatabase } from 'expo-sqlite';
import { escapeLike, normalizeSearch } from '@/lib/text';
import type {
  Book,
  Item,
  LocalLoan,
  LocalRequest,
  Loan,
  LoanStatus,
  ProductRequest,
  RequestStatus,
  Sex,
  SyncState,
} from '@/types';

// ───────────────────────────── Objetos ReUsa ─────────────────────────────

interface ItemRow {
  id: string;
  title: string;
  category: string;
  description: string;
  state: 'nuevo' | 'usado_bueno' | 'usado_regular';
  sex: Sex | null;
  available: number;
  published_by: string;
  publisher_name: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_comment: string | null;
  cover_url: string | null;
  created_at: string;
  updated_at: string;
}

const toItem = (r: ItemRow): Item => ({
  id: r.id,
  title: r.title,
  category: r.category,
  description: r.description,
  state: r.state || 'usado_bueno',
  condition: r.state || 'usado_bueno',
  sex: r.sex ?? undefined,
  publisherGender: r.sex ?? undefined,
  available: r.available === 1,
  publishedBy: r.published_by,
  publisherId: r.published_by,
  publisherName: r.publisher_name ?? undefined,
  status: r.status,
  reviewedBy: r.reviewed_by,
  reviewedAt: r.reviewed_at,
  reviewComment: r.review_comment,
  rejectionReason: r.review_comment,
  coverUrl: r.cover_url,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export interface ItemFilters {
  q?: string;
  category?: string | null;
  sex?: Sex | null;
}

export function createItemsRepo(db: SQLiteDatabase) {
  return {
    async upsertMany(items: Item[]): Promise<void> {
      if (items.length === 0) return;
      await db.withTransactionAsync(async () => {
        for (const item of items) {
          const state = (item as any).state || (item as any).condition || 'usado_bueno';
          const publishedBy = (item as any).publishedBy || (item as any).publisherId || '';
          const sex = (item as any).sex || (item as any).publisherGender || null;
          const status = (item as any).status === 'pending_approval' ? 'pending' : ((item as any).status || 'approved');
          const reviewComment = (item as any).reviewComment || (item as any).rejectionReason || null;

          await db.runAsync(
            `INSERT INTO items (id, title, category, description, state, sex, available,
              published_by, publisher_name, status, reviewed_by, reviewed_at, review_comment,
              cover_url, created_at, updated_at, search_text)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
              title = excluded.title, category = excluded.category, description = excluded.description,
              state = excluded.state, sex = excluded.sex, available = excluded.available,
              published_by = excluded.published_by, publisher_name = excluded.publisher_name,
              status = excluded.status, reviewed_by = excluded.reviewed_by, reviewed_at = excluded.reviewed_at,
              review_comment = excluded.review_comment, cover_url = excluded.cover_url,
              created_at = excluded.created_at, updated_at = excluded.updated_at,
              search_text = excluded.search_text`,
            item.id,
            item.title,
            item.category,
            item.description,
            state,
            sex,
            item.available ? 1 : 0,
            publishedBy,
            item.publisherName ?? null,
            status,
            item.reviewedBy ?? null,
            item.reviewedAt ?? null,
            reviewComment,
            item.coverUrl,
            item.createdAt,
            item.updatedAt,
            normalizeSearch(`${item.title} ${item.category} ${item.description}`),
          );
        }
      });
    },

    async list({ q, category, sex }: ItemFilters = {}): Promise<Item[]> {
      const term = q ? normalizeSearch(q) : '';
      const rows = await db.getAllAsync<ItemRow>(
        `SELECT * FROM items
         WHERE (? = '' OR search_text LIKE ? ESCAPE '\\')
           AND (? IS NULL OR category = ?)
           AND (? IS NULL OR sex = ?)
           AND available = 1
           AND status = 'approved'
         ORDER BY updated_at DESC`,
        term,
        `%${escapeLike(term)}%`,
        category ?? null,
        category ?? null,
        sex ?? null,
        sex ?? null,
      );
      return rows.map(toItem);
    },

    async getById(id: string): Promise<Item | null> {
      const row = await db.getFirstAsync<ItemRow>('SELECT * FROM items WHERE id = ?', id);
      return row ? toItem(row) : null;
    },

    async categories(): Promise<string[]> {
      const rows = await db.getAllAsync<{ category: string }>(
        'SELECT DISTINCT category FROM items ORDER BY category COLLATE NOCASE',
      );
      return rows.map((r) => r.category);
    },

    async clear(): Promise<void> {
      await db.runAsync('DELETE FROM items');
    },
  };
}

// ───────────────────────────── Libros (Guía 2) ─────────────────────────────

interface BookRow {
  id: string;
  title: string;
  author: string;
  category: string;
  year: number;
  description: string;
  total_copies: number;
  available_copies: number;
  cover_url: string | null;
  updated_at: string;
}

const toBook = (r: BookRow): Book => ({
  id: r.id,
  title: r.title,
  author: r.author,
  category: r.category,
  year: r.year,
  description: r.description,
  totalCopies: r.total_copies,
  availableCopies: r.available_copies,
  coverUrl: r.cover_url,
  updatedAt: r.updated_at,
});

export interface BookFilters {
  q?: string;
  category?: string | null;
}

export function createBooksRepo(db: SQLiteDatabase) {
  return {
    async upsertMany(books: Book[]): Promise<void> {
      if (books.length === 0) return;
      await db.withTransactionAsync(async () => {
        for (const b of books) {
          await db.runAsync(
            `INSERT INTO books (id, title, author, category, year, description, total_copies,
              available_copies, cover_url, updated_at, search_text)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
              title = excluded.title, author = excluded.author, category = excluded.category,
              year = excluded.year, description = excluded.description,
              total_copies = excluded.total_copies, available_copies = excluded.available_copies,
              cover_url = excluded.cover_url, updated_at = excluded.updated_at,
              search_text = excluded.search_text`,
            b.id,
            b.title,
            b.author,
            b.category,
            b.year,
            b.description,
            b.totalCopies,
            b.availableCopies,
            b.coverUrl,
            b.updatedAt,
            normalizeSearch(`${b.title} ${b.author}`),
          );
        }
      });
    },

    async list({ q, category }: BookFilters = {}): Promise<Book[]> {
      const term = q ? normalizeSearch(q) : '';
      const rows = await db.getAllAsync<BookRow>(
        `SELECT * FROM books
         WHERE (? = '' OR search_text LIKE ? ESCAPE '\\')
           AND (? IS NULL OR category = ?)
         ORDER BY title COLLATE NOCASE`,
        term,
        `%${escapeLike(term)}%`,
        category ?? null,
        category ?? null,
      );
      return rows.map(toBook);
    },

    async getById(id: string): Promise<Book | null> {
      const row = await db.getFirstAsync<BookRow>('SELECT * FROM books WHERE id = ?', id);
      return row ? toBook(row) : null;
    },

    async categories(): Promise<string[]> {
      const rows = await db.getAllAsync<{ category: string }>(
        'SELECT DISTINCT category FROM books ORDER BY category COLLATE NOCASE',
      );
      return rows.map((r) => r.category);
    },

    async clear(): Promise<void> {
      await db.runAsync('DELETE FROM books');
    },
  };
}

// ───────────────────────────── Solicitudes ReUsa ─────────────────────────────

interface RequestRow {
  id: string;
  item_id: string;
  item_title: string;
  publisher_id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  status: RequestStatus;
  client_request_id: string;
  requested_at: string;
  resolved_at: string | null;
  delivered_at: string | null;
  updated_at: string;
  sync_state: SyncState;
  sync_error: string | null;
}

const toRequest = (r: RequestRow): LocalRequest => ({
  id: r.id,
  itemId: r.item_id,
  itemTitle: r.item_title,
  publisherId: r.publisher_id,
  userId: r.user_id,
  applicantId: r.user_id,
  userEmail: r.user_email,
  applicantEmail: r.user_email,
  userName: r.user_name,
  applicantName: r.user_name,
  status: r.status,
  clientRequestId: r.client_request_id,
  requestedAt: r.requested_at,
  resolvedAt: r.resolved_at,
  deliveredAt: r.delivered_at,
  updatedAt: r.updated_at,
  syncState: r.sync_state,
  syncError: r.sync_error,
});

export function createRequestsRepo(db: SQLiteDatabase) {
  async function insert(req: ProductRequest, syncState: SyncState, syncError: string | null) {
    const userId = req.userId || (req as any).applicantId || '';
    const userEmail = req.userEmail || (req as any).applicantEmail || '';
    const userName = req.userName || (req as any).applicantName || '';

    await db.runAsync(
      `INSERT OR REPLACE INTO requests (id, item_id, item_title, publisher_id, user_id, user_email,
        user_name, status, client_request_id, requested_at, resolved_at, delivered_at, updated_at,
        sync_state, sync_error)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      req.id,
      req.itemId,
      req.itemTitle,
      req.publisherId,
      userId,
      userEmail,
      userName,
      req.status,
      req.clientRequestId,
      req.requestedAt,
      req.resolvedAt,
      req.deliveredAt,
      req.updatedAt,
      syncState,
      syncError,
    );
  }

  return {
    async list(userId: string | null): Promise<LocalRequest[]> {
      const rows = userId
        ? await db.getAllAsync<RequestRow>(
            'SELECT * FROM requests WHERE user_id = ? ORDER BY requested_at DESC',
            userId,
          )
        : await db.getAllAsync<RequestRow>('SELECT * FROM requests ORDER BY requested_at DESC');
      return rows.map(toRequest);
    },

    async listForPublisher(publisherId: string): Promise<LocalRequest[]> {
      const rows = await db.getAllAsync<RequestRow>(
        'SELECT * FROM requests WHERE publisher_id = ? ORDER BY requested_at DESC',
        publisherId,
      );
      return rows.map(toRequest);
    },

    async insertPending(req: ProductRequest): Promise<void> {
      await insert(req, 'pending', null);
    },

    async upsertFromServer(req: ProductRequest): Promise<void> {
      await db.withTransactionAsync(async () => {
        await db.runAsync(
          'DELETE FROM requests WHERE client_request_id = ? AND id <> ?',
          req.clientRequestId,
          req.id,
        );
        await insert(req, 'synced', null);
      });
    },

    async upsertManyFromServer(reqs: ProductRequest[]): Promise<void> {
      if (reqs.length === 0) return;
      await db.withTransactionAsync(async () => {
        for (const req of reqs) {
          await db.runAsync(
            'DELETE FROM requests WHERE client_request_id = ? AND id <> ?',
            req.clientRequestId,
            req.id,
          );
          await insert(req, 'synced', null);
        }
      });
    },

    async markConflict(clientRequestId: string, message: string): Promise<void> {
      await db.runAsync(
        `UPDATE requests SET sync_state = 'conflict', sync_error = ? WHERE client_request_id = ?`,
        message,
        clientRequestId,
      );
    },

    async remove(id: string): Promise<void> {
      await db.runAsync('DELETE FROM requests WHERE id = ?', id);
    },

    async hasActiveForItem(userId: string, itemId: string): Promise<boolean> {
      const row = await db.getFirstAsync<{ n: number }>(
        `SELECT COUNT(*) AS n FROM requests
         WHERE user_id = ? AND item_id = ? AND status IN ('requested','approved') AND sync_state <> 'conflict'`,
        userId,
        itemId,
      );
      return (row?.n ?? 0) > 0;
    },

    async latestForItem(userId: string, itemId: string): Promise<LocalRequest | null> {
      const row = await db.getFirstAsync<RequestRow>(
        'SELECT * FROM requests WHERE user_id = ? AND item_id = ? ORDER BY requested_at DESC LIMIT 1',
        userId,
        itemId,
      );
      return row ? toRequest(row) : null;
    },

    async clear(): Promise<void> {
      await db.runAsync('DELETE FROM requests');
    },
  };
}

// ───────────────────────────── Préstamos (Guía 2) ─────────────────────────────

interface LoanRow {
  id: string;
  book_id: string;
  book_title: string;
  user_id: string;
  user_email: string;
  user_name: string;
  status: LoanStatus;
  client_request_id: string;
  requested_at: string;
  resolved_at: string | null;
  due_date: string | null;
  returned_at: string | null;
  updated_at: string;
  sync_state: SyncState;
  sync_error: string | null;
}

const toLoan = (r: LoanRow): LocalLoan => ({
  id: r.id,
  bookId: r.book_id,
  bookTitle: r.book_title,
  userId: r.user_id,
  userEmail: r.user_email,
  userName: r.user_name,
  status: r.status,
  clientRequestId: r.client_request_id,
  requestedAt: r.requested_at,
  resolvedAt: r.resolved_at,
  dueDate: r.due_date,
  returnedAt: r.returned_at,
  updatedAt: r.updated_at,
  syncState: r.sync_state,
  syncError: r.sync_error,
});

export function createLoansRepo(db: SQLiteDatabase) {
  async function insert(loan: Loan, syncState: SyncState, syncError: string | null) {
    await db.runAsync(
      `INSERT OR REPLACE INTO loans (id, book_id, book_title, user_id, user_email, user_name, status,
        client_request_id, requested_at, resolved_at, due_date, returned_at, updated_at, sync_state, sync_error)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      loan.id,
      loan.bookId,
      loan.bookTitle,
      loan.userId,
      loan.userEmail,
      loan.userName,
      loan.status,
      loan.clientRequestId,
      loan.requestedAt,
      loan.resolvedAt,
      loan.dueDate,
      loan.returnedAt,
      loan.updatedAt,
      syncState,
      syncError,
    );
  }

  return {
    async list(userId: string | null): Promise<LocalLoan[]> {
      const rows = userId
        ? await db.getAllAsync<LoanRow>(
            'SELECT * FROM loans WHERE user_id = ? ORDER BY requested_at DESC',
            userId,
          )
        : await db.getAllAsync<LoanRow>('SELECT * FROM loans ORDER BY requested_at DESC');
      return rows.map(toLoan);
    },

    async insertPending(loan: Loan): Promise<void> {
      await insert(loan, 'pending', null);
    },

    async upsertFromServer(loan: Loan): Promise<void> {
      await db.withTransactionAsync(async () => {
        await db.runAsync(
          'DELETE FROM loans WHERE client_request_id = ? AND id <> ?',
          loan.clientRequestId,
          loan.id,
        );
        await insert(loan, 'synced', null);
      });
    },

    async upsertManyFromServer(loans: Loan[]): Promise<void> {
      if (loans.length === 0) return;
      await db.withTransactionAsync(async () => {
        for (const loan of loans) {
          await db.runAsync(
            'DELETE FROM loans WHERE client_request_id = ? AND id <> ?',
            loan.clientRequestId,
            loan.id,
          );
          await insert(loan, 'synced', null);
        }
      });
    },

    async markConflict(clientRequestId: string, message: string): Promise<void> {
      await db.runAsync(
        `UPDATE loans SET sync_state = 'conflict', sync_error = ? WHERE client_request_id = ?`,
        message,
        clientRequestId,
      );
    },

    async remove(id: string): Promise<void> {
      await db.runAsync('DELETE FROM loans WHERE id = ?', id);
    },

    async hasActiveForBook(userId: string, bookId: string): Promise<boolean> {
      const row = await db.getFirstAsync<{ n: number }>(
        `SELECT COUNT(*) AS n FROM loans
         WHERE user_id = ? AND book_id = ? AND status IN ('requested','approved') AND sync_state <> 'conflict'`,
        userId,
        bookId,
      );
      return (row?.n ?? 0) > 0;
    },

    async latestForBook(userId: string, bookId: string): Promise<LocalLoan | null> {
      const row = await db.getFirstAsync<LoanRow>(
        'SELECT * FROM loans WHERE user_id = ? AND book_id = ? ORDER BY requested_at DESC LIMIT 1',
        userId,
        bookId,
      );
      return row ? toLoan(row) : null;
    },

    async clear(): Promise<void> {
      await db.runAsync('DELETE FROM loans');
    },
  };
}

// ───────────────────────────── Cola Outbox (FIFO) ─────────────────────────────

export interface OutboxItem {
  id: number;
  kind: 'request_loan' | 'request_item' | 'publish_item';
  payload: {
    bookId?: string;
    itemId?: string;
    clientRequestId: string;
    [key: string]: unknown;
  };
  attempts: number;
  lastError: string | null;
  createdAt: string;
}

interface OutboxRow {
  id: number;
  kind: string;
  payload: string;
  attempts: number;
  last_error: string | null;
  created_at: string;
}

export function createOutboxRepo(db: SQLiteDatabase) {
  return {
    async enqueue(kind: OutboxItem['kind'], payload: OutboxItem['payload']): Promise<void> {
      await db.runAsync(
        'INSERT INTO outbox (kind, payload, created_at) VALUES (?, ?, ?)',
        kind,
        JSON.stringify(payload),
        new Date().toISOString(),
      );
    },

    async pending(): Promise<OutboxItem[]> {
      const rows = await db.getAllAsync<OutboxRow>('SELECT * FROM outbox ORDER BY id ASC');
      return rows.map((r) => ({
        id: r.id,
        kind: r.kind as OutboxItem['kind'],
        payload: JSON.parse(r.payload) as OutboxItem['payload'],
        attempts: r.attempts,
        lastError: r.last_error,
        createdAt: r.created_at,
      }));
    },

    async count(): Promise<number> {
      const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM outbox');
      return row?.n ?? 0;
    },

    async remove(id: number): Promise<void> {
      await db.runAsync('DELETE FROM outbox WHERE id = ?', id);
    },

    async recordFailure(id: number, message: string): Promise<void> {
      await db.runAsync(
        'UPDATE outbox SET attempts = attempts + 1, last_error = ? WHERE id = ?',
        message,
        id,
      );
    },

    async clear(): Promise<void> {
      await db.runAsync('DELETE FROM outbox');
    },
  };
}

// ───────────────────────────── Metadatos y Bitácora ─────────────────────────────

export function createMetaRepo(db: SQLiteDatabase) {
  return {
    async get(key: string): Promise<string | null> {
      const row = await db.getFirstAsync<{ value: string }>(
        'SELECT value FROM sync_meta WHERE key = ?',
        key,
      );
      return row?.value ?? null;
    },

    async set(key: string, value: string): Promise<void> {
      await db.runAsync(
        'INSERT INTO sync_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        key,
        value,
      );
    },

    async clear(): Promise<void> {
      await db.runAsync('DELETE FROM sync_meta');
    },
  };
}

export interface ActivityEntry {
  id: number;
  kind: string;
  detail: string;
  createdAt: string;
}

export function createActivityRepo(db: SQLiteDatabase) {
  return {
    async log(kind: string, detail: string): Promise<void> {
      await db.runAsync(
        'INSERT INTO activity_log (kind, detail, created_at) VALUES (?, ?, ?)',
        kind,
        detail,
        new Date().toISOString(),
      );
      await db.runAsync(
        'DELETE FROM activity_log WHERE id NOT IN (SELECT id FROM activity_log ORDER BY id DESC LIMIT 200)',
      );
    },

    async recent(limit = 20): Promise<ActivityEntry[]> {
      const rows = await db.getAllAsync<{
        id: number;
        kind: string;
        detail: string;
        created_at: string;
      }>('SELECT * FROM activity_log ORDER BY id DESC LIMIT ?', limit);
      return rows.map((r) => ({
        id: r.id,
        kind: r.kind,
        detail: r.detail,
        createdAt: r.created_at,
      }));
    },
  };
}

export function createRepositories(db: SQLiteDatabase) {
  return {
    items: createItemsRepo(db),
    books: createBooksRepo(db),
    requests: createRequestsRepo(db),
    loans: createLoansRepo(db),
    outbox: createOutboxRepo(db),
    meta: createMetaRepo(db),
    activity: createActivityRepo(db),
  };
}

export type Repositories = ReturnType<typeof createRepositories>;
