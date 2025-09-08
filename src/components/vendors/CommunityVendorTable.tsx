import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
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
  Pencil
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
  const [category, setCategory] = useState<string>("Pool");
  const SORTS = getSorts(communityName);
  const [sortBy, setSortBy] = useState<typeof SORTS[number]["key"]>("homes");
  const isMobile = useIsMobile();

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
      'Pool Service': '🏊',
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
    
    if (category === 'all') {
      return `${categoryIcon} ${sortLabel}`;
    }
    return `${categoryIcon} ${category} • ${sortLabel}`;
  };

  // Helper function to generate dynamic title based on category
  const getDynamicTitle = (category: string) => {
    if (category === 'all') {
      return 'All Service Providers';
    }
    return `${category} Providers`;
  };

  const openRate = (row: CommunityVendorRow) => {
    setSelectedVendor({ id: row.id, name: row.name, category: row.category });
    setRateModalOpen(true);
  };

  const openCosts = (row: CommunityVendorRow) => {
    setSelectedVendor({ id: row.id, name: row.name, category: row.category });
    setCostModalOpen(true);
  };

  const handleHeaderClick = (sortKey: typeof SORTS[number]["key"]) => {
    setSortBy(sortKey);
  };

  const getSortIcon = (sortKey: typeof SORTS[number]["key"]) => {
    if (sortBy === sortKey) {
      return <ChevronUp className="h-4 w-4 text-primary" />;
    }
    return <ArrowUpDown className="h-4 w-4 text-muted-foreground opacity-50" />;
  };

  const formatted = useMemo(() => data || [], [data]);

  return (
    <TooltipProvider>
    <div className="space-y-6">
      {/* Enhanced Filter Bar for Desktop */}
      {!isMobile ? (
        <div className="space-y-4">
          {/* Category Tabs */}
          <div className="border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-foreground">{getDynamicTitle(category)}</h2>
              <div className="flex items-center gap-3">
                {/* Sort Dropdown */}
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Sort by:</span>
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                    <SelectTrigger className="w-40 h-8 text-sm border-2 border-primary bg-primary/5 hover:bg-primary/10 focus:border-primary transition-colors">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SORTS.map((s) => (
                        <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            {/* Tab Navigation */}
            <Tabs value={POPULAR_CATEGORIES.includes(category as any) || category === "all" ? category : "more"} className="w-full">
              <TabsList className="flex w-full h-auto p-1 bg-muted/30">
                <TabsTrigger 
                  value="all" 
                  className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium text-sm px-3 py-2 transition-all flex-1"
                  onClick={() => setCategory("all")}
                >
                   <Building2 className="h-4 w-4" />
                   All Categories
                 </TabsTrigger>
                 {POPULAR_CATEGORIES.map((cat) => {
                   const CategoryIcon = getCategoryIcon(cat);
                   return (
                     <TabsTrigger 
                       key={cat}
                       value={cat}
                       className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium text-sm px-3 py-2 transition-all flex-1"
                       onClick={() => setCategory(cat)}
                     >
                       <CategoryIcon className="h-4 w-4" />
                       <span className="hidden sm:inline">{cat}</span>
                     </TabsTrigger>
                   );
                 })}
                  {/* More Categories Tab with Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <TabsTrigger 
                        value="more" 
                        className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium text-sm px-3 py-2 transition-all cursor-pointer w-38 ml-1"
                      >
                        <Settings className="h-4 w-4 flex-shrink-0" />
                        <span className="hidden sm:inline truncate">
                          {OTHER_CATEGORIES.includes(category as any) 
                            ? `More Categories (${category})`
                            : "More Categories"
                          }
                        </span>
                        <ChevronDown className="h-4 w-4 flex-shrink-0" />
                      </TabsTrigger>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="z-50 bg-background border shadow-md">
                      {OTHER_CATEGORIES.map((cat) => (
                        <DropdownMenuItem 
                          key={cat} 
                          onClick={() => setCategory(cat)}
                          className="hover:bg-muted cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            {React.createElement(getCategoryIcon(cat), { className: "h-4 w-4" })}
                            {cat}
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
              </TabsList>
            </Tabs>
          </div>
        </div>
      ) : (
        /* Mobile Filter Controls */
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilterModalOpen(true)}
              className="flex items-center gap-2 text-sm font-medium"
            >
              <span className="truncate">{getFilterButtonText()}</span>
              <ChevronDown className="h-4 w-4 shrink-0" />
            </Button>
          </div>
        </div>
      )}

      {isMobile ? (
        <div className="space-y-3">
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
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <Table>
            <TableHeader>
              <TableRow className="border-b-2">
                <TableHead className="text-xs font-medium text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <BarChart3 className="h-3 w-3" />
                    Rank
                  </div>
                </TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    Provider Info
                  </div>
                </TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground">Category</TableHead>
                <TableHead className="whitespace-nowrap text-xs font-medium text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    <div className="flex flex-col items-start">
                      <span>Neighbors Using</span>
                    </div>
                  </div>
                </TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3" />
                    <div className="flex flex-col items-start">
                      <span>Ratings & Reviews</span>
                    </div>
                  </div>
                </TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    <div className="flex flex-col items-start">
                      <span>Cost Information</span>
                    </div>
                  </div>
                </TableHead>
                <TableHead className="text-right text-xs font-medium text-muted-foreground">
                  <div className="flex items-center gap-1 justify-center">
                    <Settings className="h-3 w-3" />
                    Actions
                  </div>
                </TableHead>
                <TableHead className="whitespace-nowrap text-xs font-medium text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    Contact Info
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={8} className="text-sm text-muted-foreground">Loading…</TableCell>
                </TableRow>
              )}
              {error && (
                <TableRow>
                  <TableCell colSpan={8} className="text-sm text-muted-foreground">Unable to load providers.</TableCell>
                </TableRow>
              )}
              {!isLoading && !error && formatted.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-sm text-muted-foreground">What? No vendors? Please be the first to add one to this category and help out your neighbors :)</TableCell>
                </TableRow>
              )}
              {formatted.map((r, idx) => (
                <TableRow key={r.id}>
                  <TableCell>{idx + 1}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {/* Labels above provider name */}
                      <div className="flex flex-wrap gap-1">
                        {r.homes_serviced === 0 && (
                          <Badge 
                            variant="secondary" 
                            className="text-[10px] px-1 py-0 bg-orange-100 text-orange-800 hover:bg-orange-200 whitespace-nowrap"
                          >
                            New
                          </Badge>
                        )}
                        {userHomeVendors?.has(r.id) && (
                          <Badge 
                            variant="secondary" 
                            className="text-[10px] px-1 py-0 bg-green-100 text-green-800 hover:bg-green-200 whitespace-nowrap"
                          >
                            Your Provider
                          </Badge>
                        )}
                      </div>
                      {/* Full provider name */}
                      <div>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="font-medium text-foreground break-words leading-tight block">
                              {r.name}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{r.name}</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" className="h-7 px-2 text-xs flex items-center gap-1" onClick={() => setCategory(r.category)}>
                      {getCategoryIcon(r.category as any) && React.createElement(getCategoryIcon(r.category as any), { className: "h-3 w-3 mr-1" })}
                      {r.category}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">
                        {r.homes_serviced === 0 ? "–" : r.homes_serviced}
                      </span>
                      <span className="text-xs text-muted-foreground">{r.homes_pct ? `${r.homes_pct}%` : ""}</span>
                      {/* Heat map hidden for now */}
                    </div>
                  </TableCell>
                   <TableCell>
                     <div className="space-y-3">
                       {/* Community Rating Section */}
                       <div className="space-y-1">
                         <div className="flex items-center gap-1">
                           <Users className="h-3 w-3 text-blue-600" />
                           <span className="text-[10px] font-medium text-blue-600 uppercase tracking-wide">Community Rating</span>
                           <Tooltip>
                             <TooltipTrigger asChild>
                               <HelpCircle className="h-3 w-3 text-muted-foreground" />
                             </TooltipTrigger>
                             <TooltipContent>
                               <p>Ratings from neighbors in {communityName}</p>
                             </TooltipContent>
                           </Tooltip>
                         </div>
                         <ReviewsHover vendorId={r.id}>
                           <div className="cursor-pointer group">
                             {r.hoa_rating ? (
                               <div className="flex items-center gap-1 px-2 py-1.5 rounded-md bg-blue-50 hover:bg-blue-100 transition-colors border border-blue-200 hover:border-blue-300 min-h-[28px] underline decoration-dotted underline-offset-4">
                                 <RatingStars rating={r.hoa_rating} showValue />
                                 {r.hoa_rating_count ? <span className="text-xs text-muted-foreground">({r.hoa_rating_count})</span> : null}
                               </div>
                             ) : (
                               <span 
                                 className="text-xs text-muted-foreground px-2 py-1.5 rounded-md bg-blue-50 hover:bg-blue-100 transition-colors border border-blue-200 hover:border-blue-300 min-h-[28px] flex items-center underline decoration-dotted underline-offset-4"
                                 title="Be the first to rate this provider"
                               >
                                 No Ratings Yet
                               </span>
                             )}
                           </div>
                         </ReviewsHover>
                       </div>

                       {/* Google Rating Section */}
                       {r.google_rating != null && (
                         <>
                           <div className="h-px bg-border"></div>
                           <div className="space-y-1">
                             <div className="flex items-center gap-1">
                               <Star className="h-3 w-3 text-green-600" />
                               <span className="text-[10px] font-medium text-green-600 uppercase tracking-wide">Google Rating</span>
                               <Tooltip>
                                 <TooltipTrigger asChild>
                                   <HelpCircle className="h-3 w-3 text-muted-foreground" />
                                 </TooltipTrigger>
                                 <TooltipContent>
                                   <p>Public Google reviews and ratings</p>
                                 </TooltipContent>
                               </Tooltip>
                             </div>
                             <GoogleReviewsHover 
                               vendorId={r.id} 
                               googleReviewsJson={r.google_reviews_json}
                               googlePlaceId={r.google_place_id}
                             >
                               <div className="cursor-pointer group">
                                 <div className="flex items-center gap-1 px-2 py-1.5 rounded-md bg-green-50 hover:bg-green-100 transition-colors border border-green-200 hover:border-green-300 min-h-[28px] underline decoration-dotted underline-offset-4">
                                   <RatingStars rating={r.google_rating} showValue />
                                   {r.google_rating_count ? <span className="text-xs text-muted-foreground">({r.google_rating_count})</span> : null}
                                 </div>
                               </div>
                             </GoogleReviewsHover>
                           </div>
                         </>
                       )}
                     </div>
                   </TableCell>
                    <TableCell>
                      <CostDisplay
                        vendorId={r.id}
                        vendorName={r.name}
                        category={r.category}
                        communityAmount={r.community_amount}
                        communityUnit={r.community_unit}
                        communitySampleSize={r.community_sample_size}
                        marketAmount={r.market_amount}
                        marketUnit={r.market_unit}
                        showContact={!!showContact}
                        isAuthenticated={isAuthenticated}
                        communityName={communityName}
                        onOpenCostModal={() => {
                          setSelectedVendor(r);
                          setCostModalOpen(true);
                        }}
                      />
                    </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-7 px-2 text-xs bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 hover:from-blue-600 hover:to-purple-700" 
                                onClick={() => isAuthenticated ? openRate(r) : window.location.href = `/auth?community=${encodeURIComponent(communityName)}`}
                              >
                                {userReviews?.has(r.id) ? (
                                  <>
                                    <Pencil className="h-3 w-3 mr-0.5" />
                                    Edit Rating
                                  </>
                                ) : (
                                  <>
                                    <Star className="h-3 w-3 mr-0.5" />
                                    Rate
                                  </>
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{userReviews?.has(r.id) ? "Update your existing rating" : "Rate this provider to help neighbors"}</p>
                            </TooltipContent>
                          </Tooltip>
                           {isAuthenticated && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="h-7 px-2 text-xs bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 hover:from-blue-600 hover:to-purple-700" 
                                  onClick={() => openCosts(r)}
                                >
                                  {userCosts.data?.has(r.id) ? (
                                    <>
                                      <Pencil className="h-3 w-3 mr-0.5" />
                                      Edit Cost
                                    </>
                                  ) : (
                                    <>
                                      <Plus className="h-3 w-3 mr-0.5" />
                                      Costs
                                    </>
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{userCosts.data?.has(r.id) ? "Update your cost information" : "Share cost information to help neighbors budget"}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                   <TableCell className="whitespace-nowrap">{showContact ? (r.contact_info ? formatUSPhoneDisplay(r.contact_info) : "—") : "Hidden"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </div>
      )}
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
      {isMobile && (
        <EnhancedMobileFilterModal
          open={filterModalOpen}
          onOpenChange={setFilterModalOpen}
          selectedCategory={category}
          selectedSort={sortBy === 'homes' ? 'neighbors_using' : sortBy === 'hoa_rating' ? 'highest_rated' : 'most_reviews'}
          onCategoryChange={setCategory}
          onSortChange={(sort) => {
            const mappedSort = sort === 'neighbors_using' ? 'homes' : sort === 'highest_rated' ? 'hoa_rating' : 'google_rating';
            setSortBy(mappedSort as any);
          }}
          categories={[...CATEGORIES]}
        />
      )}
    </div>
    </TooltipProvider>
  );
}

