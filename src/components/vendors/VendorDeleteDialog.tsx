import { useState, useEffect } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

interface AdminVendor {
  id: string;
  name: string;
  category: string;
  creator_name?: string;
  creator_email?: string;
}

interface VendorDeleteDialogProps {
  vendor: AdminVendor;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface VendorUsage {
  reviews: number;
  costs: number;
  homeVendors: number;
  totalUsers: number;
}

export function VendorDeleteDialog({ vendor, open, onOpenChange, onSuccess }: VendorDeleteDialogProps) {
  const [loading, setLoading] = useState(false);
  const [usage, setUsage] = useState<VendorUsage | null>(null);
  const [usageLoading, setUsageLoading] = useState(true);

  useEffect(() => {
    if (open) {
      fetchVendorUsage();
    }
  }, [open, vendor.id]);

  const fetchVendorUsage = async () => {
    setUsageLoading(true);
    try {
      const [reviewsRes, costsRes, homeVendorsRes] = await Promise.all([
        supabase
          .from("reviews")
          .select("id, user_id")
          .eq("vendor_id", vendor.id),
        
        supabase
          .from("costs")
          .select("id, created_by")
          .eq("vendor_id", vendor.id),
          
        supabase
          .from("home_vendors")
          .select("id, user_id")
          .eq("vendor_id", vendor.id)
      ]);

      const reviews = reviewsRes.data || [];
      const costs = costsRes.data || [];
      const homeVendors = homeVendorsRes.data || [];

      // Count unique users affected
      const affectedUsers = new Set([
        ...reviews.map(r => r.user_id),
        ...costs.map(c => c.created_by),
        ...homeVendors.map(hv => hv.user_id)
      ].filter(Boolean));

      setUsage({
        reviews: reviews.length,
        costs: costs.length,
        homeVendors: homeVendors.length,
        totalUsers: affectedUsers.size
      });
    } catch (error) {
      console.error("Error fetching vendor usage:", error);
      toast.error("Failed to load vendor usage data");
    } finally {
      setUsageLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      // Delete in reverse order of dependencies
      // 1. Delete reviews
      const { error: reviewsError } = await supabase
        .from("reviews")
        .delete()
        .eq("vendor_id", vendor.id);

      if (reviewsError) throw reviewsError;

      // 2. Delete costs
      const { error: costsError } = await supabase
        .from("costs")
        .delete()
        .eq("vendor_id", vendor.id);

      if (costsError) throw costsError;

      // 3. Delete home_vendors relationships
      const { error: homeVendorsError } = await supabase
        .from("home_vendors")
        .delete()
        .eq("vendor_id", vendor.id);

      if (homeVendorsError) throw homeVendorsError;

      // 4. Finally delete the vendor
      const { error: vendorError } = await supabase
        .from("vendors")
        .delete()
        .eq("id", vendor.id);

      if (vendorError) throw vendorError;

      toast.success("Vendor deleted successfully");
      onSuccess();
    } catch (error) {
      console.error("Error deleting vendor:", error);
      toast.error("Failed to delete vendor");
    } finally {
      setLoading(false);
    }
  };

  const hasData = usage && (usage.reviews > 0 || usage.costs > 0 || usage.homeVendors > 0);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Vendor</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                Are you sure you want to delete <strong>{vendor.name}</strong>? 
                This action cannot be undone.
              </p>

              {vendor.creator_name && (
                <div className="rounded-lg border p-3 bg-muted/50">
                  <h4 className="font-medium text-sm mb-1">Vendor Details</h4>
                  <div className="text-sm text-muted-foreground">
                    <div>Category: {vendor.category}</div>
                    <div>Created by: {vendor.creator_name}</div>
                    {vendor.creator_email && (
                      <div>Contact: {vendor.creator_email}</div>
                    )}
                  </div>
                </div>
              )}

              {usageLoading ? (
                <div className="text-sm text-muted-foreground">
                  Loading usage data...
                </div>
              ) : hasData ? (
                <div className="rounded-lg border p-3 bg-destructive/10">
                  <h4 className="font-medium text-sm mb-2 text-destructive">
                    ⚠️ Data Impact Warning
                  </h4>
                  <div className="text-sm space-y-1">
                    <p>Deleting this vendor will also remove:</p>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      {usage!.reviews > 0 && (
                        <li>{usage!.reviews} review{usage!.reviews !== 1 ? 's' : ''}</li>
                      )}
                      {usage!.costs > 0 && (
                        <li>{usage!.costs} cost entr{usage!.costs !== 1 ? 'ies' : 'y'}</li>
                      )}
                      {usage!.homeVendors > 0 && (
                        <li>{usage!.homeVendors} user relationship{usage!.homeVendors !== 1 ? 's' : ''}</li>
                      )}
                    </ul>
                    <div className="pt-2">
                      <Badge variant="destructive">
                        {usage!.totalUsers} user{usage!.totalUsers !== 1 ? 's' : ''} will be affected
                      </Badge>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border p-3 bg-green-50">
                  <div className="text-sm text-green-700">
                    ✅ Safe to delete - no associated data found
                  </div>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading || usageLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? "Deleting..." : "Delete Vendor"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}