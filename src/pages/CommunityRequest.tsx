
import { useState } from "react";
import SEO from "@/components/SEO";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const CommunityRequest = () => {
  const canonical = typeof window !== "undefined" ? window.location.href : undefined;
  const { toast } = useToast();
  const navigate = useNavigate();

  const [communityName, setCommunityName] = useState("");
  const [location, setLocation] = useState("");
  const [requestorName, setRequestorName] = useState("");
  const [requestorEmail, setRequestorEmail] = useState("");
  const [resident, setResident] = useState<"" | "yes" | "no">("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = communityName.trim();
    if (!name) {
      toast({ title: "Community name required", description: "Please enter a community name.", variant: "destructive" });
      return;
    }

    const reqName = requestorName.trim();
    if (!reqName) {
      toast({ title: "Your name is required", description: "Please enter your name.", variant: "destructive" });
      return;
    }

    const email = requestorEmail.trim();
    if (!email) {
      toast({ title: "Email required", description: "Please enter your email address.", variant: "destructive" });
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({ title: "Invalid email", description: "Please enter a valid email address.", variant: "destructive" });
      return;
    }

    if (!resident) {
      toast({ title: "Please select resident status", description: "Tell us if you're a current resident.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    const finalNotes = `Resident status: ${resident === "yes" ? "Yes" : "No"}${notes.trim() ? " — " + notes.trim() : ""}`;

    const payload = {
      community_name: name,
      location: location.trim() || null,
      requestor_name: reqName,
      requestor_email: email,
      notes: finalNotes || null,
    };

    // Temporary cast to any until Supabase types include `community_requests`
    const { error } = await (supabase as any).from("community_requests").insert(payload);

    setSubmitting(false);

    if (error) {
      console.error("[CommunityRequest] insert error:", error);
      toast({ title: "Could not submit request", description: error.message, variant: "destructive" });
      return;
    }

    toast({
      title: "Thank you, we will review your request!",
      description: "We'll be in touch soon about adding your community.",
    });
    setCommunityName("");
    setLocation("");
    setRequestorName("");
    setRequestorEmail("");
    setResident("");
    setNotes("");
    setTimeout(() => navigate("/homepage", { replace: true }), 600);
  };

  return (
    <main className="min-h-screen bg-background">
      <SEO
        title="Request Your Community — Courtney's List"
        description="Ask us to add your neighborhood to Courtney's List."
        canonical={canonical}
      />
      <section className="container max-w-xl py-10">
        <Card>
          <CardHeader>
            <CardTitle>Request Your Community</CardTitle>
            <CardDescription>Tell us about your neighborhood and we'll consider adding it.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="community_name">Community Name</Label>
                <Input
                  id="community_name"
                  value={communityName}
                  onChange={(e) => setCommunityName(e.currentTarget.value)}
                  placeholder="e.g., Seven Bridges, Lotus, The Oaks"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">City / State</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.currentTarget.value)}
                  placeholder="e.g., Boca Raton, FL"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="requestor_name">Your Name</Label>
                  <Input
                    id="requestor_name"
                    value={requestorName}
                    onChange={(e) => setRequestorName(e.currentTarget.value)}
                    placeholder="Your full name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="requestor_email">Your Email</Label>
                  <Input
                    id="requestor_email"
                    type="email"
                    value={requestorEmail}
                    onChange={(e) => setRequestorEmail(e.currentTarget.value)}
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="resident_status">Are you a current resident?</Label>
                <Select value={resident} onValueChange={(v) => setResident(v as "yes" | "no")}>
                  <SelectTrigger id="resident_status" aria-label="Current resident">
                    <SelectValue placeholder="Select one" />
                  </SelectTrigger>
                  <SelectContent className="z-50">
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.currentTarget.value)}
                  placeholder="Anything else we should know? (Optional)"
                  className="min-h-[100px]"
                />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <Button type="submit" disabled={submitting} className="min-w-[160px]">
                  {submitting ? "Submitting..." : "Submit Request"}
                </Button>
                <Button type="button" variant="secondary" onClick={() => navigate("/homepage", { replace: true })}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </section>
    </main>
  );
};

export default CommunityRequest;
