import { useState } from "react";
import { useNavigate } from "react-router-dom";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, Send, Search, CheckCircle } from "lucide-react";

const Index = () => {
  const canonical = typeof window !== "undefined" ? window.location.href : undefined;
  const [query, setQuery] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();

  const onSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const value = query.trim();
    if (!value) {
      toast({ title: "Enter your address or HOA", description: "Please type your address or HOA name.", variant: "destructive" });
      return;
    }

    localStorage.setItem("prefill_address", value);
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      navigate("/dashboard");
    } else {
      navigate(`/auth/signup?address=${encodeURIComponent(value)}`);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <SEO
        title="Courtney's List — Your Private Community’s Trusted Guide to Local Services"
        description="Invite-only community vendor recommendations for your neighborhood. Enter your address to view trusted providers."
        canonical={canonical}
      />

      <section className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-3xl w-full text-center space-y-6">
          <h1 className="font-playfair text-5xl md:text-7xl font-bold tracking-tight">Courtney's List</h1>
          <p className="text-xl text-muted-foreground">Your Private Community’s Trusted Guide to Local Services</p>
          <p className="text-base text-muted-foreground">No more guessing, random internet searches, or frantic Facebook posts.</p>

          <form onSubmit={onSubmit} className="mx-auto mt-6 w-full">
            <div className="flex flex-col md:flex-row items-stretch gap-3 md:gap-4 max-w-2xl mx-auto">
              <Input
                value={query}
                onChange={(e) => setQuery(e.currentTarget.value)}
                placeholder="Enter Your Address or HOA Name"
                aria-label="Enter Your Address or HOA Name"
              />
              <Button type="submit" className="md:min-w-[180px]">View Dashboard</Button>
            </div>
          </form>

          <p className="text-xs text-muted-foreground">*We’ll only show street-level info publicly to protect your privacy.*</p>
        </div>
      </section>

      <section className="container py-16 md:py-24 space-y-10">
        <h2 className="text-2xl md:text-3xl font-semibold text-center">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <article className="text-center motion-safe:animate-fade-in">
            <div className="flex items-center justify-center mb-4">
              <ShieldCheck className="text-foreground" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-medium">Verify Your Address</h3>
            <p className="text-sm text-muted-foreground">Join your neighborhood’s trusted network by verifying your address.</p>
          </article>
          <article className="text-center motion-safe:animate-fade-in">
            <div className="flex items-center justify-center mb-4">
              <Send className="text-foreground" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-medium">Submit Vendors</h3>
            <p className="text-sm text-muted-foreground">Share your favorite local vendors to unlock full access.</p>
          </article>
          <article className="text-center motion-safe:animate-fade-in">
            <div className="flex items-center justify-center mb-4">
              <Search className="text-foreground" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-medium">Explore Providers</h3>
            <p className="text-sm text-muted-foreground">Browse transparent ratings and pricing from your neighbors.</p>
          </article>
        </div>
      </section>

      <section className="container pb-16 md:pb-24">
        <h2 className="text-2xl md:text-3xl font-semibold text-center mb-6">Why Courtney’s List</h2>
        <ul className="max-w-3xl mx-auto space-y-3">
          <li className="flex items-start gap-3"><CheckCircle className="mt-0.5 text-foreground" aria-hidden="true" /><span>No more guessing, random internet searches, or frantic Facebook posts.</span></li>
          <li className="flex items-start gap-3"><CheckCircle className="mt-0.5 text-foreground" aria-hidden="true" /><span>Real reviews and prices from people you trust.</span></li>
          <li className="flex items-start gap-3"><CheckCircle className="mt-0.5 text-foreground" aria-hidden="true" /><span>Save time, money, and stress on home services.</span></li>
        </ul>
      </section>

      <footer className="border-t">
        <div className="container py-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <nav className="flex items-center gap-4">
            <a href="/privacy" className="hover:underline">Privacy Policy</a>
            <a href="/terms" className="hover:underline">Terms of Service</a>
            <a href="/contact" className="hover:underline">Contact Us</a>
          </nav>
          <p className="text-xs">© {new Date().getFullYear()} Courtney’s List. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
};

export default Index;
