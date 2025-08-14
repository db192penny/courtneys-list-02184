import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RatingStars } from "@/components/ui/rating-stars";
import { CATEGORIES } from "@/data/categories";

import ReviewsHover from "@/components/vendors/ReviewsHover";
import RateVendorModal from "@/components/vendors/RateVendorModal";
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
  avg_monthly_cost: number | null;
  service_call_avg: number | null;
  contact_info: string | null;
  typical_cost: number | null;
  avg_cost_display: string | null;
  avg_cost_amount: number | null;
};

const SORTS = [
  { key: "homes", label: "# of Homes Serviced" },
  { key: "hoa_rating", label: "HOA Rating" },
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
      return (data || []) as CommunityVendorRow[];
    },
    enabled: !!communityName,
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<{ id: string; name: string; category: string } | null>(null);

  const openRate = (row: CommunityVendorRow) => {
    setSelected({ id: row.id, name: row.name, category: row.category });
    setModalOpen(true);
  };

  const formatted = useMemo(() => data || [], [data]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-52">
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
          <div className="w-56">
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
          <Button variant="secondary" onClick={() => refetch()} disabled={isFetching}>Refresh</Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rank</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Category</TableHead>
              <TableHead># Homes</TableHead>
              <TableHead>Ratings</TableHead>
              <TableHead>Avg Cost</TableHead>
              <TableHead>Contact</TableHead>
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
                    <span className="font-medium text-foreground">
                      {r.name}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="outline" onClick={() => setCategory(r.category)}>
                    {r.category}
                  </Button>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{r.homes_serviced}</span>
                    <span className="text-xs text-muted-foreground">{r.homes_pct ? `${r.homes_pct}%` : ""}</span>
                    {/* Heat map hidden for now */}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-2">
                    <ReviewsHover vendorId={r.id}>
                      <div className="flex items-center gap-2 cursor-pointer group">
                        <span className="text-xs text-muted-foreground">HOA:</span>
                        {r.hoa_rating ? (
                          <div className="flex items-center gap-1 border-b border-blue-400 group-hover:border-blue-600 pb-0.5">
                            <RatingStars rating={r.hoa_rating} showValue />
                            {r.hoa_rating_count ? <span className="text-xs text-muted-foreground">({r.hoa_rating_count})</span> : null}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground border-b border-blue-400 group-hover:border-blue-600 pb-0.5">—</span>
                        )}
                      </div>
                    </ReviewsHover>
                    {r.google_rating != null && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Google:</span>
                        <div className="flex items-center gap-1">
                          <RatingStars rating={r.google_rating} showValue />
                          {r.google_rating_count ? <span className="text-xs text-muted-foreground">({r.google_rating_count})</span> : null}
                        </div>
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {r.avg_cost_display === "See in Reviews" ? (
                    <span className="text-xs text-muted-foreground">See in Reviews</span>
                  ) : r.avg_cost_amount != null ? (
                    <span>${Number(r.avg_cost_amount).toFixed(2)} {r.avg_cost_display}</span>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>{showContact ? (r.contact_info ? formatUSPhoneDisplay(r.contact_info) : "—") : "Hidden"}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button size="sm" variant="outline" className="bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 hover:from-blue-600 hover:to-purple-700" onClick={() => openRate(r)}>Rate</Button>
                  
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <RateVendorModal open={modalOpen} onOpenChange={setModalOpen} vendor={selected} onSuccess={() => { setModalOpen(false); refetch(); }} />
    </div>
  );
}

