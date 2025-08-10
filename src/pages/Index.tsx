// Update this page (the content is just a fallback if you fail to update the page)
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";

const Index = () => {
  const canonical = typeof window !== "undefined" ? window.location.href : undefined;

  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <SEO
        title="Courtney's List — Your Private Community’s Trusted Guide to Local Services"
        description="Invite-only community vendor recommendations for Boca Bridges. Submit a vendor to unlock full access."
        canonical={canonical}
      />
      <section className="text-center px-6">
        <h1 className="text-4xl font-bold mb-4">Courtney's List</h1>
        <p className="text-xl text-muted-foreground mb-8">Your Private Community’s Trusted Guide to Local Services</p>
        <div className="flex items-center justify-center gap-4">
          <a href="/submit"><Button>Submit a Vendor</Button></a>
          <a href="/dashboard"><Button variant="secondary">View Dashboard</Button></a>
        </div>
      </section>
    </main>
  );
};

export default Index;
