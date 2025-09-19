import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown, Star, TrendingUp } from "lucide-react";
import { RatingStars } from "@/components/ui/rating-stars";

interface ReviewWithHistory {
  id: string;
  vendor_id: string;
  rating: number;
  created_at: string;
  vendor_name?: string;
  vendor_category?: string;
}

export function RatingMovements() {
  const [recentReviews, setRecentReviews] = useState<ReviewWithHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecentRatings = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get recent reviews from the last 7 days with vendor info
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        
        const { data, error } = await supabase
          .from('reviews')
          .select(`
            id,
            vendor_id,
            rating,
            created_at,
            vendors!inner(name, category)
          `)
          .gte('created_at', sevenDaysAgo)
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) throw error;

        // Transform the data to include vendor info
        const transformedData = (data || []).map(review => ({
          ...review,
          vendor_name: (review.vendors as any)?.name || 'Unknown Vendor',
          vendor_category: (review.vendors as any)?.category || 'Unknown Category'
        }));

        setRecentReviews(transformedData);

      } catch (err) {
        console.error('Error fetching rating movements:', err);
        setError(err instanceof Error ? err.message : 'Failed to load rating movements');
      } finally {
        setLoading(false);
      }
    };

    fetchRecentRatings();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Rating Activity (Last 7 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading rating movements...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Rating Activity (Last 7 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-destructive">Error: {error}</div>
        </CardContent>
      </Card>
    );
  }

  // Group reviews by vendor
  const vendorGroups = recentReviews.reduce((acc, review) => {
    const key = review.vendor_name || 'Unknown';
    if (!acc[key]) {
      acc[key] = {
        vendor_name: review.vendor_name || 'Unknown',
        category: review.vendor_category || 'Unknown',
        reviews: [],
      };
    }
    acc[key].reviews.push(review);
    return acc;
  }, {} as Record<string, { vendor_name: string; category: string; reviews: ReviewWithHistory[] }>);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Rating Activity (Last 7 Days)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {recentReviews.length === 0 ? (
          <div className="text-sm text-muted-foreground">No rating activity in the last 7 days.</div>
        ) : (
          <div className="space-y-4">
            {Object.values(vendorGroups).map((group) => {
              const avgRating = group.reviews.reduce((sum, r) => sum + r.rating, 0) / group.reviews.length;
              return (
                <div key={group.vendor_name} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium">{group.vendor_name}</h4>
                      <p className="text-sm text-muted-foreground">{group.category}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <RatingStars rating={avgRating} size="sm" showValue />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">New Reviews:</span>
                      <Badge variant="outline">{group.reviews.length}</Badge>
                    </div>
                    
                    <div className="flex items-center gap-1 text-blue-600">
                      <Star className="h-3 w-3 fill-current" />
                      <span>Recent Activity</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}