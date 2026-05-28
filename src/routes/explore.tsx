import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Search, MapPin, Star } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { listPins } from "@/lib/pins.functions";
import { placeMeta, priceLabel, PLACE_TYPES, type PlaceType } from "@/lib/place-types";

const pinsQuery = queryOptions({
  queryKey: ["pins"],
  queryFn: () => listPins(),
});

export const Route = createFileRoute("/explore")({
  head: () => ({
    meta: [
      { title: "Explore — WANDR" },
      { name: "description", content: "Honest, community-rated spots along your train route." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(pinsQuery),
  component: ExplorePage,
});

const FILTERS = ["all", ...(Object.keys(PLACE_TYPES) as PlaceType[])] as const;

function ExplorePage() {
  const { data: pins } = useSuspenseQuery(pinsQuery);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");

  const visible = useMemo(() => {
    const query = q.trim().toLowerCase();
    return pins.filter((p) => {
      if (filter !== "all" && p.placeType !== filter) return false;
      if (query && !p.title.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [pins, q, filter]);

  return (
    <PageShell>
      <section className="mt-12 md:mt-16">
        <div className="flex items-center gap-3 rounded-full border border-border bg-card px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search destinations, places…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <h1 className="font-display mt-8 text-4xl sm:text-5xl">Explore</h1>

        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 border-b border-border pb-1 text-sm">
          {FILTERS.map((f) => {
            const label = f === "all" ? "All" : PLACE_TYPES[f as PlaceType].plural;
            const active = filter === f;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={
                  "relative inline-flex items-center gap-1.5 pb-3 transition-colors " +
                  (active ? "text-foreground" : "text-muted-foreground hover:text-foreground")
                }
              >
                {f !== "all" && (
                  <span
                    className="inline-block h-2 w-2 shrink-0 rounded-full"
                    style={{ background: PLACE_TYPES[f as PlaceType].mapColor }}
                  />
                )}
                {label}
                {active && (
                  <span className="absolute inset-x-0 -bottom-px h-px bg-foreground" />
                )}
              </button>
            );
          })}
        </div>

        <ul className="mt-2 divide-y divide-border">
          {visible.length === 0 && (
            <li className="py-12 text-center text-sm text-muted-foreground">
              No pins match. Try a different search.
            </li>
          )}
          {visible.map((pin) => {
            const meta = placeMeta(pin.placeType);
            return (
              <li key={pin.id}>
                <Link
                  to="/pins/$pinId"
                  params={{ pinId: pin.id }}
                  className="group flex items-center gap-4 py-4"
                >
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
                    {pin.photoUrl ? (
                      <img
                        src={pin.photoUrl}
                        alt={pin.title}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-muted-foreground">
                        <MapPin className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-base font-semibold">{pin.title}</h3>
                    <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-muted-foreground">
                      <span
                        className="inline-block h-2 w-2 shrink-0 rounded-full"
                        style={{ background: meta.color }}
                      />
                      {meta.label} · {priceLabel(pin.avgPriceTier)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 text-sm text-muted-foreground">
                    {pin.avgRating ? (
                      <>
                        <Star className="h-3.5 w-3.5 fill-foreground text-foreground" />
                        <span className="text-foreground">{pin.avgRating}</span>
                        <span>({pin.reviews.length})</span>
                      </>
                    ) : (
                      <span>No reviews</span>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </PageShell>
  );
}
