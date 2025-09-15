import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Star, Building2, DollarSign, Calendar, MessageSquare, Tag, MapPin, Home, Trophy, Users } from "lucide-react";
import { RatingStars } from "@/components/ui/rating-stars";
import { format } from "date-fns";

interface UserActivityDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  userEmail: string;
  userAddress?: string | null;
  userHoaName?: string | null;
  userSignupSource?: string | null;
  userPoints?: number | null;
}

export function UserActivityDetailsModal({
  open,
  onOpenChange,
  userId,
  userName,
  userEmail,
  userAddress,
  userHoaName,
  userSignupSource,
  userPoints
}: UserActivityDetailsModalProps) {
  const [activeTab, setActiveTab] = useState("reviews");

  const { data: reviews, isLoading: reviewsLoading } = useQuery({
    queryKey: ["user-reviews-detailed", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select(`
          id,
          rating,
          comments,
          created_at,
          anonymous,
          vendor:vendors(
            id,
            name,
            category
          )
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: open && !!userId
  });

  const { data: submittedVendors, isLoading: vendorsLoading } = useQuery({
    queryKey: ["user-submitted-vendors", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendors")
        .select(`
          id,
          name,
          category,
          contact_info,
          created_at,
          google_rating,
          google_rating_count
        `)
        .eq("created_by", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: open && !!userId
  });

  const { data: sharedCosts, isLoading: costsLoading } = useQuery({
    queryKey: ["user-shared-costs", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("costs")
        .select(`
          id,
          amount,
          cost_kind,
          unit,
          period,
          notes,
          created_at,
          anonymous,
          vendor:vendors(
            id,
            name,
            category
          )
        `)
        .eq("created_by", userId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: open && !!userId
  });

  const formatCostDisplay = (cost: any) => {
    let display = `$${cost.amount}`;
    
    if (cost.unit === "month") display += "/mo";
    else if (cost.unit === "hour") display += "/hr";
    else if (cost.unit === "visit") display += "/visit";
    else if (cost.unit === "year") display += "/yr";
    
    if (cost.cost_kind) {
      display += ` (${cost.cost_kind.replace(/_/g, " ")})`;
    }
    
    return display;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex flex-col gap-2">
            <span>User Activity Details</span>
            <div className="flex flex-col gap-1 text-sm text-muted-foreground font-normal">
              <div className="flex items-center gap-2">
                <span className="font-medium">{userName}</span>
                <span>•</span>
                <span>{userEmail}</span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {userAddress && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    <span>{userAddress}</span>
                  </div>
                )}
                {userHoaName && (
                  <div className="flex items-center gap-1">
                    <Home className="h-3 w-3" />
                    <span>{userHoaName}</span>
                  </div>
                )}
                {userPoints !== null && userPoints !== undefined && (
                  <div className="flex items-center gap-1">
                    <Trophy className="h-3 w-3" />
                    <span>{userPoints} points</span>
                  </div>
                )}
                {userSignupSource && (
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    <span>{userSignupSource.startsWith("community:") 
                      ? `${userSignupSource.replace("community:", "")} signup`
                      : "Regular signup"
                    }</span>
                  </div>
                )}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="reviews" className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              Reviews ({reviews?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="vendors" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Vendors ({submittedVendors?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="costs" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Costs ({sharedCosts?.length || 0})
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[500px] mt-4">
            <TabsContent value="reviews" className="space-y-4">
              {reviewsLoading && (
                <div className="text-center text-muted-foreground py-8">
                  Loading reviews...
                </div>
              )}
              
              {!reviewsLoading && reviews?.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  No reviews submitted
                </div>
              )}

              {reviews?.map((review: any) => (
                <Card key={review.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-base flex items-center gap-2">
                          {review.vendor?.name || "Unknown Vendor"}
                          {review.anonymous && (
                            <Badge variant="secondary" className="text-xs">
                              Anonymous
                            </Badge>
                          )}
                        </CardTitle>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Badge variant="outline" className="text-xs">
                            {review.vendor?.category || "Uncategorized"}
                          </Badge>
                          <span>•</span>
                          <Calendar className="h-3 w-3" />
                          <span>{format(new Date(review.created_at), "MMM d, yyyy")}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <RatingStars rating={review.rating} size="sm" />
                        <span className="text-sm font-medium ml-1">
                          {review.rating}/5
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  {review.comments && (
                    <CardContent>
                      <div className="flex gap-2">
                        <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-muted-foreground">
                          {review.comments}
                        </p>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="vendors" className="space-y-4">
              {vendorsLoading && (
                <div className="text-center text-muted-foreground py-8">
                  Loading vendors...
                </div>
              )}
              
              {!vendorsLoading && submittedVendors?.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  No vendors submitted
                </div>
              )}

              {submittedVendors?.map((vendor: any) => (
                <Card key={vendor.id}>
                  <CardHeader>
                    <div className="space-y-2">
                      <CardTitle className="text-base">
                        {vendor.name}
                      </CardTitle>
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <Badge variant="outline">
                          <Tag className="h-3 w-3 mr-1" />
                          {vendor.category}
                        </Badge>
                        {vendor.contact_info && (
                          <Badge variant="secondary">
                            {vendor.contact_info}
                          </Badge>
                        )}
                        {vendor.google_rating && (
                          <Badge variant="secondary" className="bg-green-50 text-green-700">
                            Google: {vendor.google_rating}⭐ ({vendor.google_rating_count})
                          </Badge>
                        )}
                        <span className="text-muted-foreground">
                          <Calendar className="h-3 w-3 inline mr-1" />
                          {format(new Date(vendor.created_at), "MMM d, yyyy")}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="costs" className="space-y-4">
              {costsLoading && (
                <div className="text-center text-muted-foreground py-8">
                  Loading costs...
                </div>
              )}
              
              {!costsLoading && sharedCosts?.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  No costs shared
                </div>
              )}

              {sharedCosts?.map((cost: any) => (
                <Card key={cost.id}>
                  <CardHeader>
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base">
                          {cost.vendor?.name || "Unknown Vendor"}
                          {cost.anonymous && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              Anonymous
                            </Badge>
                          )}
                        </CardTitle>
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                          {formatCostDisplay(cost)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {cost.vendor?.category || "Uncategorized"}
                        </Badge>
                        <span>•</span>
                        <Calendar className="h-3 w-3" />
                        <span>{format(new Date(cost.created_at), "MMM d, yyyy")}</span>
                      </div>
                      {cost.notes && (
                        <p className="text-sm text-muted-foreground mt-2 italic">
                          "{cost.notes}"
                        </p>
                      )}
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}