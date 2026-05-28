export const PLACE_TYPES = {
  food:        { label: "Food & Drink",  plural: "Food & Drink",  color: "#f97316", mapColor: "#f97316" }, // orange
  nightlife:   { label: "Nightlife",     plural: "Nightlife",     color: "#a855f7", mapColor: "#a855f7" }, // purple
  sightseeing: { label: "Sightseeing",   plural: "Sightseeing",   color: "#3b82f6", mapColor: "#3b82f6" }, // blue
  transport:   { label: "Station",       plural: "Stations",      color: "#6b7280", mapColor: "#6b7280" }, // grey
  hidden:      { label: "Hidden Gem",    plural: "Hidden Gems",   color: "#10b981", mapColor: "#10b981" }, // emerald
  stays:       { label: "Stay",          plural: "Stays",         color: "#ec4899", mapColor: "#ec4899" }, // pink
  spot:        { label: "Spot",          plural: "Spots",         color: "#b85c38", mapColor: "#b85c38" }, // original brown (fallback)
} as const;

export type PlaceType = keyof typeof PLACE_TYPES;

export const PRICE_LABELS: Record<number, string> = { 1: "$", 2: "$$", 3: "$$$" };

export function placeMeta(type: string) {
  const key = (type in PLACE_TYPES ? type : "spot") as PlaceType;
  return { key, ...PLACE_TYPES[key] };
}

export function priceLabel(tier: number | null | undefined) {
  if (!tier) return "—";
  return PRICE_LABELS[Math.round(tier)] ?? "—";
}

export function stars(n: number) {
  return "★".repeat(n) + "☆".repeat(5 - n);
}

export type PinReview = {
  id: string;
  rating: number;
  priceTier: number;
  body: string;
  isAnonymous: boolean;
  displayName: string | null;
  createdAt: string;
};

export type Pin = {
  id: string;
  lat: number;
  lng: number;
  title: string;
  placeType: string;
  photoUrl: string | null;
  createdAt: string;
  reviews: PinReview[];
  avgRating: number | null;
  avgPriceTier: number | null;
};
