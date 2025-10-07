import { useMemo, useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus, UserPlus, Home, Star, TrendingUp, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
import { BackToTopButton } from "@/components/ui/BackToTopButton";
import { CommunityNavigationNotice } from "@/components/CommunityNavigationNotice";
import { storeAuthReturnPath } from "@/utils/authRedirect";

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
  const homesCount = (asset as any)?.total_homes ?? 591;
  const homesLabel = typeof homesCount === "number" ? homesCount.toLocaleString() : "591";

  // Fetch real community stats
  const { data: communityStats } = useQuery({
    queryKey: ["community-stats", communityName],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_community_stats' as any, { _hoa_name: communityName });
      if (error) throw error;
      return data?.[0] || { total_reviews: 0, active_users: 0 };
    },
    enabled: !!communityName,
  });

  // Use real stats from database
  const totalReviews = communityStats?.total_reviews || 0;
  const activeUsers = communityStats?.active_users || 0;
  
  // Calculate average rating from vendor data
  const ratedVendorsCount = data?.filter(v => (v.hoa_rating_count || 0) > 0).length || 0;
  const avgRating = ratedVendorsCount > 0 
    ? (data?.reduce((sum, v) => sum + (v.hoa_rating || 0), 0) || 0) / ratedVendorsCount 
    : 0;

  // Dynamic SEO based on community
  const seoTitle = useMemo(() => {
    if (slug === "the-bridges") {
      return "The Bridges Community | Trusted Service Providers";
    } else if (slug === "boca-bridges") {
      return "Boca Bridges | Verified Vendor Recommendations";
    }
    return `${communityName} | Courtney's List`;
  }, [slug, communityName]);

  const seoDescription = useMemo(() => {
    if (slug === "the-bridges") {
      return "Find home service providers recommended by The Bridges residents. Pool service, landscaping, HVAC repairs - all vetted by your neighbors in The Bridges community.";
    } else if (slug === "boca-bridges") {
      return "See which plumbers, HVAC, pool, pest, and landscapers your Boca Bridges neighbors actually use. Add your ratings and make homeownership less stressful.";
    }
    return `Trusted vendors recommended by ${communityName} residents. View ratings, costs, and contact information.`;
  }, [slug, communityName]);

  // Add default image for social sharing
  const seoImage = "https://www.courtneys-list.com/lovable-uploads/fa4d554f-323c-4bd2-b5aa-7cd1f2289c3c.png";

  return (
    <main className="min-h-screen bg-background overflow-x-hidden">
      <CommunityNavigationNotice />
      <SEO
        title={seoTitle}
        description={seoDescription}
        canonical={canonical}
        image={seoImage}
      />

      <section className="container pt-0 sm:py-10 pb-40 md:pb-2 space-y-2 sm:space-y-6">
        
        {/* Welcome toolbar for new users */}
        <WelcomeToolbar communitySlug={slug} />
        
        {/* Hero Card - Desktop/Tablet Only */}
        <div className="hidden md:block mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-none shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center gap-6">
                {/* Community Logo */}
                <div className="flex-shrink-0">
                  <img
                    src={photoUrl}
                    alt={`${communityName} logo`}
                    className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-lg"
                  />
                </div>
                
                {/* Community Info */}
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-foreground mb-1">{communityName}</h1>
                  <p className="text-sm text-muted-foreground">{addressLine || 'Trusted local service providers'}</p>
                </div>
                
                {/* Stats Grid - Responsive */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                  {/* Total Homes */}
                  <div className="text-center">
                    <Home className="w-5 h-5 mx-auto mb-1 text-blue-600" />
                    <div className="text-xl font-bold">{homesLabel}</div>
                    <div className="text-xs text-muted-foreground">Homes</div>
                  </div>
                  
                  {/* Total Reviews */}
                  <div className="text-center">
                    <Star className="w-5 h-5 mx-auto mb-1 text-amber-500" />
                    <div className="text-xl font-bold">{totalReviews}</div>
                    <div className="text-xs text-muted-foreground">Reviews</div>
                  </div>
                  
                  {/* Average Rating */}
                  <div className="text-center">
                    <TrendingUp className="w-5 h-5 mx-auto mb-1 text-green-600" />
                    <div className="text-xl font-bold">{avgRating > 0 ? `${avgRating.toFixed(1)}★` : '-'}</div>
                    <div className="text-xs text-muted-foreground">Avg Rating</div>
                  </div>
                  
                  {/* Active Users */}
                  <div className="text-center">
                    <Users className="w-5 h-5 mx-auto mb-1 text-purple-600" />
                    <div className="text-xl font-bold">{activeUsers}</div>
                    <div className="text-xs text-muted-foreground">Neighbors</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sticky Community Header */}
        <div className={`sticky ${hideHeader ? 'top-0 sm:top-2' : 'top-8 sm:top-14'} z-40 backdrop-blur-md bg-background/95 border-b border-border/40 shadow-sm transition-transform duration-300 ease-in-out -mx-4 sm:mx-0 px-4 sm:px-0 pb-1.5 sm:py-4 ${isScrollingDown ? '-translate-y-full' : 'translate-y-0'}`}>
          <header className="space-y-4">
              <div className="flex flex-col gap-2 sm:gap-4">
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

      {/* Back to Top Button */}
      <BackToTopButton />

      {/* Sticky Split Action Bar - Bottom */}
      {showSignUpPrompt && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border shadow-2xl animate-fade-in">
          <div className="container py-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              
              {/* Left: Value Proposition + Social Proof */}
              <div className="flex-1 text-center sm:text-left space-y-1">
                <p className="text-base sm:text-lg font-semibold text-foreground">
                  See who your neighbors are using and trust
                </p>
                {activeUsers >= 100 && (
                  <div className="flex items-center justify-center sm:justify-start gap-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Users className="h-4 w-4 text-primary" />
                      <span className="font-medium">{activeUsers}+ active neighbors</span>
                    </div>
                    <span className="text-border">•</span>
                    <div className="flex items-center gap-1.5">
                      <Star className="h-4 w-4 text-amber-500" />
                      <span className="font-medium">{totalReviews}+ reviews</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Right: CTAs */}
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Button
                  onClick={() => navigate(`/signin?community=${communityName}`)}
                  size="default"
                  variant="ghost"
                  className="flex-1 sm:flex-initial text-muted-foreground hover:text-foreground"
                >
                  Log In
                </Button>
                <Button
                  onClick={() => {
                    storeAuthReturnPath();
                    
                    const inviteCode = localStorage.getItem('pending_invite_code');
                    const inviterId = localStorage.getItem('pending_inviter_id');
                    
                    if (inviteCode && inviterId) {
                      navigate(`/auth?community=${communityName}&invite=${inviteCode}&inviter=${inviterId}`);
                    } else {
                      navigate(`/auth?community=${communityName}`);
                    }
                  }}
                  size="default"
                  className="flex-1 sm:flex-initial font-semibold shadow-lg flex items-center gap-2 bg-primary hover:bg-primary/90"
                >
                  <UserPlus className="h-4 w-4" />
                  Sign Up Free
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}