import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { listPins } from "@/lib/pins.functions";
import { priceLabel, stars } from "@/lib/place-types";

const pinsQuery = queryOptions({ queryKey: ["pins"], queryFn: () => listPins() });

export const Route = createFileRoute("/reviews")({
  head: () => ({
    meta: [
      { title: "Reviews — WANDR" },
      { name: "description", content: "Latest honest reviews from train travellers." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(pinsQuery),
  component: ReviewsPage,
});

function ReviewsPage() {
  const { data: pins } = useSuspenseQuery(pinsQuery);
  const all = pins
    .flatMap((p) => p.reviews.map((r) => ({ ...r, pin: p })))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  const avg =
    all.length > 0
      ? Math.round((all.reduce((s, r) => s + r.rating, 0) / all.length) * 10) / 10
      : 0;

  return (
    <PageShell>
      <section className="mt-12">
        <div className="flex items-end justify-between gap-6">
          <div>
            <h1 className="font-display text-4xl sm:text-5xl">Reviews</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Every review is from someone who actually went.
            </p>
          </div>
          <div className="text-right">
            <div className="font-display text-5xl">{avg || "—"}</div>
            <div className="mt-1 flex items-center justify-end gap-1 text-sm text-muted-foreground">
              <Star className="h-3.5 w-3.5 fill-foreground text-foreground" /> {all.length} reviews
            </div>
          </div>
        </div>

        <ul className="mt-10 divide-y divide-border">
          {all.map((r) => (
            <li key={r.id} className="py-6">
              <Link to="/pins/$pinId" params={{ pinId: r.pin.id }} className="group block">
                <div className="flex items-center gap-3 text-sm">
                  <span>{stars(r.rating)}</span>
                  <span className="text-muted-foreground">{priceLabel(r.priceTier)}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">
                    {r.isAnonymous ? "Anonymous" : r.displayName ?? "Traveller"}
                  </span>
                </div>
                <h3 className="mt-1 text-base font-semibold group-hover:underline">
                  {r.pin.title}
                </h3>
                <p className="mt-1 text-[15px] leading-relaxed text-foreground/90">{r.body}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </PageShell>
  );
}
