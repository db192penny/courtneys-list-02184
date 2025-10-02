import { useState } from "react";
import { useNavigate } from "react-router-dom";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

import { ShieldCheck, Send, Search, CheckCircle } from "lucide-react";
import { toSlug } from "@/utils/slug";
import heroPoolImage from "@/assets/hero-pool-image.jpeg";

const getCommunitySlug = (communityName: string): string => {
  const slugMap: { [key: string]: string } = {
    'Boca Bridges': 'boca-bridges',
    'The Bridges': 'the-bridges',
    'The Oaks': 'the-oaks',
    'St. Andrews Country Club': 'st-andrews-country-club',
    'Woodfield Country Club': 'woodfield-country-club',
    'Seven Bridges': 'seven-bridges',
    'Lotus': 'lotus'
  };
  return slugMap[communityName] || communityName.toLowerCase().replace(/\s+/g, '-');
};

const Index = () => {
  const canonical = typeof window !== "undefined" ? window.location.href : undefined;
  const [hoa, setHoa] = useState("Boca Bridges");
  
  const navigate = useNavigate();

  const onSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    console.log("Index: Submit clicked", { hoa });
    try {
      const communitySlug = getCommunitySlug(hoa);
      console.log("Index: Navigating to community:", communitySlug);
      navigate(`/communities/${communitySlug}`);
    } catch (e) {
      console.error("[Index] submit error:", e);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <SEO
        title="Courtney's List – Your Neighbors' Trusted Service Providers"
        description="See which plumbers, HVAC, pool, pest, and landscapers your Boca Bridges neighbors actually use. Add your ratings and make homeownership less stressful."
        canonical={canonical}
      />

      <section className="relative min-h-screen overflow-hidden px-6 grid place-items-center">
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `url(${heroPoolImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.35
          }}
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 z-0 bg-gradient-to-b from-background/80 via-background/85 to-background/90"
          aria-hidden="true"
        />
        <div className="relative z-10 w-full h-full flex flex-col">
          <div className="flex-1 flex items-center justify-center px-6">
            <div className="max-w-3xl w-full text-center space-y-6">
              <div className="flex flex-col items-center mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-3xl md:text-4xl">🏘️</span>
                  <span className="font-bold text-2xl md:text-4xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Courtney's List
                  </span>
                </div>
                <p className="text-sm md:hidden text-foreground/80 mt-2">Your neighborhood's trusted service providers</p>
              </div>
              <p className="text-lg md:text-xl text-foreground/90 font-medium" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.2)' }}>Say goodbye to "Could you recommend a plumber?" Facebook posts</p>
          
          <div className="mx-auto mt-6 w-full max-w-2xl">
            <p className="text-center text-lg font-semibold mb-3">Choose your community</p>
            <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-3 items-center justify-center">
              <Select value={hoa} onValueChange={setHoa}>
                <SelectTrigger className="w-full sm:w-64 bg-background/95 backdrop-blur">
                  <SelectValue placeholder="Select your community" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Boca Bridges">Boca Bridges</SelectItem>
                  <SelectItem value="The Bridges">The Bridges</SelectItem>
                  <SelectItem value="The Oaks" disabled>The Oaks (coming soon)</SelectItem>
                  <SelectItem value="St. Andrews Country Club" disabled>St. Andrews Country Club (coming soon)</SelectItem>
                  <SelectItem value="Woodfield Country Club" disabled>Woodfield Country Club (coming soon)</SelectItem>
                  <SelectItem value="Seven Bridges" disabled>Seven Bridges (coming soon)</SelectItem>
                  <SelectItem value="Lotus" disabled>Lotus (coming soon)</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                type="submit" 
                size="lg"
                className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 hover:from-blue-600 hover:to-purple-700"
              >
                See Providers
              </Button>
            </form>
            <p className="text-center text-sm mt-4">
              <a href="/community-request" className="text-primary hover:underline">
                ➕ Don't see your community? Request it here
              </a>
            </p>
          </div>
              {/* How It Works moved below hero */}
            </div>
          </div>
        </div>
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