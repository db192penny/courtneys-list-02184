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
  const isAuthenticated = !!profile?.isAuthenticated;
  const isVerified = !!profile?.isVerified;
  const showSignUpPrompt = !isAuthenticated;

  const { data, isLoading, error } = useQuery({
    queryKey: ["community-vendor-stats", communityName],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc("list_vendor_stats", {
          _hoa_name: communityName,
          _limit: 100
        });
      if (error) throw error;
      return data || [];
    },
    enabled: !!communityName,
  });

  // Community asset (photo and address)
  type CommunityAsset = { hoa_name: string; photo_path: string | null; address_line: string | null; contact_phone: string | null; total_homes?: number | null };
  const { data: asset } = useQuery<CommunityAsset | null>({
    queryKey: ["community-asset", communityName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_assets")
        .select("hoa_name, photo_path, address_line, contact_phone, total_homes")
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
  const contactPhone = asset?.contact_phone || null;
  const phoneDigits = contactPhone?.replace(/\D/g, "");
  const e164Phone = phoneDigits ? (phoneDigits.length === 10 ? `+1${phoneDigits}` : `+${phoneDigits}`) : null;
  const homesCount = (asset as any)?.total_homes ?? 500;
  const homesLabel = typeof homesCount === "number" ? homesCount.toLocaleString() : "500";
  return (
    <main className="min-h-screen bg-background">
      <SEO
        title={pageTitle}
        description={`Trusted vendors recommended by ${communityName} residents. View ratings, costs, and contact information.`}
        canonical={canonical}
      />

      <section className="container py-10 space-y-6">
        <header className="space-y-0">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <img
              src={photoUrl}
              alt={`${communityName} HOA entrance sign and community graphic`}
              className="h-16 w-16 rounded-md object-cover border"
              loading="lazy"
            />
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{communityName}</h1>
              <p className="text-sm text-muted-foreground">Your Trusted Neighborhood — {homesLabel} Homes</p>
              <p className="text-sm text-muted-foreground">{addressLine}</p>
              {e164Phone && (
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <Button variant="outline" asChild size="sm">
                    <a href={`tel:${e164Phone}`} aria-label="Call HOA contact">Call HOA</a>
                  </Button>
                  <Button variant="secondary" asChild size="sm">
                    <a href={`sms:${e164Phone}`} aria-label="Text HOA contact">Text HOA</a>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Submit Vendor available to all users; unauthenticated users will be redirected to Auth */}
        <div className="pt-2">
          <Button 
            variant="secondary" 
            onClick={() => navigate(`/submit?community=${encodeURIComponent(communityName)}`)}
            className="w-full sm:w-auto"
          >
            + Add a Service Provider
          </Button>
        </div>

        {showSignUpPrompt && (
          <div className="flex flex-col gap-3">
            <Button 
              onClick={() => {
                const url = `/auth?community=${encodeURIComponent(communityName)}`;
                navigate(url);
              }}
              className="w-full sm:w-auto"
            >
              Join Your Neighbors
            </Button>
            <p className="text-sm text-muted-foreground">
              Join your community to rate vendors, share costs, and access detailed reviews. We keep this space for verified neighbors only, so everyone can share openly and safely.
            </p>
          </div>
        )}

        {isLoading && <div className="text-sm text-muted-foreground">Loading providers…</div>}
        {error && <div className="text-sm text-muted-foreground">Unable to load providers.</div>}

        {/* Show demo data only when no real data exists */}
        {!!data && data.length === 0 && !isLoading && (
          <>
            <CommunityDemoTable communityName={communityName} />
            <div className="pt-4">
              <Button 
                variant="secondary" 
                onClick={() => navigate(`/submit?community=${encodeURIComponent(communityName)}`)}
                className="w-full sm:w-auto"
              >
                + Add a Service Provider
              </Button>
            </div>
          </>
        )}

        {/* Show real data when it exists */}
        {!!data && data.length > 0 && (
          <div className="space-y-3">
            {!isAuthenticated && (
              <p className="text-sm text-muted-foreground">
                Join your community to rate vendors, share costs, and access detailed reviews. We keep this space for verified neighbors only, so everyone can share openly and safely.
              </p>
            )}
            <CommunityVendorTable 
              communityName={communityName} 
              showContact={true} 
              isAuthenticated={isAuthenticated}
              isVerified={isVerified}
            />
          </div>
        )}

      </section>
    </main>
  );
}