import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink, RefreshCw } from "lucide-react";
import VendorNameInput, { type VendorSelectedPayload } from "@/components/VendorNameInput";

interface AdminVendor {
  id: string;
  name: string;
  category: string;
  contact_info: string;
  community: string;
  google_place_id?: string;
  google_rating?: number;
  google_rating_count?: number;
}

interface VendorEditModalProps {
  vendor: AdminVendor;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const CATEGORIES = [
  "HVAC", "Plumbing", "Electrical", "Landscaping", "Pool", "Pest Control",
  "Handyman", "Roofing", "General Contractor", "Power Washing", "Pressure Washing",
  "Appliance Repair", "Flooring", "Painting", "Tree Service", "Security",
  "Cleaning Service", "Window Treatment", "Garage Door", "Other"
];

interface GooglePlaceDetails {
  name?: string;
  formatted_phone_number?: string;
  formatted_address?: string;
  rating?: number;
  user_ratings_total?: number;
}

export function VendorEditModal({ vendor, open, onOpenChange, onSuccess }: VendorEditModalProps) {
  const [formData, setFormData] = useState({
    name: vendor.name,
    category: vendor.category,
    contact_info: vendor.contact_info,
    community: vendor.community,
    google_place_id: vendor.google_place_id || "",
  });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleData, setGoogleData] = useState<GooglePlaceDetails | null>(null);
  const [communities, setCommunities] = useState<string[]>([]);

  useEffect(() => {
    // Fetch available communities
    const fetchCommunities = async () => {
      const { data } = await supabase
        .from("vendors")
        .select("community")
        .not("community", "is", null);
      
      const uniqueCommunities = [...new Set(data?.map(v => v.community).filter(Boolean))].sort();
      setCommunities(uniqueCommunities);
    };

    fetchCommunities();
  }, []);

  const fetchGooglePlaceDetails = async (placeId: string) => {
    if (!placeId.trim()) return;
    
    setGoogleLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-google-place-details", {
        body: { place_id: placeId.trim() }
      });

      if (error) throw error;
      
      if (data) {
        setGoogleData(data);
        toast.success("Google data fetched successfully");
      }
    } catch (error) {
      console.error("Error fetching Google place details:", error);
      toast.error("Failed to fetch Google data");
      setGoogleData(null);
    } finally {
      setGoogleLoading(false);
    }
  };

  const applyGoogleData = () => {
    if (!googleData) return;
    
    setFormData(prev => ({
      ...prev,
      name: googleData.name || prev.name,
      contact_info: googleData.formatted_phone_number || prev.contact_info,
    }));
    
    toast.success("Google data applied to form");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const updateData: any = {
        name: formData.name.trim(),
        category: formData.category,
        contact_info: formData.contact_info.trim(),
        community: formData.community.trim() || null,
      };

      // Only update Google data if we have fresh data or if place_id changed
      if (formData.google_place_id !== vendor.google_place_id) {
        updateData.google_place_id = formData.google_place_id.trim() || null;
        
        // If we have fresh Google data, update ratings too
        if (googleData && formData.google_place_id.trim()) {
          updateData.google_rating = googleData.rating || null;
          updateData.google_rating_count = googleData.user_ratings_total || null;
        }
      }

      const { error } = await supabase
        .from("vendors")
        .update(updateData)
        .eq("id", vendor.id);

      if (error) throw error;

      toast.success("Vendor updated successfully");
      onSuccess();
    } catch (error) {
      console.error("Error updating vendor:", error);
      toast.error("Failed to update vendor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Vendor</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Vendor Name</Label>
              <VendorNameInput
                id="name"
                defaultValue={formData.name}
                placeholder="Start typing business name..."
                onSelected={(payload: VendorSelectedPayload) => {
                  setFormData(prev => ({
                    ...prev,
                    name: payload.name,
                    contact_info: payload.phone || prev.contact_info,
                    google_place_id: payload.place_id,
                  }));
                  
                  // Auto-populate Google data if available
                  if (payload.rating || payload.user_ratings_total) {
                    setGoogleData({
                      name: payload.name,
                      formatted_phone_number: payload.phone,
                      formatted_address: payload.formatted_address,
                      rating: payload.rating,
                      user_ratings_total: payload.user_ratings_total,
                    });
                  }
                  
                  toast.success("Business data populated from Google Places");
                }}
                onManualInput={(name: string) => {
                  setFormData(prev => ({ ...prev, name }));
                }}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="contact">Contact Info</Label>
              <Input
                id="contact"
                value={formData.contact_info}
                onChange={(e) => setFormData(prev => ({ ...prev, contact_info: e.target.value }))}
                placeholder="Phone number, website, or other contact info"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="community">Community/HOA</Label>
              <Select
                value={formData.community}
                onValueChange={(value) => setFormData(prev => ({ ...prev, community: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a community" />
                </SelectTrigger>
                <SelectContent>
                  {communities.map(community => (
                    <SelectItem key={community} value={community}>{community}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Google Places Integration */}
          <div className="border-t pt-6">
            <h3 className="font-medium mb-4">Google Places Integration</h3>
            
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="google-place-id">Google Place ID</Label>
                <div className="flex gap-2">
                  <Input
                    id="google-place-id"
                    value={formData.google_place_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, google_place_id: e.target.value }))}
                    placeholder="Google Place ID (optional)"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fetchGooglePlaceDetails(formData.google_place_id)}
                    disabled={!formData.google_place_id.trim() || googleLoading}
                  >
                    {googleLoading ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      "Fetch"
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter a Google Place ID to auto-populate business information
                </p>
              </div>

              {googleData && (
                <div className="rounded-lg border p-4 bg-muted/50">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">Google Place Data</h4>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={applyGoogleData}
                    >
                      Apply to Form
                    </Button>
                  </div>
                  
                  <div className="grid gap-2 text-sm">
                    {googleData.name && (
                      <div>
                        <span className="font-medium">Name:</span> {googleData.name}
                      </div>
                    )}
                    {googleData.formatted_phone_number && (
                      <div>
                        <span className="font-medium">Phone:</span> {googleData.formatted_phone_number}
                      </div>
                    )}
                    {googleData.formatted_address && (
                      <div>
                        <span className="font-medium">Address:</span> {googleData.formatted_address}
                      </div>
                    )}
                    {googleData.rating && (
                      <div>
                        <span className="font-medium">Rating:</span> {googleData.rating} ({googleData.user_ratings_total} reviews)
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Current Google Status */}
          {vendor.google_place_id && (
            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">Current Google Integration</h4>
              <div className="flex items-center gap-2">
                <Badge variant="outline">Google Verified</Badge>
                {vendor.google_rating && (
                  <span className="text-sm text-muted-foreground">
                    {vendor.google_rating.toFixed(1)} rating ({vendor.google_rating_count} reviews)
                  </span>
                )}
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={() => window.open(`https://www.google.com/maps/place/?q=place_id:${vendor.google_place_id}`, '_blank')}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  View on Google
                </Button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}