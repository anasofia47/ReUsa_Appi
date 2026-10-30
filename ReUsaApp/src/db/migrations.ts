import type { SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';

export const DATABASE_VERSION = 2;

export async function migrateDbIfNeeded(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;
  if (version >= DATABASE_VERSION) return;

  if (Platform.OS !== 'web') {
    try {
      await db.execAsync('PRAGMA journal_mode = WAL;');
    } catch {
      // Ignorar si el motor subyacente no soporta WAL
    }
  }
  await db.execAsync('PRAGMA foreign_keys = ON;');

  if (version < 1) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(`
        -- Catálogo de Objetos donados ReUsa
        CREATE TABLE items (
          id TEXT PRIMARY KEY NOT NULL,
          title TEXT NOT NULL,
          category TEXT NOT NULL,
          description TEXT NOT NULL,
          state TEXT NOT NULL,
          sex TEXT,
          available INTEGER NOT NULL,
          published_by TEXT NOT NULL,
          publisher_name TEXT,
          status TEXT NOT NULL,
          reviewed_by TEXT,
          reviewed_at TEXT,
          review_comment TEXT,
          cover_url TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          search_text TEXT NOT NULL
        );

        -- Tabla books para compatibilidad total con la Guía 2
        CREATE TABLE books (
          id TEXT PRIMARY KEY NOT NULL,
          title TEXT NOT NULL,
          author TEXT NOT NULL,
          category TEXT NOT NULL,
          year INTEGER NOT NULL,
          description TEXT NOT NULL,
          total_copies INTEGER NOT NULL,
          available_copies INTEGER NOT NULL,
          cover_url TEXT,
          updated_at TEXT NOT NULL,
          search_text TEXT NOT NULL
        );

        -- Solicitudes de Producto ReUsa
        CREATE TABLE requests (
          id TEXT PRIMARY KEY NOT NULL,
          item_id TEXT NOT NULL,
          item_title TEXT NOT NULL,
          publisher_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          user_email TEXT NOT NULL,
          user_name TEXT NOT NULL,
          status TEXT NOT NULL CHECK (status IN ('requested','approved','rejected','delivered')),
          client_request_id TEXT NOT NULL UNIQUE,
          requested_at TEXT NOT NULL,
          resolved_at TEXT,
          delivered_at TEXT,
          updated_at TEXT NOT NULL,
          sync_state TEXT NOT NULL DEFAULT 'synced' CHECK (sync_state IN ('synced','pending','conflict')),
          sync_error TEXT
        );

        -- Tabla loans para compatibilidad con pruebas de la Guía 2
        CREATE TABLE loans (
          id TEXT PRIMARY KEY NOT NULL,
          book_id TEXT NOT NULL,
          book_title TEXT NOT NULL,
          user_id TEXT NOT NULL,
          user_email TEXT NOT NULL,
          user_name TEXT NOT NULL,
          status TEXT NOT NULL CHECK (status IN ('requested','approved','rejected','returned')),
          client_request_id TEXT NOT NULL UNIQUE,
          requested_at TEXT NOT NULL,
          resolved_at TEXT,
          due_date TEXT,
          returned_at TEXT,
          updated_at TEXT NOT NULL,
          sync_state TEXT NOT NULL DEFAULT 'synced' CHECK (sync_state IN ('synced','pending','conflict')),
          sync_error TEXT
        );

        -- Cola outbox para operaciones offline (FIFO)
        CREATE TABLE outbox (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          kind TEXT NOT NULL,
          payload TEXT NOT NULL,
          attempts INTEGER NOT NULL DEFAULT 0,
          last_error TEXT,
          created_at TEXT NOT NULL
        );

        -- Metadatos de sincronización
        CREATE TABLE sync_meta (
          key TEXT PRIMARY KEY NOT NULL,
          value TEXT NOT NULL
        );
      `);
    });
    version = 1;
  }

  if (version < 2) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS items (
          id TEXT PRIMARY KEY NOT NULL,
          title TEXT NOT NULL,
          category TEXT NOT NULL,
          description TEXT NOT NULL,
          state TEXT NOT NULL,
          sex TEXT,
          available INTEGER NOT NULL,
          published_by TEXT NOT NULL,
          publisher_name TEXT,
          status TEXT NOT NULL,
          reviewed_by TEXT,
          reviewed_at TEXT,
          review_comment TEXT,
          cover_url TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          search_text TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS requests (
          id TEXT PRIMARY KEY NOT NULL,
          item_id TEXT NOT NULL,
          item_title TEXT NOT NULL,
          publisher_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          user_email TEXT NOT NULL,
          user_name TEXT NOT NULL,
          status TEXT NOT NULL CHECK (status IN ('requested','approved','rejected','delivered')),
          client_request_id TEXT NOT NULL UNIQUE,
          requested_at TEXT NOT NULL,
          resolved_at TEXT,
          delivered_at TEXT,
          updated_at TEXT NOT NULL,
          sync_state TEXT NOT NULL DEFAULT 'synced' CHECK (sync_state IN ('synced','pending','conflict')),
          sync_error TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_items_category ON items (category);
        CREATE INDEX IF NOT EXISTS idx_items_publisher ON items (published_by);
        CREATE INDEX IF NOT EXISTS idx_books_category ON books (category);
        CREATE INDEX IF NOT EXISTS idx_loans_user ON loans (user_id, requested_at DESC);
        CREATE INDEX IF NOT EXISTS idx_loans_book ON loans (book_id);
        CREATE INDEX IF NOT EXISTS idx_requests_user ON requests (user_id, requested_at DESC);
        CREATE INDEX IF NOT EXISTS idx_requests_publisher ON requests (publisher_id, requested_at DESC);
        CREATE INDEX IF NOT EXISTS idx_requests_item ON requests (item_id);

        CREATE TABLE IF NOT EXISTS activity_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          kind TEXT NOT NULL,
          detail TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
      `);
    });
    version = 2;
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}
