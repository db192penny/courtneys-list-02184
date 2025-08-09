import SEO from "@/components/SEO";
import { useParams, Link } from "react-router-dom";

const VendorDetail = () => {
  const { id } = useParams();
  const canonical = typeof window !== "undefined" ? window.location.href : undefined;

  return (
    <main className="min-h-screen bg-background">
      <SEO
        title={`Courtney’s List | Vendor ${id ?? "Detail"}`}
        description="View provider details and community reviews from Boca Bridges residents."
        canonical={canonical}
      />
      <section className="container py-10">
        <header className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Vendor Details</h1>
          <p className="text-muted-foreground mt-2">Data will appear after Supabase is connected.</p>
        </header>

        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">Vendor ID: {id}</div>
          <p className="text-muted-foreground text-sm">
            Contact info, average rating, and reviews will be displayed here.
          </p>
          <Link to="/dashboard" className="underline">Back to Dashboard</Link>
        </div>
      </section>
    </main>
  );
};

export default VendorDetail;
