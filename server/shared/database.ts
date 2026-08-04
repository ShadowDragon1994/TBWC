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
    CREATE TABLE IF NOT EXISTS performance_records (
      id TEXT PRIMARY KEY, publishing_task_id TEXT REFERENCES publishing_tasks(id) ON DELETE SET NULL,
      product_name TEXT NOT NULL, platform TEXT NOT NULL CHECK(platform IN ('小红书','抖音')), title TEXT NOT NULL,
      recorded_on TEXT NOT NULL, impressions INTEGER NOT NULL, views INTEGER NOT NULL, likes INTEGER NOT NULL,
      favorites INTEGER NOT NULL, comments INTEGER NOT NULL, shares INTEGER NOT NULL, leads INTEGER NOT NULL,
      orders INTEGER NOT NULL, revenue REAL NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS creative_tasks (
      id TEXT PRIMARY KEY,
      product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
      product_name TEXT NOT NULL,
      platform TEXT NOT NULL CHECK(platform IN ('小红书','抖音')),
      title TEXT NOT NULL DEFAULT '',
      selling_points TEXT NOT NULL DEFAULT '[]',
      body TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL CHECK(status IN ('draft','editing','checking','confirming','exporting','completed','failed')),
      failure_reason TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS ai_usage_records (
      id TEXT PRIMARY KEY,
      operation TEXT NOT NULL,
      platform TEXT NOT NULL CHECK(platform IN ('小红书','抖音')),
      model TEXT NOT NULL,
      input_tokens INTEGER,
      output_tokens INTEGER,
      latency_ms INTEGER NOT NULL,
      estimated_cost REAL,
      success INTEGER NOT NULL CHECK(success IN (0,1)),
      error_message TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS automation_executions (
      id TEXT PRIMARY KEY, adapter_id TEXT NOT NULL, capability TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('running','succeeded','failed')),
      external_id TEXT NOT NULL DEFAULT '', external_url TEXT NOT NULL DEFAULT '',
      output TEXT NOT NULL DEFAULT '{}', error_message TEXT NOT NULL DEFAULT '',
      started_at TEXT NOT NULL, finished_at TEXT
    );
    CREATE TABLE IF NOT EXISTS automation_control (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      emergency_stopped INTEGER NOT NULL DEFAULT 0 CHECK(emergency_stopped IN (0,1))
    );
    INSERT OR IGNORE INTO automation_control(id, emergency_stopped) VALUES(1, 0);
    CREATE TABLE IF NOT EXISTS opportunity_keywords (
      position INTEGER PRIMARY KEY,
      keyword TEXT NOT NULL UNIQUE
    );
  `)
  const keywordCount = database.prepare('SELECT COUNT(*) AS count FROM opportunity_keywords').get() as { count: number }
  if (keywordCount.count === 0) {
    const insertKeyword = database.prepare('INSERT INTO opportunity_keywords(position, keyword) VALUES(?, ?)')
    const defaultKeywords = ['非遗漆扇礼盒', '毕业季手写信礼物', '东方香囊随身挂件', '普通陶瓷马克杯', '教师节定制书签']
    defaultKeywords.forEach((keyword, position) => insertKeyword.run(position, keyword))
  }
  const creationColumns = new Set((database.prepare('PRAGMA table_info(creation_records)').all() as Array<{ name: string }>).map(column => column.name))
  if (!creationColumns.has('source')) database.exec("ALTER TABLE creation_records ADD COLUMN source TEXT NOT NULL DEFAULT 'manual'")
  if (!creationColumns.has('version_number')) database.exec('ALTER TABLE creation_records ADD COLUMN version_number INTEGER NOT NULL DEFAULT 1')
  if (!creationColumns.has('publish_status')) database.exec("ALTER TABLE creation_records ADD COLUMN publish_status TEXT NOT NULL DEFAULT 'draft'")
  if (!creationColumns.has('published_url')) database.exec("ALTER TABLE creation_records ADD COLUMN published_url TEXT NOT NULL DEFAULT ''")
  const aiSettingsColumns = new Set((database.prepare('PRAGMA table_info(ai_settings)').all() as Array<{ name: string }>).map(column => column.name))
  if (!aiSettingsColumns.has('input_price_per_million')) database.exec('ALTER TABLE ai_settings ADD COLUMN input_price_per_million REAL NOT NULL DEFAULT 0')
  if (!aiSettingsColumns.has('output_price_per_million')) database.exec('ALTER TABLE ai_settings ADD COLUMN output_price_per_million REAL NOT NULL DEFAULT 0')
  if (!aiSettingsColumns.has('monthly_budget')) database.exec('ALTER TABLE ai_settings ADD COLUMN monthly_budget REAL NOT NULL DEFAULT 0')
  database.exec('CREATE INDEX IF NOT EXISTS creation_records_history_idx ON creation_records(product_name, platform, version_number DESC)')
  database.exec('CREATE INDEX IF NOT EXISTS publishing_tasks_board_idx ON publishing_tasks(status, planned_at)')
  database.exec('CREATE INDEX IF NOT EXISTS performance_records_report_idx ON performance_records(platform, recorded_on DESC)')
  database.exec('CREATE INDEX IF NOT EXISTS creative_tasks_status_idx ON creative_tasks(status, updated_at DESC)')
  database.exec('CREATE INDEX IF NOT EXISTS ai_usage_created_idx ON ai_usage_records(created_at DESC)')
  database.exec('CREATE INDEX IF NOT EXISTS automation_executions_started_idx ON automation_executions(started_at DESC)')
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
