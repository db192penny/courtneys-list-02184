import { Star, Info, ChevronRight, Smartphone, DollarSign, Phone, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RatingStars } from "@/components/ui/rating-stars";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SectionHeader } from "@/components/ui/section-header";
import { formatUSPhoneDisplay } from "@/utils/phone";
import { getCategoryIcon } from "@/utils/categoryIcons";
import { useUserReviews } from "@/hooks/useUserReviews";
import { useUserCosts } from "@/hooks/useUserCosts";
import ReviewsHover from "@/components/vendors/ReviewsHover";
import GoogleReviewsHover from "@/components/vendors/GoogleReviewsHover";
import { CostDisplay } from "@/components/vendors/CostDisplay";
import { MobileReviewsModal } from "@/components/vendors/MobileReviewsModal";
import { MobileGoogleReviewsModal } from "@/components/vendors/MobileGoogleReviewsModal";
import { ReviewSourceIcon } from "./ReviewSourceIcon";
import { NeighborReviewPreview } from "./NeighborReviewPreview";
import type { CommunityVendorRow } from "@/components/vendors/CommunityVendorTable";
import React from "react";

interface VendorMobileCardProps {
  vendor: CommunityVendorRow;
  rank: number;
  showContact: boolean;
  onCategoryClick: (category: string) => void;
  onRate: (vendor: CommunityVendorRow) => void;
  onCosts: (vendor: CommunityVendorRow) => void;
  userHomeVendors?: Set<string>;
  userReviews?: Map<string, { rating: number; id: string }>;
  userCosts?: Map<string, boolean>;
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
  userReviews,
  userCosts,
  isAuthenticated = false,
  communityName,
}: VendorMobileCardProps) {
  return (
    <Card className="w-full">
      <CardContent className="p-3 space-y-3">
        {/* Header with rank, name, and rate button */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2 flex-1">
            <span className="bg-blue-500 text-white text-xs font-semibold px-2 py-1 rounded min-w-[28px] text-center">
              #{rank}
            </span>
            <div>
              <h3 className="text-base font-semibold text-gray-900">{vendor.name}</h3>
              <span className="text-xs font-medium uppercase tracking-wide text-gray-600">
                {vendor.category}
              </span>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => isAuthenticated ? onRate(vendor) : window.location.href = `/auth?community=${encodeURIComponent(communityName || '')}`}
            className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-1.5"
          >
            Rate
          </Button>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1 mb-2">
          {vendor.homes_serviced === 0 && (
            <Badge 
              variant="secondary" 
              className="text-[10px] px-1 py-0 bg-orange-100 text-orange-800 hover:bg-orange-200 whitespace-nowrap"
            >
              New
            </Badge>
          )}
          {(() => {
            const hasVendor = userHomeVendors?.has(vendor.id);
            console.log(`[VendorMobileCard] Checking vendor ${vendor.name} (${vendor.id}):`, {
              hasVendor,
              userHomeVendorsSize: userHomeVendors?.size,
              userHomeVendorsArray: userHomeVendors ? Array.from(userHomeVendors) : []
            });
            return hasVendor;
          })() && (
            <Badge 
              variant="secondary" 
              className="text-[10px] px-1 py-0 bg-green-100 text-green-800 hover:bg-green-200 whitespace-nowrap"
            >
              Your Provider
            </Badge>
          )}
        </div>

        {/* Homes serviced */}
        <div className="flex justify-center text-sm">
          <span className="font-medium">
            {vendor.homes_serviced === 0 ? "–" : vendor.homes_serviced} neighbors
          </span>
          {vendor.homes_pct && (
            <span className="text-xs text-muted-foreground ml-1">({vendor.homes_pct}%)</span>
          )}
        </div>

        {/* Reviews Section */}
        <div className="space-y-2 mb-3">
          {/* Simplified BB Reviews */}
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2">
              <ReviewSourceIcon source="bb" size="sm" />
              <span className="text-sm font-medium">Boca Bridges</span>
            </div>
            <div className="flex items-center gap-1">
              <RatingStars rating={vendor.hoa_rating || 0} size="sm" />
              <span className="text-sm font-medium text-gray-700">
                {vendor.hoa_rating?.toFixed(1)}
              </span>
              <span className="text-xs text-gray-500">
                ({vendor.hoa_rating_count || 0})
              </span>
            </div>
          </div>
          
          {/* Simplified Google Reviews if available */}
          {vendor.google_rating_count > 0 && (
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2">
                <ReviewSourceIcon source="google" size="sm" />
                <span className="text-sm font-medium">Google</span>
              </div>
              <div className="flex items-center gap-1">
                <RatingStars rating={vendor.google_rating || 0} size="sm" />
                <span className="text-sm font-medium text-gray-700">
                  {vendor.google_rating?.toFixed(1)}
                </span>
                <span className="text-xs text-gray-500">
                  ({vendor.google_rating_count})
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Neighbor Review Preview */}
        <NeighborReviewPreview vendorId={vendor.id} className="px-2" />

        {/* Cost Information Section */}
        <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
          <SectionHeader icon={DollarSign} title="Cost Information" />
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
            communityName={communityName}
            onOpenCostModal={() => onCosts(vendor)}
          />
        </div>

        {/* Actions Section */}
        {isAuthenticated && (
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline"
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 hover:from-blue-600 hover:to-purple-700 flex-1"
              onClick={() => onCosts(vendor)}
            >
              {userCosts?.has(vendor.id) ? "Edit Cost Info" : "Add Cost Info"}
            </Button>
          </div>
        )}

        {/* Contact Section */}
        {showContact && vendor.contact_info && (
          <div className="flex gap-2 mt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.href = `tel:${vendor.contact_info}`}
              className="flex-1 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              <Phone className="w-3 h-3 mr-1" />
              Call
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.href = `sms:${vendor.contact_info}`}
              className="flex-1 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              <MessageSquare className="w-3 h-3 mr-1" />
              Text
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}