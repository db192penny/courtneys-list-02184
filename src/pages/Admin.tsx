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

const Admin = () => {
  const canonical = typeof window !== "undefined" ? window.location.href : undefined;
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [pending, setPending] = useState<PendingRow[]>([]);
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
      const { data: adminRes } = await supabase.rpc("is_user_hoa_admin");
      const adminFlag = !!adminRes;
      if (!cancelled) setIsAdmin(adminFlag);
      if (adminFlag) {
        const { data: rows, error } = await supabase.rpc("admin_list_pending_households");
        if (error) console.warn("[Admin] pending error:", error);
        if (!cancelled) setPending((rows || []) as PendingRow[]);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const approve = async (addr: string) => {
    const { error } = await supabase.rpc("admin_approve_household", { _addr: addr });
    if (error) {
      console.error("[Admin] approve error:", error);
      return;
    }
    const { data: rows } = await supabase.rpc("admin_list_pending_households");
    setPending((rows || []) as PendingRow[]);
  };

  return (
    <main className="min-h-screen bg-background">
      <SEO
        title="Courtney’s List | Admin"
        description="Approve households and manage community access."
        canonical={canonical}
      />
      <section className="container py-10 max-w-4xl">
        <header className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Admin</h1>
        </header>

        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {authed === false && <p className="text-sm text-muted-foreground">Please sign in to access admin tools.</p>}
        {authed && isAdmin === false && <p className="text-sm text-muted-foreground">You don’t have admin access for your HOA.</p>}

        {authed && isAdmin && (
          <div className="grid gap-6">
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
                    {pending.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-sm text-muted-foreground">No pending households.</TableCell>
                      </TableRow>
                    )}
                    {pending.map((row) => (
                      <TableRow key={row.household_address}>
                        <TableCell>{row.household_address}</TableCell>
                        <TableCell>{row.hoa_name}</TableCell>
                        <TableCell>{row.first_seen ? new Date(row.first_seen).toLocaleDateString() : "—"}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" onClick={() => approve(row.household_address)}>Approve</Button>
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
