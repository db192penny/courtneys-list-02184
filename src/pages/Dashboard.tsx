
import SEO from "@/components/SEO";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CATEGORIES } from "@/data/categories";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import VendorList from "@/components/vendors/VendorList";

const Dashboard = () => {
  const canonical = typeof window !== "undefined" ? window.location.href : undefined;

  const [loading, setLoading] = useState(true);
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [submissionsCount, setSubmissionsCount] = useState<number>(0);
  const [points, setPoints] = useState<number>(0);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("users")
        .select("is_verified, submissions_count, points")
        .eq("id", auth.user.id)
        .single();

      if (error) {
        console.warn("[Dashboard] could not load profile:", error);
      }
      if (!cancelled) {
        setIsVerified(!!data?.is_verified);
        setSubmissionsCount(data?.submissions_count ?? 0);
        setPoints(data?.points ?? 0);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

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
          {!loading && !isVerified && (
            <p className="text-muted-foreground mt-2">
              Submit your first trusted vendor to unlock full access.
            </p>
          )}
          {!loading && isVerified && (
            <p className="text-muted-foreground mt-2">
              Full access unlocked. Thanks for contributing! Submissions: {submissionsCount}. Points: {points}.
            </p>
          )}
        </header>

        <div className="grid gap-6 md:grid-cols-4">
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Filter</CardTitle>
            </CardHeader>
            <CardContent>
              <label className="text-sm mb-2 block">Service Category</label>
              <Select onValueChange={(val) => setSelectedCategory(val)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <div className="md:col-span-3 space-y-6">
            {!isVerified ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Limited Access</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm">
                      You can see providers and categories but contact info and detailed reviews are hidden until you submit a vendor.
                    </p>
                      <div className="mt-3 flex gap-4">
                        <Link to="/submit" className="underline">Submit a Vendor</Link>
                        <Link to="/profile" className="underline">Your Profile</Link>
                      </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Browse Providers (Preview)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <VendorList category={selectedCategory} isVerified={false} />
                  </CardContent>
                </Card>
              </>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Browse Providers</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-muted-foreground text-sm">
                      You now have full access. Provider contact info and reviews are available.
                    </p>
                    <div className="flex gap-4">
                      <Link to="/submit" className="underline">Add a Vendor</Link>
                      <Link to="/profile" className="underline">Your Profile</Link>
                    </div>
                  </CardContent>
                </Card>

                <VendorList category={selectedCategory} isVerified />
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
};

export default Dashboard;
