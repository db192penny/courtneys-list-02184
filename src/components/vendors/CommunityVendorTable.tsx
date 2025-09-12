import React, { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link, useSearchParams } from "react-router-dom";
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
import { useUserHomeVendors } from "@/hooks/useUserHomeVendors";
import { useUserReviews } from "@/hooks/useUserReviews";
import { useUserCosts } from "@/hooks/useUserCosts";
import { useIsMobile } from "@/hooks/use-mobile";

import ReviewsHover from "@/components/vendors/ReviewsHover";
import PreviewReviewsHover from "@/components/vendors/PreviewReviewsHover";
import GoogleReviewsHover from "@/components/vendors/GoogleReviewsHover";
import RateVendorModalWrapper from "@/components/vendors/RateVendorModalWrapper";
import VendorMobileCard from "@/components/vendors/VendorMobileCard";
import CostManagementModalWrapper from "@/components/vendors/CostManagementModalWrapper";
import { CostDisplay } from "@/components/vendors/CostDisplay";
import { EnhancedMobileFilterModal } from "./EnhancedMobileFilterModal";
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
  const [category, setCategory] = useState<string>("Pool");
  const SORTS = getSorts(communityName);
  const [sortBy, setSortBy] = useState<typeof SORTS[number]["key"]>("homes");
  const { toast } = useToast();
  // Always use mobile layout for desktop - removed isMobile detection
  const isMobile = true;
  const [showInitialAnimation, setShowInitialAnimation] = useState(true);

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

  const { data: userHomeVendors } = useUserHomeVendors();
  const { data: userReviews } = useUserReviews();
  const userCosts = useUserCosts();
  
  // Modal states
  const [rateModalOpen, setRateModalOpen] = useState(false);
  const [costModalOpen, setCostModalOpen] = useState(false);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<{ id: string; name: string; category: string } | null>(null);

  // Dynamic filter button text
  const getFilterButtonText = () => {
    const categoryIcon = {
      'all': '🏠',
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
      'Car Wash and Detail': '🚗',
      'Pet Grooming': '🐕',
      'Mobile Tire Repair': '🔧',
      'Appliance Repair': '🔌'
    }[category] || '🏠';
    
    const sortLabel = {
      'homes': 'Most Used',
      'hoa_rating': 'Highest Rated',
      'google_rating': 'Most Reviews'
    }[sortBy] || 'Most Used';
    
    const categoryLabel = category === 'all' ? '' : category;
    
    return { icon: categoryIcon, category: categoryLabel, sort: sortLabel };
  };

  const filterText = getFilterButtonText();

  const handleCategoryChange = (newCategory: string) => {
    setCategory(newCategory);
    // Update URL parameter
    const newSearchParams = new URLSearchParams(searchParams);
    if (newCategory === 'all') {
      newSearchParams.delete('category');
    } else {
      newSearchParams.set('category', newCategory);
    }
    setSearchParams(newSearchParams);
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
        {/* Sticky Filter Controls */}
        <div className="sticky top-[120px] sm:top-[140px] z-30 backdrop-blur-md bg-background/95 border-b border-border/40 shadow-sm transition-all duration-200 mb-4 -mx-4 px-4 py-2 sm:py-3">
          <div className="max-w-4xl mx-auto">
            <label className="text-xs text-primary font-semibold uppercase tracking-wide mb-1.5 sm:mb-2 block flex items-center gap-1.5">
              <Filter className="h-3 w-3" />
              Choose Category
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilterModalOpen(true)}
                className={`flex-1 flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5 hover:from-primary/10 hover:to-accent/10 transition-all duration-200 shadow-sm hover:shadow-md hover:scale-[1.01] active:scale-[0.99] ${showInitialAnimation ? 'animate-pulse' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg sm:text-xl">{filterText.icon}</span>
                  <span className="text-sm sm:text-base font-semibold text-foreground truncate">
                    {filterText.category ? `${filterText.category} • ${filterText.sort}` : `All Categories • ${filterText.sort}`}
                  </span>
                </div>
                <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
              </button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleShareCategory}
                className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2.5 sm:py-3 h-auto text-xs sm:text-sm"
              >
                <Share className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Share</span>
              </Button>
            </div>
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
                onClick={() => window.location.href = `/submit?community=${communityName}&category=${category}`}
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
              userCosts={userCosts.data}
              isAuthenticated={isAuthenticated}
              communityName={communityName}
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
              onSuccess={() => { setRateModalOpen(false); refetch(); }}
              communityName={communityName}
            />
            <CostManagementModalWrapper 
              open={costModalOpen} 
              onOpenChange={setCostModalOpen} 
              vendor={selectedVendor} 
              onSuccess={() => { setCostModalOpen(false); refetch(); }}
              communityName={communityName}
            />
          </>
        )}

        {/* Enhanced Mobile Filter Modal */}
        <EnhancedMobileFilterModal
          open={filterModalOpen}
          onOpenChange={setFilterModalOpen}
          selectedCategory={category}
          selectedSort={sortBy === 'homes' ? 'neighbors_using' : sortBy === 'hoa_rating' ? 'highest_rated' : 'most_reviews'}
          onCategoryChange={handleCategoryChange}
          onSortChange={(sort) => {
            const mappedSort = sort === 'neighbors_using' ? 'homes' : sort === 'highest_rated' ? 'hoa_rating' : 'google_rating';
            setSortBy(mappedSort as any);
          }}
          categories={[...CATEGORIES]}
        />
      </div>
    </TooltipProvider>
  );
}