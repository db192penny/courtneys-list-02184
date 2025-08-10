import SEO from "@/components/SEO";

const Contact = () => {
  const canonical = typeof window !== "undefined" ? window.location.href : undefined;
  return (
    <main className="min-h-screen bg-background">
      <SEO title="Contact Us — Courtney's List" description="Get in touch with Courtney's List." canonical={canonical} />
      <section className="container max-w-3xl py-12">
        <h1 className="text-3xl font-semibold mb-4">Contact Us</h1>
        <p className="text-muted-foreground">Have questions or feedback? Email us at <a className="underline" href="mailto:support@courtneyslist.com">support@courtneyslist.com</a>.</p>
      </section>
    </main>
  );
};

export default Contact;
