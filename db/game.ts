import { env } from "cloudflare:workers";

let ready: Promise<void> | null = null;

export function getD1() {
  if (!env.DB) {
    throw new Error("The game database is unavailable.");
  }
  return env.DB;
}

export async function ensureGameData() {
  if (!ready) {
    ready = initialize().catch((error) => {
      ready = null;
      throw error;
    });
  }
  return ready;
}

async function initialize() {
  const db = getD1();
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS wheel_prizes (
      id INTEGER PRIMARY KEY NOT NULL,
      prize_type TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      claimed_by TEXT,
      claimed_at TEXT,
      revealed_at TEXT
    )`),
    db.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_wheel_prizes_claimed_by
      ON wheel_prizes (claimed_by)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS riddle_prizes (
      id INTEGER PRIMARY KEY NOT NULL,
      code TEXT NOT NULL UNIQUE,
      claimed_by TEXT,
      claimed_at TEXT
    )`),
  ]);

  await db.batch([
    db.prepare(`INSERT OR IGNORE INTO wheel_prizes (id, prize_type, code) VALUES
      (0, 'catalogue_20', '41193A118'),
      (1, 'neural', '295911540'),
      (2, 'catalogue_20', '509D5DBE7'),
      (3, 'neural', 'C7E15145C'),
      (4, 'catalogue_35', 'A40282751'),
      (5, 'catalogue_20', '81F36CAC6'),
      (6, 'neural', '39C819EA0'),
      (7, 'catalogue_20', '97B3C2590'),
      (8, 'neural', '6301BF77C'),
      (9, 'catalogue_20', '193ED33E1')`),
    db.prepare(`INSERT OR IGNORE INTO riddle_prizes (id, code) VALUES
      (1, 'BFDD8DB14'),
      (2, '891A7931D')`),
    db.prepare("PRAGMA optimize"),
  ]);
}
