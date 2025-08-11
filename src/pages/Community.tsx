import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import VendorCard from "@/components/vendors/VendorCard";
import CommunityDemoTable from "@/components/vendors/CommunityDemoTable";
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
  const canViewFull = !!profile?.isAuthenticated && !!profile?.isVerified;
  const isPreview = !canViewFull;

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
        title={isPreview ? `${communityName} — Preview of Community Providers` : `${communityName} — Community Providers`}
        description={isPreview ? "You’re viewing a limited preview. Sign up to request exclusive access to your community’s full vendor details, pricing, and HOA-approved membership." : `Trusted vendors recommended by ${communityName} residents.`}
        canonical={canonical}
      />

      <section className="container py-10 space-y-6">
        {isPreview ? (
          <header className="space-y-0">
            <div className="flex items-center gap-4">
              <img
                src="/lovable-uploads/fa4d554f-323c-4bd2-b5aa-7cd1f2289c3c.png"
                alt={`${communityName} HOA entrance sign and community graphic`}
                className="h-16 w-16 rounded-md object-cover border"
                loading="lazy"
              />
              <div>
                <h1 className="text-3xl font-semibold tracking-tight">{communityName}</h1>
                <p className="text-sm text-muted-foreground">Your Trusted Neighborhood — 500 Homes</p>
                <p className="text-sm text-muted-foreground">17179 Ludovica Lane, Boca Raton, FL 33496</p>
              </div>
            </div>
          </header>
        ) : (
          <header className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">{communityName} — Community Providers</h1>
            <p className="text-muted-foreground">{`Browse providers recommended by neighbors in ${communityName}.`}</p>
          </header>
        )}

        {/* Submit Vendor available to all users; unauthenticated users will be redirected to Auth */}
        <div className="pt-2">
          <Button variant="secondary" onClick={() => navigate(`/submit?community=${encodeURIComponent(communityName)}`)}>
            Submit a Vendor
          </Button>
        </div>

        {isPreview && (
          <div className="flex flex-col gap-3">
            <Button onClick={() => {
              let addr = "";
              try {
                addr = localStorage.getItem("prefill_address") || "";
              } catch {}
              const url = `/auth/signup?community=${encodeURIComponent(communityName)}${addr ? `&address=${encodeURIComponent(addr)}` : ""}`;
              navigate(url);
            }}>
              Sign Up to Request Access
            </Button>
            <p className="text-sm text-muted-foreground">
              Membership is by community admin approval only — join your trusted community and gain exclusive vendor insights.
            </p>
          </div>
        )}

        {isLoading && <div className="text-sm text-muted-foreground">Loading providers…</div>}
        {error && <div className="text-sm text-muted-foreground">Unable to load providers.</div>}

        {!!data && data.length === 0 && !isLoading && (
          <>
            <CommunityDemoTable communityName={communityName} />
            {!isPreview && (
              <div className="pt-4">
                <Button variant="secondary" onClick={() => navigate(`/submit?community=${encodeURIComponent(communityName)}`)}>
                  Submit a Vendor — contribute to your community’s trusted resource
                </Button>
              </div>
            )}
          </>
        )}

        {!!data && data.length > 0 && (
          <div className="space-y-3">
            {isPreview && (
              <p className="text-sm text-muted-foreground">
                Contact info and HOA averages are hidden until you sign up.
              </p>
            )}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {data.map((v: any) => (
                <VendorCard key={v.id} vendor={v} isVerified={canViewFull} />
              ))}
            </div>
          </div>
        )}

        {!isPreview && (
          <div className="pt-4">
            <Button variant="secondary" onClick={() => navigate("/")}>Home</Button>
          </div>
        )}
      </section>
    </main>
  );
}
