import SEO from "@/components/SEO";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CATEGORIES } from "@/data/categories";
import { Link } from "react-router-dom";

const Dashboard = () => {
  const canonical = typeof window !== "undefined" ? window.location.href : undefined;

  return (
    <main className="min-h-screen bg-background">
      <SEO
        title="Courtney’s List | Dashboard"
        description="Browse Boca Bridges community-recommended vendors by category with ratings and typical costs."
        canonical={canonical}
      />
      <section className="container py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Vendor Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Filter by category to view community recommendations. Submit one vendor to unlock full details after Supabase is connected.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-4">
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Filter</CardTitle>
            </CardHeader>
            <CardContent>
              <label className="text-sm mb-2 block">Service Category</label>
              <Select>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <div className="md:col-span-3 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Category Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  Summary stats will appear here once Supabase is connected (provider count, avg rating, cost ranges).
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Providers</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-muted-foreground text-sm">
                  Provider list will render here. Try adding a vendor to get started.
                </p>
                <Link to="/submit" className="underline">Submit a Vendor</Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Dashboard;
