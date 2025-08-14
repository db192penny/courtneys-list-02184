import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

interface AdminEditCostModalProps {
  cost: CostEntry;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AdminEditCostModal({ cost, open, onOpenChange, onSuccess }: AdminEditCostModalProps) {
  const [amount, setAmount] = useState(cost.amount.toString());
  const [unit, setUnit] = useState(cost.unit);
  const [period, setPeriod] = useState(cost.period);
  const [costKind, setCostKind] = useState(cost.cost_kind);
  const [notes, setNotes] = useState(cost.notes || "");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setAmount(cost.amount.toString());
    setUnit(cost.unit);
    setPeriod(cost.period);
    setCostKind(cost.cost_kind);
    setNotes(cost.notes || "");
  }, [cost]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        throw new Error("User not authenticated");
      }

      const { error } = await supabase
        .from("costs")
        .update({
          amount: parseFloat(amount),
          unit,
          period,
          cost_kind: costKind,
          notes: notes || null,
          admin_modified: true,
          admin_modified_by: user.user.id,
          admin_modified_at: new Date().toISOString(),
        })
        .eq("id", cost.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Cost entry updated successfully",
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

  const getAuthorLabel = () => {
    if (!cost.author_name) return "Unknown";
    
    const firstName = cost.author_name.split(" ")[0];
    const lastName = cost.author_name.split(" ").slice(-1)[0];
    const lastInitial = lastName ? lastName.charAt(0) + "." : "";
    
    let label = firstName;
    if (lastInitial && lastInitial !== firstName.charAt(0) + ".") {
      label += ` ${lastInitial}`;
    }
    
    if (cost.author_street) {
      label += ` on ${cost.author_street}`;
    }
    
    return label;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Cost Entry</DialogTitle>
          <DialogDescription>
            Editing cost for <strong>{cost.vendor_name}</strong> submitted by {getAuthorLabel()}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount ($)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Month</SelectItem>
                  <SelectItem value="visit">Visit</SelectItem>
                  <SelectItem value="hour">Hour</SelectItem>
                  <SelectItem value="job">Job</SelectItem>
                  <SelectItem value="call">Call</SelectItem>
                  <SelectItem value="sq_ft">Sq Ft</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="period">Period</Label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one_time">One Time</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="annually">Annually</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Biweekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="costKind">Cost Type</Label>
              <Select value={costKind} onValueChange={setCostKind}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly_plan">Monthly Plan</SelectItem>
                  <SelectItem value="service_call">Service Call</SelectItem>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="one_time">One Time</SelectItem>
                  <SelectItem value="per_visit">Per Visit</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes about this cost..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}