import { AdminCostManagement } from "@/components/admin/AdminCostManagement";
import SEO from "@/components/SEO";

export default function AdminCostManagementPage() {
  const canonical = typeof window !== "undefined" ? window.location.href : undefined;

  return (
    <main className="min-h-screen bg-background">
      <SEO
        title="Courtney's List | Admin Cost Management"
        description="Manage community cost submissions and data."
        canonical={canonical}
      />
      <section className="container py-10 max-w-7xl">
        <AdminCostManagement />
      </section>
    </main>
  );
}