import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RatingStars } from "@/components/ui/rating-stars";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatUSPhoneDisplay } from "@/utils/phone";
import ReviewsHover from "@/components/vendors/ReviewsHover";
import GoogleReviewsHover from "@/components/vendors/GoogleReviewsHover";
import { CostDisplay } from "@/components/vendors/CostDisplay";
import type { CommunityVendorRow } from "@/components/vendors/CommunityVendorTable";

interface VendorMobileCardProps {
  vendor: CommunityVendorRow;
  rank: number;
  showContact: boolean;
  onCategoryClick: (category: string) => void;
  onRate: (vendor: CommunityVendorRow) => void;
  onCosts: (vendor: CommunityVendorRow) => void;
  userHomeVendors?: Set<string>;
  isAuthenticated?: boolean;
  communityName?: string;
}

export default function VendorMobileCard({
  vendor,
  rank,
  showContact,
  onCategoryClick,
  onRate,
  onCosts,
  userHomeVendors,
  isAuthenticated = false,
  communityName,
}: VendorMobileCardProps) {
  return (
    <Card className="w-full">
      <CardContent className="p-4 space-y-3">
        {/* Header with rank, name, and badges */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {/* Labels above provider name */}
            <div className="flex flex-wrap gap-1 mb-2">
              {vendor.homes_serviced === 0 && (
                <Badge 
                  variant="secondary" 
                  className="text-[10px] px-1 py-0 bg-orange-100 text-orange-800 hover:bg-orange-200 whitespace-nowrap"
                >
                  New
                </Badge>
              )}
              {userHomeVendors?.has(vendor.id) && (
                <Badge 
                  variant="secondary" 
                  className="text-[10px] px-1 py-0 bg-green-100 text-green-800 hover:bg-green-200 whitespace-nowrap"
                >
                  Your Provider
                </Badge>
              )}
            </div>
            {/* Rank and full provider name */}
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-muted-foreground">#{rank}</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <h3 className="font-medium text-foreground break-words leading-tight">{vendor.name}</h3>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{vendor.name}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
          <div className="flex gap-1 shrink-0">
            <Button 
              size="sm" 
              variant="outline"
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 hover:from-blue-600 hover:to-purple-700 flex items-center gap-1"
              onClick={() => isAuthenticated ? onRate(vendor) : window.location.href = `/auth?community=${encodeURIComponent(communityName || '')}`}
            >
              <Star className="h-3 w-3" />
              Rate
            </Button>
            {isAuthenticated && (
              <Button 
                size="sm" 
                variant="outline"
                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 hover:from-blue-600 hover:to-purple-700"
                onClick={() => onCosts(vendor)}
              >
                + Costs
              </Button>
            )}
          </div>
        </div>

        {/* Category and homes serviced */}
        <div className="flex items-center justify-between gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => onCategoryClick(vendor.category)}
            className="text-xs"
          >
            {vendor.category}
          </Button>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">
              {vendor.homes_serviced === 0 ? "–" : vendor.homes_serviced} neighbors
            </span>
            {vendor.homes_pct && (
              <span className="text-xs text-muted-foreground">({vendor.homes_pct}%)</span>
            )}
          </div>
        </div>

        {/* Ratings */}
        <div className="space-y-2">
          <ReviewsHover vendorId={vendor.id}>
            <div className="flex items-center justify-between p-2 rounded-md bg-blue-50 hover:bg-blue-100 transition-colors border border-blue-200 cursor-pointer">
              <span className="text-sm font-medium text-muted-foreground">{communityName}</span>
              {vendor.hoa_rating ? (
                <div className="flex items-center gap-1">
                  <RatingStars rating={vendor.hoa_rating} showValue />
                  {vendor.hoa_rating_count && (
                    <span className="text-xs text-muted-foreground">({vendor.hoa_rating_count})</span>
                  )}
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">No ratings yet</span>
              )}
            </div>
          </ReviewsHover>

          {vendor.google_rating != null && (
            <GoogleReviewsHover 
              vendorId={vendor.id} 
              googleReviewsJson={vendor.google_reviews_json}
              googlePlaceId={vendor.google_place_id}
            >
              <div className="flex items-center justify-between p-2 rounded-md bg-green-50 hover:bg-green-100 transition-colors border border-green-200 cursor-pointer">
                <span className="text-sm font-medium text-muted-foreground">Google</span>
                <div className="flex items-center gap-1">
                  <RatingStars rating={vendor.google_rating} showValue />
                  {vendor.google_rating_count && (
                    <span className="text-xs text-muted-foreground">({vendor.google_rating_count})</span>
                  )}
                </div>
              </div>
            </GoogleReviewsHover>
          )}
        </div>

        {/* Cost and contact info */}
        <div className="space-y-3 pt-2 border-t">
          <CostDisplay
            vendorId={vendor.id}
            vendorName={vendor.name}
            category={vendor.category}
            communityAmount={vendor.community_amount}
            communityUnit={vendor.community_unit}
            communitySampleSize={vendor.community_sample_size}
            marketAmount={vendor.market_amount}
            marketUnit={vendor.market_unit}
            showContact={showContact}
          />
          <div className="text-sm">
            <span className="text-muted-foreground">Contact: </span>
            <span className="font-medium">
              {showContact ? (vendor.contact_info ? formatUSPhoneDisplay(vendor.contact_info) : "—") : "Hidden"}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}