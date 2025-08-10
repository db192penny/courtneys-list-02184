// Update this page (the content is just a fallback if you fail to update the page)
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Users, Search, CircleDollarSign, CheckCircle2, ShieldCheck } from "lucide-react";

const Index = () => {
  const canonical = typeof window !== "undefined" ? window.location.href : undefined;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Courtney’s List — Boca Bridges Vendors",
    url: canonical,
    description:
      "Invite-only community vendor recommendations for Boca Bridges with transparent costs and ratings.",
  };


  return (
    <main className="min-h-screen bg-background">
      <SEO
        title="Courtney’s List — Boca Bridges Vendors"
        description="Invite-only community vendor recommendations for Boca Bridges. Submit a vendor to unlock full access."
        canonical={canonical}
      />

      <section className="container mx-auto px-6 py-16 text-center animate-fade-in">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-accent/50 text-accent-foreground px-3 py-1 text-xs">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          <span>Invite-only for Boca Bridges residents</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Boca Bridges Trusted Vendors</h1>
        <p className="text-lg md:text-xl text-muted-foreground mb-8">
          No more guessing. Get vetted recommendations from neighbors with transparent costs and ratings.
        </p>
        <div className="flex items-center justify-center gap-4">
          <a href="/submit"><Button>Submit a Vendor</Button></a>
          <a href="/dashboard"><Button variant="secondary">View Dashboard</Button></a>
        </div>
      </section>

      <section className="container mx-auto px-6 pb-20">
        <h2 className="text-2xl font-semibold mb-6">Why Boca Bridges Trusted Vendors?</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <article className="flex items-start gap-4 rounded-lg border bg-card p-5">
            <div className="rounded-md bg-primary/10 text-primary p-2">
              <Users className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="text-sm text-muted-foreground">
              No more guessing or endless internet searches — get recommendations directly from your neighbors.
            </p>
          </article>

          <article className="flex items-start gap-4 rounded-lg border bg-card p-5">
            <div className="rounded-md bg-primary/10 text-primary p-2">
              <Search className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="text-sm text-muted-foreground">
              Stop trolling through scattered Facebook groups — all trusted service info is in one easy place.
            </p>
          </article>

          <article className="flex items-start gap-4 rounded-lg border bg-card p-5">
            <div className="rounded-md bg-primary/10 text-primary p-2">
              <CircleDollarSign className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="text-sm text-muted-foreground">
              Transparent costs and ratings based on real community experiences.
            </p>
          </article>

          <article className="flex items-start gap-4 rounded-lg border bg-card p-5">
            <div className="rounded-md bg-primary/10 text-primary p-2">
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="text-sm text-muted-foreground">
              Make confident decisions that save you time and money.
            </p>
          </article>

          <article className="flex items-start gap-4 rounded-lg border bg-card p-5 md:col-span-2">
            <div className="rounded-md bg-primary/10 text-primary p-2">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="text-sm text-muted-foreground">
              Exclusive to Boca Bridges residents — trusted, local, and invite-only.
            </p>
          </article>
        </div>
      </section>

      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </main>
  );
};

export default Index;
