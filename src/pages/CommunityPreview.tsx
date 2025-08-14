import { useMemo, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import CommunityVendorTable from "@/components/vendors/CommunityVendorTable";
import { usePreviewSession } from "@/hooks/usePreviewSession";

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

  if (!slug) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-semibold">Invalid Preview Link</h1>
          <p className="text-muted-foreground">The preview link you accessed is not valid.</p>
          <Button onClick={() => navigate("/")} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Main Site
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
      <div className="bg-primary text-primary-foreground py-3">
        <div className="container text-center">
          <p className="text-sm font-medium">
            Hi - thanks for helping with this list. Please rate at least three vendors (more if we have them :)
          </p>
        </div>
      </div>

      <div className="container py-8 space-y-8">
        {/* Logo and Header */}
        <header className="text-center space-y-4">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <span className="text-2xl font-bold text-primary">CL</span>
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{communityName}</h1>
            <p className="text-muted-foreground mt-2">
              Neighbor-recommended service providers
            </p>
          </div>
        </header>

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
            <h2 className="text-xl font-semibold">Service Providers</h2>
            <p className="text-sm text-muted-foreground">
              Rate and share your experiences
            </p>
          </div>
          
          <CommunityVendorTable 
            communityName={communityName} 
            showContact={true}
            isPreviewMode={true}
          />
        </div>

      </div>
    </main>
  );
};

export default CommunityPreview;