import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown, Star, TrendingUp } from "lucide-react";
import { RatingStars } from "@/components/ui/rating-stars";

interface VendorMovementGroup {
  vendor_name: string;
  vendor_category: string;
  new_ratings: number;
  upgrades: number;
  downgrades: number;
  total_changes: number;
  avg_rating: number;
  recent_changes: Array<{
    id: string;
    changed_at: string;
    old_rating: number | null;
    new_rating: number;
  }>;
}

export function RatingMovements() {
  const [vendorGroups, setVendorGroups] = useState<VendorMovementGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRatingHistory = async () => {
      try {
        setLoading(true);
        setError(null);

        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        
        // Try to fetch from rating_history table using type casting
        const { data, error } = await (supabase
          .from('rating_history' as any)
          .select('*')
          .gte('changed_at', sevenDaysAgo)
          .order('changed_at', { ascending: false }) as any);

        if (error) {
          console.log('Rating history not available yet:', error);
          setVendorGroups([]);
          return;
        }

        if (data && Array.isArray(data)) {
          const groups = processRawData(data);
          setVendorGroups(groups);
        } else {
          setVendorGroups([]);
        }

      } catch (err) {
        console.error('Error fetching rating history:', err);
        setVendorGroups([]);
      } finally {
        setLoading(false);
      }
    };

    function processRawData(records: any[]): VendorMovementGroup[] {
      const groupsMap = new Map<string, VendorMovementGroup>();
      
      records.forEach(record => {
        if (!record.vendor_name) return;
        
        const key = `${record.vendor_name}::${record.vendor_category || 'Unknown'}`;
        
        if (!groupsMap.has(key)) {
          groupsMap.set(key, {
            vendor_name: record.vendor_name,
            vendor_category: record.vendor_category || 'Unknown',
            new_ratings: 0,
            upgrades: 0,
            downgrades: 0,
            total_changes: 0,
            avg_rating: 0,
            recent_changes: []
          });
        }
        
        const group = groupsMap.get(key)!;
        group.total_changes++;
        
        // Add to recent changes (keep only first 3)
        if (group.recent_changes.length < 3) {
          group.recent_changes.push({
            id: record.id,
            changed_at: record.changed_at,
            old_rating: record.old_rating,
            new_rating: record.new_rating
          });
        }
        
        // Count movement types
        if (record.old_rating === null || record.old_rating === undefined) {
          group.new_ratings++;
        } else if (record.new_rating > record.old_rating) {
          group.upgrades++;
        } else if (record.new_rating < record.old_rating) {
          group.downgrades++;
        }
      });

      // Calculate average ratings and convert to array
      const groupsArray = Array.from(groupsMap.values()).map(group => {
        // Calculate average from the records we have for this vendor
        const vendorRecords = records.filter(r => 
          r.vendor_name === group.vendor_name && 
          (r.vendor_category || 'Unknown') === group.vendor_category
        );
        
        const sum = vendorRecords.reduce((acc, r) => acc + (r.new_rating || 0), 0);
        group.avg_rating = vendorRecords.length > 0 
          ? Math.round(sum / vendorRecords.length * 10) / 10 
          : 0;
        
        return group;
      });

      // Sort by total activity
      groupsArray.sort((a, b) => b.total_changes - a.total_changes);
      
      return groupsArray;
    }

    fetchRatingHistory();
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Rating Activity (Last 7 Days)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {vendorGroups.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            <p>No rating changes in the last 7 days.</p>
            <p className="mt-2 text-xs">Rating history tracking is now active - future changes will appear here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {vendorGroups.map((group) => (
              <div key={`${group.vendor_name}-${group.vendor_category}`} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-medium">{group.vendor_name}</h4>
                    <p className="text-sm text-muted-foreground">{group.vendor_category}</p>
                  </div>
                  {group.avg_rating > 0 && (
                    <div className="flex items-center gap-2">
                      <RatingStars rating={group.avg_rating} size="sm" showValue />
                    </div>
                  )}
                </div>
                
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">Total Changes:</span>
                    <Badge variant="outline">{group.total_changes}</Badge>
                  </div>
                  
                  {group.new_ratings > 0 && (
                    <div className="flex items-center gap-1 text-blue-600">
                      <Star className="h-3 w-3 fill-current" />
                      <span>{group.new_ratings} new</span>
                    </div>
                  )}
                  
                  {group.upgrades > 0 && (
                    <div className="flex items-center gap-1 text-green-600">
                      <ArrowUp className="h-3 w-3" />
                      <span>{group.upgrades} upgraded</span>
                    </div>
                  )}
                  
                  {group.downgrades > 0 && (
                    <div className="flex items-center gap-1 text-red-600">
                      <ArrowDown className="h-3 w-3" />
                      <span>{group.downgrades} downgraded</span>
                    </div>
                  )}
                </div>
                
                {/* Show recent changes if we have them */}
                {group.recent_changes.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="text-xs text-muted-foreground">
                      Recent activity:
                    </div>
                    <div className="mt-1 space-y-1">
                      {group.recent_changes.map((change, idx) => (
                        <div key={`${change.id}-${idx}`} className="text-xs flex items-center gap-2">
                          <span className="text-muted-foreground">
                            {new Date(change.changed_at).toLocaleDateString()}
                          </span>
                          {!change.old_rating ? (
                            <span className="text-blue-600">New rating: {change.new_rating}★</span>
                          ) : change.new_rating > change.old_rating ? (
                            <span className="text-green-600">
                              {change.old_rating}★ → {change.new_rating}★
                            </span>
                          ) : (
                            <span className="text-red-600">
                              {change.old_rating}★ → {change.new_rating}★
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}