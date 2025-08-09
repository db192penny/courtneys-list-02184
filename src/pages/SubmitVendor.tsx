import { useState } from "react";
import SEO from "@/components/SEO";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { CATEGORIES } from "@/data/categories";

const SubmitVendor = () => {
  const { toast } = useToast();
  const [anonymous, setAnonymous] = useState(false);
  const canonical = typeof window !== "undefined" ? window.location.href : undefined;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Supabase required",
      description:
        "Connect Supabase to enable submissions, approval gating, and data storage.",
    });
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
          <h1 className="text-3xl font-bold tracking-tight">Submit a Vendor</h1>
          <p className="text-muted-foreground mt-2">
            Share a provider you recommend. Your first submission unlocks full access after admin approval.
          </p>
        </header>

        <form onSubmit={onSubmit} className="space-y-6">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="category">Service Category</Label>
              <Select>
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
              <Input id="name" placeholder="e.g., ABC Pool Services" />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="contact">Provider Contact Info</Label>
              <Input id="contact" placeholder="phone or email" />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="cost">Typical Cost</Label>
              <Input id="cost" type="number" inputMode="decimal" placeholder="e.g., 150" />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="rating">Rating</Label>
              <Select>
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
              <Textarea id="comments" placeholder="Share your experience" />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch id="recommend" />
                <Label htmlFor="recommend">Would you recommend?</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="anonymous" checked={anonymous} onCheckedChange={setAnonymous} />
                <Label htmlFor="anonymous">Post as Anonymous</Label>
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full">Submit</Button>
        </form>
      </section>
    </main>
  );
};

export default SubmitVendor;
