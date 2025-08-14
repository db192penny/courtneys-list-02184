
import { useEffect, useMemo, useState } from "react";
import SEO from "@/components/SEO";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
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
const SubmitVendor = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // form state
  const [category, setCategory] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [contact, setContact] = useState<string>("");
  const [googlePlaceId, setGooglePlaceId] = useState<string>("");
  const [isManualEntry, setIsManualEntry] = useState<boolean>(false);
  const [costEntries, setCostEntries] = useState<CostEntry[]>(buildDefaultCosts());
  const [rating, setRating] = useState<number>(4);
  const [comments, setComments] = useState<string>("");
  const [showNameInReview, setShowNameInReview] = useState(true);
  const [useForHome, setUseForHome] = useState(true);
  const [myReviewId, setMyReviewId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { data: isAdmin } = useIsAdmin();
  const { data: isHoaAdmin } = useIsHoaAdmin();
  const { data: userData } = useUserData();

  const canonical = typeof window !== "undefined" ? window.location.href : undefined;

  const vendorId = searchParams.get("vendor_id");
  const canEditCore = !!isAdmin || !!isHoaAdmin || !vendorId;

  useEffect(() => {
    console.log("[SubmitVendor] mounted");
    // If editing, prefill the form
    const loadVendor = async () => {
      if (!vendorId) return;
      const { data, error } = await supabase.from("vendors").select("*").eq("id", vendorId).maybeSingle();
      if (error) {
        console.warn("[SubmitVendor] failed to load vendor:", error);
        return;
      }
      if (data) {
        setCategory(data.category || "");
        setName(data.name || "");
        setContact(data.contact_info || "");
        setGooglePlaceId(data.google_place_id || "");
        setIsManualEntry(!data.google_place_id);
        const defaults = buildDefaultCosts(data.category || "");
        if (data.typical_cost != null && defaults.length) defaults[0].amount = Number(data.typical_cost);
        setCostEntries(defaults);
      }
    };

    const prefillShowName = async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { data } = await supabase
        .from("users")
        .select("show_name_public")
        .eq("id", auth.user.id)
        .maybeSingle();
      setShowNameInReview(data?.show_name_public ?? true);
    };

    const loadMyReview = async () => {
      if (!vendorId) return;
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { data } = await supabase
        .from("reviews")
        .select("id, rating, comments, anonymous")
        .eq("vendor_id", vendorId)
        .eq("user_id", auth.user.id)
        .maybeSingle();
      if (data) {
        setMyReviewId(data.id as string);
        setRating(data.rating ?? 0);
        setComments(data.comments ?? "");
        // For existing reviews, prefer the review's anonymous setting over user's global setting
        setShowNameInReview(!data.anonymous);
      }

      // Check if vendor is in user's home list
      const { data: homeVendor } = await supabase
        .from("home_vendors")
        .select("id")
        .eq("vendor_id", vendorId)
        .eq("user_id", auth.user.id)
        .maybeSingle();
      setUseForHome(!!homeVendor);
    };

    loadVendor();
    prefillShowName();
    loadMyReview();
  }, [vendorId]);

  const handleVendorSelected = async (payload: VendorSelectedPayload) => {
    setName(payload.name);
    setGooglePlaceId(payload.place_id);
    setIsManualEntry(false);
    
    // Auto-populate contact info if available
    if (payload.phone) {
      setContact(payload.phone);
    }

    // Fetch additional Google details and update vendor data
    try {
      const { data, error } = await supabase.functions.invoke('fetch-google-place-details', {
        body: { place_id: payload.place_id }
      });

      if (error) {
        console.warn("Failed to fetch Google place details:", error);
        return;
      }

      if (data?.formatted_phone_number && !contact.trim()) {
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
    if (submitting) return;

    if (!vendorId || canEditCore) {
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
    }
    if (!vendorId && !rating) {
      toast({ title: "Rating required", description: "Please select a rating from 1 to 5.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    console.log("[SubmitVendor] starting submission");

    // Check for duplicate vendor before new submission
    if (!vendorId) {
      const { data: duplicates } = await supabase.rpc("check_vendor_duplicate", {
        _name: name.trim(),
        _community: "Boca Bridges"
      });
      
      if (duplicates && duplicates.length > 0) {
        const existing = duplicates[0];
        toast({ 
          title: "Vendor already exists", 
          description: `"${existing.vendor_name}" (${existing.vendor_category}) is already in our database. Please rate the existing vendor instead.`,
          variant: "destructive"
        });
        setSubmitting(false);
        return;
      }
    }

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      console.error("[SubmitVendor] auth error:", userErr);
      toast({ title: "Not signed in", description: "Please sign in to submit a vendor.", variant: "destructive" });
      setSubmitting(false);
      return;
    }

    const userId = userData.user.id;
    
    // Update user's global show_name_public setting if they want to show their name
    if (showNameInReview) {
      const { error: userUpdateErr } = await supabase
        .from("users")
        .update({ show_name_public: true })
        .eq("id", userId);
      
      if (userUpdateErr) {
        console.warn("[SubmitVendor] user update error (non-fatal):", userUpdateErr);
      }
    }
    
    // Derive a typical cost number from dynamic cost entries
    const pickCostNum = () => {
      const byKind = (k: "monthly_plan" | "service_call" | "hourly") =>
        costEntries.find((e) => e.cost_kind === k && e.amount != null)?.amount ?? null;
      return byKind("monthly_plan") ?? byKind("service_call") ?? byKind("hourly") ?? null;
    };
    const costNum = pickCostNum();

    // 1) Insert or update vendor
    if (vendorId) {
      if (canEditCore) {
        const { error: updateErr } = await supabase
          .from("vendors")
          .update({
            name: name.trim(),
            category,
            contact_info: contact.trim(),
            typical_cost: costNum,
            google_place_id: googlePlaceId || null,
          })
          .eq("id", vendorId);

        if (updateErr) {
          console.error("[SubmitVendor] vendor update error:", updateErr);
          toast({ title: "Could not update vendor", description: updateErr?.message || "Please try again.", variant: "destructive" });
          setSubmitting(false);
          return;
        }
      }

      // Upsert my review if provided or exists
      if (rating || comments.trim() || myReviewId) {
        if (myReviewId) {
          const { error: reviewUpdateErr } = await supabase
            .from("reviews")
            .update({
              rating: rating!,
              comments: comments.trim() || null,
              anonymous: !showNameInReview,
            })
            .eq("id", myReviewId);
          if (reviewUpdateErr) {
            console.warn("[SubmitVendor] review update error (non-fatal):", reviewUpdateErr);
          }
        } else if (rating) {
          const { data: userData2 } = await supabase.auth.getUser();
          if (userData2?.user) {
            const { error: reviewInsertErr } = await supabase.from("reviews").insert([
              {
                vendor_id: vendorId,
                user_id: userData2.user.id,
                rating: rating,
                comments: comments.trim() || null,
                anonymous: !showNameInReview,
              },
            ]);
            if (reviewInsertErr) {
              console.warn("[SubmitVendor] review insert error (non-fatal):", reviewInsertErr);
            }
          }
        }
      }

      // 3) Handle home vendor association for existing vendors
      if (useForHome) {
        const primary = costEntries.find(c => c.cost_kind === "monthly_plan" && c.amount != null) || costEntries.find(c => c.amount != null);
        const hv = {
          user_id: userId,
          vendor_id: vendorId,
          my_rating: rating || undefined,
          amount: primary?.amount ?? null,
          currency: primary?.amount != null ? "USD" : null,
          period: primary?.cost_kind === "monthly_plan" ? "monthly" : (primary?.cost_kind === "hourly" ? "hourly" : null),
        } as any;
        const { error: hvErr } = await supabase.from("home_vendors").upsert(hv, { onConflict: "user_id,vendor_id" });
        if (hvErr) console.warn("[SubmitVendor] home_vendors upsert error", hvErr);
      } else {
        // Remove from home_vendors if unchecked
        await supabase
          .from("home_vendors")
          .delete()
          .eq("vendor_id", vendorId)
          .eq("user_id", userId);
      }

      toast({ title: "Saved!", description: "Your changes have been saved." });
      navigate("/dashboard");
      return;
    }

    // Create vendor data with Google integration
    const vendorData: any = {
      name: name.trim(),
      category,
      contact_info: contact.trim(),
      typical_cost: costNum,
      created_by: userId,
      google_place_id: googlePlaceId || null,
    };

    // If we have Google place data, fetch and store Google ratings
    if (googlePlaceId) {
      try {
        const { data: googleData, error: googleError } = await supabase.functions.invoke('fetch-google-place-details', {
          body: { place_id: googlePlaceId }
        });

        if (!googleError && googleData) {
          vendorData.google_rating = googleData.rating;
          vendorData.google_rating_count = googleData.user_ratings_total;
          vendorData.google_last_updated = new Date().toISOString();
          vendorData.google_reviews_json = googleData.reviews;
        }
      } catch (err) {
        console.warn("Failed to fetch Google data during vendor creation:", err);
      }
    }

    const { data: vendorInsert, error: vendorErr } = await supabase
      .from("vendors")
      .insert([vendorData])
      .select("id")
      .single();

    if (vendorErr || !vendorInsert) {
      console.error("[SubmitVendor] vendor insert error:", vendorErr);
      toast({ title: "Could not submit vendor", description: vendorErr?.message || "Please try again.", variant: "destructive" });
      setSubmitting(false);
      return;
    }

    const vendorIdNew = vendorInsert.id as string;
    console.log("[SubmitVendor] vendor created:", vendorIdNew);

    // 2) Insert initial review linked to this vendor
    const { error: reviewErr } = await supabase.from("reviews").insert([
      {
        vendor_id: vendorIdNew,
        user_id: userId,
        rating: rating,
        comments: comments.trim() || null,
        anonymous: !showNameInReview,
      },
    ]);

    if (reviewErr) {
      console.warn("[SubmitVendor] review insert error (non-fatal):", reviewErr);
    }

    // 3) Save cost entries to costs table
    const validCostEntries = costEntries.filter(entry => entry.amount != null && entry.amount > 0);
    if (validCostEntries.length > 0) {
      // Get user's address for cost entries
      const { data: userProfile } = await supabase
        .from("users")
        .select("address")
        .eq("id", userId)
        .single();

      if (userProfile?.address) {
        const costInserts = validCostEntries.map(entry => ({
          vendor_id: vendorIdNew,
          created_by: userId,
          household_address: userProfile.address,
          normalized_address: userProfile.address, // Will be processed by trigger
          amount: entry.amount,
          cost_kind: entry.cost_kind || null,
          unit: entry.unit || null,
          period: entry.period || null,
          quantity: entry.quantity || null,
          anonymous: !showNameInReview,
          currency: "USD",
        }));

        const { error: costsErr } = await supabase
          .from("costs")
          .insert(costInserts);

        if (costsErr) {
          console.warn("[SubmitVendor] costs insert error (non-fatal):", costsErr);
        }
      }
    }

    // 4) Add to home_vendors table if user selected to use this vendor
    if (useForHome) {
      const primary = costEntries.find(c => c.cost_kind === "monthly_plan" && c.amount != null) || costEntries.find(c => c.amount != null);
      const hv = {
        user_id: userId,
        vendor_id: vendorIdNew,
        my_rating: rating,
        amount: primary?.amount ?? null,
        currency: primary?.amount != null ? "USD" : null,
        period: primary?.cost_kind === "monthly_plan" ? "monthly" : (primary?.cost_kind === "hourly" ? "hourly" : null),
      } as any;
      const { error: hvErr } = await supabase.from("home_vendors").upsert(hv, { onConflict: "user_id,vendor_id" });
      if (hvErr) console.warn("[SubmitVendor] home_vendors upsert error", hvErr);
    }

    // DB trigger will mark the user as verified and increment submission count
    toast({
      title: "Vendor submitted!",
      description: "Thanks for contributing. Your full access should be unlocked now.",
    });

    // Navigate to dashboard (full access will reflect after trigger)
    navigate("/dashboard");
  };

  return (
    <main className="min-h-screen bg-background">
      <SEO
        title="Courtney’s List | Submit Vendor"
        description="Submit a local provider recommendation to unlock full access to Courtney’s List."
        canonical={canonical}
      />
      <section className="container py-10 max-w-2xl">
        <header className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">{vendorId ? "Edit Vendor" : "Submit a Vendor"}</h1>
          <p className="text-muted-foreground mt-2">
            {vendorId ? "Update provider details for your community." : "Share a provider you recommend. Your first submission unlocks full access after admin approval."}
          </p>
        </header>

        <form onSubmit={onSubmit} className="space-y-6">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="category">Service Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="category" disabled={!!(vendorId && !canEditCore)}>
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
              {vendorId && !canEditCore ? (
                <Input id="name" value={name} disabled />
              ) : (
                <VendorNameInput
                  id="name"
                  placeholder="Search business name or enter manually..."
                  defaultValue={name}
                  onSelected={handleVendorSelected}
                  onManualInput={handleManualNameInput}
                />
              )}
              {!isManualEntry && googlePlaceId && (
                <p className="text-xs text-green-600">✓ Verified business from Google</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="contact">Provider Contact Info</Label>
              <Input id="contact" placeholder="phone or email" value={contact} onChange={(e) => setContact(e.currentTarget.value)} disabled={!!(vendorId && !canEditCore)} />
            </div>

            <div className="grid gap-2">
              <CostInputs category={category} value={costEntries} onChange={setCostEntries} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="rating">Rating</Label>
              <StarRating value={rating} onChange={setRating} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="comments">Comments (Additional Color)</Label>
              <Textarea id="comments" placeholder="Any helpful insights — pricing, professionalism, customer service, responsiveness — the more detailed the better for your neighbors." value={comments} onChange={(e) => setComments(e.currentTarget.value)} />
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox checked={useForHome} onCheckedChange={(v) => setUseForHome(!!v)} />
                <label className="text-sm font-medium">Do you currently use this vendor for your home?</label>
              </div>
              {!vendorId && (
                <div className="flex items-center space-x-2">
                  <Checkbox checked={showNameInReview} onCheckedChange={(v) => setShowNameInReview(!!v)} />
                  <label className="text-sm font-medium">Show My Name in Review</label>
                </div>
              )}
              {rating > 0 && (
                <ReviewPreview 
                  rating={rating}
                  showName={showNameInReview}
                  userName={userData?.name}
                  streetName={userData?.streetName}
                />
              )}
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? (vendorId ? "Saving..." : "Submitting...") : (vendorId ? "Save changes" : "Submit")}
          </Button>
        </form>
      </section>
    </main>
  );
};

export default SubmitVendor;
