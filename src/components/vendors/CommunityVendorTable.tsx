import React, { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RatingStars } from "@/components/ui/rating-stars";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SectionHeader } from "@/components/ui/section-header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  Star, 
  Filter, 
  ChevronUp, 
  ChevronDown, 
  ArrowUpDown, 
  Plus, 
  Building2,
  Users,
  BarChart3,
  DollarSign,
  Phone,
  Settings,
  HelpCircle,
  Pencil,
  Share
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CATEGORIES } from "@/data/categories";
import { getCategoryIcon } from "@/utils/categoryIcons";
import { getCategoryEmoji } from "@/utils/categoryEmojis";
import { useUserHomeVendors } from "@/hooks/useUserHomeVendors";
import { useUserReviews } from "@/hooks/useUserReviews";
import { useUserCosts } from "@/hooks/useUserCosts";
import { useIsMobile } from "@/hooks/use-mobile";
import { useScrollDirection } from "@/hooks/useScrollDirection";
import { GATracking } from "@/components/analytics/GoogleAnalytics";

import ReviewsHover from "@/components/vendors/ReviewsHover";
import PreviewReviewsHover from "@/components/vendors/PreviewReviewsHover";
import GoogleReviewsHover from "@/components/vendors/GoogleReviewsHover";
import RateVendorModalWrapper from "@/components/vendors/RateVendorModalWrapper";
import VendorMobileCard from "@/components/vendors/VendorMobileCard";
import CostManagementModalWrapper from "@/components/vendors/CostManagementModalWrapper";
import { CostDisplay } from "@/components/vendors/CostDisplay";
import { HorizontalSortControls } from "./HorizontalSortControls";
import { HorizontalCategoryPills } from "./HorizontalCategoryPills";
import { formatUSPhoneDisplay } from "@/utils/phone";

export type CommunityVendorRow = {
  id: string;
  name: string;
  category: string;
  homes_serviced: number;
  homes_pct: number | null;
  hoa_rating: number | null;
  hoa_rating_count: number | null;
  google_rating: number | null;
  google_rating_count: number | null;
  google_reviews_json: any | null;
  google_place_id: string | null;
  avg_monthly_cost: number | null;
  service_call_avg: number | null;
  contact_info: string | null;
  typical_cost: number | null;
  avg_cost_display: string | null;
  avg_cost_amount: number | null;
  community_amount: number | null;
  community_unit: string | null;
  community_sample_size: number | null;
  market_amount: number | null;
  market_unit: string | null;
};

const getSorts = (communityName: string) => [
  { key: "homes", label: "Neighbors Using" },
  { key: "hoa_rating", label: `${communityName} Rating` },
  { key: "google_rating", label: "Google Rating" },
] as const;

// Popular categories to show as tabs (exactly 4 for 5-tab layout with All Categories)
const POPULAR_CATEGORIES = ["Pool", "HVAC", "Landscaping", "Pest Control"] as const;
const OTHER_CATEGORIES = CATEGORIES.filter(cat => !POPULAR_CATEGORIES.includes(cat as any));

