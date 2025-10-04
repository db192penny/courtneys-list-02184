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
import { getCategoryEmoji } from "@/utils/categoryEmojis";
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
import { GATracking } from "@/components/analytics/GoogleAnalytics";


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
  isVerified?: boolean;
  communityName?: string;
  communityPhotoUrl?: string | null;
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
  isVerified = false,
  communityName,
  communityPhotoUrl,
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
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0,
  });
  const { data: profile } = useUserProfile();
  const { toast } = useToast();
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
    <Card className="w-full" data-vendor-id={vendor.id} data-vendor-name={vendor.name}>
      <CardContent className="p-3 space-y-3">
        {/* Header Section - Rank and Name on same line */}
        <div className="flex items-center gap-3 mb-2">
          <span className="bg-blue-500 text-white text-sm font-semibold px-3 py-1 rounded-lg shrink-0">
            #{rank}
          </span>
          <h3 className="text-lg font-bold break-words leading-tight flex-1">{vendor.name}</h3>
        </div>

        {/* Category, Neighbors, and Rate Button */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 flex-1">
            <Badge variant="secondary" className="text-sm px-3 py-1">
              {getCategoryEmoji(vendor.category)} {vendor.category}
            </Badge>
            {vendor.homes_serviced > 0 && (
              <span className="text-sm text-muted-foreground">
                👥 {vendor.homes_serviced} neighbor{vendor.homes_serviced !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <Button
            onClick={(e) => {
              e.stopPropagation();
              GATracking.trackButtonClick('rate_vendor', { 
                vendor_id: vendor.id,
                vendor_name: vendor.name 
              });
              if (isAuthenticated) {
                onRate(vendor);
              } else {
                window.location.href = `/auth?community=${encodeURIComponent(communityName || '')}`;
              }
            }}
            className={`rounded-lg px-3 py-1.5 font-medium shrink-0 flex items-center gap-1.5 transition-colors duration-200 ${
              userReviews?.has(vendor.id) 
                ? "border-2 border-green-600 bg-green-50 text-green-700 hover:bg-green-100" 
                : "border-2 border-blue-600 bg-transparent text-blue-600 hover:bg-blue-50"
            }`}
          >
            <Star size={14} className={userReviews?.has(vendor.id) ? "fill-current text-green-600" : "text-blue-600"} />
            {userReviews?.has(vendor.id) ? "Rated!" : "Rate!"}
          </Button>
        </div>

        {/* Status Badges */}
        {(vendor.homes_serviced === 0 || userHomeVendors?.has(vendor.id)) && (
          <div className="flex gap-2 mb-4">
            {vendor.homes_serviced === 0 && (
              <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                🆕 New Provider
              </Badge>
            )}
            {userHomeVendors?.has(vendor.id) && (
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                ✅ Your Provider
              </Badge>
            )}
          </div>
        )}


        {/* Reviews Section */}
        <div className="space-y-3">
          <NeighborReviewPreview 
            vendorId={vendor.id} 
            vendor={vendor}
            onOpenModal={() => {
              GATracking.trackModalOpen('reviews_modal', { 
                vendor_id: vendor.id,
                vendor_name: vendor.name 
              });
              setIsReviewsModalOpen(true);
            }}
            onRate={() => onRate(vendor)}
            onSignUp={() => {
              const communitySlug = communityName?.toLowerCase().replace(/\s+/g, '-');
              window.location.href = `/auth?community=${communityName}`;
            }}
            communityName={communityName}
            isAuthenticated={isAuthenticated}
            communityPhotoUrl={communityPhotoUrl}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {/* Reviews Button */}
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={() => {
              GATracking.trackModalOpen('reviews_modal', { 
                vendor_id: vendor.id,
                vendor_name: vendor.name 
              });
              setIsReviewsModalOpen(true);
            }}
          >
            📝 Reviews ({vendor.hoa_rating_count || 0})
          </Button>

          {/* Costs Button */}
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={() => {
              GATracking.trackModalOpen('cost_details_modal', { 
                vendor_id: vendor.id,
                vendor_name: vendor.name 
              });
              setCostModalOpen(true);
            }}
          >
            💰 {(() => {
              const costsWithAmounts = vendorCosts?.filter(c => 
                c.amount !== null && 
                c.amount !== undefined && 
                c.amount > 0
              ) || [];
              
              if (costsWithAmounts.length === 0) return 'Costs';
              
              const amounts = costsWithAmounts.map(c => c.amount);
              const minAmount = Math.min(...amounts);
              const maxAmount = Math.max(...amounts);
              
              return minAmount === maxAmount ? `$${minAmount}` : `$${minAmount}-${maxAmount}`;
            })()}
          </Button>

          {/* Contact Button */}
          {showContact && vendor.contact_info && (
            <Popover open={contactPopoverOpen} onOpenChange={setContactPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                >
                  📞 Contact
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2">
                <div className="flex flex-col gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCall}
                    className="flex items-center gap-2 justify-start"
                  >
                    <Phone size={16} />
                    Call
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleText}
                    className="flex items-center gap-2 justify-start"
                  >
                    <MessageSquare size={16} />
                    Text
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyNumber}
                    className="flex items-center gap-2 justify-start"
                  >
                    <Copy size={16} />
                    Copy Number
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
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
        {isAuthenticated && isVerified ? (
          <MobileCostsModal vendorId={vendor.id} />
        ) : (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold">{communityName || "Boca Bridges"}</h3>
              <p className="text-sm text-muted-foreground">
                Full cost details are shared just within our neighborhood circle. Sign up to view them.
              </p>
            </div>
            <Button 
              onClick={() => {
                const communitySlug = communityName?.toLowerCase().replace(/\s+/g, '-');
                window.location.href = `/auth?community=${communityName}`;
                setCostModalOpen(false);
              }}
              className="w-full"
            >
              Sign Up to View Costs
            </Button>
          </div>
        )}
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