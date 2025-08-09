import SEO from "@/components/SEO";

const Admin = () => {
  const canonical = typeof window !== "undefined" ? window.location.href : undefined;

  return (
    <main className="min-h-screen bg-background">
      <SEO
        title="Courtney’s List | Admin"
        description="Approve users, manage invitations, and moderate vendors for Courtney’s List."
        canonical={canonical}
      />
      <section className="container py-10 max-w-3xl">
        <header className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Admin</h1>
          <p className="text-muted-foreground mt-2">
            Admin tools will be enabled after Supabase is connected. You’ll be able to approve users, send invites, and review submissions.
          </p>
        </header>

        <div className="grid gap-4">
          <div className="rounded-md border border-border p-4">
            <h2 className="font-medium">Pending Approvals</h2>
            <p className="text-sm text-muted-foreground">Awaiting data from Supabase…</p>
          </div>
          <div className="rounded-md border border-border p-4">
            <h2 className="font-medium">Invitations</h2>
            <p className="text-sm text-muted-foreground">Send and track invites here.</p>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Admin;
