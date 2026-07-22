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
    CREATE TABLE IF NOT EXISTS creation_records (
      id TEXT PRIMARY KEY,
      product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
      product_name TEXT NOT NULL,
      platform TEXT NOT NULL,
      title TEXT NOT NULL,
      selling_points TEXT NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS ai_settings (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      mode TEXT NOT NULL CHECK(mode IN ('mock','real')),
      base_url TEXT NOT NULL,
      model TEXT NOT NULL,
      encrypted_api_key TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS publishing_tasks (
      id TEXT PRIMARY KEY,
      product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
      creation_record_id TEXT REFERENCES creation_records(id) ON DELETE SET NULL,
      product_name TEXT NOT NULL,
      platform TEXT NOT NULL CHECK(platform IN ('小红书','抖音')),
      title TEXT NOT NULL,
      planned_at TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL CHECK(status IN ('editing','review','ready','published')),
      published_url TEXT NOT NULL DEFAULT '',
      actual_published_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `)
  const creationColumns = new Set((database.prepare('PRAGMA table_info(creation_records)').all() as Array<{ name: string }>).map(column => column.name))
  if (!creationColumns.has('source')) database.exec("ALTER TABLE creation_records ADD COLUMN source TEXT NOT NULL DEFAULT 'manual'")
  if (!creationColumns.has('version_number')) database.exec('ALTER TABLE creation_records ADD COLUMN version_number INTEGER NOT NULL DEFAULT 1')
  if (!creationColumns.has('publish_status')) database.exec("ALTER TABLE creation_records ADD COLUMN publish_status TEXT NOT NULL DEFAULT 'draft'")
  if (!creationColumns.has('published_url')) database.exec("ALTER TABLE creation_records ADD COLUMN published_url TEXT NOT NULL DEFAULT ''")
  database.exec('CREATE INDEX IF NOT EXISTS creation_records_history_idx ON creation_records(product_name, platform, version_number DESC)')
  database.exec('CREATE INDEX IF NOT EXISTS publishing_tasks_board_idx ON publishing_tasks(status, planned_at)')
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
