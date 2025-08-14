import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { usePreviewSession } from "@/hooks/usePreviewSession";
import IdentityGateModal from "@/components/preview/IdentityGateModal";
import CostInputs from "@/components/vendors/CostInputs";
import CostPreview from "@/components/vendors/CostPreview";
import { CATEGORIES } from "@/data/categories";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendor?: { id: string; name: string; category: string } | null;
  onSuccess?: () => void;
  communityName?: string;
}

export default function PreviewCostManagementModal({ open, onOpenChange, vendor, onSuccess, communityName }: Props) {
  const { session, createSession, trackEvent, getAuthorLabel } = usePreviewSession();
  const [costs, setCosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNameInCosts, setShowNameInCosts] = useState(false);
  const [showIdentityGate, setShowIdentityGate] = useState(false);

  // Check if we need to show identity gate on first open
  useEffect(() => {
    if (open && vendor && !session) {
      setShowIdentityGate(true);
    }
  }, [open, vendor, session]);

  // Initialize costs when modal opens
  useEffect(() => {
    if (!open || !vendor) return;

    const initializeCosts = async () => {
      // Build default costs based on category
      let defaultCosts: any[] = [];

      if (["Pool", "Pool Service", "Landscaping", "Pest Control"].includes(vendor.category)) {
        defaultCosts = [{ cost_kind: "monthly_plan", unit: "month", amount: null, period: "monthly" }];
      } else if (["HVAC", "Power Washing", "Pressure Washing", "Plumbing", "Electrical"].includes(vendor.category)) {
        defaultCosts = [{ cost_kind: "service_call", unit: "call", amount: null, period: "one_time" }];
      } else if (vendor.category === "Handyman") {
        defaultCosts = [{ cost_kind: "hourly", unit: "hour", amount: null, period: "one_time" }];
      } else {
        defaultCosts = [{ cost_kind: "one_time", unit: "job", amount: null, period: "one_time" }];
      }

      // Try to fetch existing costs for this session
      if (session) {
        try {
          const { data: existingCosts } = await supabase
            .from("preview_costs")
            .select("*")
            .eq("vendor_id", vendor.id)
            .eq("session_id", session.id)
            .order("created_at", { ascending: false });

          if (existingCosts && existingCosts.length > 0) {
            setCosts(existingCosts.map(cost => ({
              cost_kind: cost.cost_kind,
              unit: cost.unit,
              amount: cost.amount,
              period: cost.period,
              notes: cost.notes,
              quantity: cost.quantity,
            })));
            setShowNameInCosts(!existingCosts[0].anonymous);
            return;
          }
        } catch (error) {
          console.warn("Failed to fetch existing costs:", error);
        }
      }

      setCosts(defaultCosts);
    };

    initializeCosts();
  }, [open, vendor, session]);

  const handleIdentitySuccess = async (sessionData: any) => {
    try {
      await createSession(sessionData);
      setShowIdentityGate(false);
    } catch (error) {
      console.error("Failed to create session:", error);
    }
  };

  const onSubmit = async () => {
    if (!vendor || !session) return;

    const validCosts = costs.filter(cost => cost.amount && cost.amount > 0);
    
    if (validCosts.length === 0) {
      toast({
        title: "Cost Required",
        description: "Please enter at least one cost amount.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Delete existing costs for this vendor/session
      await supabase
        .from("preview_costs")
        .delete()
        .eq("vendor_id", vendor.id)
        .eq("session_id", session.id);

      // Insert new costs
      const costsToInsert = validCosts.map(cost => ({
        vendor_id: vendor.id,
        session_id: session.id,
        amount: parseFloat(cost.amount),
        currency: "USD",
        cost_kind: cost.cost_kind,
        unit: cost.unit,
        period: cost.period,
        quantity: cost.quantity ? parseFloat(cost.quantity) : null,
        notes: cost.notes || null,
        anonymous: !showNameInCosts,
      }));

      const { error } = await supabase
        .from("preview_costs")
        .insert(costsToInsert);

      if (error) throw error;

      // Track the event
      await trackEvent("add_cost", vendor.id, {
        cost_count: validCosts.length,
        vendor_name: vendor.name,
        vendor_category: vendor.category,
      });

      toast({
        title: "Costs Saved",
        description: "Thank you for sharing cost information!",
      });

      onSuccess?.();
    } catch (error) {
      console.error("Failed to save costs:", error);
      toast({
        title: "Error",
        description: "Failed to save costs. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (showIdentityGate && vendor) {
    return (
      <IdentityGateModal
        open={showIdentityGate}
        onOpenChange={setShowIdentityGate}
        community={communityName || vendor.category}
        onSuccess={handleIdentitySuccess}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Share Costs for {vendor?.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <CostInputs 
            category={vendor.category} 
            value={costs} 
            onChange={setCosts} 
          />

          <div className="flex items-center space-x-2">
            <Checkbox
              id="showNameCosts"
              checked={showNameInCosts}
              onCheckedChange={(checked) => setShowNameInCosts(!!checked)}
            />
            <Label
              htmlFor="showNameCosts"
              className="text-sm font-normal cursor-pointer"
            >
              Show my name with these costs
            </Label>
          </div>

          <div className="border rounded-md p-4 bg-muted/30">
            <h4 className="text-sm font-medium mb-2">Preview:</h4>
            <CostPreview
              costs={costs.filter(c => c.amount && c.amount > 0)}
              showNameInCosts={showNameInCosts}
              authorLabel={showNameInCosts ? getAuthorLabel() : "Neighbor"}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={onSubmit}
              disabled={loading || !costs.some(c => c.amount && c.amount > 0)}
              className="flex-1"
            >
              {loading ? "Saving..." : "Save Costs"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}