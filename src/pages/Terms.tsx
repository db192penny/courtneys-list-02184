import SEO from "@/components/SEO";

const Terms = () => {
  const canonical = typeof window !== "undefined" ? window.location.href : undefined;
  return (
    <main className="min-h-screen bg-background">
      <SEO title="Terms of Service — Courtney's List" description="The terms that govern the use of Courtney's List." canonical={canonical} />
      <section className="container max-w-3xl py-12">
        <h1 className="text-3xl font-semibold mb-4">Terms of Service</h1>
        <p className="text-muted-foreground">
          By using Courtney's List, you agree to our standard terms of service. This includes acceptable use, content guidelines, and limitations of liability.
        </p>
      </section>
    </main>
  );
};

export default Terms;
