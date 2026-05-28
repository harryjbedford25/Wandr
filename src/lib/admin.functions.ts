import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getDb, save, queryAll, queryOne, randomUUID } from "@/lib/db";
import { getWebRequest } from "@tanstack/react-start/server";
import { scryptSync, randomBytes, timingSafeEqual } from "crypto";

// ─── Password hashing (no bcrypt, no native deps) ────────────────────────────

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  const hashBuf = Buffer.from(hash, "hex");
  const derived = scryptSync(password, salt, 64);
  return timingSafeEqual(hashBuf, derived);
}

// ─── Session helpers ──────────────────────────────────────────────────────────

const SESSION_COOKIE = "wandr_admin_session";
const SESSION_DAYS = 7;

function getSessionToken(): string | null {
  try {
    const req = getWebRequest();
    const cookie = req.headers.get("cookie") ?? "";
    for (const part of cookie.split(";")) {
      const [k, v] = part.trim().split("=");
      if (k === SESSION_COOKIE) return decodeURIComponent(v ?? "");
    }
  } catch {}
  return null;
}

// ─── Server functions ─────────────────────────────────────────────────────────

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ email: z.string().email(), password: z.string().min(1) }).parse(d)
  )
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string; token?: string }> => {
    const db = await getDb();
    const user = queryOne(db, "SELECT * FROM admin_users WHERE email = ?", [data.email.toLowerCase()]);
    if (!user) return { ok: false, error: "Invalid email or password" };
    if (!verifyPassword(data.password, user.password_hash))
      return { ok: false, error: "Invalid email or password" };

    const token = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + SESSION_DAYS * 86400 * 1000).toISOString();
    db.run("INSERT INTO admin_sessions (token, admin_id, expires_at) VALUES (?, ?, ?)", [
      token, user.id, expires,
    ]);
    save(db);
    return { ok: true, token };
  });

export const adminLogout = createServerFn({ method: "POST" }).handler(async (): Promise<void> => {
  const token = getSessionToken();
  if (!token) return;
  const db = await getDb();
  db.run("DELETE FROM admin_sessions WHERE token = ?", [token]);
  save(db);
});

export const getAdminSession = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ authenticated: boolean; email?: string }> => {
    const token = getSessionToken();
    if (!token) return { authenticated: false };
    const db = await getDb();
    const session = queryOne(
      db,
      `SELECT s.*, u.email FROM admin_sessions s
       JOIN admin_users u ON u.id = s.admin_id
       WHERE s.token = ? AND s.expires_at > datetime('now')`,
      [token]
    );
    if (!session) return { authenticated: false };
    return { authenticated: true, email: session.email };
  }
);

export const adminCreateUser = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ email: z.string().email(), password: z.string().min(8) }).parse(d)
  )
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const db = await getDb();
    const existing = queryOne(db, "SELECT id FROM admin_users WHERE email = ?", [data.email.toLowerCase()]);
    if (existing) return { ok: false, error: "Email already registered" };
    const id = randomUUID();
    const hash = hashPassword(data.password);
    db.run("INSERT INTO admin_users (id, email, password_hash) VALUES (?, ?, ?)", [
      id, data.email.toLowerCase(), hash,
    ]);
    save(db);
    return { ok: true };
  });

// ─── Moderation ───────────────────────────────────────────────────────────────

async function requireAdmin(): Promise<void> {
  const token = getSessionToken();
  if (!token) throw new Error("Unauthorised");
  const db = await getDb();
  const session = queryOne(
    db,
    "SELECT id FROM admin_sessions WHERE token = ? AND expires_at > datetime('now')",
    [token]
  );
  if (!session) throw new Error("Unauthorised");
}

export const adminListAll = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const db = await getDb();
  const pins = queryAll(db, "SELECT * FROM pins ORDER BY created_at DESC");
  const reviews = queryAll(db, "SELECT * FROM reviews ORDER BY created_at DESC");
  return { pins, reviews };
});

export const adminDeletePin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }): Promise<void> => {
    await requireAdmin();
    const db = await getDb();
    db.run("DELETE FROM pins WHERE id = ?", [data.id]);
    save(db);
  });

export const adminDeleteReview = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }): Promise<void> => {
    await requireAdmin();
    const db = await getDb();
    db.run("DELETE FROM reviews WHERE id = ?", [data.id]);
    save(db);
  });
