import { SiteHeader } from "./SiteHeader";

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-6 py-6 sm:px-10 sm:py-8">
        <SiteHeader />
        {children}
      </div>
    </div>
  );
}
