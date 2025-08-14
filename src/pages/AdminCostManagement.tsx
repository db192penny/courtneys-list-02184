import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminCostTable } from "@/components/vendors/AdminCostTable";
import { AdminEditCostModal } from "@/components/vendors/AdminEditCostModal";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface CostEntry {
  id: string;
  vendor_id: string;
  vendor_name: string;
  vendor_category: string;
  amount: number;
  unit: string;
  period: string;
  cost_kind: string;
  notes?: string;
  created_at: string;
  created_by: string;
  author_name?: string;
  author_street?: string;
  admin_modified: boolean;
  admin_modified_by?: string;
  admin_modified_at?: string;
  deleted_at?: string;
}

export default function AdminCostManagement() {
  const [editingCost, setEditingCost] = useState<CostEntry | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();

  const { data: costs = [], isLoading } = useQuery({
    queryKey: ["adminCosts", showDeleted],
    queryFn: async () => {
      const query = supabase
        .from("costs")
        .select(`
          *,
          vendors!inner(name, category),
          users!costs_created_by_fkey(name, street_name)
        `)
        .order("created_at", { ascending: false });

      if (!showDeleted) {
        query.is("deleted_at", null);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data.map((cost: any) => ({
        id: cost.id,
        vendor_id: cost.vendor_id,
        vendor_name: cost.vendors.name,
        vendor_category: cost.vendors.category,
        amount: cost.amount,
        unit: cost.unit,
        period: cost.period,
        cost_kind: cost.cost_kind,
        notes: cost.notes,
        created_at: cost.created_at,
        created_by: cost.created_by,
        author_name: cost.users?.name,
        author_street: cost.users?.street_name,
        admin_modified: cost.admin_modified,
        admin_modified_by: cost.admin_modified_by,
        admin_modified_at: cost.admin_modified_at,
        deleted_at: cost.deleted_at,
      }));
    },
  });

  const handleDelete = async (costId: string) => {
    try {
      const { error } = await supabase
        .from("costs")
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .eq("id", costId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Cost entry deleted successfully",
      });

      queryClient.invalidateQueries({ queryKey: ["adminCosts"] });
      queryClient.invalidateQueries({ queryKey: ["vendorStats"] });
    } catch (error) {
      console.error("Error deleting cost:", error);
      toast({
        title: "Error",
        description: "Failed to delete cost entry",
        variant: "destructive",
      });
    }
  };

  const handleRestore = async (costId: string) => {
    try {
      const { error } = await supabase
        .from("costs")
        .update({
          deleted_at: null,
          deleted_by: null,
        })
        .eq("id", costId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Cost entry restored successfully",
      });

      queryClient.invalidateQueries({ queryKey: ["adminCosts"] });
      queryClient.invalidateQueries({ queryKey: ["vendorStats"] });
    } catch (error) {
      console.error("Error restoring cost:", error);
      toast({
        title: "Error",
        description: "Failed to restore cost entry",
        variant: "destructive",
      });
    }
  };

  const activeCosts = costs.filter(cost => !cost.deleted_at);
  const deletedCosts = costs.filter(cost => cost.deleted_at);

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate("/admin")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Admin
        </Button>
        <div className="flex items-center gap-2">
          <DollarSign className="h-6 w-6" />
          <h1 className="text-3xl font-bold">Cost Management</h1>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{costs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeCosts.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deleted Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{deletedCosts.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-4">
        <Button
          variant={showDeleted ? "outline" : "default"}
          onClick={() => setShowDeleted(false)}
        >
          Active Costs ({activeCosts.length})
        </Button>
        <Button
          variant={showDeleted ? "default" : "outline"}
          onClick={() => setShowDeleted(true)}
        >
          Deleted Costs ({deletedCosts.length})
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cost Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading cost entries...</div>
          ) : (
            <AdminCostTable
              costs={showDeleted ? deletedCosts : activeCosts}
              onEdit={setEditingCost}
              onDelete={handleDelete}
              onRestore={handleRestore}
              showDeleted={showDeleted}
            />
          )}
        </CardContent>
      </Card>

      {editingCost && (
        <AdminEditCostModal
          cost={editingCost}
          open={!!editingCost}
          onOpenChange={(open) => !open && setEditingCost(null)}
          onSuccess={() => {
            setEditingCost(null);
            queryClient.invalidateQueries({ queryKey: ["adminCosts"] });
            queryClient.invalidateQueries({ queryKey: ["vendorStats"] });
          }}
        />
      )}
    </div>
  );
}