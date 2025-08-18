import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import VendorCard from "@/components/vendors/VendorCard";
import CommunityVendorTable from "@/components/vendors/CommunityVendorTable";
import CommunityDemoTable from "@/components/vendors/CommunityDemoTable";
import { supabase } from "@/integrations/supabase/client";
import { useUserProfile } from "@/hooks/useUserProfile";
import { WelcomeToolbar } from "@/components/WelcomeToolbar";

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

      <section className="container py-2 sm:py-10 space-y-2 sm:space-y-6">
        {/* Welcome toolbar for new users */}
        {profile?.isAuthenticated && <WelcomeToolbar communitySlug={slug} />}
        
        <header className="space-y-0">
          <div className="flex flex-col gap-2 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-2 sm:gap-4 items-center sm:flex-row">
              <img
                src={photoUrl}
                alt={`${communityName} HOA entrance sign and community graphic`}
                className="h-10 w-10 sm:h-16 sm:w-16 rounded-md object-cover border"
                loading="lazy"
              />
              <div className="flex-1">
                <h1 className="text-lg sm:text-2xl md:text-3xl font-semibold tracking-tight">{communityName}</h1>
                <p className="text-sm text-muted-foreground truncate sm:whitespace-normal">Your Trusted Neighborhood — {homesLabel} Homes</p>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">{addressLine}</p>
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
              {/* Submit Provider Button - inline on mobile */}
              <Button
                onClick={() => navigate(`/submit?community=${encodeURIComponent(communityName)}`)}
                variant="outline"
                size="sm"
                className="shrink-0 sm:hidden"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Submit Provider Button - separate on desktop */}
            <Button
              onClick={() => navigate(`/submit?community=${encodeURIComponent(communityName)}`)}
              variant="outline"
              size="sm"
              className="shrink-0 hidden sm:flex"
            >
              <Plus className="h-4 w-4 mr-2" />
              Submit Provider
            </Button>
          </div>
        </header>


        {showSignUpPrompt && (
          <div className="flex flex-col gap-2 sm:gap-3">
            <Button 
              onClick={() => {
                const url = `/auth?community=${encodeURIComponent(communityName)}`;
                navigate(url);
              }}
              size="sm"
              variant="outline"
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 hover:from-blue-600 hover:to-purple-700 w-auto py-2 text-sm"
            >
              Request Access
            </Button>
            <p className="text-sm text-muted-foreground">
              Rate vendors, share costs, and read detailed neighbor reviews—verified neighbors only.
            </p>
          </div>
        )}

        {/* Sticky Filters Bar */}
        <div className="sticky top-[48px] sm:top-[56px] z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70 border-b py-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:border-0 sm:bg-transparent sm:static">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label htmlFor="category-filter" className="sr-only">Filter by Category</label>
              <select
                id="category-filter"
                className="h-9 text-sm w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                defaultValue="all"
              >
                <option value="all">All Categories</option>
                <option value="landscaping">Landscaping</option>
                <option value="home-services">Home Services</option>
                <option value="contractors">Contractors</option>
                <option value="utilities">Utilities</option>
              </select>
            </div>
          </div>
        </div>

        {isLoading && <div className="text-sm text-muted-foreground">Loading providers…</div>}
        {error && <div className="text-sm text-muted-foreground">Unable to load providers.</div>}

        {/* Show demo data only when no real data exists */}
        {!!data && data.length === 0 && !isLoading && (
          <div className="mt-2 sm:mt-6">
            <CommunityDemoTable communityName={communityName} />
          </div>
        )}

        {/* Show real data when it exists */}
        {!!data && data.length > 0 && (
          <div className="mt-2 sm:mt-6 space-y-2 sm:space-y-3">
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