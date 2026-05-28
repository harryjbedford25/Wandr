import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/plan")({
  head: () => ({
    meta: [
      { title: "Plan — WANDR" },
      { name: "description", content: "Plan your train trip across Europe." },
    ],
  }),
  component: PlanPage,
});

function PlanPage() {
  return (
    <PageShell>
      <section className="mt-12 max-w-2xl">
        <h1 className="font-display text-4xl sm:text-5xl">Plan your trip</h1>
        <p className="mt-3 text-muted-foreground">
          Trip planning is coming next. For now, browse the map to scout stops and pin places worth
          visiting along the way.
        </p>
        <div className="mt-8 flex gap-3">
          <Link
            to="/map"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
          >
            Open the map <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/explore"
            className="inline-flex items-center gap-2 rounded-md border border-border px-5 py-2.5 text-sm font-medium hover:bg-muted"
          >
            Browse pins
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
