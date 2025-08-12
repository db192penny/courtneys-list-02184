import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import VendorCard from "@/components/vendors/VendorCard";
import CommunityVendorTable from "@/components/vendors/CommunityVendorTable";
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
  const pageTitle = useMemo(() => (communityName === "Boca Bridges" ? "Boca Bridges Overview" : `${communityName} Overview`), [communityName]);
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

  // Community asset (photo and address)
  type CommunityAsset = { hoa_name: string; photo_path: string | null; address_line: string | null };
  const { data: asset } = useQuery<CommunityAsset | null>({
    queryKey: ["community-asset", communityName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_assets")
        .select("hoa_name, photo_path, address_line")
        .eq("hoa_name", communityName)
        .maybeSingle();
      if (error && (error as any).code !== "PGRST116") throw error;
      return (data as CommunityAsset) ?? null;
    },
    enabled: !!communityName,
  });

  const photoUrl = useMemo(() => {
    if (asset?.photo_path) {
      return supabase.storage.from("community-photos").getPublicUrl(asset.photo_path).data.publicUrl;
    }
    return "/lovable-uploads/fa4d554f-323c-4bd2-b5aa-7cd1f2289c3c.png";
  }, [asset?.photo_path]);

  const addressLine = asset?.address_line || "17179 Ludovica Lane, Boca Raton, FL 33496";

  return (
    <main className="min-h-screen bg-background">
      <SEO
        title={isPreview ? `${pageTitle} — Preview` : pageTitle}
        description={isPreview ? "You’re viewing a limited preview. Sign up to request exclusive access to your community’s full vendor details, pricing, and HOA-approved membership." : `Trusted vendors recommended by ${communityName} residents.`}
        canonical={canonical}
      />

      <section className="container py-10 space-y-6">
        {isPreview ? (
          <header className="space-y-0">
            <div className="flex items-center gap-4">
              <img
                src={photoUrl}
                alt={`${communityName} HOA entrance sign and community graphic`}
                className="h-16 w-16 rounded-md object-cover border"
                loading="lazy"
              />
              <div>
                <h1 className="text-3xl font-semibold tracking-tight">{communityName}</h1>
                <p className="text-sm text-muted-foreground">Your Trusted Neighborhood — 500 Homes</p>
                <p className="text-sm text-muted-foreground">{addressLine}</p>
              </div>
            </div>
          </header>
        ) : (
          <header className="space-y-0">
            <div className="flex items-center gap-4">
              <img
                src={photoUrl}
                alt={`${communityName} HOA entrance sign and community graphic`}
                className="h-16 w-16 rounded-md object-cover border"
                loading="lazy"
              />
              <div>
                <h1 className="text-3xl font-semibold tracking-tight">{communityName}</h1>
                <p className="text-sm text-muted-foreground">Your Trusted Neighborhood — 500 Homes</p>
                <p className="text-sm text-muted-foreground">{addressLine}</p>
              </div>
            </div>
          </header>
        )}

        {/* Submit Vendor available to all users; unauthenticated users will be redirected to Auth */}
        <div className="pt-2">
          <Button variant="secondary" onClick={() => navigate(`/submit?community=${encodeURIComponent(communityName)}`)}>
            Submit a Vendor
          </Button>
        </div>

        {isPreview && !profile?.isAuthenticated && (
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

{!!data && (
          <div className="space-y-3">
            {isPreview && (
              <p className="text-sm text-muted-foreground">
                {profile?.isAuthenticated
                  ? "Contact info and HOA averages are hidden until you’re approved."
                  : "Contact info and HOA averages are hidden until you sign up."}
              </p>
            )}
            <CommunityVendorTable communityName={communityName} showContact={canViewFull} />
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
