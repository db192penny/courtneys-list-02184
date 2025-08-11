import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import VendorCard from "@/components/vendors/VendorCard";
import { supabase } from "@/integrations/supabase/client";
import { useUserProfile } from "@/hooks/useUserProfile";

function slugToName(slug: string) {
  const cleaned = (slug || "")
    .toLowerCase()
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  // Title case simple words
  return cleaned.replace(/\b\w+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));
}

export default function Community() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const { data: profile } = useUserProfile();

  const communityName = useMemo(() => slugToName(slug), [slug]);
  const canonical = typeof window !== "undefined" ? window.location.href : undefined;

  const { data, isLoading, error } = useQuery({
    queryKey: ["community-vendors", communityName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendors")
        .select("id, name, category, contact_info, typical_cost, community, created_at")
        .eq("community", communityName)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!communityName,
  });

  return (
    <main className="min-h-screen bg-background">
      <SEO
        title={`${communityName} — Community Providers`}
        description={`Trusted vendors recommended by ${communityName} residents.`}
        canonical={canonical}
      />

      <section className="container py-10 space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">{communityName} — Community Providers</h1>
          <p className="text-muted-foreground">
            Browse providers recommended by neighbors in {communityName}.
          </p>
        </header>

        {isLoading && <div className="text-sm text-muted-foreground">Loading providers…</div>}
        {error && <div className="text-sm text-muted-foreground">Unable to load providers.</div>}

        {!!data && data.length === 0 && !isLoading && (
          <div className="text-sm text-muted-foreground">No providers yet for {communityName}.</div>
        )}

        {!!data && data.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data.map((v: any) => (
              <VendorCard key={v.id} vendor={v} isVerified={!!profile?.isVerified} />
            ))}
          </div>
        )}

        <div className="pt-4">
          <Button variant="secondary" onClick={() => navigate("/")}>Home</Button>
        </div>
      </section>
    </main>
  );
}
