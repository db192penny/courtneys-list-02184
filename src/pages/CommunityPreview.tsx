import { useMemo, useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import CommunityVendorTable from "@/components/vendors/CommunityVendorTable";
import { usePreviewSession } from "@/hooks/usePreviewSession";
import EmailManagementPanel from "@/components/preview/EmailManagementPanel";
import { useScrollDirection } from "@/hooks/useScrollDirection";
import { BackToTopButton } from "@/components/ui/BackToTopButton";


function slugToName(slug: string): string {
  return slug
    .split("-")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

const CommunityPreview = () => {
  const canonical = typeof window !== "undefined" ? window.location.href : undefined;
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { trackEvent } = usePreviewSession();
  const { isScrollingDown, hasScrolled } = useScrollDirection();
  const [hideHeader, setHideHeader] = useState(false);
  useEffect(() => {
    if (hasScrolled) setHideHeader(true);
  }, [hasScrolled]);
  
  const communityName = useMemo(() => (slug ? slugToName(slug) : ""), [slug]);

  // Track page view
  useEffect(() => {
    if (communityName) {
      trackEvent("page_view", null, { 
        community: communityName,
        source: searchParams.get("src") || "direct"
      });
    }
  }, [communityName, trackEvent, searchParams]);

  const { data: previewLink } = useQuery({
    queryKey: ["preview-link", slug],
    queryFn: async () => {
      if (!slug) return null;
      
      const { data, error } = await supabase
        .from("preview_links")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();

      if (error) {
        console.error("Failed to fetch preview link:", error);
        return null;
      }
      
      return data;
    },
    enabled: !!slug,
  });

  const { data: community, isLoading: communityLoading } = useQuery({
    queryKey: ["community-assets", communityName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_assets")
        .select("*")
        .ilike("hoa_name", communityName)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Failed to fetch community:", error);
        return null;
      }
      return data;
    },
    enabled: !!communityName,
  });

  const photoUrl = useMemo(() => {
    if (community?.photo_path) {
      return supabase.storage.from("community-photos").getPublicUrl(community.photo_path).data.publicUrl;
    }
    return "/lovable-uploads/fa4d554f-323c-4bd2-b5aa-7cd1f2289c3c.png";
  }, [community?.photo_path]);

  if (!slug) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-semibold">Invalid Preview Link</h1>
          <p className="text-muted-foreground">The preview link you accessed is not valid.</p>
          <Button onClick={() => navigate("/signin")} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  const title = previewLink?.title || `${communityName} — Vendor Preview`;
  const description = previewLink?.description || `Preview vendor listings and community reviews for ${communityName}. Early access to neighbor recommendations.`;

  
  return (
    <main className="min-h-screen bg-background">
      <SEO
        title={title}
        description={description}
        canonical={canonical}
      />

      {/* Early Preview Banner */}
      <div className={`bg-primary text-primary-foreground py-3 ${
        isScrollingDown ? 'fixed -top-full' : 'sticky top-0'
      } left-0 right-0 z-40 transition-all duration-300 ease-in-out`}>
        <div className="container text-center">
          <p className="text-sm font-medium">
            Hi - thanks so much for helping with this list. Please rate at least three vendors (more if you see them :)
          </p>
        </div>
      </div>

      <div className="container py-8 space-y-8">
        {/* Hero Card - Desktop/Tablet Only */}
        {!hideHeader && (
          <div className="hidden md:block">
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
                    <p className="text-sm text-muted-foreground">Early preview - Help us rate these providers</p>
                  </div>
                  
                  {/* Preview badge instead of stats */}
                  <div className="px-4 py-2 bg-primary/10 rounded-lg border border-primary/20">
                    <p className="text-sm font-medium text-primary">Preview Mode</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Community Info */}
        {!communityLoading && community && (
          <div className="bg-muted/50 rounded-lg p-6 text-center space-y-2">
            {community.address_line && (
              <p className="text-sm text-muted-foreground">{community.address_line}</p>
            )}
            {community.contact_phone && (
              <p className="text-sm text-muted-foreground">
                Community Contact: {community.contact_phone}
              </p>
            )}
          </div>
        )}

        {/* Vendor Table */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Service Providers</h2>
              <p className="text-sm text-muted-foreground">
                Rate and share your experiences
              </p>
            </div>
            <div className="flex gap-2">
              <EmailManagementPanel communityName={communityName} />
            </div>
          </div>
          
          <CommunityVendorTable 
            communityName={communityName} 
            showContact={true}
            isAuthenticated={false}
            isVerified={false}
          />
        </div>

      </div>

      {/* Back to Top Button */}
      <BackToTopButton />
    </main>
  );
};

export default CommunityPreview;