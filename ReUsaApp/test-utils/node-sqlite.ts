import { DatabaseSync } from 'node:sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';

type Param = string | number | null;

function args(params: unknown[]): Param[] {
  return (params.length === 1 && Array.isArray(params[0]) ? params[0] : params) as Param[];
}

export function createTestDb(): SQLiteDatabase {
  const db = new DatabaseSync(':memory:');
  let depth = 0;

  const adapter = {
    async execAsync(sql: string) {
      db.exec(sql);
    },
    async runAsync(sql: string, ...params: unknown[]) {
      const r = db.prepare(sql).run(...args(params));
      return { lastInsertRowId: Number(r.lastInsertRowid), changes: Number(r.changes) };
    },
    async getAllAsync(sql: string, ...params: unknown[]) {
      return db.prepare(sql).all(...args(params));
    },
    async getFirstAsync(sql: string, ...params: unknown[]) {
      return db.prepare(sql).get(...args(params)) ?? null;
    },
    async withTransactionAsync(task: () => Promise<void>) {
      if (depth > 0) return task();
      depth++;
      db.exec('BEGIN');
      try {
        await task();
        db.exec('COMMIT');
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      } finally {
        depth--;
      }
    },
  };
  return adapter as unknown as SQLiteDatabase;
}
