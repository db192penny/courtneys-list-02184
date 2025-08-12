import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CATEGORIES } from "@/data/categories";
import { toast } from "@/components/ui/sonner";
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
  const [modalMode, setModalMode] = useState<"rate" | "addHome">("rate");
  const [selected, setSelected] = useState<{ id: string; name: string; category: string } | null>(null);

  const openRate = (row: CommunityVendorRow) => {
    setSelected({ id: row.id, name: row.name, category: row.category });
    setModalMode("rate");
    setModalOpen(true);
  };
  const openAddHome = (row: CommunityVendorRow) => {
    setSelected({ id: row.id, name: row.name, category: row.category });
    setModalMode("addHome");
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
              <TableHead>HOA / Google</TableHead>
              <TableHead>$ / Month</TableHead>
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
                    <span className="font-medium text-foreground" title={r.name}>{r.name}</span>
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
                    <Button size="sm" variant="ghost" title="Heat map coming soon" aria-label="Show heat map">🗺️</Button>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-xs leading-tight space-y-1">
                    <ReviewsHover vendorId={r.id}>
                      <div>HOA: <span className="font-medium text-foreground">{r.hoa_rating?.toFixed(1) ?? "—"}</span>{r.hoa_rating_count ? ` (${r.hoa_rating_count})` : ""}</div>
                    </ReviewsHover>
                    {r.google_rating != null && (
                      <ReviewsHover vendorId={r.id}>
                        <div>Google: <span className="font-medium text-foreground">{r.google_rating?.toFixed(1) ?? "—"}</span>{r.google_rating_count ? ` (${r.google_rating_count})` : ""}</div>
                      </ReviewsHover>
                    )}
                  </div>
                </TableCell>
                <TableCell>{(() => { const v = r.avg_monthly_cost ?? r.service_call_avg ?? r.typical_cost; return v != null ? `$${Number(v).toFixed(2)}` : "—"; })()}</TableCell>
                <TableCell>{showContact ? (r.contact_info ? formatUSPhoneDisplay(r.contact_info) : "—") : "Hidden"}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button size="sm" onClick={() => openRate(r)}>Rate</Button>
                  <Button size="sm" variant="secondary" onClick={() => openAddHome(r)}>+ Add to My Home</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <RateVendorModal open={modalOpen} onOpenChange={setModalOpen} vendor={selected} mode={modalMode} onSuccess={() => { setModalOpen(false); refetch(); }} />
    </div>
  );
}

