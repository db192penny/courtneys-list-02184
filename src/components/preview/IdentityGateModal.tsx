import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { loadGoogleMaps } from "@/utils/mapsLoader";
import { capitalizeStreetName, extractStreetName as utilExtractStreetName } from "@/utils/address";

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
  const [mapsLoading, setMapsLoading] = useState(false);
  const [mapsError, setMapsError] = useState<string | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedPlace, setSelectedPlace] = useState<google.maps.places.PlaceResult | null>(null);

  useEffect(() => {
    if (!open || !inputRef.current) return;

    const initAutocomplete = async () => {
      setMapsLoading(true);
      setMapsError(null);
      
      // Add a small delay to ensure modal is fully rendered
      await new Promise(resolve => setTimeout(resolve, 100));
      
      try {
        console.log('Initializing Google Maps for IdentityGateModal...');
        await loadGoogleMaps(["places"]);
        console.log('Google Maps loaded successfully');
        
        if (!inputRef.current) {
          throw new Error('Address input ref is null after modal render');
        }

        autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
          types: ["address"],
          componentRestrictions: { country: "us" },
          fields: ["formatted_address", "address_components", "place_id"],
        });

        autocompleteRef.current.addListener("place_changed", () => {
          const place = autocompleteRef.current?.getPlace();
          console.log('Place selected:', place);
          if (place?.formatted_address) {
            setAddress(place.formatted_address);
            setSelectedPlace(place);
          }
        });
        
        console.log('Autocomplete initialized successfully');
        setMapsLoading(false);
      } catch (error) {
        console.error("Failed to load Google Maps:", error);
        setMapsError(error instanceof Error ? error.message : 'Failed to load address suggestions');
        setMapsLoading(false);
      }
    };

    initAutocomplete();

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [open]);

  const extractStreetFromPlace = (place: google.maps.places.PlaceResult | null) => {
    if (!place?.address_components) return "";
    
    const streetName = place.address_components.find(
      component => component.types.includes("route")
    )?.long_name || "";
    
    return streetName || "";
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
      const streetName = capitalizeStreetName(extractStreetFromPlace(selectedPlace));
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
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <div className="relative">
                <Input
                  ref={inputRef}
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={mapsLoading ? "Loading address suggestions..." : "Start typing your address..."}
                  disabled={mapsLoading}
                  required
                />
                {mapsLoading && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                  </div>
                )}
              </div>
              {mapsError && (
                <p className="text-sm text-destructive mt-1">
                  {mapsError}. You can still enter your address manually.
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                We will not share your address but will help make sure you are a part of the community
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