import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AdminEditCostModalProps {
  cost: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AdminEditCostModal({ cost, open, onOpenChange, onSuccess }: AdminEditCostModalProps) {
  const [formData, setFormData] = useState({
    amount: cost?.amount || 0,
    unit: cost?.unit || "month",
    period: cost?.period || "one_time",
    cost_kind: cost?.cost_kind || "one_time",
    notes: cost?.notes || "",
    quantity: cost?.quantity || 1,
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (cost) {
      setFormData({
        amount: cost.amount || 0,
        unit: cost.unit || "month",
        period: cost.period || "one_time",
        cost_kind: cost.cost_kind || "one_time",
        notes: cost.notes || "",
        quantity: cost.quantity || 1,
      });
    }
  }, [cost]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("costs")
        .update({
          ...formData,
          admin_modified: true,
          admin_modified_by: user.user.id,
          admin_modified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", cost.id);

      if (error) throw error;

      toast({
        title: "Cost updated",
        description: "The cost entry has been successfully updated.",
      });
      onSuccess();
    } catch (error) {
      console.error("Error updating cost:", error);
      toast({
        title: "Error",
        description: "Failed to update cost entry",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const costKinds = [
    { value: "monthly_plan", label: "Monthly Plan" },
    { value: "service_call", label: "Service Call" },
    { value: "hourly", label: "Hourly" },
    { value: "one_time", label: "One Time" },
  ];

  const periods = [
    { value: "one_time", label: "One Time" },
    { value: "monthly", label: "Monthly" },
    { value: "quarterly", label: "Quarterly" },
    { value: "annually", label: "Annually" },
    { value: "weekly", label: "Weekly" },
    { value: "biweekly", label: "Biweekly" },
  ];

  const units = [
    { value: "month", label: "Month" },
    { value: "hour", label: "Hour" },
    { value: "call", label: "Call" },
    { value: "visit", label: "Visit" },
    { value: "job", label: "Job" },
    { value: "sq_ft", label: "Square Foot" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Cost Entry</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amount">Amount ($)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="cost_kind">Cost Type</Label>
            <Select value={formData.cost_kind} onValueChange={(value) => setFormData({ ...formData, cost_kind: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {costKinds.map((kind) => (
                  <SelectItem key={kind.value} value={kind.value}>
                    {kind.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="unit">Unit</Label>
              <Select value={formData.unit} onValueChange={(value) => setFormData({ ...formData, unit: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {units.map((unit) => (
                    <SelectItem key={unit.value} value={unit.value}>
                      {unit.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="period">Period</Label>
              <Select value={formData.period} onValueChange={(value) => setFormData({ ...formData, period: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {periods.map((period) => (
                    <SelectItem key={period.value} value={period.value}>
                      {period.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes about this cost..."
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}