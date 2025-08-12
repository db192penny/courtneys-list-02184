import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { Link } from "react-router-dom";

export type HomeVendor = {
  id: string;
  user_id: string;
  vendor_id: string;
  amount: number | null;
  currency: string | null;
  period: string | null;
  personal_notes: string | null;
  contact_override: string | null;
  my_rating: number | null;
  my_comments: string | null;
  created_at: string | null;
};

export default function HomeVendorsTable() {
  const { data: hvRows, isLoading, error, refetch } = useQuery<HomeVendor[]>({
    queryKey: ["home-vendors"],
    queryFn: async () => {
      const { data, error } = await supabase.from("home_vendors").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as HomeVendor[];
    },
  });

  const vendorIds = useMemo(() => (hvRows || []).map((r) => r.vendor_id), [hvRows]);

  const { data: vendorMap } = useQuery<Record<string, { id: string; name: string; category: string; contact_info: string | null }>>({
    queryKey: ["home-vendors-details", vendorIds.join(",")],
    queryFn: async () => {
      if (!vendorIds.length) return {};
      const { data, error } = await supabase
        .from("vendors")
        .select("id, name, category, contact_info")
        .in("id", vendorIds);
      if (error) throw error;
      const map: Record<string, any> = {};
      for (const v of data || []) map[v.id as string] = v;
      return map;
    },
    enabled: vendorIds.length > 0,
  });

  const onRemove = async (rowId: string) => {
    const { error } = await supabase.from("home_vendors").delete().eq("id", rowId);
    if (error) {
      console.warn("[HomeVendorsTable] remove error", error);
      toast.error("Could not remove", { description: error.message });
    } else {
      toast.success("Removed");
      refetch();
    }
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Provider</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>My Review</TableHead>
            <TableHead>$ Cost</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Personal Notes</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell colSpan={7} className="text-sm text-muted-foreground">Loading…</TableCell>
            </TableRow>
          )}
          {error && (
            <TableRow>
              <TableCell colSpan={7} className="text-sm text-muted-foreground">Unable to load your vendors.</TableCell>
            </TableRow>
          )}
          {!isLoading && !error && (!hvRows || hvRows.length === 0) && (
            <TableRow>
              <TableCell colSpan={7} className="text-sm text-muted-foreground">No vendors in your list yet. Add from the Community page.</TableCell>
            </TableRow>
          )}
          {(hvRows || []).map((r) => {
            const v = vendorMap?.[r.vendor_id];
            const provider = v ? (
              <Link className="underline" to={`/vendor/${v.id}`}>{v.name}</Link>
            ) : (
              <span>—</span>
            );
            const category = v?.category ?? "—";
            const contact = r.contact_override || v?.contact_info || "—";
            const cost = r.amount != null ? `$${Number(r.amount).toFixed(2)}${r.period ? ` / ${r.period}` : ""}` : "—";
            const myReview = r.my_rating != null ? `${r.my_rating}/5` : "—";
            return (
              <TableRow key={r.id}>
                <TableCell>{provider}</TableCell>
                <TableCell>{category}</TableCell>
                <TableCell>
                  <div className="text-xs leading-tight">
                    <div>{myReview}</div>
                    {r.my_comments && <div className="text-muted-foreground truncate max-w-[220px]" title={r.my_comments}>{r.my_comments}</div>}
                  </div>
                </TableCell>
                <TableCell>{cost}</TableCell>
                <TableCell className="truncate max-w-[220px]" title={contact}>{contact}</TableCell>
                <TableCell className="truncate max-w-[260px]" title={r.personal_notes || undefined}>{r.personal_notes || "—"}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="secondary" onClick={() => onRemove(r.id)}>Remove</Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
