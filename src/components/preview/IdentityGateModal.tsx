import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { loadGoogleMaps } from "@/utils/mapsLoader";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  community: string;
  onSuccess: (sessionData: {
    name: string;
    address: string;
    formatted_address?: string;
    google_place_id?: string;
    street_name?: string;
    community: string;
    source?: string;
  }) => void;
}

export default function IdentityGateModal({ open, onOpenChange, community, onSuccess }: Props) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedPlace, setSelectedPlace] = useState<google.maps.places.PlaceResult | null>(null);

  useEffect(() => {
    if (!open || !inputRef.current) return;

    const initAutocomplete = async () => {
      try {
        await loadGoogleMaps(["places"]);
        
        if (!inputRef.current) return;

        autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
          types: ["address"],
          componentRestrictions: { country: "us" },
          fields: ["formatted_address", "address_components", "place_id"],
        });

        autocompleteRef.current.addListener("place_changed", () => {
          const place = autocompleteRef.current?.getPlace();
          if (place?.formatted_address) {
            setAddress(place.formatted_address);
            setSelectedPlace(place);
          }
        });
      } catch (error) {
        console.warn("Failed to load Google Maps:", error);
      }
    };

    initAutocomplete();

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [open]);

  const extractStreetName = (place: google.maps.places.PlaceResult | null) => {
    if (!place?.address_components) return "";
    
    const streetNumber = place.address_components.find(
      component => component.types.includes("street_number")
    )?.long_name || "";
    
    const streetName = place.address_components.find(
      component => component.types.includes("route")
    )?.long_name || "";
    
    return streetName ? `${streetNumber} ${streetName}`.trim() : "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !address.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide both your name and address.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      const streetName = extractStreetName(selectedPlace);
      const urlParams = new URLSearchParams(window.location.search);
      const source = urlParams.get("src") || "direct";
      
      await onSuccess({
        name: name.trim(),
        address: address.trim(),
        formatted_address: selectedPlace?.formatted_address,
        google_place_id: selectedPlace?.place_id,
        street_name: streetName,
        community,
        source,
      });
      
      toast({
        title: "Welcome!",
        description: "You can now rate vendors and share costs.",
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to create session:", error);
      toast({
        title: "Error",
        description: "Failed to save your information. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Your Experience</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            To rate vendors and share costs, we need a few quick details. This helps us show relevant 
            information to your neighbors.
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">First Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your first name"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                ref={inputRef}
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Start typing your address..."
                required
              />
              <p className="text-xs text-muted-foreground">
                We use this to show you relevant neighborhood information
              </p>
            </div>
            
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? "Saving..." : "Continue"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}