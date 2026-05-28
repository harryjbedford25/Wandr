import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, Star, MapPin } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { getPin, addReview } from "@/lib/pins.functions";
import { placeMeta, priceLabel, stars } from "@/lib/place-types";

const pinQuery = (id: string) =>
  queryOptions({
    queryKey: ["pin", id],
    queryFn: () => getPin({ data: { id } }),
  });

export const Route = createFileRoute("/pins/$pinId")({
  loader: async ({ params, context }) => {
    const pin = await context.queryClient.ensureQueryData(pinQuery(params.pinId));
    if (!pin) throw notFound();
    return pin;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.title ?? "Pin"} — WANDR` },
      { name: "description", content: `Community reviews for ${loaderData?.title ?? "this place"}.` },
      ...(loaderData?.photoUrl
        ? [{ property: "og:image", content: loaderData.photoUrl }]
        : []),
    ],
  }),
  component: PinPage,
  notFoundComponent: () => (
    <PageShell>
      <div className="py-24 text-center">
        <h1 className="font-display text-3xl">Pin not found</h1>
        <Link to="/explore" className="mt-4 inline-block text-sm underline">
          Back to Explore
        </Link>
      </div>
    </PageShell>
  ),
});

function PinPage() {
  const { pinId } = Route.useParams();
  const { data: pin } = useSuspenseQuery(pinQuery(pinId));
  if (!pin) return null;
  const meta = placeMeta(pin.placeType);

  return (
    <PageShell>
      <div className="mt-8">
        <Link
          to="/explore"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> All pins
        </Link>
      </div>

      <section className="mt-6 grid gap-10 md:grid-cols-2 md:items-start">
        <div className="aspect-[4/3] overflow-hidden rounded-md bg-muted">
          {pin.photoUrl ? (
            <img src={pin.photoUrl} alt={pin.title} className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center text-muted-foreground">
              <MapPin className="h-12 w-12" />
            </div>
          )}
        </div>

        <div>
          <span
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs uppercase tracking-wider text-muted-foreground"
          >
            <span
              className="inline-block h-2 w-2 shrink-0 rounded-full"
              style={{ background: meta.color }}
            />
            {meta.label}
          </span>
          <h1 className="font-display mt-3 text-4xl sm:text-5xl">{pin.title}</h1>
          <div className="mt-3 flex items-center gap-4 text-sm">
            {pin.avgRating ? (
              <span className="inline-flex items-center gap-1">
                <Star className="h-4 w-4 fill-foreground text-foreground" />
                <strong>{pin.avgRating}</strong>
                <span className="text-muted-foreground">({pin.reviews.length} reviews)</span>
              </span>
            ) : (
              <span className="text-muted-foreground">No reviews yet</span>
            )}
            <span className="text-muted-foreground">·</span>
            <span>{priceLabel(pin.avgPriceTier)}</span>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            {pin.lat.toFixed(3)}°, {pin.lng.toFixed(3)}°
          </p>
        </div>
      </section>

      <ReviewSection pinId={pin.id} title={pin.title} reviews={pin.reviews} />
    </PageShell>
  );
}

function ReviewSection({
  pinId,
  title,
  reviews,
}: {
  pinId: string;
  title: string;
  reviews: { id: string; rating: number; priceTier: number; body: string; isAnonymous: boolean; displayName: string | null; createdAt: string }[];
}) {
  const qc = useQueryClient();
  const submit = useServerFn(addReview);
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [priceTier, setPriceTier] = useState(1);
  const [body, setBody] = useState("");

  const m = useMutation({
    mutationFn: submit,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pin", pinId] });
      qc.invalidateQueries({ queryKey: ["pins"] });
      setOpen(false);
      setRating(0);
      setPriceTier(1);
      setBody("");
      toast.success("Review posted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="mt-16 border-t border-border pt-10">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-3xl">Reviews</h2>
        <button
          onClick={() => setOpen((o) => !o)}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          {open ? "Cancel" : "Write a review"}
        </button>
      </div>

      {open && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!rating) return toast.error("Pick a rating");
            if (!body.trim()) return toast.error("Write something");
            m.mutate({ data: { pinId, rating, priceTier, body: body.trim(), isAnonymous: true } });
          }}
          className="mt-6 space-y-4 rounded-md border border-border p-5"
        >
          <p className="text-sm text-muted-foreground">Reviewing {title}</p>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Rating</label>
            <div className="mt-1 flex gap-1 text-2xl">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  type="button"
                  key={n}
                  onClick={() => setRating(n)}
                  className={n <= rating ? "text-foreground" : "text-muted-foreground/40"}
                  aria-label={`${n} stars`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Price</label>
            <div className="mt-1 flex gap-2">
              {[1, 2, 3].map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => setPriceTier(t)}
                  className={
                    "rounded-md border px-3 py-1.5 text-sm transition-colors " +
                    (priceTier === t
                      ? "border-foreground bg-foreground text-background"
                      : "border-border hover:bg-muted")
                  }
                >
                  {priceLabel(t)}
                </button>
              ))}
            </div>
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="What was it like? Honest, helpful, specific."
            rows={4}
            maxLength={2000}
            className="w-full resize-none rounded-md border border-border bg-card p-3 text-sm outline-none focus:border-foreground"
          />
          <button
            type="submit"
            disabled={m.isPending}
            className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {m.isPending ? "Posting…" : "Post review"}
          </button>
        </form>
      )}

      <ul className="mt-8 divide-y divide-border">
        {reviews.length === 0 && (
          <li className="py-10 text-center text-sm text-muted-foreground">
            No reviews yet. Be the first.
          </li>
        )}
        {reviews.map((r) => (
          <li key={r.id} className="py-6">
            <div className="flex items-center gap-3 text-sm">
              <span className="text-foreground">{stars(r.rating)}</span>
              <span className="text-muted-foreground">{priceLabel(r.priceTier)}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">
                {r.isAnonymous ? "Anonymous" : r.displayName ?? "Traveller"}
              </span>
            </div>
            <p className="mt-2 text-[15px] leading-relaxed">{r.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
