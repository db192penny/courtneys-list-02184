import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIES } from "@/data/categories";
import { supabase } from "@/integrations/supabase/client";
import VendorNameInput, { type VendorSelectedPayload } from "@/components/VendorNameInput";

export interface AdminEditVendorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendorId: string | null;
  onSuccess: () => void;
}

export default function AdminEditVendorModal({
  open,
  onOpenChange,
  vendorId,
  onSuccess,
}: AdminEditVendorModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [category, setCategory] = useState("");
  const [community, setCommunity] = useState("");
  const [googlePlaceId, setGooglePlaceId] = useState("");
  const [isManualEntry, setIsManualEntry] = useState(false);

  // Load vendor data when modal opens
  useEffect(() => {
    if (!open || !vendorId) {
      // Reset form when modal closes or no vendor selected
      setName("");
      setContact("");
      setCategory("");
      setCommunity("");
      setGooglePlaceId("");
      setIsManualEntry(false);
      return;
    }

    const loadVendor = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("vendors")
          .select("*")
          .eq("id", vendorId)
          .single();

        if (error) throw error;

        setName(data.name || "");
        setContact(data.contact_info || "");
        setCategory(data.category || "");
        setCommunity(data.community || "");
        setGooglePlaceId(data.google_place_id || "");
        setIsManualEntry(!data.google_place_id);
      } catch (error) {
        console.error("Failed to load vendor:", error);
        toast({
          title: "Error",
          description: "Failed to load vendor details",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadVendor();
  }, [open, vendorId, toast]);

  const handleVendorSelected = async (payload: VendorSelectedPayload) => {
    setName(payload.name);
    setGooglePlaceId(payload.place_id);
    setIsManualEntry(false);
    
    // Auto-populate contact info if available
    if (payload.phone) {
      setContact(payload.phone);
    }

    // Fetch additional Google details
    try {
      const { data, error } = await supabase.functions.invoke('fetch-google-place-details', {
        body: { place_id: payload.place_id }
      });

      if (!error && data?.formatted_phone_number && !contact.trim()) {
        setContact(data.formatted_phone_number);
      }
    } catch (err) {
      console.warn("Error fetching Google place details:", err);
    }
  };

  const handleManualNameInput = (inputName: string) => {
    setName(inputName);
    setIsManualEntry(true);
    setGooglePlaceId("");
  };

  const handleSave = async () => {
    if (!vendorId) return;

    // Validation
    if (!name.trim()) {
      toast({
        title: "Validation Error",
        description: "Provider name is required",
        variant: "destructive",
      });
      return;
    }

    if (!contact.trim()) {
      toast({
        title: "Validation Error", 
        description: "Contact info is required",
        variant: "destructive",
      });
      return;
    }

    if (!category) {
      toast({
        title: "Validation Error",
        description: "Category is required", 
        variant: "destructive",
      });
      return;
    }

    if (!community.trim()) {
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
        name: name.trim(),
        contact_info: contact.trim(),
        category,
        community: community.trim(),
        google_place_id: googlePlaceId || null,
      };

      // If we have a new Google Place ID, fetch and update Google data
      if (googlePlaceId) {
        try {
          const { data: googleData, error: googleError } = await supabase.functions.invoke('fetch-google-place-details', {
            body: { place_id: googlePlaceId }
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
        .eq("id", vendorId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Vendor updated successfully",
      });

      onSuccess();
      onOpenChange(false);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Vendor</DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="py-8 text-center text-muted-foreground">
            Loading vendor details...
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-category">Service Category</Label>
              <Select value={category} onValueChange={setCategory}>
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
                defaultValue={name}
                onSelected={handleVendorSelected}
                onManualInput={handleManualNameInput}
              />
              {!isManualEntry && googlePlaceId && (
                <p className="text-xs text-green-600">✓ Verified business from Google</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-contact">Contact Info</Label>
              <Input 
                id="edit-contact"
                placeholder="Phone or email"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-community">Community/HOA</Label>
              <Input 
                id="edit-community"
                placeholder="Community name"
                value={community}
                onChange={(e) => setCommunity(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}