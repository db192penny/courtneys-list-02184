import { Star, Info, ChevronRight, Smartphone, DollarSign, Phone, MessageSquare, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RatingStars } from "@/components/ui/rating-stars";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SectionHeader } from "@/components/ui/section-header";
import { formatUSPhoneDisplay } from "@/utils/phone";
import { getCategoryIcon } from "@/utils/categoryIcons";
import { useUserReviews } from "@/hooks/useUserReviews";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useToast } from "@/hooks/use-toast";
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
  // Use a combined query that works for both authenticated and preview users
  const { data: vendorCosts, isLoading: costsLoading } = useQuery({
    queryKey: ["vendor-costs-combined", vendor.id],
    queryFn: async () => {
      let allCosts: any[] = [];
      
      // Try to fetch real costs (works for authenticated users)
      try {
        const { data: realCosts, error } = await supabase.rpc("list_vendor_costs", {
          _vendor_id: vendor.id,
        });
        
        if (!error && realCosts) {
          allCosts = realCosts;
        }
      } catch (error) {
        // Silently handle RLS errors for logged-out users
        console.log("Cannot fetch real costs (user not authenticated)");
      }

      // Also fetch preview costs (always accessible)
      try {
        const { data: previewCosts, error: previewError } = await supabase
          .from("preview_costs")
          .select("*")
          .eq("vendor_id", vendor.id);
          
        if (!previewError && previewCosts) {
          // Convert preview costs to match real costs format
          const formattedPreviewCosts = previewCosts.map(cost => ({
            id: `preview-${cost.id}`,
            vendor_id: cost.vendor_id,
            amount: cost.amount,
            period: cost.period,
            unit: cost.unit,
            cost_kind: cost.cost_kind,
            notes: cost.notes,
            created_at: cost.created_at,
            anonymous: cost.anonymous,
            currency: cost.currency || 'USD'
          }));
          allCosts = [...allCosts, ...formattedPreviewCosts];
        }
      } catch (error) {
        console.error("Failed to fetch preview costs:", error);
      }

      return allCosts;
    },
    enabled: !!vendor.id,
  });
  const { data: profile } = useUserProfile();
  const { toast } = useToast();
  const isVerified = !!profile?.isVerified;
  const [costModalOpen, setCostModalOpen] = useState(false);
  const [googleReviewsModalOpen, setGoogleReviewsModalOpen] = useState(false);
  const [isReviewsModalOpen, setIsReviewsModalOpen] = useState(false);
  const [contactPopoverOpen, setContactPopoverOpen] = useState(false);

  const handleCall = () => {
    window.location.href = `tel:${vendor.contact_info}`;
    setContactPopoverOpen(false);
  };

  const handleText = () => {
    window.location.href = `sms:${vendor.contact_info}`;
    setContactPopoverOpen(false);
  };

  const handleCopyNumber = async () => {
    try {
      await navigator.clipboard.writeText(vendor.contact_info || '');
      toast({
        title: "Number copied",
        description: "Phone number copied to clipboard",
      });
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = vendor.contact_info || '';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast({
        title: "Number copied",
        description: "Phone number copied to clipboard",
      });
    }
    setContactPopoverOpen(false);
  };

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
            onRate={() => onRate(vendor)}
            communityName={communityName}
          />
          
          {/* Google Reviews - Separate External Reviews */}
          {vendor.google_rating_count && vendor.google_rating_count > 0 && (
            <div>
              <div className="mb-2">
                <h5 className="text-xs font-medium text-gray-600">External Reviews</h5>
              </div>
              <button 
                onClick={() => setGoogleReviewsModalOpen(true)}
                className="w-full flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2 hover:bg-green-100 transition-colors border-b-2 border-b-green-300 hover:border-b-green-400"
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
            <h5 className="text-xs font-medium text-gray-600">Cost Information</h5>
            {isVerified && (
              <button
                onClick={() => onCosts(vendor)}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
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
                  
                  <div className="text-right mt-2">
                    <button
                      onClick={() => setCostModalOpen(true)}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      View all cost details →
                    </button>
                  </div>
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
                  
                  {/* Always show view all details link for single cost too */}
                  <div className="text-right mt-2">
                    <button
                      onClick={() => setCostModalOpen(true)}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      View all cost details →
                    </button>
                  </div>
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
          <div className="space-y-2 mt-3">
            <div className="text-center">
              <span className="text-xs text-gray-600 font-medium">Contact: </span>
              <Popover open={contactPopoverOpen} onOpenChange={setContactPopoverOpen}>
                <PopoverTrigger asChild>
                  <button className="text-base font-medium text-blue-600 underline hover:text-blue-800 transition-colors">
                    {formatUSPhoneDisplay(vendor.contact_info)}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2">
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCall}
                      className="flex items-center gap-2 justify-start text-sm"
                    >
                      <Phone size={16} />
                      Call
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleText}
                      className="flex items-center gap-2 justify-start text-sm"
                    >
                      <MessageSquare size={16} />
                      Text
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyNumber}
                      className="flex items-center gap-2 justify-start text-sm"
                    >
                      <Copy size={16} />
                      Copy Number
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
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