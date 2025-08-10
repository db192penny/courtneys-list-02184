import { useEffect, useMemo, useState } from "react";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink, Plus, Rocket } from "lucide-react";

// Minimal types
type Vendor = {
  id: string;
  name: string;
  category: string;
  community: string | null;
  created_at: string | null;
  updated_at?: string | null;
};

type VendorStat = {
  avg_amount: number | null;
  sample_size: number | null;
};

const formatCurrency = (amount?: number | null, currency = "USD") => {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return "—";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
};

export default function Household() {
  const canonical = typeof window !== "undefined" ? window.location.href : undefined;
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [address, setAddress] = useState<string>("");
  const [hoaName, setHoaName] = useState<string>("");

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [stats, setStats] = useState<Record<string, VendorStat>>({});
  const [yourCosts, setYourCosts] = useState<Record<string, { amount: number; currency: string } | null>>({});

  const [costOpen, setCostOpen] = useState(false);
  const [costVendorId, setCostVendorId] = useState<string | null>(null);
  const [amount, setAmount] = useState<string>("");
  const [currency, setCurrency] = useState<string>("USD");
  const [isInviting, setIsInviting] = useState<boolean>(false);

  const [points, setPoints] = useState<number>(0);
  const [level, setLevel] = useState<string>("New");

  const levelInfo = useMemo(() => {
    if (points >= 50) return { label: "Leader", next: 0 };
    if (points >= 15) return { label: "Power Contributor", next: 50 - points };
    if (points >= 5) return { label: "Active", next: 15 - points };
    return { label: "New", next: 5 - points };
  }, [points]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        setLoading(false);
        return;
      }
      setUserId(auth.user.id);

      const { data: profile } = await supabase
        .from("users")
        .select("address, submissions_count")
        .eq("id", auth.user.id)
        .maybeSingle();

      const addr = profile?.address ?? "";
      if (!cancelled) setAddress(addr);

      // HOA name via RPC (server-side normalization)
      const { data: hoaRes, error: hoaErr } = await supabase.rpc("get_my_hoa");
      if (hoaErr) console.warn("[Household] get_my_hoa error:", hoaErr);
      const hoa = (hoaRes?.[0]?.hoa_name as string | undefined) || "";
      if (!cancelled) setHoaName(hoa);

      // Vendors: prefer community match if HOA found
      let vq = supabase.from("vendors").select("id, name, category, community, created_at, updated_at").order("created_at", { ascending: false });
      if (hoa) vq = vq.eq("community", hoa);
      const { data: vlist, error: vErr } = await vq;
      if (vErr) console.warn("[Household] load vendors error:", vErr);
      const list = (vlist || []) as Vendor[];
      if (!cancelled) setVendors(list);

      // Load stats per vendor
      const statsEntries: Record<string, VendorStat> = {};
      const yourCostsEntries: Record<string, { amount: number; currency: string } | null> = {};
      if (list.length) {
        await Promise.all(
          list.map(async (v) => {
            // Community stats
            if (hoa) {
              const { data: s, error: sErr } = await supabase.rpc("vendor_cost_stats", { _vendor_id: v.id, _hoa_name: hoa });
              if (sErr) {
                console.warn("[Household] stats error", v.id, sErr);
              }
              const rec = (s?.[0] as VendorStat) || { avg_amount: null, sample_size: null };
              statsEntries[v.id] = rec;
            } else {
              statsEntries[v.id] = { avg_amount: null, sample_size: null };
            }

            // Your latest cost for this vendor
            if (addr) {
              const { data: yc, error: ycErr } = await supabase
                .from("costs")
                .select("amount, currency, created_at")
                .eq("vendor_id", v.id)
                .order("created_at", { ascending: false })
                .limit(1);
              if (ycErr) console.warn("[Household] your cost error", v.id, ycErr);
              const row = yc?.[0] as { amount: number; currency: string } | undefined;
              yourCostsEntries[v.id] = row ? { amount: Number(row.amount), currency: row.currency } : null;
            } else {
              yourCostsEntries[v.id] = null;
            }
          })
        );
      }
      if (!cancelled) {
        setStats(statsEntries);
        setYourCosts(yourCostsEntries);
      }

      // Activity points
      const reviewsCountPromise = supabase
        .from("reviews")
        .select("id", { count: "exact", head: true })
        .eq("user_id", auth.user.id);
      const { data: rc, error: rErr, count: rCount } = await reviewsCountPromise;
      if (rErr) console.warn("[Household] reviews count error:", rErr);

      const { data: costsCount, error: cErr } = await supabase.rpc("count_my_costs");
      if (cErr) console.warn("[Household] costs count error:", cErr);

      const submissions = profile?.submissions_count ?? 0;
      const reviewsCount = rCount ?? 0;
      const myCosts = (Array.isArray(costsCount) ? (costsCount[0] as number) : (costsCount as number)) || 0;
      const totalPoints = submissions * 10 + reviewsCount * 5 + myCosts * 5;
      if (!cancelled) {
        setPoints(totalPoints);
        setLevel(levelInfo.label);
      }

      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [levelInfo.label]);

  const openAddCost = (vendorId: string) => {
    setCostVendorId(vendorId);
    setAmount("");
    setCurrency("USD");
    setCostOpen(true);
  };

  const submitCost = async () => {
    if (!userId || !costVendorId) return;
    const value = parseFloat(amount);
    if (!Number.isFinite(value) || value < 0) {
      toast({ title: "Enter a valid amount", description: "Amount must be a non-negative number.", variant: "destructive" });
      return;
    }
    const curr = currency.trim().toUpperCase();
    if (!/^([A-Z]{3})$/.test(curr)) {
      toast({ title: "Invalid currency", description: "Use a 3-letter currency code (e.g., USD).", variant: "destructive" });
      return;
    }

    const payload = {
      vendor_id: costVendorId,
      household_address: address,
      amount: value,
      currency: curr,
      created_by: userId,
    } as const;

    const { error } = await supabase.from("costs").insert(payload as any);
    if (error) {
      console.error("[Household] insert cost error:", error);
      toast({ title: "Could not add cost", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Cost added", description: "Thanks for sharing!" });
    setCostOpen(false);

    // Refresh quick caches for the vendor
    if (hoaName && costVendorId) {
      const { data: s } = await supabase.rpc("vendor_cost_stats", { _vendor_id: costVendorId, _hoa_name: hoaName });
      const rec = (s?.[0] as VendorStat) || { avg_amount: null, sample_size: null };
      setStats((prev) => ({ ...prev, [costVendorId]: rec }));
      setYourCosts((prev) => ({ ...prev, [costVendorId]: { amount: value, currency: curr } }));
      setPoints((p) => p + 5);
    }
  };

  const generateInvite = async () => {
    if (!userId) return;
    try {
      setIsInviting(true);
      const token = (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
      const { error } = await supabase.from("invitations").insert({ invite_token: token, invited_by: userId });
      if (error) throw error;
      const link = `${window.location.origin}/invite/${token}`;
      await navigator.clipboard.writeText(link);
      toast({ title: "Invite link copied", description: "Share it with your neighbor." });
    } catch (e: any) {
      console.error("[Household] invite error:", e);
      toast({ title: "Could not create invite", description: e?.message ?? "Unknown error", variant: "destructive" });
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <SEO
        title="Household | Trusted vendors, costs, and ratings"
        description="All your household’s trusted vendors, costs, and ratings — organized in one place."
        canonical={canonical}
      />

      <section className="container py-10 space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Your Household</h1>
          <p className="text-muted-foreground">All your household’s trusted vendors, costs, and ratings — organized in one place.</p>
        </header>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle className="text-base">Household Overview</CardTitle>
              <Button size="sm" onClick={generateInvite} disabled={isInviting}>Copy Invite Link</Button>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <div><span className="text-foreground font-medium">Address:</span> <span>{address || "—"}</span></div>
              <div><span className="text-foreground font-medium">HOA/Community:</span> <span>{hoaName || "—"}</span></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Activity</CardTitle>
              <Rocket className="h-4 w-4 text-foreground" aria-hidden="true" />
            </CardHeader>
            <CardContent className="text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">Level:</span>
                <span className="text-muted-foreground">{levelInfo.label}</span>
              </div>
              {levelInfo.next > 0 && (
                <p className="text-muted-foreground mt-2">{levelInfo.next} pts to next level</p>
              )}
              <p className="text-muted-foreground mt-1">Total points: {points}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Providers Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Your Cost</TableHead>
                    <TableHead>Community Avg</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!loading && vendors.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-muted-foreground">No providers yet.</TableCell>
                    </TableRow>
                  )}
                  {vendors.map((v) => {
                    const stat = stats[v.id];
                    const yc = yourCosts[v.id];
                    const showAvg = stat && (stat.sample_size ?? 0) >= 3 ? formatCurrency(stat.avg_amount) : "—";
                    const last = v.updated_at || v.created_at || null;
                    const lastStr = last ? new Date(last).toLocaleDateString() : "—";
                    const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(`${v.name} ${v.category}`)}`;
                    return (
                      <TableRow key={v.id}>
                        <TableCell>{v.category}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <a href={googleUrl} target="_blank" rel="noreferrer" aria-label={`Search ${v.name} on Google`} className="inline-flex items-center gap-1 underline">
                              {v.name}
                              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                            </a>
                          </div>
                        </TableCell>
                        <TableCell>{yc ? formatCurrency(yc.amount, yc.currency) : "—"}</TableCell>
                        <TableCell>{showAvg}</TableCell>
                        <TableCell>{lastStr}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="secondary" onClick={() => openAddCost(v.id)}>
                            <Plus className="h-4 w-4 mr-1" /> Add Cost
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </section>

      <Dialog open={costOpen} onOpenChange={setCostOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Cost</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input id="amount" type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.currentTarget.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Input id="currency" value={currency} onChange={(e) => setCurrency(e.currentTarget.value)} placeholder="USD" maxLength={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setCostOpen(false)}>Cancel</Button>
            <Button onClick={submitCost}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
