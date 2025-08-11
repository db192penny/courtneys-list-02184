
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import VendorCard from "./VendorCard";

type Vendor = {
  id: string;
  name: string;
  category: string;
  contact_info: string | null;
  typical_cost: number | null;
  community: string | null;
  created_at: string | null;
};

export default function VendorList({
  category,
  isVerified,
  limit,
}: {
  category?: string;
  isVerified: boolean;
  limit?: number;
}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["vendors", category || "all"],
    queryFn: async () => {
      console.log("[VendorList] loading vendors", { category });
      let q = supabase.from("vendors").select("*").order("created_at", { ascending: false });
      if (category && category !== "all") {
        q = q.eq("category", category);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as Vendor[];
    },
  });

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading vendors…</div>;
  }
  if (error) {
    console.warn("[VendorList] error:", error);
    return <div className="text-sm text-muted-foreground">Unable to load vendors.</div>;
  }
  if (!data || data.length === 0) {
    return <div className="text-sm text-muted-foreground">No vendors found yet.</div>;
  }

  return (
    <div className="grid gap-4">
      {(limit ? data.slice(0, limit) : data).map((v) => (
        <VendorCard key={v.id} vendor={v} isVerified={isVerified} />
      ))}
    </div>
  );
}
