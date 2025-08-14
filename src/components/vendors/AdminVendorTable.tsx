import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/sonner";
import { Pencil, Trash2, RefreshCw, Search } from "lucide-react";
import { VendorEditModal } from "./VendorEditModal";
import { VendorDeleteDialog } from "./VendorDeleteDialog";

interface AdminVendor {
  id: string;
  name: string;
  category: string;
  contact_info: string;
  community: string;
  google_place_id?: string;
  google_rating?: number;
  google_rating_count?: number;
  created_at: string;
  created_by?: string;
  creator_name?: string;
  creator_email?: string;
  review_count: number;
  cost_count: number;
  home_vendor_count: number;
  hoa_rating?: number;
  hoa_rating_count?: number;
}

type SortOption = "created_at_desc" | "created_at_asc" | "name_asc" | "category_asc" | "creator_name_asc" | "review_count_desc" | "hoa_rating_desc";

const SORT_OPTIONS = [
  { value: "created_at_desc", label: "Recently Added" },
  { value: "name_asc", label: "Vendor Name (A-Z)" },
  { value: "category_asc", label: "Category (A-Z)" },
  { value: "creator_name_asc", label: "Creator Name (A-Z)" },
  { value: "created_at_asc", label: "Oldest First" },
  { value: "review_count_desc", label: "Most Reviewed" },
  { value: "hoa_rating_desc", label: "Highest Rated" },
] as const;

