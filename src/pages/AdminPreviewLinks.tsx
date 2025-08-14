import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Copy, Plus, Edit, BarChart3, ExternalLink } from "lucide-react";
import SEO from "@/components/SEO";

interface PreviewLink {
  id: string;
  slug: string;
  community: string;
  title: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

interface PreviewMetrics {
  total_sessions: number;
  total_reviews: number;
  total_costs: number;
  page_views: number;
  conversion_rate: number;
}

export default function AdminPreviewLinks() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<PreviewLink | null>(null);
  const [newLink, setNewLink] = useState({
    slug: "",
    community: "",
    title: "",
    description: "",
    is_active: true,
  });
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const { data: previewLinks, isLoading } = useQuery({
    queryKey: ["admin-preview-links"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("preview_links")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as PreviewLink[];
    },
  });

  const { data: metricsData } = useQuery({
    queryKey: ["admin-preview-metrics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("preview_metrics")
        .select(`
          event_type,
          session_id,
          created_at,
          preview_sessions!inner(community)
        `);
      
      if (error) throw error;
      
      // Process metrics by community
      const metricsByLink: Record<string, PreviewMetrics> = {};
      
      data.forEach((metric: any) => {
        const community = metric.preview_sessions.community;
        if (!metricsByLink[community]) {
          metricsByLink[community] = {
            total_sessions: 0,
            total_reviews: 0,
            total_costs: 0,
            page_views: 0,
            conversion_rate: 0,
          };
        }
        
        const metrics = metricsByLink[community];
        
        switch (metric.event_type) {
          case "page_view":
            metrics.page_views++;
            break;
          case "rate_vendor":
            metrics.total_reviews++;
            break;
          case "add_cost":
            metrics.total_costs++;
            break;
          case "identity_provided":
            metrics.total_sessions++;
            break;
        }
      });

      // Calculate conversion rates
      Object.values(metricsByLink).forEach(metrics => {
        if (metrics.page_views > 0) {
          metrics.conversion_rate = (metrics.total_sessions / metrics.page_views) * 100;
        }
      });

      return metricsByLink;
    },
  });

  const resetForm = () => {
    setNewLink({
      slug: "",
      community: "",
      title: "",
      description: "",
      is_active: true,
    });
    setEditingLink(null);
  };

  const generateSlug = (community: string) => {
    return community.toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  };

  const handleCommunityChange = (community: string) => {
    setNewLink(prev => ({
      ...prev,
      community,
      slug: generateSlug(community),
      title: `${community} — Vendor Preview`,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLink.slug || !newLink.community || !newLink.title) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      if (editingLink) {
        const { error } = await supabase
          .from("preview_links")
          .update({
            slug: newLink.slug,
            community: newLink.community,
            title: newLink.title,
            description: newLink.description || null,
            is_active: newLink.is_active,
          })
          .eq("id", editingLink.id);

        if (error) throw error;
        toast({ title: "Preview Link Updated", description: "Successfully updated the preview link." });
      } else {
        const { error } = await supabase
          .from("preview_links")
          .insert({
            slug: newLink.slug,
            community: newLink.community,
            title: newLink.title,
            description: newLink.description || null,
            is_active: newLink.is_active,
            created_by: (await supabase.auth.getUser()).data.user?.id,
          });

        if (error) throw error;
        toast({ title: "Preview Link Created", description: "Successfully created the preview link." });
      }

      queryClient.invalidateQueries({ queryKey: ["admin-preview-links"] });
      setIsCreateModalOpen(false);
      resetForm();
    } catch (error: any) {
      console.error("Failed to save preview link:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save preview link",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleLinkStatus = async (link: PreviewLink) => {
    try {
      const { error } = await supabase
        .from("preview_links")
        .update({ is_active: !link.is_active })
        .eq("id", link.id);

      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ["admin-preview-links"] });
      toast({
        title: "Status Updated",
        description: `Preview link ${!link.is_active ? "activated" : "deactivated"}.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update link status",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = (link: PreviewLink) => {
    const url = `${window.location.origin}/community-preview/${link.slug}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Copied!",
      description: "Preview link copied to clipboard.",
    });
  };

  const openEditModal = (link: PreviewLink) => {
    setEditingLink(link);
    setNewLink({
      slug: link.slug,
      community: link.community,
      title: link.title,
      description: link.description || "",
      is_active: link.is_active,
    });
    setIsCreateModalOpen(true);
  };

  return (
    <main className="container py-8 space-y-8">
      <SEO
        title="Admin — Preview Links Management"
        description="Manage Facebook community preview links and analytics"
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Preview Links</h1>
          <p className="text-muted-foreground mt-2">
            Manage Facebook community preview links and track engagement
          </p>
        </div>

        <Dialog open={isCreateModalOpen} onOpenChange={(open) => {
          setIsCreateModalOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Preview Link
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingLink ? "Edit Preview Link" : "Create Preview Link"}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="community">Community Name *</Label>
                <Input
                  id="community"
                  value={newLink.community}
                  onChange={(e) => handleCommunityChange(e.target.value)}
                  placeholder="Boca Bridges"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="slug">URL Slug *</Label>
                <Input
                  id="slug"
                  value={newLink.slug}
                  onChange={(e) => setNewLink(prev => ({ ...prev, slug: e.target.value }))}
                  placeholder="boca-bridges"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  URL: /community-preview/{newLink.slug}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="title">Page Title *</Label>
                <Input
                  id="title"
                  value={newLink.title}
                  onChange={(e) => setNewLink(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Boca Bridges — Vendor Preview"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newLink.description}
                  onChange={(e) => setNewLink(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Preview vendor listings and community reviews..."
                  rows={3}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={newLink.is_active}
                  onCheckedChange={(checked) => setNewLink(prev => ({ ...prev, is_active: checked }))}
                />
                <Label htmlFor="active">Active</Label>
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? "Saving..." : editingLink ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Preview Links */}
      <div className="space-y-4">
        {isLoading ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">Loading preview links...</p>
            </CardContent>
          </Card>
        ) : !previewLinks?.length ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">No preview links created yet.</p>
            </CardContent>
          </Card>
        ) : (
          previewLinks.map((link) => {
            const metrics = metricsData?.[link.community];
            const url = `${window.location.origin}/community-preview/${link.slug}`;
            
            return (
              <Card key={link.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{link.title}</CardTitle>
                      <p className="text-sm text-muted-foreground">{link.community}</p>
                      <p className="text-xs text-muted-foreground font-mono">{url}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={link.is_active ? "default" : "secondary"}>
                        {link.is_active ? "Active" : "Inactive"}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(link)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(link)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(url, "_blank")}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                {metrics && (
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                      <div className="text-center">
                        <p className="font-semibold text-lg">{metrics.page_views}</p>
                        <p className="text-muted-foreground">Page Views</p>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-lg">{metrics.total_sessions}</p>
                        <p className="text-muted-foreground">Sessions</p>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-lg">{metrics.total_reviews}</p>
                        <p className="text-muted-foreground">Reviews</p>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-lg">{metrics.total_costs}</p>
                        <p className="text-muted-foreground">Cost Shares</p>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-lg">{metrics.conversion_rate.toFixed(1)}%</p>
                        <p className="text-muted-foreground">Conversion</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleLinkStatus(link)}
                      >
                        {link.is_active ? "Deactivate" : "Activate"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(link)}
                      >
                        Copy Link
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })
        )}
      </div>
    </main>
  );
}