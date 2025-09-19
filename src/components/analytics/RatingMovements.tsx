import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown, Star, TrendingUp } from "lucide-react";
import { RatingStars } from "@/components/ui/rating-stars";

interface RatingHistoryRecord {
  id: string;
  review_id: string;
  user_id: string;
  vendor_id: string;
  old_rating: number | null;
  new_rating: number;
  old_comments: string | null;
  new_comments: string | null;
  changed_at: string;
  change_type: 'create' | 'update' | 'delete';
  user_email: string;
  vendor_name: string;
  vendor_category: string;
}

interface VendorMovementGroup {
  vendor_name: string;
  vendor_category: string;
  new_ratings: number;
  upgrades: number;
  downgrades: number;
  total_changes: number;
  avg_rating: number;
  records: RatingHistoryRecord[];
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
        
        // Use raw SQL query to bypass TypeScript type checking
        const { data, error } = await supabase.rpc('get_community_rating_movements', {
          _hoa_name: 'Boca Bridges', // You can make this dynamic
          _days: 7
        });

        if (error) {
          // If the function doesn't exist, fall back to direct query
          const { data: directData, error: directError } = await supabase
            .from('rating_history' as any)
            .select('*')
            .gte('changed_at', sevenDaysAgo)
            .order('changed_at', { ascending: false });

          if (directError) throw directError;
          
          const records = (directData || []) as unknown as RatingHistoryRecord[];
          processRecords(records);
        } else {
          // Process the RPC results
          const movements = data || [];
          
          // Group by vendor from RPC results
          const groupsMap = new Map<string, VendorMovementGroup>();
          
          movements.forEach((movement: any) => {
            const key = movement.vendor_name;
            
            if (!groupsMap.has(key)) {
              groupsMap.set(key, {
                vendor_name: movement.vendor_name,
                vendor_category: movement.category,
                new_ratings: 0,
                upgrades: 0,
                downgrades: 0,
                total_changes: 0,
                avg_rating: movement.avg_rating || 0,
                records: []
              });
            }
            
            const group = groupsMap.get(key)!;
            group.total_changes += Number(movement.count) || 0;
            
            if (movement.movement_type === 'New Rating') {
              group.new_ratings += Number(movement.count) || 0;
            } else if (movement.movement_type === 'Upgrade') {
              group.upgrades += Number(movement.count) || 0;
            } else if (movement.movement_type === 'Downgrade') {
              group.downgrades += Number(movement.count) || 0;
            }
          });

          const groupsArray = Array.from(groupsMap.values());
          groupsArray.sort((a, b) => b.total_changes - a.total_changes);
          setVendorGroups(groupsArray);
        }

      } catch (err) {
        console.error('Error fetching rating history:', err);
        
        // Fallback: Try using the weekly_rating_changes view
        try {
          const { data: viewData, error: viewError } = await supabase
            .from('weekly_rating_changes' as any)
            .select('*');
            
          if (!viewError && viewData) {
            const groups = (viewData as any[]).map(row => ({
              vendor_name: row.vendor_name,
              vendor_category: row.vendor_category,
              new_ratings: row.new_ratings || 0,
              upgrades: row.upgrades || 0,
              downgrades: row.downgrades || 0,
              total_changes: row.total_changes || 0,
              avg_rating: row.avg_rating || 0,
              records: []
            }));
            
            setVendorGroups(groups);
            return;
          }
        } catch (fallbackErr) {
          console.error('Fallback also failed:', fallbackErr);
        }
        
        setError(err instanceof Error ? err.message : 'Failed to load rating movements');
      } finally {
        setLoading(false);
      }
    };

    function processRecords(records: RatingHistoryRecord[]) {
      // Group by vendor and calculate stats
      const groupsMap = new Map<string, VendorMovementGroup>();
      
      records.forEach(record => {
        const key = `${record.vendor_name}::${record.vendor_category}`;
        
        if (!groupsMap.has(key)) {
          groupsMap.set(key, {
            vendor_name: record.vendor_name,
            vendor_category: record.vendor_category,
            new_ratings: 0,
            upgrades: 0,
            downgrades: 0,
            total_changes: 0,
            avg_rating: 0,
            records: []
          });
        }
        
        const group = groupsMap.get(key)!;
        group.records.push(record);
        group.total_changes++;
        
        // Count movement types
        if (record.old_rating === null) {
          group.new_ratings++;
        } else if (record.new_rating > record.old_rating) {
          group.upgrades++;
        } else if (record.new_rating < record.old_rating) {
          group.downgrades++;
        }
      });

      // Calculate average ratings
      const groupsArray = Array.from(groupsMap.values()).map(group => {
        const sum = group.records.reduce((acc, r) => acc + r.new_rating, 0);
        group.avg_rating = group.records.length > 0 ? sum / group.records.length : 0;
        return group;
      });

      // Sort by total activity
      groupsArray.sort((a, b) => b.total_changes - a.total_changes);
      
      setVendorGroups(groupsArray);
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
          <div className="text-sm text-destructive">
            <p>Note: Rating history tracking was just enabled.</p>
            <p className="mt-2">New rating changes will appear here going forward.</p>
          </div>
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
                
                {/* Show recent changes if we have record details */}
                {group.records.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="text-xs text-muted-foreground">
                      Recent activity:
                    </div>
                    <div className="mt-1 space-y-1">
                      {group.records.slice(0, 3).map((record) => (
                        <div key={record.id} className="text-xs flex items-center gap-2">
                          <span className="text-muted-foreground">
                            {new Date(record.changed_at).toLocaleDateString()}
                          </span>
                          {record.old_rating === null ? (
                            <span className="text-blue-600">New rating: {record.new_rating}★</span>
                          ) : record.new_rating > record.old_rating ? (
                            <span className="text-green-600">
                              {record.old_rating}★ → {record.new_rating}★
                            </span>
                          ) : (
                            <span className="text-red-600">
                              {record.old_rating}★ → {record.new_rating}★
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