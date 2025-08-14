import { useEffect, useState } from "react";
import SEO from "@/components/SEO";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { StarRating } from "@/components/ui/star-rating";
import { useToast } from "@/hooks/use-toast";
import { CATEGORIES } from "@/data/categories";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";
import CostInputs, { buildDefaultCosts, type CostEntry } from "@/components/vendors/CostInputs";
import useIsAdmin from "@/hooks/useIsAdmin";
import useIsHoaAdmin from "@/hooks/useIsHoaAdmin";
import { useUserData } from "@/hooks/useUserData";
import ReviewPreview from "@/components/ReviewPreview";
import VendorNameInput, { type VendorSelectedPayload } from "@/components/VendorNameInput";

const AdminEditVendor = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // form state
  const [category, setCategory] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [contact, setContact] = useState<string>("");
  const [community, setCommunity] = useState<string>("");
  const [googlePlaceId, setGooglePlaceId] = useState<string>("");
  const [isManualEntry, setIsManualEntry] = useState<boolean>(false);
  const [costEntries, setCostEntries] = useState<CostEntry[]>(buildDefaultCosts());
  const [rating, setRating] = useState<number>(4);
  const [comments, setComments] = useState<string>("");
  const [showNameInReview, setShowNameInReview] = useState(true);
  const [useForHome, setUseForHome] = useState(false);
  const [myReviewId, setMyReviewId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const { data: isAdmin } = useIsAdmin();
  const { data: isHoaAdmin } = useIsHoaAdmin();
  const { data: userData } = useUserData();

  const canonical = typeof window !== "undefined" ? window.location.href : undefined;
  const vendorId = searchParams.get("vendor_id");

  useEffect(() => {
    // Check admin permissions
    if (!isAdmin && !isHoaAdmin) {
      toast({
        title: "Access denied",
        description: "You must be an admin to edit vendors.",
        variant: "destructive",
      });
      navigate("/admin");
      return;
    }

    if (!vendorId) {
      toast({
        title: "No vendor specified",
        description: "No vendor ID provided to edit.",
        variant: "destructive",
      });
      navigate("/admin/vendors/manage");
      return;
    }

    // Load vendor data
    const loadVendor = async () => {
      try {
        const { data, error } = await supabase
          .from("vendors")
          .select("*")
          .eq("id", vendorId)
          .single();

        if (error) throw error;

        setCategory(data.category || "");
        setName(data.name || "");
        setContact(data.contact_info || "");
        setCommunity(data.community || "Boca Bridges");
        setGooglePlaceId(data.google_place_id || "");
        setIsManualEntry(!data.google_place_id);
        
        const defaults = buildDefaultCosts(data.category || "");
        if (data.typical_cost != null && defaults.length) {
          defaults[0].amount = Number(data.typical_cost);
        }
        setCostEntries(defaults);
      } catch (error) {
        console.error("Failed to load vendor:", error);
        toast({
          title: "Error",
          description: "Failed to load vendor details",
          variant: "destructive",
        });
        navigate("/admin/vendors/manage");
      } finally {
        setLoading(false);
      }
    };

    loadVendor();
  }, [vendorId, isAdmin, isHoaAdmin, navigate, toast]);

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

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !vendorId) return;

    // Validation
    if (!category) {
      toast({ title: "Category required", description: "Please select a service category.", variant: "destructive" });
      return;
    }
    if (!name.trim()) {
      toast({ title: "Provider name required", description: "Please enter the provider name.", variant: "destructive" });
      return;
    }
    if (!contact.trim()) {
      toast({ title: "Contact info required", description: "Please enter phone or email.", variant: "destructive" });
      return;
    }
    if (!community.trim()) {
      toast({ title: "Community required", description: "Please enter the community name.", variant: "destructive" });
      return;
    }

    setSubmitting(true);

    try {
      // Derive a typical cost number from dynamic cost entries
      const pickCostNum = () => {
        const byKind = (k: "monthly_plan" | "service_call" | "hourly") =>
          costEntries.find((e) => e.cost_kind === k && e.amount != null)?.amount ?? null;
        return byKind("monthly_plan") ?? byKind("service_call") ?? byKind("hourly") ?? null;
      };
      const costNum = pickCostNum();

      // Prepare update data
      const updateData: any = {
        name: name.trim(),
        category,
        contact_info: contact.trim(),
        community: community.trim(),
        typical_cost: costNum,
        google_place_id: googlePlaceId || null,
      };

      // If we have a Google Place ID, fetch and update Google data
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
        title: "Vendor updated!",
        description: "The vendor has been successfully updated.",
      });

      navigate("/admin/vendors/manage");
    } catch (error) {
      console.error("Failed to update vendor:", error);
      toast({
        title: "Error",
        description: "Failed to update vendor",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <section className="container py-10 max-w-2xl">
          <p className="text-sm text-muted-foreground">Loading vendor details...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <SEO
        title="Courtney's List | Edit Vendor"
        description="Edit vendor details and information."
        canonical={canonical}
      />
      <section className="container py-10 max-w-2xl">
        <header className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Edit Vendor</h1>
          <p className="text-muted-foreground mt-2">
            Update provider details and information.
          </p>
        </header>

        <form onSubmit={onSubmit} className="space-y-6">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="category">Service Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="category">
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
              <Label htmlFor="name">Provider Name</Label>
              <VendorNameInput
                id="name"
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
              <Label htmlFor="contact">Provider Contact Info</Label>
              <Input 
                id="contact" 
                placeholder="phone or email" 
                value={contact} 
                onChange={(e) => setContact(e.currentTarget.value)} 
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="community">Community/HOA</Label>
              <Input 
                id="community" 
                placeholder="Community name" 
                value={community} 
                onChange={(e) => setCommunity(e.currentTarget.value)} 
              />
            </div>

            <div className="grid gap-2">
              <CostInputs category={category} value={costEntries} onChange={setCostEntries} />
            </div>
          </div>

          <div className="flex justify-between pt-6">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => navigate("/admin/vendors/manage")}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Updating..." : "Update Vendor"}
            </Button>
          </div>
        </form>
      </section>
    </main>
  );
};

export default AdminEditVendor;