// Historique des questions et diagnostics, dans SQLite (module node:sqlite intégré à Node 22).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const DEFAULT_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "data", "agri.db");

export function openDb(file = process.env.DB_PATH || DEFAULT_PATH) {
  if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(`
    CREATE TABLE IF NOT EXISTS history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id TEXT NOT NULL,
      kind TEXT NOT NULL CHECK (kind IN ('question', 'diagnostic')),
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS history_client ON history (client_id, id DESC);
  `);

  const insert = db.prepare("INSERT INTO history (client_id, kind, title, content) VALUES (?, ?, ?, ?)");
  const page = db.prepare(
    "SELECT id, kind, title, content, created_at FROM history WHERE client_id = ? ORDER BY id DESC LIMIT ? OFFSET ?",
  );
  const count = db.prepare("SELECT COUNT(*) AS n FROM history WHERE client_id = ?");
  const clear = db.prepare("DELETE FROM history WHERE client_id = ?");

  return {
    add(clientId, kind, title, content) {
      return Number(insert.run(clientId, kind, title.slice(0, 300), content.slice(0, 20_000)).lastInsertRowid);
    },
    list(clientId, { page: p = 1, limit = 10 } = {}) {
      const items = page.all(clientId, limit, (p - 1) * limit);
      const { n } = count.get(clientId);
      return { items, total: n, page: p, pages: Math.max(1, Math.ceil(n / limit)) };
    },
    clear(clientId) {
      clear.run(clientId);
    },
    close() {
      db.close();
    },
  };
}
