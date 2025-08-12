
import SEO from "@/components/SEO";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUserProfile } from "@/hooks/useUserProfile";
import useIsAdmin from "@/hooks/useIsAdmin";
import useIsHoaAdmin from "@/hooks/useIsHoaAdmin";

type Vendor = {
  id: string;
  name: string;
  category: string;
  contact_info: string | null;
  typical_cost: number | null;
  community: string | null;
  created_at: string | null;
};

type Review = {
  id: string;
  rating: number;
  recommended: boolean | null;
  comments: string | null;
  created_at: string | null;
  author_label: string;
};

const VendorDetail = () => {
  const { id } = useParams();
  const canonical = typeof window !== "undefined" ? window.location.href : undefined;

  const { data: profile } = useUserProfile();
  const isVerified = !!profile?.isVerified;
  const isAuthenticated = !!profile?.isAuthenticated;
  const { data: isAdmin } = useIsAdmin();
  const { data: isHoaAdmin } = useIsHoaAdmin();
  const canEdit = !!isAdmin || !!isHoaAdmin;

  const { data: vendor, isLoading: vendorLoading, error: vendorError } = useQuery<Vendor | null>({
    queryKey: ["vendor", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase.from("vendors").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as Vendor | null;
    },
    enabled: !!id,
  });

  const { data: reviews } = useQuery<Review[]>({
    queryKey: ["reviews", id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_vendor_reviews", { _vendor_id: id as string });
      if (error) throw error;
      return (data || []) as Review[];
    },
    enabled: !!id && isVerified, // only fetch reviews when verified
  });

  return (
    <main className="min-h-screen bg-background">
      <SEO
        title={`Courtney’s List | Vendor ${vendor?.name ?? id ?? "Detail"}`}
        description="View provider details and community reviews from Boca Bridges residents."
        canonical={canonical}
      />
      <section className="container py-10">
        <header className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Vendor Details</h1>
          {!isAuthenticated && (
            <p className="text-muted-foreground mt-2 text-sm">
              Sign in to view vendors and reviews.
            </p>
          )}
        </header>

        {vendorLoading && <div className="text-sm text-muted-foreground">Loading vendor…</div>}
        {vendorError && (
          <div className="text-sm text-muted-foreground">Unable to load vendor.</div>
        )}
        {!vendorLoading && !vendor && (
          <div className="text-sm text-muted-foreground">Vendor not found.</div>
        )}

        {vendor && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{vendor.name}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <div>
                  <span className="font-medium text-foreground">Category:</span>{" "}
                  <span>{vendor.category}</span>
                </div>
                <div>
                  <span className="font-medium text-foreground">Contact:</span>{" "}
                  <span>{isVerified ? (vendor.contact_info || "N/A") : "Hidden until verified"}</span>
                </div>
                {vendor.typical_cost !== null && (
                  <div>
                    <span className="font-medium text-foreground">Typical Cost:</span>{" "}
                    <span>${Number(vendor.typical_cost).toLocaleString()}</span>
                  </div>
                )}
                {vendor.community && (
                  <div>
                    <span className="font-medium text-foreground">Community:</span>{" "}
                    <span>{vendor.community}</span>
                  </div>
                )}
                <div className="pt-2 flex items-center gap-3">
                  <Link to="/dashboard" className="underline">Back to Dashboard</Link>
                  {canEdit && id && (
                    <Button asChild size="sm" variant="secondary">
                      <Link to={`/submit?vendor_id=${id}`}>Edit Vendor</Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Reviews</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!isVerified && (
                  <p className="text-sm text-muted-foreground">
                    Reviews are available after you’re verified. Submit a vendor to unlock full access.
                  </p>
                )}
                {isVerified && (!reviews || reviews.length === 0) && (
                  <p className="text-sm text-muted-foreground">No reviews yet.</p>
                )}
                {isVerified && reviews && reviews.length > 0 && (
                  <ul className="space-y-3">
                    {reviews.map((r) => (
                      <li key={r.id} className="border rounded p-3">
                        <div className="text-foreground text-sm">
                          Rating: <span className="font-medium">{r.rating}/5</span>
                          {r.recommended !== null && (
                            <span className="ml-2 text-muted-foreground">
                              {r.recommended ? "Recommended" : "Not recommended"}
                            </span>
                          )}
                          <span className="ml-2 text-muted-foreground">by {r.author_label}</span>
                        </div>
                        {r.comments && (
                          <p className="text-sm text-muted-foreground mt-1">{r.comments}</p>
                        )}
                        {r.created_at && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {new Date(r.created_at).toLocaleDateString()}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </section>
    </main>
  );
};

export default VendorDetail;
