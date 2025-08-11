
import { useEffect, useMemo, useState } from "react";
import SEO from "@/components/SEO";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { CATEGORIES } from "@/data/categories";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";

const SubmitVendor = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // form state
  const [category, setCategory] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [contact, setContact] = useState<string>("");
  const [cost, setCost] = useState<string>("");
  const [rating, setRating] = useState<string>("");
  const [comments, setComments] = useState<string>("");
  const [recommend, setRecommend] = useState<boolean>(true);
  const [anonymous, setAnonymous] = useState(false); // keep switch as-is (not used in MVP)
  const [submitting, setSubmitting] = useState(false);

  const canonical = typeof window !== "undefined" ? window.location.href : undefined;

  const vendorId = searchParams.get("vendor_id");

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
        setCost(data.typical_cost != null ? String(data.typical_cost) : "");
      }
    };
    loadVendor();
  }, [vendorId]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

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
    if (!rating) {
      toast({ title: "Rating required", description: "Please select a rating from 1 to 5.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    console.log("[SubmitVendor] starting submission");

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      console.error("[SubmitVendor] auth error:", userErr);
      toast({ title: "Not signed in", description: "Please sign in to submit a vendor.", variant: "destructive" });
      setSubmitting(false);
      return;
    }

    const userId = userData.user.id;
    const costNum = cost ? Number(cost) : null;
    if (cost && Number.isNaN(costNum)) {
      toast({ title: "Invalid cost", description: "Please enter a valid number.", variant: "destructive" });
      setSubmitting(false);
      return;
    }

    // 1) Insert or update vendor
    if (vendorId) {
      const { error: updateErr } = await supabase
        .from("vendors")
        .update({
          name: name.trim(),
          category,
          contact_info: contact.trim(),
          typical_cost: costNum,
        })
        .eq("id", vendorId);

      if (updateErr) {
        console.error("[SubmitVendor] vendor update error:", updateErr);
        toast({ title: "Could not update vendor", description: updateErr?.message || "Please try again.", variant: "destructive" });
        setSubmitting(false);
        return;
      }

      toast({ title: "Vendor updated!", description: "Your changes have been saved." });
      navigate(`/vendor/${vendorId}`);
      return;
    }

    const { data: vendorInsert, error: vendorErr } = await supabase
      .from("vendors")
      .insert([
        {
          name: name.trim(),
          category,
          contact_info: contact.trim(),
          typical_cost: costNum,
          created_by: userId,
        },
      ])
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
    const ratingInt = parseInt(rating, 10);
    const { error: reviewErr } = await supabase.from("reviews").insert([
      {
        vendor_id: vendorIdNew,
        user_id: userId,
        rating: ratingInt,
        recommended: recommend,
        comments: comments.trim() || null,
      },
    ]);

    if (reviewErr) {
      console.warn("[SubmitVendor] review insert error (non-fatal):", reviewErr);
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
              <Input id="name" placeholder="e.g., ABC Pool Services" value={name} onChange={(e) => setName(e.currentTarget.value)} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="contact">Provider Contact Info</Label>
              <Input id="contact" placeholder="phone or email" value={contact} onChange={(e) => setContact(e.currentTarget.value)} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="cost">Typical Cost</Label>
              <Input id="cost" type="number" inputMode="decimal" placeholder="e.g., 150" value={cost} onChange={(e) => setCost(e.currentTarget.value)} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="rating">Rating</Label>
              <Select value={rating} onValueChange={setRating}>
                <SelectTrigger id="rating">
                  <SelectValue placeholder="Select 1–5" />
                </SelectTrigger>
                <SelectContent>
                  {[1,2,3,4,5].map((r) => (
                    <SelectItem key={r} value={String(r)}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="comments">Comments (optional)</Label>
              <Textarea id="comments" placeholder="Share your experience" value={comments} onChange={(e) => setComments(e.currentTarget.value)} />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch id="recommend" checked={recommend} onCheckedChange={setRecommend} />
                <Label htmlFor="recommend">Would you recommend?</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="anonymous" checked={anonymous} onCheckedChange={setAnonymous} />
                <Label htmlFor="anonymous">Post as Anonymous</Label>
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Submitting..." : "Submit"}
          </Button>
        </form>
      </section>
    </main>
  );
};

export default SubmitVendor;
