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
        title="Household Preview | See trusted vendors"
        description="Preview community vendors. Sign up to unlock HOA averages and full access."
        canonical={canonical}
      />

      <section className="container py-10 max-w-3xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Household Preview</h1>
          <p className="text-muted-foreground">
            This is a limited preview. Sign up to unlock HOA community costs, full vendor details, and invites.
          </p>
        </header>

        {addr && (
          <div className="rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
            For address: <span className="font-medium text-foreground">{addr}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={() => navigate(`/auth/signup?address=${encodeURIComponent(addr)}`)}>
            Sign up to unlock
          </Button>
          <Button variant="secondary" onClick={() => navigate("/")}>Change address</Button>
        </div>

        <div className="space-y-3">
          <h2 className="text-xl font-medium">Vendors (sample)</h2>
          <p className="text-sm text-muted-foreground">Contact info and HOA averages are hidden until you sign up.</p>
          <VendorList isVerified={false} limit={6} />
        </div>
      </section>
    </main>
  );
};

export default HouseholdPreview;
