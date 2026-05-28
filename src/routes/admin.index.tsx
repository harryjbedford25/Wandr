import { createFileRoute, useRouter, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { getAdminSession, adminLogout, adminDeletePin, adminDeleteReview } from "@/lib/admin.functions";
import { adminListAll } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/")({
  beforeLoad: async () => {
    const session = await getAdminSession();
    if (!session.authenticated) {
      throw redirect({ to: "/admin/login" });
    }
    return { session };
  },
  loader: async () => {
    return await adminListAll();
  },
  component: AdminDashboard,
});

function AdminDashboard() {
  const router = useRouter();
  const { pins: initialPins, reviews: initialReviews } = Route.useLoaderData();
  const { session } = Route.useRouteContext();
  const [pins, setPins] = useState<any[]>(initialPins);
  const [reviews, setReviews] = useState<any[]>(initialReviews);
  const [tab, setTab] = useState<"pins" | "reviews">("pins");
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleLogout() {
    await adminLogout();
    document.cookie = "wandr_admin_session=; path=/; max-age=0";
    window.location.href = "/admin/login";
  }

  async function deletePin(id: string) {
    if (!confirm("Delete this pin and all its reviews?")) return;
    setDeleting(id);
    try {
      await adminDeletePin({ data: { id } });
      setPins((p) => p.filter((x) => x.id !== id));
      setReviews((r) => r.filter((x) => x.pin_id !== id));
    } finally {
      setDeleting(null);
    }
  }

  async function deleteReview(id: string) {
    if (!confirm("Delete this review?")) return;
    setDeleting(id);
    try {
      await adminDeleteReview({ data: { id } });
      setReviews((r) => r.filter((x) => x.id !== id));
    } finally {
      setDeleting(null);
    }
  }

  const pinMap = Object.fromEntries(pins.map((p) => [p.id, p.title]));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <h1 className="font-serif text-2xl text-foreground">WANDR Admin</h1>
            <p className="text-xs text-muted-foreground">{session.email}</p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="rounded-md border border-input px-3 py-1.5 text-sm text-foreground hover:bg-accent"
            >
              ← Back to site
            </a>
            <button
              onClick={handleLogout}
              className="rounded-md bg-destructive px-3 py-1.5 text-sm text-destructive-foreground hover:bg-destructive/90"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {/* Stats */}
        <div className="mb-8 grid grid-cols-2 gap-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-3xl font-bold text-foreground">{pins.length}</p>
            <p className="text-sm text-muted-foreground">Total pins</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-3xl font-bold text-foreground">{reviews.length}</p>
            <p className="text-sm text-muted-foreground">Total reviews</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-4 flex gap-2 border-b border-border">
          {(["pins", "reviews"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
                tab === t
                  ? "border-b-2 border-primary text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t} ({t === "pins" ? pins.length : reviews.length})
            </button>
          ))}
        </div>

        {/* Pins table */}
        {tab === "pins" && (
          <div className="overflow-hidden rounded-lg border border-border">
            {pins.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">No pins yet</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Title</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Location</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Added</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pins.map((pin) => (
                    <tr key={pin.id} className="bg-card hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium text-foreground">{pin.title}</td>
                      <td className="px-4 py-3 capitalize text-muted-foreground">{pin.place_type}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {Number(pin.lat).toFixed(3)}, {Number(pin.lng).toFixed(3)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(pin.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => deletePin(pin.id)}
                          disabled={deleting === pin.id}
                          className="rounded px-2 py-1 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-50"
                        >
                          {deleting === pin.id ? "Deleting…" : "Delete"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Reviews table */}
        {tab === "reviews" && (
          <div className="overflow-hidden rounded-lg border border-border">
            {reviews.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">No reviews yet</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Pin</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Author</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Rating</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Review</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Added</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {reviews.map((review) => (
                    <tr key={review.id} className="bg-card hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium text-foreground">
                        {pinMap[review.pin_id] ?? "Deleted pin"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {review.is_anonymous ? "Anonymous" : (review.display_name ?? "—")}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{"★".repeat(review.rating)}</td>
                      <td className="max-w-xs px-4 py-3 text-muted-foreground">
                        <p className="truncate">{review.body}</p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(review.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => deleteReview(review.id)}
                          disabled={deleting === review.id}
                          className="rounded px-2 py-1 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-50"
                        >
                          {deleting === review.id ? "Deleting…" : "Delete"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
