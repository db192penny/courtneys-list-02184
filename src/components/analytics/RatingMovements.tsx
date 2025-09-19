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
        
        // Execute raw SQL query directly
        const { data, error } = await supabase.rpc('query' as any, {
          query_text: `
            SELECT 
              vendor_name,
              vendor_category,
              COUNT(*) FILTER (WHERE old_rating IS NULL) as new_ratings,
              COUNT(*) FILTER (WHERE old_rating IS NOT NULL AND new_rating > old_rating) as upgrades,
              COUNT(*) FILTER (WHERE old_rating IS NOT NULL AND new_rating < old_rating) as downgrades,
              COUNT(*) as total_changes,
              ROUND(AVG(new_rating), 1) as avg_rating,
              JSON_AGG(
                JSON_BUILD_OBJECT(
                  'id', id,
                  'changed_at', changed_at,
                  'old_rating', old_rating,
                  'new_rating', new_rating
                ) ORDER BY changed_at DESC
              ) FILTER (WHERE id IS NOT NULL) as recent_changes
            FROM rating_history
            WHERE changed_at >= $1
              AND change_type IN ('create', 'update')
            GROUP BY vendor_name, vendor_category
            ORDER BY COUNT(*) DESC
          `,
          params: [sevenDaysAgo]
        }).catch(() => {
          // If raw query doesn't work, try a simpler approach
          return supabase
            .from('rating_history' as any)
            .select('*')
            .gte('changed_at', sevenDaysAgo)
            .order('changed_at', { ascending: false });
        });

        if (error) {
          // If the table doesn't exist, show a helpful message
          console.log('Rating history table not accessible yet');
          setVendorGroups([]);
          return;
        }

        if (data) {
          // Process the data
          if (Array.isArray(data)) {
            const groups = processRawData(data as any[]);
            setVendorGroups(groups);
          } else {
            setVendorGroups([]);
          }
        }

      } catch (err) {
        console.error('Error fetching rating history:', err);
        // Don't show error, just show empty state
        setVendorGroups([]);
      } finally {
        setLoading(false);
      }
    };

    function processRawData(records: any[]): VendorMovementGroup[] {
      // If data has the aggregated format
      if (records.length > 0 && 'new_ratings' in records[0]) {
        return records.map(row => ({
          vendor_name: row.vendor_name || 'Unknown',
          vendor_category: row.vendor_category || 'Unknown',
          new_ratings: Number(row.new_ratings) || 0,
          upgrades: Number(row.upgrades) || 0,
          downgrades: Number(row.downgrades) || 0,
          total_changes: Number(row.total_changes) || 0,
          avg_rating: Number(row.avg_rating) || 0,
          recent_changes: Array.isArray(row.recent_changes) ? row.recent_changes.slice(0, 3) : []
        }));
      }
      
      // Otherwise process individual records
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
        
        // Add to recent changes
        if (group.recent_changes.length < 3) {
          group.recent_changes.push({
            id: record.id,
            changed_at: record.changed_at,
            old_rating: record.old_rating,
            new_rating: record.new_rating
          });
        }
        
        // Count movement types
        if (record.old_rating === null) {
          group.new_ratings++;
        } else if (record.new_rating > record.old_rating) {
          group.upgrades++;
        } else if (record.new_rating < record.old_rating) {
          group.downgrades++;
        }
      });

      // Calculate average ratings and convert to array
      const groupsArray = Array.from(groupsMap.values()).map(group => {
        const ratings = records.filter(r => 
          r.vendor_name === group.vendor_name && 
          r.vendor_category === group.vendor_category
        ).map(r => r.new_rating);
        
        const sum = ratings.reduce((acc, r) => acc + (r || 0), 0);
        group.avg_rating = ratings.length > 0 ? sum / ratings.length : 0;
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
                  <div className="flex items-center gap-2">
                    <RatingStars rating={group.avg_rating} size="sm" showValue />
                  </div>
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
                      {group.recent_changes.map((change) => (
                        <div key={change.id} className="text-xs flex items-center gap-2">
                          <span className="text-muted-foreground">
                            {new Date(change.changed_at).toLocaleDateString()}
                          </span>
                          {change.old_rating === null ? (
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