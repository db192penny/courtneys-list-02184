import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CATEGORIES } from "@/data/categories";
import { toast } from "@/components/ui/sonner";
import { Link } from "react-router-dom";

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
  contact_info: string | null;
  additional_notes: string | null;
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

  const onAddVendor = async (vendorId: string) => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      toast("Please sign in to add vendors to your home list.");
      return;
    }
    const { error } = await supabase.from("home_vendors").insert({
      user_id: auth.user.id,
      vendor_id: vendorId,
    } as any);
    if (error) {
      console.warn("[CommunityVendorTable] add vendor error", error);
      toast.error("Could not add vendor", { description: error.message });
    } else {
      toast.success("Added to your home list");
    }
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
              <TableHead>Notes</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={9} className="text-sm text-muted-foreground">Loading…</TableCell>
              </TableRow>
            )}
            {error && (
              <TableRow>
                <TableCell colSpan={9} className="text-sm text-muted-foreground">Unable to load providers.</TableCell>
              </TableRow>
            )}
            {!isLoading && !error && formatted.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-sm text-muted-foreground">No vendors found.</TableCell>
              </TableRow>
            )}
            {formatted.map((r, idx) => (
              <TableRow key={r.id}>
                <TableCell>{idx + 1}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Link className="underline" to={`/vendor/${r.id}`}>{r.name}</Link>
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
                  <div className="text-xs leading-tight">
                    <div>HOA: <span className="font-medium text-foreground">{r.hoa_rating?.toFixed(1) ?? "—"}</span>{r.hoa_rating_count ? ` (${r.hoa_rating_count})` : ""}</div>
                    <div>Google: <span className="font-medium text-foreground">{r.google_rating?.toFixed(1) ?? "—"}</span>{r.google_rating_count ? ` (${r.google_rating_count})` : ""}</div>
                  </div>
                </TableCell>
                <TableCell>{r.avg_monthly_cost != null ? `$${Number(r.avg_monthly_cost).toFixed(2)}` : "—"}</TableCell>
                <TableCell>{showContact ? (r.contact_info || "—") : "Hidden"}</TableCell>
                <TableCell className="max-w-[260px] truncate" title={r.additional_notes || undefined}>{r.additional_notes || "—"}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button size="sm" variant="secondary" onClick={() => onAddVendor(r.id)}>+ Add Vendor</Button>
                  <Button size="sm" asChild>
                    <Link to={`/vendor/${r.id}`}>Rate</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
