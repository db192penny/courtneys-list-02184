import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { ExternalLink, Copy, Settings, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";

interface PreviewLink {
  id: string;
  slug: string;
  community: string;
  title: string;
  description: string;
  is_active: boolean;
  created_at: string;
}

export const AdminQuickAccess = () => {
  const [latestPreviewLink, setLatestPreviewLink] = useState<PreviewLink | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLatestPreviewLink = async () => {
      try {
        const { data, error } = await supabase
          .from("preview_links")
          .select("*")
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.warn("Error fetching latest preview link:", error);
        } else {
          setLatestPreviewLink(data);
        }
      } catch (err) {
        console.warn("Error in fetchLatestPreviewLink:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLatestPreviewLink();
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const previewUrl = latestPreviewLink 
    ? `${window.location.origin}/community-preview/${latestPreviewLink.slug}`
    : null;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Preview Links Management
          </CardTitle>
          <CardDescription>
            Create and manage community preview links for potential residents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link to="/admin/preview-links">
              Manage Preview Links
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Latest Preview Link
          </CardTitle>
          <CardDescription>
            {loading 
              ? "Loading latest preview link..." 
              : latestPreviewLink 
                ? `${latestPreviewLink.title} • Created ${new Date(latestPreviewLink.created_at).toLocaleDateString()}`
                : "No active preview links found"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!loading && latestPreviewLink && previewUrl && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Button 
                  asChild 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                >
                  <a 
                    href={previewUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View Preview
                  </a>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => copyToClipboard(previewUrl)}
                  className="flex items-center gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Copy Link
                </Button>
              </div>
              <div className="p-2 bg-muted rounded text-xs font-mono text-muted-foreground break-all">
                {previewUrl}
              </div>
            </div>
          )}
          {!loading && !latestPreviewLink && (
            <Button asChild variant="outline" className="w-full">
              <Link to="/admin/preview-links">
                Create First Preview Link
              </Link>
            </Button>
          )}
          {loading && (
            <div className="animate-pulse bg-muted rounded h-8"></div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};