import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { extractStreetName } from "@/utils/address";
import AddressInput, { AddressSelectedPayload } from "@/components/AddressInput";

interface AccountSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AccountSettingsModal({ open, onOpenChange }: AccountSettingsModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => {
    if (open) {
      loadUserData();
    }
  }, [open]);

  const loadUserData = async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;

    const { data, error } = await supabase
      .from("users")
      .select("name, address")
      .eq("id", auth.user.id)
      .single();

    if (error) {
      console.warn("[AccountSettings] load error:", error);
    } else {
      setName(data?.name ?? "");
      setAddress(data?.address ?? "");
    }
  };

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setLoading(false);
      return;
    }

    const trimmedAddress = address.trim();
    const payload = {
      id: auth.user.id,
      email: auth.user.email ?? "",
      name: name.trim(),
      address: trimmedAddress,
      street_name: extractStreetName(trimmedAddress),
    };

    const { error } = await supabase.from("users").upsert(payload);
    if (error) {
      console.error("[AccountSettings] save error:", error);
      toast({ title: "Could not save", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Saved", description: "Your account settings were updated." });
      onOpenChange(false);
    }
    setLoading(false);
  };

  const handleAddressSelected = async (payload: AddressSelectedPayload) => {
    // Validate the address before sending to backend
    const incomingAddress = payload.household_address || payload.formatted_address || '';
    
    if (!incomingAddress || incomingAddress.trim().length === 0) {
      console.warn("[AccountSettings] Empty address provided to handleAddressSelected");
      toast({
        title: "Invalid address",
        description: "Please select a valid address from the suggestions.",
        variant: "destructive",
      });
      return;
    }

    // Check for obviously invalid addresses
    const normalized = incomingAddress.toLowerCase().trim();
    const invalidPatterns = [
      'address not provided',
      'no address',
      'unknown',
      'pending',
      'not specified',
      'n/a'
    ];
    
    if (invalidPatterns.some(pattern => normalized.includes(pattern))) {
      console.warn("[AccountSettings] Invalid address pattern detected:", incomingAddress);
      toast({
        title: "Invalid address",
        description: "Please enter a valid street address.",
        variant: "destructive",
      });
      return;
    }

    // Require place_id for proper geocoding
    if (!payload.place_id) {
      console.warn("[AccountSettings] No place_id provided");
      toast({
        title: "Invalid address",
        description: "Please select an address from the dropdown suggestions.",
        variant: "destructive",
      });
      return;
    }

    // Don't overwrite a good address with a potentially bad one
    if (address && 
        address !== 'Address Not Provided' && 
        address.trim().length > 10 && // Has some substance
        (!incomingAddress || incomingAddress.length < address.length / 2)) {
      console.warn("[AccountSettings] Refusing to overwrite good address with potentially bad one:", {
        current: address,
        incoming: incomingAddress
      });
      toast({
        title: "Address not updated",
        description: "The selected address appears incomplete. Please try again.",
        variant: "destructive",
      });
      return;
    }

    // POST to backend (Supabase Edge Function)
    const { error } = await supabase.functions.invoke("household-address", {
      body: payload,
    });
    if (error) {
      console.error("[AccountSettings] address save error:", error);
      toast({
        title: "Could not save address",
        description: error.message || "Unknown error",
        variant: "destructive",
      });
      return;
    }
    // Optimistic/local refresh
    setAddress(payload.household_address);
    toast({ title: "Address saved", description: "Your household address was updated." });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Account Settings</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="modal-name">Name</Label>
            <Input 
              id="modal-name" 
              value={name} 
              onChange={(e) => setName(e.currentTarget.value)} 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="modal-address">Full Address</Label>
            <AddressInput
              id="modal-address"
              defaultValue={address}
              onSelected={handleAddressSelected}
              country={["us"]}
              placeholder="Start typing your address..."
            />
          </div>
          <div className="text-sm text-muted-foreground">
            Your address is used for community verification. Only your street name may be shown publicly.
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}