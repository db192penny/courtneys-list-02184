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
import { useVendorCosts } from "@/hooks/useVendorCosts";
import { useUserProfile } from "@/hooks/useUserProfile";
import ReviewsHover from "@/components/vendors/ReviewsHover";
import GoogleReviewsHover from "@/components/vendors/GoogleReviewsHover";
import { CostDisplay } from "@/components/vendors/CostDisplay";
import { MobileReviewsModal } from "@/components/vendors/MobileReviewsModal";
import { MobileGoogleReviewsModal } from "@/components/vendors/MobileGoogleReviewsModal";
import { ReviewSourceIcon } from "./ReviewSourceIcon";
import { NeighborReviewPreview } from "./NeighborReviewPreview";
import { MobileCostsModal } from "./MobileCostsModal";
import type { CommunityVendorRow } from "@/components/vendors/CommunityVendorTable";
import React, { useState } from "react";

// Category emoji mapping (from CommunityVendorTable)
const getCategoryEmoji = (category: string) => {
  const categoryIcon = {
    'HVAC': '🔧',
    'Pool': '🏊',
    'Landscaping': '🌱',
    'Plumbing': '🚰',
    'Electrical': '⚡',
    'Pest Control': '🐛',
    'House Cleaning': '🧹',
    'Handyman': '🔨',
    'Roofing': '🏠',
    'General Contractor': '👷',
    'Car Wash & Detail': '🚗',
    'Pet Grooming': '🐕',
    'Mobile Tire Repair': '🔧',
    'Appliance Repair': '🔌',
    'Painters': '🎨',
    'Power Washing': '💧',
    'Water Filtration': '💧',
    'Interior Design': '🏡'
  }[category] || '🏠';
  return categoryIcon;
};

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
  const { data: vendorCosts, isLoading: costsLoading } = useVendorCosts(vendor.id);
  const { data: profile } = useUserProfile();
  const isVerified = !!profile?.isVerified;
  const [costModalOpen, setCostModalOpen] = useState(false);
  const [googleReviewsModalOpen, setGoogleReviewsModalOpen] = useState(false);
  const [isReviewsModalOpen, setIsReviewsModalOpen] = useState(false);

  return (
    <>
    <Card className="w-full">
      <CardContent className="p-3 space-y-3">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2 flex-1">
            <span className="bg-blue-500 text-white text-xs font-semibold px-2 py-1 rounded">
              #{rank}
            </span>
            <div className="flex-1">
              <h3 className="text-base font-semibold">{vendor.name}</h3>
              
              {/* Category Badge with Emoji */}
              <div className="flex items-center mt-1 mb-2">
                <Badge variant="secondary" className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                  {getCategoryEmoji(vendor.category)} {vendor.category}
                </Badge>
              </div>
              
              {/* Interactive Neighbor Count Button */}
              {vendor.homes_serviced > 0 && (
                <button
                  onClick={() => setIsReviewsModalOpen(true)}
                  className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full font-medium hover:bg-blue-100 transition-colors cursor-pointer"
                >
                  👥 {vendor.homes_serviced} neighbor{vendor.homes_serviced !== 1 ? 's' : ''}
                </button>
              )}
            </div>
          </div>
          <Button
            onClick={() => isAuthenticated ? onRate(vendor) : window.location.href = `/auth?community=${encodeURIComponent(communityName || '')}`}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 shrink-0"
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


        {/* Community Reviews Section */}
        <div className="space-y-3">
          
          {/* Enhanced Neighbor Review Preview - Primary BB Section */}
          <NeighborReviewPreview 
            vendorId={vendor.id} 
            vendor={vendor}
            onOpenModal={() => setIsReviewsModalOpen(true)}
          />
          
          {/* Google Reviews - Separate External Reviews */}
          {vendor.google_rating_count && vendor.google_rating_count > 0 && (
            <div>
              <h5 className="text-xs font-medium text-gray-600 mb-1">External Reviews</h5>
              <button
                onClick={() => setGoogleReviewsModalOpen(true)}
                className="w-full flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2 hover:bg-green-100 transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-2">
                  <ReviewSourceIcon source="google" size="sm" />
                  <span className="text-sm font-medium text-gray-700">Google Reviews</span>
                </div>
                <div className="flex items-center gap-2">
                  <RatingStars rating={vendor.google_rating || 0} size="sm" />
                  <span className="text-sm text-gray-600">
                    {vendor.google_rating?.toFixed(1)} ({vendor.google_rating_count})
                  </span>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Cost Information */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700">Cost Information</h4>
            {isVerified && (
              <button
                onClick={() => onCosts(vendor)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                + Add
              </button>
            )}
          </div>

          {vendorCosts && vendorCosts.length > 0 ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              {/* Show cost range if multiple costs */}
              {vendorCosts.length > 1 ? (
                <>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-green-700">
                      💰 ${Math.min(...vendorCosts.map(c => c.amount || 0))} - ${Math.max(...vendorCosts.map(c => c.amount || 0))}
                      {vendorCosts[0]?.period ? `/${vendorCosts[0].period}` : ''}
                    </span>
                    <span className="text-xs text-green-600">
                      {vendorCosts.length} neighbors
                    </span>
                  </div>
                  
                  {/* Show first comment if available */}
                  {vendorCosts.find(c => c.notes) && (
                    <p className="text-xs text-green-600 italic">
                      "{(() => {
                        const note = vendorCosts.find(c => c.notes)?.notes || '';
                        return note.length > 100 ? note.substring(0, 100) + '...' : note;
                      })()}"
                    </p>
                  )}
                  
                  <button
                    onClick={() => setCostModalOpen(true)}
                    className="text-xs text-green-600 font-medium mt-2"
                  >
                    View all cost details →
                  </button>
                </>
              ) : (
                /* Single cost - show full details */
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-green-700">
                      💰 ${vendorCosts[0].amount}
                      {vendorCosts[0].period ? `/${vendorCosts[0].period}` : ''}
                    </span>
                  </div>
                  {vendorCosts[0].notes && (
                    <p className="text-xs text-green-600 italic mt-1">
                      "{vendorCosts[0].notes.length > 100 ? vendorCosts[0].notes.substring(0, 100) + '...' : vendorCosts[0].notes}"
                    </p>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="text-center py-3 text-sm text-gray-500">
              No cost information yet
            </div>
          )}
        </div>

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

   {/* Reviews Modal - Pass correct props */}
<Dialog open={isReviewsModalOpen} onOpenChange={setIsReviewsModalOpen}>
  <DialogContent className="max-w-md mx-auto">
    <DialogHeader>
      <DialogTitle>Boca Bridges</DialogTitle>
    </DialogHeader>
    <MobileReviewsModal 
      open={true}
      onOpenChange={() => {}}
      vendor={vendor}
      onRate={() => onRate(vendor)}
    />
  </DialogContent>
</Dialog>

    {/* Cost Details Modal */}
    <Dialog open={costModalOpen} onOpenChange={setCostModalOpen}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle>Cost Details</DialogTitle>
        </DialogHeader>
        <MobileCostsModal vendorId={vendor.id} />
      </DialogContent>
    </Dialog>

    {/* Google Reviews Modal */}
    <Dialog open={googleReviewsModalOpen} onOpenChange={setGoogleReviewsModalOpen}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle>Google Reviews</DialogTitle>
        </DialogHeader>
        <MobileGoogleReviewsModal 
          vendorId={vendor.id}
          googleReviewsJson={vendor.google_reviews_json}
          googlePlaceId={vendor.google_place_id}
        />
      </DialogContent>
    </Dialog>
  </>
  );
}