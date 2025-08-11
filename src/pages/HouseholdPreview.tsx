import { useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import VendorList from "@/components/vendors/VendorList";

const HouseholdPreview = () => {
  const canonical = typeof window !== "undefined" ? window.location.href : undefined;
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const addr = useMemo(() => (params.get("addr") || "").trim(), [params]);

  return (
    <main className="min-h-screen bg-background">
      <SEO
        title="Household Preview — Snapshot"
        description="Minimal household snapshot for your address."
        canonical={canonical}
      />

      <section className="container py-10 max-w-3xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Household Preview</h1>
          <p className="text-muted-foreground">
            Minimal household snapshot. Visit your HOA community page for richer details.
          </p>
        </header>

        {addr && (
          <div className="rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
            For address: <span className="font-medium text-foreground">{addr}</span>
          </div>
        )}

      </section>
    </main>
  );
};

export default HouseholdPreview;
