import { useEffect, useState } from "react";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
interface PendingRow {
  household_address: string;
  hoa_name: string;
  first_seen: string | null;
}

interface PendingUser {
  id: string;
  email: string | null;
  name: string | null;
  is_verified: boolean | null;
  created_at: string | null;
  address: string | null;
  formatted_address: string | null;
}

const Admin = () => {
  const canonical = typeof window !== "undefined" ? window.location.href : undefined;
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [isHoaAdmin, setIsHoaAdmin] = useState<boolean | null>(null);
  const [isSiteAdmin, setIsSiteAdmin] = useState<boolean | null>(null);
  const [pendingHouseholds, setPendingHouseholds] = useState<PendingRow[]>([]);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLoading, setUserLoading] = useState<Record<string, "approve" | "reject" | undefined>>({});
const [householdLoading, setHouseholdLoading] = useState<Record<string, boolean>>({});

  // Community Branding state
  const [hoaName, setHoaName] = useState<string | null>(null);
  const [brandingAddr, setBrandingAddr] = useState<string>("");
  const [brandingPhone, setBrandingPhone] = useState<string>("");
  const [brandingPhotoPath, setBrandingPhotoPath] = useState<string | null>(null);
  const [brandingPhotoUrl, setBrandingPhotoUrl] = useState<string | null>(null);
  const [brandingSaving, setBrandingSaving] = useState(false);
  const [brandingUploading, setBrandingUploading] = useState(false);
  const [totalHomes, setTotalHomes] = useState<number | "">("");
  const refreshBranding = async (hoa: string) => {
    const { data, error } = await supabase
      .from("community_assets")
      .select("hoa_name, photo_path, address_line, contact_phone, total_homes")
      .eq("hoa_name", hoa)
      .maybeSingle();
    if (error) {
      console.warn("[Admin] load branding error:", error);
      return;
    }
    setBrandingAddr((data as any)?.address_line ?? "");
    setBrandingPhone((data as any)?.contact_phone ?? "");
    setTotalHomes((data as any)?.total_homes ?? "");
    const path = (data as any)?.photo_path ?? null;
    setBrandingPhotoPath(path);
    if (path) {
      const url = supabase.storage.from("community-photos").getPublicUrl(path).data.publicUrl;
      setBrandingPhotoUrl(url);
    } else {
      setBrandingPhotoUrl(null);
    }
  };

  const handleBrandingUpload = async (file: File) => {
    if (!hoaName) return;
    setBrandingUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const uploadPath = `${hoaName}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("community-photos").upload(uploadPath, file, { upsert: true });
    if (error) {
      console.error("[Admin] upload branding photo error:", error);
      toast.error("Upload failed", { description: error.message });
    } else {
      setBrandingPhotoPath(uploadPath);
      const url = supabase.storage.from("community-photos").getPublicUrl(uploadPath).data.publicUrl;
      setBrandingPhotoUrl(url);
      toast.success("Photo uploaded");
    }
    setBrandingUploading(false);
  };

  const saveBranding = async () => {
    if (!hoaName) return;
    setBrandingSaving(true);
    try {
      const { data: existing, error: selErr } = await supabase
        .from("community_assets")
        .select("hoa_name")
        .eq("hoa_name", hoaName)
        .maybeSingle();
      if (selErr && (selErr as any).code !== "PGRST116") throw selErr;

      let opError: any = null;

      if (existing) {
        const { error: updErr } = await supabase
          .from("community_assets")
          .update({
            address_line: brandingAddr || null,
            contact_phone: brandingPhone || null,
            photo_path: brandingPhotoPath || null,
            total_homes: totalHomes === "" ? null : Number(totalHomes),
          })
          .eq("hoa_name", hoaName);
        opError = updErr;
      } else {
        const { error: insErr } = await supabase
          .from("community_assets")
          .insert({
            hoa_name: hoaName,
            address_line: brandingAddr || null,
            contact_phone: brandingPhone || null,
            photo_path: brandingPhotoPath || null,
            total_homes: totalHomes === "" ? null : Number(totalHomes),
          });
        opError = insErr;
      }

      if (opError) {
        console.error("[Admin] save branding error:", opError);
        toast.error("Save failed", { description: opError.message });
      } else {
        toast.success("Branding saved");
      }
    } finally {
      setBrandingSaving(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (!cancelled) {
          setAuthed(false);
          setLoading(false);
        }
        return;
      }
      setAuthed(true);
      const [{ data: hoaAdminRes }, { data: siteAdminRes }] = await Promise.all([
        supabase.rpc("is_user_hoa_admin"),
        supabase.rpc("is_admin" as any),
      ]);
      const hoaFlag = !!hoaAdminRes;
      const siteFlag = !!siteAdminRes;
      if (!cancelled) {
        setIsHoaAdmin(hoaFlag);
        setIsSiteAdmin(siteFlag);
      }
      if (hoaFlag) {
        const [{ data: rows, error }, { data: myHoa }] = await Promise.all([
          supabase.rpc("admin_list_pending_households"),
          supabase.rpc("get_my_hoa"),
        ]);
        if (error) console.warn("[Admin] pending households error:", error);
        if (!cancelled) {
          setPendingHouseholds((rows || []) as PendingRow[]);
          const hoa = (Array.isArray(myHoa) ? (myHoa as any[])[0]?.hoa_name : (myHoa as any)?.hoa_name) as string | undefined;
          if (hoa) {
            setHoaName(hoa);
            await refreshBranding(hoa);
          }
        }
      }
      if (siteFlag) {
        const { data: userRows, error: usersErr } = await supabase
          .from("users")
          .select("id, email, name, is_verified, created_at, address, formatted_address")
          .eq("is_verified", false)
          .order("created_at", { ascending: true });
        if (usersErr) console.warn("[Admin] pending users error:", usersErr);
        if (!cancelled) setPendingUsers((userRows as any as PendingUser[]) || []);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const approveHousehold = async (addr: string) => {
    setHouseholdLoading((prev) => ({ ...prev, [addr]: true }))
    const { error } = await supabase.rpc("admin_approve_household", { _addr: addr });
    if (error) {
      console.error("[Admin] approve household error:", error);
      toast.error("Failed to approve household", { description: error.message });
    } else {
      toast.success("Household approved");
      const { data: rows } = await supabase.rpc("admin_list_pending_households");
      setPendingHouseholds((rows || []) as PendingRow[]);
    }
    setHouseholdLoading((prev) => ({ ...prev, [addr]: false }))
  };

  const setUserVerification = async (userId: string, verified: boolean, email?: string | null) => {
    setUserLoading((prev) => ({ ...prev, [userId]: verified ? "approve" : "reject" }));
    const { error } = await supabase
      .from("users")
      .update({ is_verified: verified })
      .eq("id", userId);
    if (error) {
      console.error("[Admin] set user verification error:", error);
      toast.error(verified ? "Failed to approve user" : "Failed to reject user", {
        description: error.message,
      });
    } else {
      toast.success(verified ? "User approved" : "User rejected");

      // Send approval email with magic link (fail-soft)
      if (verified && email) {
        const { error: fnErr } = await supabase.functions.invoke("send-approval-email", {
          body: {
            email,
            redirectUrl: typeof window !== "undefined" ? window.location.origin : undefined,
          },
        });
        if (fnErr) {
          console.warn("[Admin] send-approval-email error:", fnErr);
          toast.error("Approved, but email failed", { description: fnErr.message });
        } else {
          toast.success("Approval email sent");
        }
      }

      const { data: userRows, error: usersErr } = await supabase
        .from("users")
        .select("id, email, name, is_verified, created_at, address, formatted_address")
        .eq("is_verified", false)
        .order("created_at", { ascending: true });
      if (usersErr) {
        console.warn("[Admin] refresh pending users error:", usersErr);
      }
      setPendingUsers((userRows as any as PendingUser[]) || []);
    }
    setUserLoading((prev) => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  };

  const softDeleteUser = async (userId: string) => {
    const ok = confirm("This will delete the user and their data. Continue?");
    if (!ok) return;
    const { error } = await supabase.rpc("admin_soft_delete_user", { _user_id: userId, _reason: "admin_panel" });
    if (error) {
      console.error("[Admin] soft delete user error:", error);
      toast.error("Failed to delete user", { description: error.message });
    } else {
      toast.success("User deleted");
      const { data: userRows } = await supabase
        .from("users")
        .select("id, email, name, is_verified, created_at, address, formatted_address")
        .eq("is_verified", false)
        .order("created_at", { ascending: true });
      setPendingUsers((userRows as any as PendingUser[]) || []);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <SEO
        title="Courtney’s List | Admin"
        description="Approve users and households; manage community access."
        canonical={canonical}
      />
      <section className="container py-10 max-w-5xl">
        <header className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Admin</h1>
        </header>

        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {authed === false && <p className="text-sm text-muted-foreground">Please sign in to access admin tools.</p>}
        {authed && !isHoaAdmin && !isSiteAdmin && (
          <p className="text-sm text-muted-foreground">You don’t have admin access.</p>
        )}

        {authed && isSiteAdmin && (
          <div className="grid gap-6">
            <div className="rounded-md border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-medium">Admin Tools</h2>
                <div className="flex gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link to="/admin/vendors/seed">Seed Vendor</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link to="/admin/badges">Manage Badges</Link>
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Use these tools to manage the platform and seed initial vendor data for communities.
              </p>
            </div>

            <div className="rounded-md border border-border p-4">
              <h2 className="font-medium mb-3">Pending Users ({pendingUsers.length})</h2>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingUsers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-sm text-muted-foreground">No users pending approval.</TableCell>
                      </TableRow>
                    )}
                    {pendingUsers.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell>{u.email}</TableCell>
                          <TableCell>{u.name || "—"}</TableCell>
                          <TableCell>{u.formatted_address || u.address || "—"}</TableCell>
                          <TableCell>{u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}</TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button size="sm" variant="secondary" disabled={!!userLoading?.[u.id]} onClick={() => setUserVerification(u.id, false, u.email)}>
                              {userLoading?.[u.id] === "reject" ? "Rejecting…" : "Reject"}
                            </Button>
                            <Button size="sm" disabled={!!userLoading?.[u.id]} onClick={() => setUserVerification(u.id, true, u.email)}>
                              {userLoading?.[u.id] === "approve" ? "Approving…" : "Approve"}
                            </Button>
                          </TableCell>
                        </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}

        {authed && isHoaAdmin && (
          <div className="grid gap-6 mt-6">
            <div className="rounded-md border border-border p-4">
              <h2 className="font-medium mb-3">Pending Households ({pendingHouseholds.length})</h2>
              <p className="text-sm text-muted-foreground mb-3">Households are addresses in your HOA that have not yet been approved by an HOA admin. Approving allows residents at that address to access community-only features.</p>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Address</TableHead>
                      <TableHead>HOA</TableHead>
                      <TableHead>First Seen</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingHouseholds.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-sm text-muted-foreground">No pending households.</TableCell>
                      </TableRow>
                    )}
                    {pendingHouseholds.map((row) => (
                      <TableRow key={row.household_address}>
                        <TableCell>{row.household_address}</TableCell>
                        <TableCell>{row.hoa_name}</TableCell>
                        <TableCell>{row.first_seen ? new Date(row.first_seen).toLocaleDateString() : "—"}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" disabled={!!householdLoading[row.household_address]} onClick={() => approveHousehold(row.household_address)}>
                            {householdLoading[row.household_address] ? "Approving…" : "Approve"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="rounded-md border border-border p-4">
              <h2 className="font-medium mb-3">Community Branding</h2>
              <p className="text-sm text-muted-foreground mb-4">Set your HOA’s public photo and address shown on the community page.</p>
              {!hoaName ? (
                <p className="text-sm text-muted-foreground">Loading HOA info…</p>
              ) : (
                <div className="grid gap-4">
                  <div className="flex items-center gap-4">
                    <img
                      src={brandingPhotoUrl || "/lovable-uploads/fa4d554f-323c-4bd2-b5aa-7cd1f2289c3c.png"}
                      alt={`${hoaName} community photo`}
                      className="h-16 w-16 rounded-md object-cover border"
                      loading="lazy"
                    />
                    <div className="grid gap-2">
                      <Label htmlFor="branding-photo">Community Photo</Label>
                      <Input
                        id="branding-photo"
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleBrandingUpload(file);
                        }}
                        disabled={brandingUploading}
                      />
                      <p className="text-xs text-muted-foreground">First upload stores to “{hoaName}/…” in the community-photos bucket.</p>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="branding-address">Displayed Address</Label>
                    <Input
                      id="branding-address"
                      placeholder="HOA address line"
                      value={brandingAddr}
                      onChange={(e) => setBrandingAddr(e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="branding-phone">HOA Contact Phone</Label>
                    <Input
                      id="branding-phone"
                      placeholder="e.g. (561) 555-1234"
                      value={brandingPhone}
                      onChange={(e) => setBrandingPhone(e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="total-homes">Number of Homes in HOA</Label>
                    <Input
                      id="total-homes"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      placeholder="e.g. 500"
                      value={totalHomes}
                      onChange={(e) => {
                        const v = e.target.value;
                        setTotalHomes(v === "" ? "" : Math.max(0, Number(v)));
                      }}
                    />
                    <p className="text-xs text-muted-foreground">Used to calculate % of homes serviced and shown under the community name.</p>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={saveBranding} disabled={brandingSaving || !hoaName}>
                      {brandingSaving ? "Saving…" : "Save Branding"}
                    </Button>
                    <Button variant="secondary" onClick={() => hoaName && refreshBranding(hoaName)} disabled={!hoaName}>
                      Refresh
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
};

export default Admin;
