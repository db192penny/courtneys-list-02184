import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SEO from "@/components/SEO";
import { Eye, Calendar, MapPin, Star, DollarSign, Building } from "lucide-react";
import { format } from "date-fns";

interface PreviewUser {
  id: string;
  session_token: string;
  name: string;
  address: string;
  formatted_address?: string;
  community: string;
  street_name?: string;
  created_at: string;
  source?: string;
  activity_counts: {
    reviews: number;
    costs: number;
    page_views: number;
  };
}

interface UserActivity {
  id: string;
  event_type: string;
  created_at: string;
  vendor_id?: string;
  metadata?: any;
  vendor_name?: string;
  review_rating?: number;
  review_comments?: string;
  cost_amount?: number;
  cost_unit?: string;
}

export default function AdminPreviewUsers() {
  const [selectedUser, setSelectedUser] = useState<PreviewUser | null>(null);
  const [communityFilter, setCommunityFilter] = useState<string>("all");
  const [searchFilter, setSearchFilter] = useState("");

  const { data: previewUsers, isLoading } = useQuery({
    queryKey: ["admin-preview-users"],
    queryFn: async () => {
      const { data: sessions, error: sessionsError } = await supabase
        .from("preview_sessions")
        .select("*")
        .order("created_at", { ascending: false });

      if (sessionsError) throw sessionsError;

      // Get activity counts for each session
      const usersWithActivity = await Promise.all(
        sessions.map(async (session) => {
          const [reviewsResult, costsResult, metricsResult] = await Promise.all([
            supabase
              .from("preview_reviews")
              .select("id")
              .eq("session_id", session.id),
            supabase
              .from("preview_costs")
              .select("id")
              .eq("session_id", session.id),
            supabase
              .from("preview_metrics")
              .select("id")
              .eq("session_id", session.id)
              .eq("event_type", "page_view")
          ]);

          return {
            ...session,
            activity_counts: {
              reviews: reviewsResult.data?.length || 0,
              costs: costsResult.data?.length || 0,
              page_views: metricsResult.data?.length || 0,
            }
          };
        })
      );

      return usersWithActivity as PreviewUser[];
    },
  });

  const { data: userActivity, isLoading: isActivityLoading } = useQuery({
    queryKey: ["admin-user-activity", selectedUser?.id],
    queryFn: async () => {
      if (!selectedUser) return [];

      // Get all activities for this user
      const [metricsResult, reviewsResult, costsResult] = await Promise.all([
        supabase
          .from("preview_metrics")
          .select(`
            id,
            event_type,
            created_at,
            vendor_id,
            metadata,
            vendors(name)
          `)
          .eq("session_id", selectedUser.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("preview_reviews")
          .select(`
            id,
            created_at,
            vendor_id,
            rating,
            comments,
            vendors(name)
          `)
          .eq("session_id", selectedUser.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("preview_costs")
          .select(`
            id,
            created_at,
            vendor_id,
            amount,
            unit,
            vendors(name)
          `)
          .eq("session_id", selectedUser.id)
          .order("created_at", { ascending: false })
      ]);

      const activities: UserActivity[] = [];

      // Add metrics activities
      metricsResult.data?.forEach((metric) => {
        activities.push({
          id: metric.id,
          event_type: metric.event_type,
          created_at: metric.created_at,
          vendor_id: metric.vendor_id,
          metadata: metric.metadata,
          vendor_name: (metric.vendors as any)?.name,
        });
      });

      // Add review activities
      reviewsResult.data?.forEach((review) => {
        activities.push({
          id: `review-${review.id}`,
          event_type: "review_submitted",
          created_at: review.created_at,
          vendor_id: review.vendor_id,
          vendor_name: (review.vendors as any)?.name,
          review_rating: review.rating,
          review_comments: review.comments,
        });
      });

      // Add cost activities
      costsResult.data?.forEach((cost) => {
        activities.push({
          id: `cost-${cost.id}`,
          event_type: "cost_submitted",
          created_at: cost.created_at,
          vendor_id: cost.vendor_id,
          vendor_name: (cost.vendors as any)?.name,
          cost_amount: cost.amount,
          cost_unit: cost.unit,
        });
      });

      // Sort all activities by date
      return activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },
    enabled: !!selectedUser,
  });

  const filteredUsers = useMemo(() => {
    if (!previewUsers) return [];

    return previewUsers.filter((user) => {
      const matchesCommunity = communityFilter === "all" || user.community.toLowerCase() === communityFilter.toLowerCase();
      const matchesSearch = searchFilter === "" || 
        user.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        user.address.toLowerCase().includes(searchFilter.toLowerCase()) ||
        user.community.toLowerCase().includes(searchFilter.toLowerCase());

      return matchesCommunity && matchesSearch;
    });
  }, [previewUsers, communityFilter, searchFilter]);

  const communities = useMemo(() => {
    if (!previewUsers) return [];
    return [...new Set(previewUsers.map(user => user.community))];
  }, [previewUsers]);

  const getActivityIcon = (eventType: string) => {
    switch (eventType) {
      case "page_view":
        return <Eye className="w-4 h-4 text-blue-500" />;
      case "review_submitted":
        return <Star className="w-4 h-4 text-yellow-500" />;
      case "cost_submitted":
        return <DollarSign className="w-4 h-4 text-green-500" />;
      case "vendor_submission":
        return <Building className="w-4 h-4 text-purple-500" />;
      default:
        return <Calendar className="w-4 h-4 text-gray-500" />;
    }
  };

  const getActivityDescription = (activity: UserActivity) => {
    switch (activity.event_type) {
      case "page_view":
        return "Viewed page";
      case "identity_provided":
        return "Provided identity information";
      case "rate_vendor":
        return `Opened rating modal${activity.vendor_name ? ` for ${activity.vendor_name}` : ""}`;
      case "add_cost":
        return `Opened cost modal${activity.vendor_name ? ` for ${activity.vendor_name}` : ""}`;
      case "review_submitted":
        return `Submitted ${activity.review_rating}-star review${activity.vendor_name ? ` for ${activity.vendor_name}` : ""}`;
      case "cost_submitted":
        return `Shared cost information${activity.vendor_name ? ` for ${activity.vendor_name}` : ""} (${activity.cost_amount ? `$${activity.cost_amount}${activity.cost_unit ? `/${activity.cost_unit}` : ""}` : ""})`;
      default:
        return activity.event_type.replace(/_/g, " ");
    }
  };

  const getTotalEngagement = (user: PreviewUser) => {
    return user.activity_counts.reviews + user.activity_counts.costs;
  };

  return (
    <main className="container py-8 space-y-8">
      <SEO
        title="Admin — Preview Users Activity"
        description="Track individual user activity from preview links"
      />

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Preview Users Activity</h1>
          <p className="text-muted-foreground mt-2">
            Track individual user engagement and activities from preview links
          </p>
        </div>

        {/* Filters */}
        <div className="flex gap-4 items-center">
          <Input
            placeholder="Search by name, address, or community..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="max-w-xs"
          />
          <Select value={communityFilter} onValueChange={setCommunityFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by community" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Communities</SelectItem>
              {communities.map((community) => (
                <SelectItem key={community} value={community}>
                  {community}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Preview Users ({filteredUsers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center text-muted-foreground py-8">Loading users...</p>
            ) : filteredUsers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No users found.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Community</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Reviews</TableHead>
                    <TableHead>Costs</TableHead>
                    <TableHead>Engagement</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          {user.street_name && (
                            <p className="text-sm text-muted-foreground">
                              on {user.street_name}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{user.community}</TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate" title={user.formatted_address || user.address}>
                          {user.formatted_address || user.address}
                        </div>
                      </TableCell>
                      <TableCell>{format(new Date(user.created_at), "MMM d, yyyy")}</TableCell>
                      <TableCell>
                        <Badge variant={user.activity_counts.reviews > 0 ? "default" : "secondary"}>
                          {user.activity_counts.reviews}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.activity_counts.costs > 0 ? "default" : "secondary"}>
                          {user.activity_counts.costs}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant={getTotalEngagement(user) > 0 ? "default" : "outline"}>
                            {getTotalEngagement(user)} actions
                          </Badge>
                          <Badge variant="outline">
                            {user.activity_counts.page_views} views
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedUser(user)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Activity
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* User Activity Detail Modal */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              {selectedUser?.name} — Activity Timeline
            </DialogTitle>
            <div className="text-sm text-muted-foreground space-y-1">
              <p><strong>Community:</strong> {selectedUser?.community}</p>
              <p><strong>Address:</strong> {selectedUser?.formatted_address || selectedUser?.address}</p>
              <p><strong>Joined:</strong> {selectedUser && format(new Date(selectedUser.created_at), "MMM d, yyyy 'at' h:mm a")}</p>
              {selectedUser?.source && (
                <p><strong>Source:</strong> {selectedUser.source}</p>
              )}
            </div>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh]">
            {isActivityLoading ? (
              <p className="text-center text-muted-foreground py-8">Loading activity...</p>
            ) : !userActivity?.length ? (
              <p className="text-center text-muted-foreground py-8">No activity recorded yet.</p>
            ) : (
              <div className="space-y-4">
                {userActivity.map((activity) => (
                  <div key={activity.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getActivityIcon(activity.event_type)}
                        <span className="font-medium">
                          {getActivityDescription(activity)}
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(activity.created_at), "MMM d 'at' h:mm a")}
                      </span>
                    </div>
                    
                    {activity.review_comments && (
                      <div className="pl-6 text-sm text-muted-foreground">
                        <p>"{activity.review_comments}"</p>
                      </div>
                    )}
                    
                    {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                      <div className="pl-6 text-sm text-muted-foreground">
                        <details>
                          <summary className="cursor-pointer">View metadata</summary>
                          <pre className="mt-2 text-xs bg-muted p-2 rounded">
                            {JSON.stringify(activity.metadata, null, 2)}
                          </pre>
                        </details>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </main>
  );
}