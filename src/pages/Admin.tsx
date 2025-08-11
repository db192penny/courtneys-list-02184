import { useEffect, useState } from "react";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
}

const Admin = () => {
  const canonical = typeof window !== "undefined" ? window.location.href : undefined;
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [isHoaAdmin, setIsHoaAdmin] = useState<boolean | null>(null);
  const [isSiteAdmin, setIsSiteAdmin] = useState<boolean | null>(null);
  const [pendingHouseholds, setPendingHouseholds] = useState<PendingRow[]>([]);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);

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
        const { data: rows, error } = await supabase.rpc("admin_list_pending_households");
        if (error) console.warn("[Admin] pending households error:", error);
        if (!cancelled) setPendingHouseholds((rows || []) as PendingRow[]);
      }
      if (siteFlag) {
        const { data: userRows, error: usersErr } = await supabase.rpc("admin_list_pending_users");
        if (usersErr) console.warn("[Admin] pending users error:", usersErr);
        if (!cancelled) setPendingUsers((userRows || []) as PendingUser[]);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const approveHousehold = async (addr: string) => {
    const { error } = await supabase.rpc("admin_approve_household", { _addr: addr });
    if (error) {
      console.error("[Admin] approve household error:", error);
      return;
    }
    const { data: rows } = await supabase.rpc("admin_list_pending_households");
    setPendingHouseholds((rows || []) as PendingRow[]);
  };

  const setUserVerification = async (userId: string, verified: boolean) => {
    const { error } = await supabase.rpc("admin_set_user_verification", { _user_id: userId, _is_verified: verified });
    if (error) {
      console.error("[Admin] set user verification error:", error);
      return;
    }
    const { data: userRows } = await supabase.rpc("admin_list_pending_users");
    setPendingUsers((userRows || []) as PendingUser[]);
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
              <h2 className="font-medium mb-3">Pending Users</h2>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingUsers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-sm text-muted-foreground">No users pending approval.</TableCell>
                      </TableRow>
                    )}
                    {pendingUsers.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>{u.name || "—"}</TableCell>
                        <TableCell>{u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button size="sm" variant="secondary" onClick={() => setUserVerification(u.id, false)}>Reject</Button>
                          <Button size="sm" onClick={() => setUserVerification(u.id, true)}>Approve</Button>
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
              <h2 className="font-medium mb-3">Pending Households</h2>
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
                          <Button size="sm" onClick={() => approveHousehold(row.household_address)}>Approve</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
};

export default Admin;
