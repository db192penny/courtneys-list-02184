import SEO from "@/components/SEO";

const Privacy = () => {
  const canonical = typeof window !== "undefined" ? window.location.href : undefined;
  return (
    <main className="min-h-screen bg-background">
      <SEO title="Privacy Policy — Courtney's List" description="Learn how Courtney's List protects your data and privacy." canonical={canonical} />
      <section className="container max-w-3xl py-12">
        <h1 className="text-3xl font-semibold mb-4">Privacy Policy</h1>
        <p className="text-muted-foreground">
          We respect your privacy. We only show street-level information publicly and never disclose your full address or email.
          For more details about our data practices, please contact us.
        </p>
      </section>
    </main>
  );
};

export default Privacy;
