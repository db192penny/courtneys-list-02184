import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdminCostTable } from "./AdminCostTable";
import { Search, Filter, AlertTriangle } from "lucide-react";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function AdminCostManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVendor, setSelectedVendor] = useState<string>("all");
  const [selectedCostKind, setSelectedCostKind] = useState<string>("all");
  const queryClient = useQueryClient();
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();

  // Show loading state
  if (adminLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-48">
          <div className="text-muted-foreground">Checking permissions...</div>
        </div>
      </div>
    );
  }

  // Show unauthorized message
  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You need admin permissions to access cost management. Contact a site administrator.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const { data: costs, isLoading, error } = useQuery({
    queryKey: ["admin-costs", searchTerm, selectedVendor, selectedCostKind],
    queryFn: async () => {
      console.log("Fetching admin costs...");
      
      let query = supabase
        .from("costs")
        .select(`
          *,
          vendors!inner(name, category)
        `)
        .order("created_at", { ascending: false });

      if (searchTerm) {
        query = query.or(`vendors.name.ilike.%${searchTerm}%,notes.ilike.%${searchTerm}%`);
      }

      if (selectedVendor !== "all") {
        query = query.eq("vendor_id", selectedVendor);
      }

      if (selectedCostKind !== "all") {
        query = query.eq("cost_kind", selectedCostKind);
      }

      const { data, error } = await query;
      
      console.log("Admin costs query result:", { data, error, count: data?.length });
      
      if (error) {
        console.error("Admin costs query error:", error);
        throw error;
      }
      
      return data || [];
    },
    enabled: isAdmin, // Only run if user is admin
  });

  const { data: vendors } = useQuery({
    queryKey: ["vendors-for-filter"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendors")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin, // Only run if user is admin
  });

  const costKinds = ["monthly_plan", "service_call", "hourly", "one_time"];

  // Show error if query failed
  if (error) {
    return (
      <div className="space-y-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Error loading cost data: {error.message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <h1 className="text-2xl font-bold">Community Cost Management</h1>
        <div className="text-sm text-muted-foreground">
          Total entries: {costs?.length || 0}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search vendors or notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={selectedVendor} onValueChange={setSelectedVendor}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by vendor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vendors</SelectItem>
                {vendors?.map((vendor) => (
                  <SelectItem key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedCostKind} onValueChange={setSelectedCostKind}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by cost type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cost Types</SelectItem>
                {costKinds.map((kind) => (
                  <SelectItem key={kind} value={kind}>
                    {kind.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            onClick={() => {
              setSearchTerm("");
              setSelectedVendor("all");
              setSelectedCostKind("all");
            }}
          >
            Clear Filters
          </Button>
        </CardContent>
      </Card>

      <AdminCostTable 
        costs={costs || []} 
        isLoading={isLoading} 
        onUpdate={() => queryClient.invalidateQueries({ queryKey: ["admin-costs"] })}
      />
    </div>
  );
}