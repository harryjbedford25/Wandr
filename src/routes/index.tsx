import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Search, Map as MapIcon, Star, MessageCircle, Instagram, Mail } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import heroTrain from "@/assets/hero-train.jpg";
import destLjubljana from "@/assets/dest-ljubljana.jpg";
import destInterlaken from "@/assets/dest-interlaken.jpg";
import destPorto from "@/assets/dest-porto.jpg";
import destColmar from "@/assets/dest-colmar.jpg";

export const Route = createFileRoute("/")({
  component: Index,
});

const features = [
  { icon: Search, title: "Explore", desc: "Find unique places worth visiting." },
  { icon: MapIcon, title: "Plan", desc: "Plan train routes easily." },
  { icon: Star, title: "Save", desc: "Save places and build your trip." },
  { icon: MessageCircle, title: "Review", desc: "Share your experience." },
];

const destinations = [
  { name: "Ljubljana", country: "Slovenia", img: destLjubljana },
  { name: "Interlaken", country: "Switzerland", img: destInterlaken },
  { name: "Porto", country: "Portugal", img: destPorto },
  { name: "Colmar", country: "France", img: destColmar },
];

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-6 py-6 sm:px-10 sm:py-8">
        <SiteHeader />


        {/* Hero */}
        <section className="mt-12 grid gap-10 md:mt-20 md:grid-cols-2 md:items-center">
          <div>
            <h1 className="font-display text-5xl leading-[1.05] sm:text-6xl md:text-7xl">
              Real Pins<br />Real People<br />Real Memories.
            </h1>
            <p className="mt-6 max-w-md text-base text-muted-foreground">
              Travel the world honestly.<br />Plan around the journey.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/explore"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-transform hover:translate-y-[-1px]"
              >
                Explore destinations <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/map"
                className="inline-flex items-center gap-2 rounded-md border border-border px-6 py-3 text-sm font-medium transition-colors hover:bg-muted"
              >
                Open map
              </Link>
            </div>
          </div>
          <div className="overflow-hidden rounded-md">
            <img
              src={heroTrain}
              alt="Train crossing a viaduct through misty mountains"
              width={1280}
              height={1024}
              className="h-full w-full object-cover"
            />
          </div>
        </section>

        {/* Features */}
        <section className="mt-20 border-t border-border pt-12 md:mt-28">
          <div className="grid grid-cols-2 gap-10 md:grid-cols-4">
            {features.map((f) => (
              <div key={f.title}>
                <f.icon className="h-5 w-5" strokeWidth={1.5} />
                <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Destinations */}
        <section id="destinations" className="mt-20 md:mt-28">
          <div className="flex items-end justify-between">
            <h2 className="font-display text-3xl sm:text-4xl">Popular destinations</h2>
            <a href="#" className="text-sm text-foreground/80 underline-offset-4 hover:underline">
              View all
            </a>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-5 md:grid-cols-4">
            {destinations.map((d) => (
              <a key={d.name} href="#" className="group">
                <div className="aspect-square overflow-hidden rounded-md">
                  <img
                    src={d.img}
                    alt={`${d.name}, ${d.country}`}
                    width={640}
                    height={640}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <h3 className="mt-3 text-base font-semibold">{d.name}</h3>
                <p className="text-sm text-muted-foreground">{d.country}</p>
              </a>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-24 border-t border-border pt-10 pb-6">
          <div className="grid gap-10 md:grid-cols-5">
            <div className="md:col-span-2">
              <div className="text-lg font-semibold tracking-[0.2em]">WANDR</div>
              <p className="mt-3 max-w-xs text-sm text-muted-foreground">
                The modern way to travel by train.
              </p>
            </div>
            <FooterCol title="Pages" links={["Explore", "Map", "Plan", "Reviews"]} />
            <FooterCol title="Company" links={["About", "Careers", "Contact"]} />
            <div>
              <FooterCol title="Legal" links={["Privacy", "Terms", "Cookies"]} />
              <div className="mt-6 flex items-center gap-4 text-foreground/70">
                <a href="#" aria-label="Instagram"><Instagram className="h-4 w-4" /></a>
                <a href="#" aria-label="TikTok"><span className="text-sm font-semibold">TT</span></a>
                <a href="#" aria-label="Email"><Mail className="h-4 w-4" /></a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

function FooterCol({ title, links }: { title: string; links: string[] }) {
  return (
    <div>
      <h4 className="text-sm font-semibold">{title}</h4>
      <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
        {links.map((l) => (
          <li key={l}><a href="#" className="hover:text-foreground">{l}</a></li>
        ))}
      </ul>
    </div>
  );
}
