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
import { Star } from "lucide-react";
import { CATEGORIES } from "@/data/categories";
import { useUserHomeVendors } from "@/hooks/useUserHomeVendors";
import { useIsMobile } from "@/hooks/use-mobile";

import ReviewsHover from "@/components/vendors/ReviewsHover";
import GoogleReviewsHover from "@/components/vendors/GoogleReviewsHover";
import RateVendorModal from "@/components/vendors/RateVendorModal";
import VendorMobileCard from "@/components/vendors/VendorMobileCard";
import CostManagementModal from "@/components/vendors/CostManagementModal";
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

const SORTS = [
  { key: "homes", label: "# of Homes Serviced" },
  { key: "hoa_rating", label: "Community Rating" },
  { key: "google_rating", label: "Google Rating" },
] as const;

export default function CommunityVendorTable({
  communityName,
  showContact,
}: {
  communityName: string;
  showContact?: boolean;
}) {
  const [category, setCategory] = useState<string>("all");
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

  const formatted = useMemo(() => data || [], [data]);

  return (
    <TooltipProvider>
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="w-full sm:w-52">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger aria-label="Filter by category">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full sm:w-56">
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
              <SelectTrigger aria-label="Sort by">
                <SelectValue placeholder="# of Homes Serviced" />
              </SelectTrigger>
              <SelectContent>
                {SORTS.map((s) => (
                  <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button 
            variant="secondary" 
            onClick={() => refetch()} 
            disabled={isFetching}
            className="w-full sm:w-auto"
          >
            Refresh
          </Button>
        </div>
      </div>

      {isMobile ? (
        <div className="space-y-3">
          {isLoading && (
            <div className="text-sm text-muted-foreground text-center py-8">Loading…</div>
          )}
          {error && (
            <div className="text-sm text-muted-foreground text-center py-8">Unable to load providers.</div>
          )}
          {!isLoading && !error && formatted.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-8">No vendors found.</div>
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
            />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="whitespace-nowrap"># Homes</TableHead>
                <TableHead>Ratings/Reviews</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead className="whitespace-nowrap">Contact #s</TableHead>
                <TableHead className="text-right">Actions</TableHead>
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
                  <TableCell colSpan={8} className="text-sm text-muted-foreground">No vendors found.</TableCell>
                </TableRow>
              )}
              {formatted.map((r, idx) => (
                <TableRow key={r.id}>
                  <TableCell>{idx + 1}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="font-medium text-foreground max-w-[140px] truncate">
                            {r.name}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{r.name}</p>
                        </TooltipContent>
                      </Tooltip>
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
                    <div className="space-y-4">
                      <ReviewsHover vendorId={r.id}>
                        <div className="flex items-center gap-2 cursor-pointer group">
                          <span className="text-xs text-muted-foreground min-w-[70px]">Community:</span>
                          {r.hoa_rating ? (
                            <div className="flex items-center gap-1 px-2 py-1.5 rounded-md bg-blue-50 hover:bg-blue-100 transition-colors border border-blue-200 hover:border-blue-300 min-h-[28px]">
                              <RatingStars rating={r.hoa_rating} showValue />
                              {r.hoa_rating_count ? <span className="text-xs text-muted-foreground">({r.hoa_rating_count})</span> : null}
                            </div>
                          ) : (
                            <span 
                              className="text-xs text-muted-foreground px-2 py-1.5 rounded-md bg-blue-50 hover:bg-blue-100 transition-colors border border-blue-200 hover:border-blue-300 min-h-[28px] flex items-center"
                              title="Be the first to rate this provider"
                            >
                              No Ratings Yet
                            </span>
                          )}
                        </div>
                      </ReviewsHover>
                      {r.google_rating != null && (
                        <GoogleReviewsHover 
                          vendorId={r.id} 
                          googleReviewsJson={r.google_reviews_json}
                          googlePlaceId={r.google_place_id}
                        >
                          <div className="flex items-center gap-2 cursor-pointer group">
                            <span className="text-xs text-muted-foreground min-w-[70px]">Google:</span>
                            <div className="flex items-center gap-1 px-2 py-1.5 rounded-md bg-green-50 hover:bg-green-100 transition-colors border border-green-200 hover:border-green-300 min-h-[28px]">
                              <RatingStars rating={r.google_rating} showValue />
                              {r.google_rating_count ? <span className="text-xs text-muted-foreground">({r.google_rating_count})</span> : null}
                            </div>
                          </div>
                        </GoogleReviewsHover>
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
                    />
                  </TableCell>
                  <TableCell>{showContact ? (r.contact_info ? formatUSPhoneDisplay(r.contact_info) : "—") : "Hidden"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button size="sm" variant="outline" className="bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 hover:from-blue-600 hover:to-purple-700 flex items-center gap-1" onClick={() => openRate(r)}>
                        <Star className="h-3 w-3" />
                        Rate
                      </Button>
                      <Button size="sm" variant="outline" className="bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 hover:from-blue-600 hover:to-purple-700" onClick={() => openCosts(r)}>+ Costs</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <RateVendorModal open={rateModalOpen} onOpenChange={setRateModalOpen} vendor={selectedVendor} onSuccess={() => { setRateModalOpen(false); refetch(); }} />
      <CostManagementModal open={costModalOpen} onOpenChange={setCostModalOpen} vendor={selectedVendor} onSuccess={() => { setCostModalOpen(false); refetch(); }} />
    </div>
    </TooltipProvider>
  );
}

