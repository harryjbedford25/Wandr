import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getDb, save, queryAll, queryOne, randomUUID } from "@/lib/db";
import type { Pin, PinReview } from "./place-types";

function mapReview(r: any): PinReview {
  return {
    id: r.id,
    rating: Number(r.rating),
    priceTier: Number(r.price_tier),
    body: r.body,
    isAnonymous: Boolean(r.is_anonymous),
    displayName: r.display_name ?? null,
    createdAt: r.created_at,
  };
}

function buildPin(row: any, reviews: PinReview[]): Pin {
  const avgRating =
    reviews.length > 0
      ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
      : null;
  const avgPriceTier =
    reviews.length > 0
      ? Math.round((reviews.reduce((s, r) => s + r.priceTier, 0) / reviews.length) * 100) / 100
      : null;
  return {
    id: row.id,
    lat: Number(row.lat),
    lng: Number(row.lng),
    title: row.title,
    placeType: row.place_type,
    photoUrl: row.photo_url ?? null,
    createdAt: row.created_at,
    reviews,
    avgRating,
    avgPriceTier,
  };
}

export const listPins = createServerFn({ method: "GET" }).handler(async (): Promise<Pin[]> => {
  const db = await getDb();
  const pins = queryAll(db, "SELECT * FROM pins ORDER BY created_at DESC");
  if (pins.length === 0) return [];
  const ids = pins.map((p: any) => p.id);
  const placeholders = ids.map(() => "?").join(",");
  const reviews = queryAll(db, `SELECT * FROM reviews WHERE pin_id IN (${placeholders}) ORDER BY created_at DESC`, ids);
  const byPin = new Map<string, PinReview[]>();
  for (const r of reviews) {
    const list = byPin.get(r.pin_id) ?? [];
    list.push(mapReview(r));
    byPin.set(r.pin_id, list);
  }
  return pins.map((p: any) => buildPin(p, byPin.get(p.id) ?? []));
});

export const getPin = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }): Promise<Pin | null> => {
    const db = await getDb();
    const pin = queryOne(db, "SELECT * FROM pins WHERE id = ?", [data.id]);
    if (!pin) return null;
    const reviews = queryAll(db, "SELECT * FROM reviews WHERE pin_id = ? ORDER BY created_at DESC", [data.id]);
    return buildPin(pin, reviews.map(mapReview));
  });

const CreatePin = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  title: z.string().min(1).max(120),
  placeType: z.enum(["food", "nightlife", "sightseeing", "transport", "hidden", "stays", "spot"]),
  photoUrl: z.string().url().max(500).nullable().optional(),
});

export const createPin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => CreatePin.parse(d))
  .handler(async ({ data }): Promise<Pin> => {
    const db = await getDb();
    const id = randomUUID();
    const now = new Date().toISOString();
    db.run(
      "INSERT INTO pins (id, lat, lng, title, place_type, photo_url, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [id, data.lat, data.lng, data.title, data.placeType, data.photoUrl ?? null, now]
    );
    save(db);
    const row = queryOne(db, "SELECT * FROM pins WHERE id = ?", [id]);
    return buildPin(row, []);
  });

const AddReview = z.object({
  pinId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  priceTier: z.number().int().min(1).max(3),
  body: z.string().min(1).max(2000),
  isAnonymous: z.boolean().default(true),
  displayName: z.string().min(1).max(60).nullable().optional(),
});

export const addReview = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => AddReview.parse(d))
  .handler(async ({ data }): Promise<PinReview> => {
    const db = await getDb();
    const id = randomUUID();
    const now = new Date().toISOString();
    db.run(
      "INSERT INTO reviews (id, pin_id, rating, price_tier, body, is_anonymous, display_name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [id, data.pinId, data.rating, data.priceTier, data.body, data.isAnonymous ? 1 : 0, data.isAnonymous ? null : (data.displayName ?? null), now]
    );
    save(db);
    const row = queryOne(db, "SELECT * FROM reviews WHERE id = ?", [id]);
    return mapReview(row);
  });
