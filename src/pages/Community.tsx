import { useMemo, useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import VendorCard from "@/components/vendors/VendorCard";
import CommunityVendorTable from "@/components/vendors/CommunityVendorTable";
import CommunityDemoTable from "@/components/vendors/CommunityDemoTable";
import { supabase } from "@/integrations/supabase/client";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useAuth } from "@/hooks/useAuth";
import { WelcomeToolbar } from "@/components/WelcomeToolbar";
import { useScrollDirection } from "@/hooks/useScrollDirection";

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
  const [searchParams] = useSearchParams();

  const { data: profile } = useUserProfile();
  const { isAuthenticated: sessionAuthenticated } = useAuth();
  const { isScrollingDown, hasScrolled } = useScrollDirection();
  const [hideHeader, setHideHeader] = useState(false);
  useEffect(() => {
    if (hasScrolled) setHideHeader(true);
  }, [hasScrolled]);
  
  const communityName = useMemo(() => slugToName(slug), [slug]);

  // Store community context for signup flow
  useEffect(() => {
    if (communityName && communityName !== "Community") {
      localStorage.setItem('selected_community', communityName);
    }
  }, [communityName]);

  // Handle invite codes from URL
  useEffect(() => {
    const inviteCode = searchParams.get('invite');
    const inviterId = searchParams.get('inviter');
    
    if (inviteCode && inviterId) {
      // Store both for after signup
      localStorage.setItem('pending_invite_code', inviteCode);
      localStorage.setItem('pending_inviter_id', inviterId);
    }
  }, [searchParams]);

  const pageTitle = useMemo(() => (communityName === "Boca Bridges" ? "Boca Bridges Overview" : `${communityName} Overview`), [communityName]);
  const canonical = typeof window !== "undefined" ? window.location.href : undefined;
  
  // Use session-first authentication - simplified to prevent race conditions
  const isAuthenticated = sessionAuthenticated;
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
    <main className="min-h-screen bg-background overflow-x-hidden">
      <SEO
        title={pageTitle}
        description={`Trusted vendors recommended by ${communityName} residents. View ratings, costs, and contact information.`}
        canonical={canonical}
      />

      <section className="container pt-0 sm:py-10 pb-2 space-y-2 sm:space-y-6">
        {/* Welcome toolbar for new users */}
        <WelcomeToolbar communitySlug={slug} />
        
        {/* Sticky Community Header */}
        <div className={`sticky ${hideHeader ? 'top-4 sm:top-2' : 'top-8 sm:top-14'} z-40 backdrop-blur-md bg-background/95 border-b border-border/40 shadow-sm transition-transform duration-300 ease-in-out -mx-4 sm:mx-0 px-4 sm:px-0 pb-1.5 sm:py-4 ${isScrollingDown ? '-translate-y-full' : 'translate-y-0'}`}>
          <header className="space-y-4">
              <div className="flex flex-col gap-2 sm:gap-4">
                 {/* Community info - full-width image with text overlay - only show if user hasn't scrolled yet */}
                 {!hideHeader && (
                   <div className="relative animate-fade-in hidden sm:block">
                      {/* Full-width community image with text overlay */}
                      {asset?.photo_path ? (
                        <div className="relative">
                          <img 
                            src={photoUrl} 
                            alt={`${communityName} community photo`}
                            className="w-full h-16 sm:h-20 rounded-lg object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-full h-16 sm:h-20 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl sm:text-2xl">
                          {communityName}
                        </div>
                      )}
                   </div>
                 )}

                {/* For logged out users - compact call to action */}
                {showSignUpPrompt && (
                  <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg py-2 px-4 text-center text-white mb-4">
                    <p className="text-sm font-medium mb-1">
                      Join 150+ neighbors sharing reviews
                    </p>
                    <Button
                      onClick={() => {
                        const inviteCode = localStorage.getItem('pending_invite_code');
                        const inviterId = localStorage.getItem('pending_inviter_id');
                        
                        if (inviteCode && inviterId) {
                          navigate(`/auth?community=${communityName}&invite=${inviteCode}&inviter=${inviterId}`);
                        } else {
                          navigate(`/auth?community=${communityName}`);
                        }
                      }}
                      size="sm"
                      className="bg-white text-blue-600 hover:bg-gray-100 font-semibold px-5"
                    >
                      Request Access
                    </Button>
                  </div>
                )}

                {/* For logged in users - no actions needed, removed submit provider button */}
              </div>
            </header>
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