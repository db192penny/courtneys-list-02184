import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import AddressInput, { AddressSelectedPayload } from "@/components/AddressInput";

interface AddressChangeRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentAddress: string;
  onSuccess: () => void;
}

export default function AddressChangeRequestModal({
  open,
  onOpenChange,
  currentAddress,
  onSuccess,
}: AddressChangeRequestModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [selectedAddressData, setSelectedAddressData] = useState<AddressSelectedPayload | null>(null);

  const handleAddressSelected = (payload: AddressSelectedPayload) => {
    setNewAddress(payload.formatted_address || payload.household_address || "");
    setSelectedAddressData(payload);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddress.trim()) {
      toast({
        title: "Address required",
        description: "Please select a new address.",
        variant: "destructive",
      });
      return;
    }

    if (!reason.trim()) {
      toast({
        title: "Reason required", 
        description: "Please provide a reason for the address change.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Not authenticated");

      const requestData = {
        user_id: auth.user.id,
        current_address: currentAddress,
        current_normalized_address: currentAddress, // We'll let the database normalize this
        requested_address: newAddress,
        requested_formatted_address: selectedAddressData?.formatted_address || newAddress,
        requested_normalized_address: newAddress, // We'll let the database normalize this
        requested_place_id: selectedAddressData?.place_id,
        reason: reason.trim(),
        metadata: {
          address_components: selectedAddressData?.components,
          location: selectedAddressData?.location,
          timestamp: new Date().toISOString(),
        },
      };

      const { error } = await supabase
        .from("address_change_requests")
        .insert(requestData);

      if (error) throw error;

      toast({
        title: "Request submitted",
        description: "Your address change request has been submitted for admin review.",
      });
      
      onSuccess();
      onOpenChange(false);
      setReason("");
      setNewAddress("");
      setSelectedAddressData(null);
    } catch (error: any) {
      console.error("Error submitting address change request:", error);
      toast({
        title: "Failed to submit request",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setReason("");
    setNewAddress("");
    setSelectedAddressData(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request Address Change</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Current Address</Label>
            <div className="p-3 bg-muted rounded-md text-sm">
              {currentAddress}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="new-address">New Address *</Label>
            <AddressInput
              id="new-address"
              placeholder="Start typing your new address..."
              onSelected={handleAddressSelected}
              country={["us"]}
              className="address-input-modal"
            />
            {newAddress && (
              <div className="text-sm text-muted-foreground">
                Selected: {newAddress}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Change *</Label>
            <Textarea
              id="reason"
              placeholder="Please explain why you need to change your address..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 space-y-2 space-y-reverse sm:space-y-0">
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Submitting..." : "Submit Request"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}