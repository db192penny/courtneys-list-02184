import { useEffect, useState } from "react";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { CATEGORIES } from "@/data/categories";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import useIsAdmin from "@/hooks/useIsAdmin";
import VendorNameInput, { type VendorSelectedPayload } from "@/components/VendorNameInput";
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

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    category: "",
    contact_info: "",
    community: "",
    google_place_id: "",
  });
  const [saving, setSaving] = useState(false);

  const canonical = typeof window !== "undefined" ? window.location.href : undefined;

  // Load vendors
  const loadVendors = async () => {
    try {
      const { data, error } = await supabase
        .from("vendors")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setVendors(data || []);
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

  // Open edit modal
  const openEditModal = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setEditFormData({
      name: vendor.name,
      category: vendor.category,
      contact_info: vendor.contact_info,
      community: vendor.community,
      google_place_id: vendor.google_place_id || "",
    });
    setEditModalOpen(true);
  };

  // Handle vendor selection from Google autocomplete
  const handleVendorSelected = async (payload: VendorSelectedPayload) => {
    setEditFormData(prev => ({
      ...prev,
      name: payload.name,
      google_place_id: payload.place_id,
      contact_info: payload.phone || prev.contact_info,
    }));

    // Fetch additional Google details
    try {
      const { data, error } = await supabase.functions.invoke('fetch-google-place-details', {
        body: { place_id: payload.place_id }
      });

      if (!error && data?.formatted_phone_number && !editFormData.contact_info.trim()) {
        setEditFormData(prev => ({
          ...prev,
          contact_info: data.formatted_phone_number,
        }));
      }
    } catch (err) {
      console.warn("Error fetching Google place details:", err);
    }
  };

  // Handle manual name input
  const handleManualNameInput = (inputName: string) => {
    setEditFormData(prev => ({
      ...prev,
      name: inputName,
      google_place_id: "",
    }));
  };

  // Save vendor edits
  const saveVendorEdits = async () => {
    if (!editingVendor) return;

    // Validation
    if (!editFormData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Provider name is required",
        variant: "destructive",
      });
      return;
    }

    if (!editFormData.contact_info.trim()) {
      toast({
        title: "Validation Error",
        description: "Contact info is required",
        variant: "destructive",
      });
      return;
    }

    if (!editFormData.category) {
      toast({
        title: "Validation Error",
        description: "Category is required",
        variant: "destructive",
      });
      return;
    }

    if (!editFormData.community.trim()) {
      toast({
        title: "Validation Error",
        description: "Community is required",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      // Prepare update data
      const updateData: any = {
        name: editFormData.name.trim(),
        contact_info: editFormData.contact_info.trim(),
        category: editFormData.category,
        community: editFormData.community.trim(),
        google_place_id: editFormData.google_place_id || null,
      };

      // If we have a new Google Place ID, fetch and update Google data
      if (editFormData.google_place_id && editFormData.google_place_id !== editingVendor.google_place_id) {
        try {
          const { data: googleData, error: googleError } = await supabase.functions.invoke('fetch-google-place-details', {
            body: { place_id: editFormData.google_place_id }
          });

          if (!googleError && googleData) {
            updateData.google_rating = googleData.rating;
            updateData.google_rating_count = googleData.user_ratings_total;
            updateData.google_last_updated = new Date().toISOString();
            updateData.google_reviews_json = googleData.reviews;
          }
        } catch (err) {
          console.warn("Failed to fetch Google data during vendor update:", err);
        }
      }

      const { error } = await supabase
        .from("vendors")
        .update(updateData)
        .eq("id", editingVendor.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Vendor updated successfully",
      });

      setEditModalOpen(false);
      setEditingVendor(null);
      loadVendors(); // Refresh the list
    } catch (error) {
      console.error("Failed to update vendor:", error);
      toast({
        title: "Error",
        description: "Failed to update vendor",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
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
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVendors.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
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
                  <TableCell>{new Date(vendor.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" variant="outline" onClick={() => openEditModal(vendor)}>
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

        {/* Edit Modal */}
        <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Vendor</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-category">Service Category</Label>
                <Select 
                  value={editFormData.category} 
                  onValueChange={(value) => setEditFormData(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger id="edit-category">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-name">Provider Name</Label>
                <VendorNameInput
                  id="edit-name"
                  placeholder="Search business name or enter manually..."
                  defaultValue={editFormData.name}
                  onSelected={handleVendorSelected}
                  onManualInput={handleManualNameInput}
                />
                {editFormData.google_place_id && (
                  <p className="text-xs text-green-600">✓ Verified business from Google</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-contact">Contact Info</Label>
                <Input 
                  id="edit-contact"
                  placeholder="Phone or email"
                  value={editFormData.contact_info}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, contact_info: e.target.value }))}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-community">Community/HOA</Label>
                <Input 
                  id="edit-community"
                  placeholder="Community name"
                  value={editFormData.community}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, community: e.target.value }))}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setEditModalOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button onClick={saveVendorEdits} disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </section>
    </main>
  );
};

export default AdminVendorManagement;