import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

export type AppDatabase = DatabaseSync

function migrate(database: AppDatabase) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price REAL NOT NULL CHECK(price >= 0),
      cost REAL,
      material TEXT NOT NULL DEFAULT '',
      size TEXT NOT NULL DEFAULT '',
      color TEXT NOT NULL DEFAULT '',
      audience TEXT NOT NULL DEFAULT '',
      scene TEXT NOT NULL DEFAULT '',
      selling_points TEXT NOT NULL DEFAULT '',
      forbidden_terms TEXT NOT NULL DEFAULT '',
      supplier TEXT NOT NULL DEFAULT '',
      supplier_url TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS product_assets (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      stored_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
  `)
  database.exec('PRAGMA foreign_keys = ON;')
}

export function createDatabase(path: string) {
  mkdirSync(dirname(path), { recursive: true })
  const database = new DatabaseSync(path)
  migrate(database)
  return database
}

export function createTestDatabase() {
  const database = new DatabaseSync(':memory:')
  migrate(database)
  return database
}
