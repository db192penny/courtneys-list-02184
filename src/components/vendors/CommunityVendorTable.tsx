import { useMemo, useState } from "react";
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
  HelpCircle
} from "lucide-react";
import { CATEGORIES } from "@/data/categories";
import { getCategoryIcon } from "@/utils/categoryIcons";
import { useUserHomeVendors } from "@/hooks/useUserHomeVendors";
import { useUserReviews } from "@/hooks/useUserReviews";
import { useIsMobile } from "@/hooks/use-mobile";

import ReviewsHover from "@/components/vendors/ReviewsHover";
import PreviewReviewsHover from "@/components/vendors/PreviewReviewsHover";
import GoogleReviewsHover from "@/components/vendors/GoogleReviewsHover";
import RateVendorModalWrapper from "@/components/vendors/RateVendorModalWrapper";
import VendorMobileCard from "@/components/vendors/VendorMobileCard";
import CostManagementModalWrapper from "@/components/vendors/CostManagementModalWrapper";
import { CostDisplay } from "@/components/vendors/CostDisplay";
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
  
  // Modal states
  const [rateModalOpen, setRateModalOpen] = useState(false);
  const [costModalOpen, setCostModalOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<{ id: string; name: string; category: string } | null>(null);

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
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2 justify-between">
              <span className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filter by Category
              </span>
              <button
                onClick={() => refetch()}
                disabled={isFetching}
                className="text-sm text-primary hover:text-primary/80 underline-offset-4 hover:underline sm:hidden"
              >
                {isFetching ? "Loading..." : "Refresh"}
              </button>
            </label>
            <div className="w-full sm:w-52 relative">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="bg-background border-2 border-primary hover:border-primary/80 focus:border-primary transition-colors shadow-sm">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent className="bg-background border-2">
                  <SelectItem value="all">All Categories</SelectItem>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4" />
              Sort by
            </label>
            <div className="w-full sm:w-56">
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                <SelectTrigger className="bg-background border-2 border-muted hover:border-primary/20 focus:border-primary transition-colors">
                  <SelectValue placeholder="Neighbors Using" />
                </SelectTrigger>
                <SelectContent className="bg-background border-2">
                  {SORTS.map((s) => (
                    <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div className="hidden sm:flex items-end">
          <Button 
            variant="secondary" 
            onClick={() => refetch()} 
            disabled={isFetching}
            className="w-full sm:w-auto flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            {isFetching ? "Loading..." : "Refresh"}
          </Button>
        </div>
      </div>

      {isMobile ? (
        <div className="space-y-3">
          {category !== "all" && (
            <div className="flex items-center justify-between py-2">
              <h3 className="text-lg font-semibold text-foreground">
                {category} Providers
              </h3>
              <button
                onClick={() => window.location.href = `/submit?community=${communityName}&category=${category}`}
                className="text-sm text-primary hover:text-primary/80 underline-offset-4 hover:underline flex items-center gap-1"
              >
                <Plus className="h-3 w-3" />
                New Provider
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
              isAuthenticated={isAuthenticated}
              communityName={communityName}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Section Header */}
          {category !== "all" && (
            <SectionHeader 
              icon={getCategoryIcon(category as any)} 
              title={`${category} Providers`}
              className="mb-3"
            />
          )}
          {category === "all" && (
            <SectionHeader 
              icon={Building2} 
              title="All Providers"
              className="mb-3"
            />
          )}
          
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
                      <span>Performance Metrics</span>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[10px] text-muted-foreground/80">Community & Google ratings</span>
                      </div>
                    </div>
                  </div>
                </TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    <div className="flex flex-col items-start">
                      <span>Cost Information</span>
                      <span className="text-[10px] text-muted-foreground/80">Community averages</span>
                    </div>
                  </div>
                </TableHead>
                <TableHead className="text-right text-xs font-medium text-muted-foreground">
                  <div className="flex items-center gap-1 justify-end">
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
                    <Button size="sm" variant="outline" onClick={() => setCategory(r.category)}>
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
                     />
                   </TableCell>
                     <TableCell className="text-right">
                       <div className="flex gap-2 justify-end">
                         <Tooltip>
                           <TooltipTrigger asChild>
                             <Button 
                               size="sm" 
                               variant="outline" 
                               className="h-8 px-3 text-sm bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 hover:from-blue-600 hover:to-purple-700" 
                               onClick={() => isAuthenticated ? openRate(r) : window.location.href = `/auth?community=${encodeURIComponent(communityName)}`}
                             >
                               <Star className="h-3 w-3 mr-1" />
                               Rate Provider
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
                                 className="h-8 px-3 text-sm bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 hover:from-blue-600 hover:to-purple-700" 
                                 onClick={() => openCosts(r)}
                               >
                                 <DollarSign className="h-3 w-3 mr-1" />
                                 Add Cost Info
                               </Button>
                             </TooltipTrigger>
                             <TooltipContent>
                               <p>Share cost information to help neighbors budget</p>
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
    </div>
    </TooltipProvider>
  );
}

