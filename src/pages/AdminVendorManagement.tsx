import { useEffect, useState } from "react";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CATEGORIES } from "@/data/categories";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import useIsAdmin from "@/hooks/useIsAdmin";
import { formatUSPhoneDisplay } from "@/utils/phone";

interface Vendor {
  id: string;
  name: string;
  category: string;
  contact_info: string;
  community: string;
  google_place_id: string | null;
  google_rating: number | null;
  google_rating_count: number | null;
  hoa_rating: number | null;
  hoa_rating_count: number | null;
  created_at: string;
  created_by: string;
}

const AdminVendorManagement = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();

  // State
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [communityFilter, setCommunityFilter] = useState("all");

  const canonical = typeof window !== "undefined" ? window.location.href : undefined;

  // Load vendors with rating stats
  const loadVendors = async () => {
    try {
      // Get all unique communities first
      const { data: communitiesData, error: communitiesError } = await supabase
        .from("vendors")
        .select("community")
        .order("community");

      if (communitiesError) throw communitiesError;

      const uniqueCommunities = [...new Set(communitiesData?.map(v => v.community) || [])];
      
      // Fetch vendor stats for each community
      const allVendors: Vendor[] = [];
      
      for (const community of uniqueCommunities) {
        const { data, error } = await supabase
          .rpc('list_vendor_stats', { _hoa_name: community });

        if (error) {
          console.error(`Failed to load vendors for ${community}:`, error);
          continue;
        }

        if (data) {
          const vendorsWithCommunity = data.map((vendor: any) => ({
            id: vendor.vendor_id,
            name: vendor.vendor_name,
            category: vendor.category,
            contact_info: vendor.contact_info || '',
            community: community,
            google_place_id: vendor.google_place_id,
            google_rating: vendor.google_rating,
            google_rating_count: vendor.google_rating_count,
            hoa_rating: vendor.hoa_rating,
            hoa_rating_count: vendor.hoa_rating_count,
            created_at: vendor.created_at || new Date().toISOString(),
            created_by: vendor.created_by || '',
          }));
          allVendors.push(...vendorsWithCommunity);
        }
      }

      // Remove duplicates (vendors might appear in multiple communities)
      const uniqueVendors = allVendors.reduce((acc: Vendor[], vendor) => {
        const existingIndex = acc.findIndex(v => v.id === vendor.id);
        if (existingIndex === -1) {
          acc.push(vendor);
        } else {
          // If vendor exists in multiple communities, keep the one with Boca Bridges if it exists
          if (vendor.community === "Boca Bridges" && acc[existingIndex].community !== "Boca Bridges") {
            acc[existingIndex] = vendor;
          }
        }
        return acc;
      }, []);

      // Sort by created date (newest first)
      uniqueVendors.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setVendors(uniqueVendors);
    } catch (error) {
      console.error("Failed to load vendors:", error);
      toast({
        title: "Error",
        description: "Failed to load vendors",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (adminLoading) return;
    
    if (!isAdmin) {
      toast({
        title: "Access denied",
        description: "You must be a site admin to access this page.",
        variant: "destructive"
      });
      navigate("/admin");
      return;
    }

    loadVendors();
  }, [isAdmin, adminLoading, navigate, toast]);

  // Filter vendors
  const filteredVendors = vendors.filter((vendor) => {
    const matchesSearch = vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vendor.contact_info.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || vendor.category === categoryFilter;
    const matchesCommunity = communityFilter === "all" || vendor.community === communityFilter;
    
    return matchesSearch && matchesCategory && matchesCommunity;
  });

  // Get unique communities for filter
  const communities = Array.from(new Set(vendors.map(v => v.community))).sort();

  // Open edit page
  const openEditPage = (vendor: Vendor) => {
    navigate(`/admin/vendors/edit?vendor_id=${vendor.id}`);
  };

  // Delete vendor
  const deleteVendor = async (vendor: Vendor) => {
    const confirmed = confirm(`Are you sure you want to delete "${vendor.name}"? This will also delete all associated reviews and cost data.`);
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from("vendors")
        .delete()
        .eq("id", vendor.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Vendor deleted successfully",
      });

      loadVendors(); // Refresh the list
    } catch (error) {
      console.error("Failed to delete vendor:", error);
      toast({
        title: "Error",
        description: "Failed to delete vendor",
        variant: "destructive",
      });
    }
  };

  if (adminLoading || loading) {
    return (
      <main className="min-h-screen bg-background">
        <section className="container py-10 max-w-6xl">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </section>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-background">
        <section className="container py-10 max-w-6xl">
          <p className="text-sm text-muted-foreground">Access denied. You must be a site admin to access this page.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <SEO
        title="Courtney's List | Admin Vendor Management"
        description="Admin tool to manage all vendors in the system."
        canonical={canonical}
      />
      <section className="container py-10 max-w-6xl">
        <header className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Vendor Management</h1>
          <p className="text-muted-foreground mt-2">
            View, edit, and manage all vendors in the system.
          </p>
        </header>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <Label htmlFor="search">Search</Label>
            <Input
              id="search"
              placeholder="Search by name or contact info..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-48">
            <Label htmlFor="category-filter">Category</Label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger id="category-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-48">
            <Label htmlFor="community-filter">Community</Label>
            <Select value={communityFilter} onValueChange={setCommunityFilter}>
              <SelectTrigger id="community-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Communities</SelectItem>
                {communities.map((community) => (
                  <SelectItem key={community} value={community}>{community}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Vendors Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Community</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Google Rating</TableHead>
                <TableHead>Boca Bridges Rating</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVendors.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No vendors found.
                  </TableCell>
                </TableRow>
              )}
              {filteredVendors.map((vendor) => (
                <TableRow key={vendor.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {vendor.name}
                      {vendor.google_place_id && (
                        <span className="text-xs text-green-600">✓</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{vendor.category}</TableCell>
                  <TableCell>{vendor.community}</TableCell>
                  <TableCell>{formatUSPhoneDisplay(vendor.contact_info)}</TableCell>
                  <TableCell>
                    {vendor.google_rating ? (
                      <span>{vendor.google_rating} ({vendor.google_rating_count})</span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    {vendor.hoa_rating && vendor.hoa_rating_count ? (
                      <span>{vendor.hoa_rating.toFixed(1)} ({vendor.hoa_rating_count} {vendor.hoa_rating_count === 1 ? 'review' : 'reviews'})</span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>{new Date(vendor.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" variant="outline" onClick={() => openEditPage(vendor)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => deleteVendor(vendor)}>
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Results count */}
        <div className="mt-4 text-sm text-muted-foreground">
          Showing {filteredVendors.length} of {vendors.length} vendors
        </div>

      </section>
    </main>
  );
};

export default AdminVendorManagement;
