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
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0,
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
    <Card className="w-full" data-vendor-id={vendor.id}>
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
            onClick={() => isAuthenticated ? onRate(vendor) : window.location.href = `/auth?community=${encodeURIComponent(communityName || '')}`}
            className={`rounded-lg px-3 py-1.5 font-medium shrink-0 flex items-center gap-1.5 ${
              userReviews?.has(vendor.id) 
                ? "bg-green-100 text-green-800 hover:bg-green-200 border border-green-200" 
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            <Star size={14} className={`text-yellow-500 ${userReviews?.has(vendor.id) ? "fill-current" : ""}`} />
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
        <div className="space-y-4">
          <NeighborReviewPreview 
            vendorId={vendor.id} 
            vendor={vendor}
            onOpenModal={() => setIsReviewsModalOpen(true)}
            onRate={() => onRate(vendor)}
            onSignUp={() => {
              const communitySlug = communityName?.toLowerCase().replace(/\s+/g, '-');
              window.location.href = `/auth?community=${communityName}`;
            }}
            communityName={communityName}
            isAuthenticated={isAuthenticated}
          />
          
          {vendor.google_rating_count > 0 && (
            <button 
              onClick={() => setGoogleReviewsModalOpen(true)}
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline cursor-pointer transition-colors"
            >
              See Google Reviews ⭐ {vendor.google_rating?.toFixed(1)} ({vendor.google_rating_count} reviews)
            </button>
          )}
        </div>

        {/* Cost Information */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-foreground">Cost Information</h4>
            {isVerified && (
              <Button
                variant={userCosts?.has(vendor.id) ? "secondary" : "outline"}
                size="sm"
                onClick={() => onCosts(vendor)}
                className={userCosts?.has(vendor.id) ? "bg-green-100 text-green-700 border-green-200" : ""}
              >
                {userCosts?.has(vendor.id) ? "✓ Added" : "+ Add Cost"}
              </Button>
            )}
          </div>

{vendorCosts && vendorCosts.length > 0 ? (
  <div className="space-y-2">
    {(() => {
      const costsWithAmounts = vendorCosts.filter(c => 
        c.amount !== null && 
        c.amount !== undefined && 
        c.amount > 0
      );
      
      const hasValidAmounts = costsWithAmounts.length > 0;
      const firstComment = vendorCosts.find(c => c.notes && c.notes.trim())?.notes;
      
      if (!hasValidAmounts && !firstComment) {
        return (
          <div className="text-center py-3 text-sm text-gray-500">
            No cost information yet
          </div>
        );
      }
      
      return (
        <>
          {hasValidAmounts && (
            <div className="text-sm mb-2">
              <span className="font-normal">
                💰 {costsWithAmounts.length > 1 
                  ? `$${Math.min(...costsWithAmounts.map(c => c.amount))} - $${Math.max(...costsWithAmounts.map(c => c.amount))}`
                  : `$${costsWithAmounts[0].amount}`
                }
                {costsWithAmounts[0]?.period ? `/${costsWithAmounts[0].period}` : ''}
              </span>
            </div>
          )}
          
          {firstComment && (
            <p className="text-sm text-muted-foreground italic">
              "{firstComment.length > 100 ? firstComment.substring(0, 100) + '...' : firstComment}"
            </p>
          )}
          
          <div className="text-left mt-2">
            <button
              onClick={() => setCostModalOpen(true)}
              className="text-sm text-blue-600 hover:text-blue-700 underline decoration-dotted underline-offset-4"
            >
              See details
            </button>
          </div>
        </>
      );
    })()}
  </div>
) : (
  <div className="text-center py-3 text-sm text-gray-500">
    No cost information yet
  </div>
)}
        </div>

        {/* Contact Section */}
        {showContact && vendor.contact_info && (
          <div className="bg-gray-50 rounded-lg p-4">
            <Popover open={contactPopoverOpen} onOpenChange={setContactPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="text-base font-medium flex items-center gap-2">
                  <Phone size={16} />
                  {formatUSPhoneDisplay(vendor.contact_info)}
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