export function AdminVendorTable() {
  const [vendors, setVendors] = useState<AdminVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [communityFilter, setCommunityFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("created_at_desc");
  const [editingVendor, setEditingVendor] = useState<AdminVendor | null>(null);
  const [deletingVendor, setDeletingVendor] = useState<AdminVendor | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [communities, setCommunities] = useState<string[]>([]);

  const fetchVendors = async () => {
    setLoading(true);
    try {
      // Get vendors with creator info and stats
      const { data: vendorData, error: vendorError } = await supabase
        .from("vendors")
        .select(`
          id,
          name,
          category,
          contact_info,
          community,
          google_place_id,
          google_rating,
          google_rating_count,
          created_at,
          created_by,
          users!vendors_created_by_fkey (
            name,
            email
          )
        `)
        .order("created_at", { ascending: false });

      if (vendorError) throw vendorError;

      // Get stats for each vendor
      const vendorIds = vendorData?.map(v => v.id) || [];
      
      const [reviewStats, costStats, homeVendorStats, hoaRatings] = await Promise.all([
        // Review counts
        supabase
          .from("reviews")
          .select("vendor_id")
          .in("vendor_id", vendorIds),
        
        // Cost counts  
        supabase
          .from("costs")
          .select("vendor_id")
          .in("vendor_id", vendorIds),
          
        // Home vendor counts
        supabase
          .from("home_vendors")
          .select("vendor_id")
          .in("vendor_id", vendorIds),
          
        // HOA ratings
        supabase
          .from("reviews")
          .select("vendor_id, rating")
          .in("vendor_id", vendorIds)
      ]);

      // Process stats
      const reviewCounts = reviewStats.data?.reduce((acc, item) => {
        acc[item.vendor_id] = (acc[item.vendor_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const costCounts = costStats.data?.reduce((acc, item) => {
        acc[item.vendor_id] = (acc[item.vendor_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const homeVendorCounts = homeVendorStats.data?.reduce((acc, item) => {
        acc[item.vendor_id] = (acc[item.vendor_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const hoaRatingStats = hoaRatings.data?.reduce((acc, item) => {
        if (!acc[item.vendor_id]) {
          acc[item.vendor_id] = { total: 0, count: 0 };
        }
        acc[item.vendor_id].total += item.rating;
        acc[item.vendor_id].count += 1;
        return acc;
      }, {} as Record<string, { total: number; count: number }>) || {};

      // Combine data
      const enrichedVendors: AdminVendor[] = vendorData?.map(vendor => ({
        id: vendor.id,
        name: vendor.name,
        category: vendor.category,
        contact_info: vendor.contact_info,
        community: vendor.community || "",
        google_place_id: vendor.google_place_id || undefined,
        google_rating: vendor.google_rating || undefined,
        google_rating_count: vendor.google_rating_count || undefined,
        created_at: vendor.created_at || "",
        created_by: vendor.created_by || undefined,
        creator_name: (vendor.users as any)?.name || undefined,
        creator_email: (vendor.users as any)?.email || undefined,
        review_count: reviewCounts[vendor.id] || 0,
        cost_count: costCounts[vendor.id] || 0,
        home_vendor_count: homeVendorCounts[vendor.id] || 0,
        hoa_rating: hoaRatingStats[vendor.id] ? hoaRatingStats[vendor.id].total / hoaRatingStats[vendor.id].count : undefined,
        hoa_rating_count: hoaRatingStats[vendor.id]?.count || 0,
      })) || [];

      setVendors(enrichedVendors);
      
      // Extract unique categories and communities for filters
      const uniqueCategories = [...new Set(enrichedVendors.map(v => v.category))].sort();
      const uniqueCommunities = [...new Set(enrichedVendors.map(v => v.community).filter(Boolean))].sort();
      
      setCategories(uniqueCategories);
      setCommunities(uniqueCommunities);
      
    } catch (error) {
      console.error("Error fetching vendors:", error);
      toast.error("Failed to load vendors");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  // Filter and sort vendors
  const filteredAndSortedVendors = vendors
    .filter(vendor => {
      const matchesSearch = !searchTerm || 
        vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vendor.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vendor.contact_info.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vendor.creator_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vendor.creator_email?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = categoryFilter === "all" || vendor.category === categoryFilter;
      const matchesCommunity = communityFilter === "all" || vendor.community === communityFilter;
      
      return matchesSearch && matchesCategory && matchesCommunity;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "created_at_desc":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "created_at_asc":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "name_asc":
          return a.name.localeCompare(b.name);
        case "category_asc":
          return a.category.localeCompare(b.category);
        case "creator_name_asc":
          return (a.creator_name || "").localeCompare(b.creator_name || "");
        case "review_count_desc":
          return b.review_count - a.review_count;
        case "hoa_rating_desc":
          return (b.hoa_rating || 0) - (a.hoa_rating || 0);
        default:
          return 0;
      }
    });

  const handleVendorUpdated = () => {
    fetchVendors();
    setEditingVendor(null);
  };

  const handleVendorDeleted = () => {
    fetchVendors();
    setDeletingVendor(null);
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search vendors, categories, or creators..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(category => (
                <SelectItem key={category} value={category}>{category}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={communityFilter} onValueChange={setCommunityFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Community" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Communities</SelectItem>
              {communities.map(community => (
                <SelectItem key={community} value={community}>{community}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" onClick={fetchVendors} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredAndSortedVendors.length} of {vendors.length} vendors
      </div>

      {/* Vendors Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendor</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Community</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Ratings</TableHead>
              <TableHead>Stats</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Creator</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  Loading vendors...
                </TableCell>
              </TableRow>
            ) : filteredAndSortedVendors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No vendors found
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedVendors.map((vendor) => (
                <TableRow key={vendor.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <div className="font-medium">{vendor.name}</div>
                      {vendor.google_place_id && (
                        <Badge variant="outline" className="w-fit text-xs">
                          Google Verified
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>{vendor.category}</TableCell>
                  
                  <TableCell>{vendor.community || "—"}</TableCell>
                  
                  <TableCell className="max-w-[200px] truncate">
                    {vendor.contact_info}
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex flex-col gap-1 text-sm">
                      {vendor.google_rating && (
                        <div>Google: {vendor.google_rating.toFixed(1)} ({vendor.google_rating_count})</div>
                      )}
                      {vendor.hoa_rating && (
                        <div>Community: {vendor.hoa_rating.toFixed(1)} ({vendor.hoa_rating_count})</div>
                      )}
                      {!vendor.google_rating && !vendor.hoa_rating && "—"}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex flex-col gap-1 text-sm">
                      <div>{vendor.review_count} reviews</div>
                      <div>{vendor.cost_count} costs</div>
                      <div>{vendor.home_vendor_count} users</div>
                    </div>
                  </TableCell>
                  
                  <TableCell className="text-sm">
                    {new Date(vendor.created_at).toLocaleDateString()}
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex flex-col text-sm">
                      <div>{vendor.creator_name || "Unknown"}</div>
                      <div className="text-muted-foreground text-xs">{vendor.creator_email}</div>
                    </div>
                  </TableCell>
                  
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingVendor(vendor)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeletingVendor(vendor)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Modal */}
      {editingVendor && (
        <VendorEditModal
          vendor={editingVendor}
          open={!!editingVendor}
          onOpenChange={(open) => !open && setEditingVendor(null)}
          onSuccess={handleVendorUpdated}
        />
      )}

      {/* Delete Dialog */}
      {deletingVendor && (
        <VendorDeleteDialog
          vendor={deletingVendor}
          open={!!deletingVendor}
          onOpenChange={(open) => !open && setDeletingVendor(null)}
          onSuccess={handleVendorDeleted}
        />
      )}
    </div>
  );
}