export default function CommunityVendorTable({
  communityName,
  showContact = true,
  isAuthenticated = false,
  isVerified = false,
}: {
  communityName: string;
  showContact?: boolean;
  isAuthenticated?: boolean;
  isVerified?: boolean;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [category, setCategory] = useState<string>("Pool");
  const SORTS = getSorts(communityName);
  const [sortBy, setSortBy] = useState<typeof SORTS[number]["key"]>("hoa_rating");
  const { toast } = useToast();
  // Always use mobile layout for desktop - removed isMobile detection
  const isMobile = true;
  const [showInitialAnimation, setShowInitialAnimation] = useState(true);
  const { isScrollingDown } = useScrollDirection();

  // Initialize category from URL parameter
  useEffect(() => {
    const urlCategory = searchParams.get('category');
    if (urlCategory) {
      setCategory(urlCategory);
    }
  }, [searchParams]);

  // Remove animation after initial attention
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowInitialAnimation(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const { data, isLoading, error, refetch, isFetching } = useQuery<CommunityVendorRow[]>({
    queryKey: ["community-stats", communityName, category, sortBy],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_vendor_stats", {
        _hoa_name: communityName,
        _category: category === "all" ? null : category,
        _sort_by: sortBy,
        _limit: 100,
        _offset: 0,
      });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!communityName,
  });

  // Fetch community photo for the review source icon
  const { data: communityAssets } = useQuery({
    queryKey: ["community-assets", communityName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_assets")
        .select("photo_path")
        .ilike("hoa_name", communityName)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!communityName,
  });

  // Generate public URL for community photo
  const communityPhotoUrl = useMemo(() => {
    if (!communityAssets?.photo_path) return null;
    
    const { data } = supabase.storage
      .from("community-photos")
      .getPublicUrl(communityAssets.photo_path);
    
    return data.publicUrl;
  }, [communityAssets]);

  const { data: userHomeVendors } = useUserHomeVendors();
  const { data: userReviews } = useUserReviews();
  const userCosts = useUserCosts();
  
  // Modal states
  const [rateModalOpen, setRateModalOpen] = useState(false);
  const [costModalOpen, setCostModalOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<{ id: string; name: string; category: string } | null>(null);


  const handleCategoryChange = (newCategory: string) => {
    GATracking.trackCategoryChange(category, newCategory);
    setCategory(newCategory);
    // Update URL parameter
    const newSearchParams = new URLSearchParams(searchParams);
    if (newCategory === 'all') {
      newSearchParams.delete('category');
    } else {
      newSearchParams.set('category', newCategory);
    }
    setSearchParams(newSearchParams);
    
    // Scroll to top of vendor list with smooth animation
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleShareCategory = async () => {
    try {
      const currentUrl = new URL(window.location.href);
      if (category !== 'all') {
        currentUrl.searchParams.set('category', category);
      } else {
        currentUrl.searchParams.delete('category');
      }
      
      await navigator.clipboard.writeText(currentUrl.toString());
      toast({
        title: "Link copied!",
        description: `Share this ${category === 'all' ? 'vendor list' : category} link with neighbors`,
      });
    } catch (error) {
      toast({
        title: "Failed to copy link",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const openRate = (row: CommunityVendorRow) => {
    setSelectedVendor({ id: row.id, name: row.name, category: row.category });
    setRateModalOpen(true);
  };

  const openCosts = (row: CommunityVendorRow) => {
    setSelectedVendor({ id: row.id, name: row.name, category: row.category });
    setCostModalOpen(true);
  };

  const formatted = useMemo(() => data || [], [data]);

  return (
    <TooltipProvider>
      <div className="max-w-4xl mx-auto">
        {/* Mobile-Optimized Filter Controls - Two Rows */}
        <div className={`sticky top-2 sm:top-16 z-40 bg-background/80 backdrop-blur-sm transition-transform duration-300 ease-out mb-3 sm:mb-6 ${
          isScrollingDown ? '-translate-y-full' : 'translate-y-0'
        }`}>
          {/* Row 1: Category Dropdown + Share Button */}
          <div className="flex items-end gap-3 mb-4">
            <div className="flex-1 flex flex-col justify-end">
              <HorizontalCategoryPills
                selectedCategory={category}
                onCategoryChange={handleCategoryChange}
                categories={[...CATEGORIES]}
              />
            </div>
            
            <div className="flex flex-col justify-end">
              <label className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2 block text-right sm:text-left">
                Share
              </label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleShareCategory}
                className="h-12 w-12 p-0 flex items-center justify-center"
              >
                <Share className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Row 2: Sort Controls */}
          <div className="mb-4">
            <HorizontalSortControls
              selectedSort={sortBy}
              onSortChange={(sort) => {
                setSortBy(sort as any);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              communityName={communityName}
            />
          </div>
        </div>

        {/* Mobile-style Card Layout for Desktop */}
        <div className="space-y-3 pt-2">
          {category !== "all" && (
            <div className="flex items-center justify-between py-2">
              <h3 className="text-lg font-semibold text-foreground">
                {category} Providers
              </h3>
              <button
                onClick={() => navigate(`/submit?community=${communityName}&category=${category}`)}
                className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <Plus className="h-3 w-3" />
                Add
              </button>
            </div>
          )}
          {isLoading && (
            <div className="text-sm text-muted-foreground text-center py-8">Loading…</div>
          )}
          {error && (
            <div className="text-sm text-muted-foreground text-center py-8">Unable to load providers.</div>
          )}
          {!isLoading && !error && formatted.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-8">What? No vendors? Please be the first to add one to this category and help out your neighbors :)</div>
          )}
          {formatted.map((vendor, idx) => (
            <VendorMobileCard
              key={vendor.id}
              vendor={vendor}
              rank={idx + 1}
              showContact={showContact}
              onCategoryClick={setCategory}
              onRate={openRate}
              onCosts={openCosts}
              userHomeVendors={userHomeVendors}
              userReviews={userReviews}
              userCosts={userCosts.data}
              isAuthenticated={isAuthenticated}
              isVerified={isVerified}
              communityName={communityName}
              communityPhotoUrl={communityPhotoUrl}
            />
          ))}
        </div>

        {/* Modals */}
        {isAuthenticated && (
          <>
            <RateVendorModalWrapper 
              open={rateModalOpen} 
              onOpenChange={setRateModalOpen} 
              vendor={selectedVendor} 
              onSuccess={() => { 
                setRateModalOpen(false);
                // Scroll back to the vendor card after DOM updates
                setTimeout(() => {
                  const vendorCard = document.querySelector(`[data-vendor-id="${selectedVendor?.id}"]`);
                  if (vendorCard) {
                    vendorCard.scrollIntoView({ 
                      behavior: 'smooth', 
                      block: 'center',
                      inline: 'nearest'
                    });
                  }
                }, 150);
              }}
              communityName={communityName}
            />
            <CostManagementModalWrapper 
              open={costModalOpen} 
              onOpenChange={setCostModalOpen} 
              vendor={selectedVendor} 
              onSuccess={() => { 
                setCostModalOpen(false);
                // Scroll back to the vendor card after DOM updates
                setTimeout(() => {
                  const vendorCard = document.querySelector(`[data-vendor-id="${selectedVendor?.id}"]`);
                  if (vendorCard) {
                    vendorCard.scrollIntoView({ 
                      behavior: 'smooth', 
                      block: 'center',
                      inline: 'nearest'
                    });
                  }
                }, 150);
              }}
              communityName={communityName}
            />
          </>
        )}

      </div>
    </TooltipProvider>
  );
}