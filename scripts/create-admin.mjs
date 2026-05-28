#!/usr/bin/env node
// Run with: node scripts/create-admin.mjs
// Creates an admin user in the local SQLite database.

import { createRequire } from "module";
import { randomBytes, scryptSync } from "crypto";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs";
import { createInterface } from "readline";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");
const DB_PATH = path.join(DATA_DIR, "wandr.db");

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, res));

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

async function main() {
  // Lazy-load sql.js
  const { default: initSqlJs } = await import("sql.js");

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  const SQL = await initSqlJs();
  let db;
  if (fs.existsSync(DB_PATH)) {
    db = new SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    db = new SQL.Database();
  }

  // Ensure table exists
  db.run(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const email = (await ask("Admin email: ")).trim().toLowerCase();
  const password = await ask("Password (min 8 chars): ");

  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }

  const id = randomUUID();
  const hash = hashPassword(password);

  try {
    db.run("INSERT INTO admin_users (id, email, password_hash) VALUES (?, ?, ?)", [id, email, hash]);
  } catch (e) {
    if (e.message?.includes("UNIQUE")) {
      console.error("An admin with that email already exists.");
      process.exit(1);
    }
    throw e;
  }

  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
  console.log(`\nAdmin created: ${email}`);
  rl.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
