import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

type EditMarketPriceModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendorId: string;
  vendorName: string;
  currentAmount?: number;
  currentUnit?: string;
};

export function EditMarketPriceModal({
  open,
  onOpenChange,
  vendorId,
  vendorName,
  currentAmount,
  currentUnit
}: EditMarketPriceModalProps) {
  const [amount, setAmount] = useState(currentAmount?.toString() || "");
  const [unit, setUnit] = useState(currentUnit || "month");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount greater than 0",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to edit market prices",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase
        .from("vendor_market_prices")
        .upsert({
          vendor_id: vendorId,
          amount: parseFloat(amount),
          unit: unit,
          updated_by: user.user.id
        });

      if (error) throw error;

      toast({
        title: "Market price updated",
        description: `Updated market price for ${vendorName}`
      });

      // Refresh the vendor stats query
      queryClient.invalidateQueries({ queryKey: ["vendorStats"] });
      
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating market price:", error);
      toast({
        title: "Error updating price",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("vendor_market_prices")
        .delete()
        .eq("vendor_id", vendorId);

      if (error) throw error;

      toast({
        title: "Market price removed",
        description: `Removed market price for ${vendorName}`
      });

      // Refresh the vendor stats query
      queryClient.invalidateQueries({ queryKey: ["vendorStats"] });
      
      onOpenChange(false);
    } catch (error) {
      console.error("Error removing market price:", error);
      toast({
        title: "Error removing price",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Market Price for {vendorName}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="amount">Amount (required)</Label>
            <div className="flex items-center space-x-2">
              <span>$</span>
              <Input
                id="amount"
                type="number"
                placeholder="150"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="unit">Unit</Label>
            <Select value={unit} onValueChange={setUnit}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">per Month</SelectItem>
                <SelectItem value="visit">per Visit</SelectItem>
                <SelectItem value="hour">per Hour</SelectItem>
                <SelectItem value="job">per Job</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-between">
          <div>
            {currentAmount && (
              <Button 
                variant="destructive" 
                onClick={handleDelete}
                disabled={loading}
              >
                Remove Price
              </Button>
            )}
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}