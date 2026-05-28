import { Link } from "@tanstack/react-router";
import { Moon, Sun, User } from "lucide-react";
import { useTheme } from "@/lib/theme";

const links = [
  { to: "/explore", label: "Explore" },
  { to: "/map", label: "Map" },
  { to: "/plan", label: "Plan" },
  { to: "/reviews", label: "Reviews" },
] as const;

export function SiteHeader() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="flex items-center justify-between">
      <Link to="/" className="text-xl font-semibold tracking-[0.2em]">
        WANDR
      </Link>
      <nav className="hidden items-center gap-8 text-sm md:flex">
        {links.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className="text-foreground/70 transition-colors hover:text-foreground"
            activeProps={{ className: "text-foreground font-medium" }}
          >
            {l.label}
          </Link>
        ))}
      </nav>
      <div className="flex items-center gap-2">
        <button
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          className="grid h-10 w-10 place-items-center rounded-full border border-border transition-colors hover:bg-muted"
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </button>
        <button
          aria-label="Account"
          className="grid h-10 w-10 place-items-center rounded-full border border-border transition-colors hover:bg-muted"
        >
          <User className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
