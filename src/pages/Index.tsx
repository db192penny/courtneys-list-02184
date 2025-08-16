import { useState } from "react";
import { useNavigate } from "react-router-dom";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

import { ShieldCheck, Send, Search, CheckCircle, Lock } from "lucide-react";
import AddressInput, { AddressSelectedPayload } from "@/components/AddressInput";
import { toSlug } from "@/utils/slug";


const Index = () => {
  const canonical = typeof window !== "undefined" ? window.location.href : undefined;
  const [hoa, setHoa] = useState("Boca Bridges");
  const [selectedAddress, setSelectedAddress] = useState<AddressSelectedPayload | null>(null);
  
  const { toast } = useToast();
  const navigate = useNavigate();

  const onAddressSelected = async (payload: AddressSelectedPayload) => {
    try {
      console.log("Index: Address selected:", payload);
      setSelectedAddress(payload);
      localStorage.setItem("prefill_address", payload.formatted_address);
      console.log("Index: Address stored in localStorage:", payload.formatted_address);
    } catch (e) {
      console.error("[Index] address select error:", e);
      toast({ title: "Something went wrong", description: "Please try again.", variant: "destructive" });
    }
  };

  const onSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    console.log("Index: Submit clicked", { selectedAddress, hoa });
    if (!selectedAddress) {
      console.log("Index: No address selected, showing error");
      toast({ title: "Pick from suggestions", description: "Please pick an address from the list.", variant: "destructive" });
      return;
    }
    try {
      console.log("Index: Navigating to community:", toSlug(hoa));
      navigate(`/communities/${toSlug(hoa)}`);
    } catch (e) {
      console.error("[Index] submit error:", e);
      toast({ title: "Something went wrong", description: "Please try again.", variant: "destructive" });
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <SEO
        title="Courtney's List — Your Private Community's Trusted Guide to Local Services"
        description="Invite-only community vendor recommendations for your neighborhood. Enter your address to view trusted providers."
        canonical={canonical}
      />

      <section className="relative min-h-screen overflow-hidden px-6 grid place-items-center">
        <div
          className="absolute inset-0 z-0 bg-gradient-to-b from-background/45 via-background/25 to-background/70"
          aria-hidden="true"
        />
        <div className="relative z-10 max-w-3xl w-full text-center space-y-6 mx-auto">
          <h1 className="text-5xl md:text-7xl font-normal tracking-tight">Courtney's List</h1>
          <p className="text-xl text-muted-foreground">Your Private Community's Trusted Guide to Local Services</p>
          <p className="text-lg text-muted-foreground/80 italic">And a pretty good home for your provider info</p>
          
          <div className="mx-auto mt-6 w-full max-w-2xl rounded-xl bg-background/70 supports-[backdrop-filter]:bg-background/60 backdrop-blur shadow-lg p-4 md:p-6">
            <form onSubmit={onSubmit} className="w-full">
              <div className="flex flex-col gap-3 md:flex-row md:items-stretch md:gap-4">
                <div className="flex-1">
                  <AddressInput
                    placeholder="Enter Your Street Address"
                    onSelected={onAddressSelected}
                  />
                </div>
                <div className="flex-1 md:max-w-xs">
                  <Select value={hoa} onValueChange={setHoa}>
                    <SelectTrigger aria-label="HOA Name" className="w-full">
                      <SelectValue placeholder="HOA Name" />
                    </SelectTrigger>
                    <SelectContent className="z-50">
                      <SelectItem value="Boca Bridges">Boca Bridges</SelectItem>
                      <SelectItem value="St. Andrews Country Club" disabled>St. Andrews Country Club</SelectItem>
                      <SelectItem value="Woodfield Country Club" disabled>Woodfield Country Club</SelectItem>
                      <SelectItem value="Seven Bridges" disabled>Seven Bridges</SelectItem>
                      <SelectItem value="The Bridges" disabled>The Bridges</SelectItem>
                      <SelectItem value="Addison Reserve Country Club" disabled>Addison Reserve Country Club</SelectItem>
                      <SelectItem value="Royal Palm Yacht & Country Club" disabled>Royal Palm Yacht & Country Club</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  type="submit" 
                  className="w-full md:w-auto md:min-w-[160px]" 
                  disabled={!selectedAddress} 
                  aria-disabled={!selectedAddress}
                >
                  View Dashboard
                </Button>
              </div>
            </form>
            {/* <div className="mt-3 flex flex-col items-center gap-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/auth/signup")}
                className="w-full md:w-auto md:min-w-[260px]"
                aria-label="Sign up to unlock exclusive access"
              >
                <Lock aria-hidden="true" />
                <span>Sign Up to Unlock Exclusive Access</span>
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Members-only access to detailed ratings, reviews, and pricing.
              </p>
            </div> */}
            <p className="mt-3 text-xs text-muted-foreground">*We'll only show street-level info publicly to protect your privacy.*</p>
            <div className="mt-3 flex justify-center">
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate("/communities/request")}
                className="w-full md:w-auto md:min-w-[220px]"
                aria-label="Add my HOA or Community"
              >
                Add my HOA/Community
              </Button>
            </div>
          </div>
          {/* How It Works moved below hero */}
        </div>
      </section>

      <section aria-label="How It Works" className="container mt-6 md:mt-10 lg:mt-14 xl:mt-16 space-y-8">
        <h2 className="text-2xl md:text-3xl font-semibold text-center">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12 mt-0 md:mt-10">
          <article className="text-center motion-safe:animate-fade-in">
            <div className="flex items-center justify-center mb-4">
              <ShieldCheck className="text-foreground" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-medium">Verify Your Address</h3>
            <p className="text-sm text-muted-foreground">Join your neighborhood's private community by confirming your home address and HOA. Approval comes from an HOA admin — and yes, you can be that admin if you'd like.</p>
          </article>
          <article className="text-center motion-safe:animate-fade-in">
            <div className="flex items-center justify-center mb-4">
              <Search className="text-foreground" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-medium">Explore Providers</h3>
            <p className="text-sm text-muted-foreground">See real ratings, reviews, and pricing from neighbors in your exact community — sometimes even down to your street.</p>
          </article>
          <article className="text-center motion-safe:animate-fade-in">
            <div className="flex items-center justify-center mb-4">
              <Send className="text-foreground" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-medium">Share Your Vendors</h3>
            <p className="text-sm text-muted-foreground">Add the service providers you've used (good or bad) so neighbors get an honest, growing resource they can trust.</p>
          </article>
        </div>
      </section>


      <section className="container mt-12 md:mt-16 lg:mt-20 pb-16 md:pb-24">
        <h2 className="text-2xl md:text-3xl font-semibold text-center mb-6">Why Courtney's List</h2>
        <ul className="max-w-3xl mx-auto space-y-3">
          <li className="flex items-start gap-3"><CheckCircle className="mt-0.5 text-foreground" aria-hidden="true" /><span>See who your neighbors trust — with clear ratings and costs.</span></li>
          <li className="flex items-start gap-3"><CheckCircle className="mt-0.5 text-foreground" aria-hidden="true" /><span>Compare prices and find the best local providers easily.</span></li>
          <li className="flex items-start gap-3"><CheckCircle className="mt-0.5 text-foreground" aria-hidden="true" /><span>Skip frantic Facebook posts — always have access to the community's vendors and have a home for your providers.</span></li>
        </ul>
      </section>

      <footer className="border-t">
        <div className="container py-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <nav className="flex items-center gap-4">
            <a href="/privacy" className="hover:underline">Privacy Policy</a>
            <a href="/terms" className="hover:underline">Terms of Service</a>
            <a href="/contact" className="hover:underline">Contact Us</a>
          </nav>
          <p className="text-xs">© {new Date().getFullYear()} Courtney's List. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
};

export default Index;