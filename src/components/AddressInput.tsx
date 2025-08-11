
import React, { useEffect, useRef, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { loadGoogleMaps } from "@/utils/mapsLoader";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type CountryCodes = string[];

export type AddressSelectedPayload = {
  household_address: string; // normalized lower+trim
  formatted_address: string;
  place_id: string;
  components: Record<string, any>;
  location: { lat: number | null; lng: number | null };
};

type AddressInputProps = {
  id?: string;
  className?: string;
  placeholder?: string;
  defaultValue?: string;
  country?: CountryCodes; // default ['us']
  onSelected?: (payload: AddressSelectedPayload) => void;
};

function toOneLineFromComponents(components: google.maps.GeocoderAddressComponent[]) {
  const get = (type: string) =>
    components.find((c) => c.types.includes(type))?.long_name || "";

  const streetNumber = get("street_number");
  const route = get("route");
  const city = get("locality") || get("sublocality") || get("postal_town");
  const state = get("administrative_area_level_1");
  const postalCode = get("postal_code");

  // "{streetNumber} {route}, {city}, {state}, {postalCode}"
  const left = [streetNumber, route].filter(Boolean).join(" ").trim();
  const right = [city, state, postalCode].filter(Boolean).join(", ").trim();
  const oneLine = [left, right].filter(Boolean).join(", ").replace(/\s+,/g, ",").replace(/,\s+/g, ", ");
  return { oneLine, parts: { streetNumber, route, city, state, postalCode } };
}

function normalizeLowerTrim(input: string) {
  return (input || "").trim().toLowerCase();
}

export default function AddressInput({
  id,
  className,
  placeholder = "Start typing your address...",
  defaultValue,
  country = ["us"],
  onSelected,
}: AddressInputProps) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const lastPlaceIdRef = useRef<string | null>(null);
  const [localValue, setLocalValue] = useState<string>(defaultValue || "");
  const [helper, setHelper] = useState<string>("");

  const initAutocomplete = useCallback(async () => {
    const google = await loadGoogleMaps(["places"]);
    if (!inputRef.current) return;

    const options: google.maps.places.AutocompleteOptions = {
      types: ["address"],
      componentRestrictions: { country },
      fields: ["address_components", "formatted_address", "geometry", "place_id"],
    };

    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, options);
    autocompleteRef.current = autocomplete;

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      lastPlaceIdRef.current = place.place_id || null;

      const comps = place.address_components || [];
      const { oneLine, parts } = toOneLineFromComponents(comps);

      const formatted = place.formatted_address || oneLine;
      const normalized = normalizeLowerTrim(oneLine);

      const lat = place.geometry?.location ? place.geometry.location.lat() : null;
      const lng = place.geometry?.location ? place.geometry.location.lng() : null;

      const payload: AddressSelectedPayload = {
        household_address: normalized,
        formatted_address: formatted,
        place_id: place.place_id || "",
        components: {
          parts,
          raw: comps,
        },
        location: { lat, lng },
      };

      // Update visible input with Google's formatted address for better UX
      setLocalValue(formatted);
      setHelper("");

      if (onSelected) {
        onSelected(payload);
      }
    });
  }, [country, onSelected]);

  useEffect(() => {
    initAutocomplete().catch((e) => {
      console.error("[AddressInput] Autocomplete init failed:", e);
      setHelper("Address suggestions are unavailable right now.");
    });
    // We only want to initialize once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (!lastPlaceIdRef.current) {
        e.preventDefault();
        e.stopPropagation();

        const input = localValue.trim();
        if (!input) {
          setHelper("Please pick an address from the list.");
          toast({
            title: "Select from suggestions",
            description: "Please pick an address from the list.",
            variant: "destructive",
          });
          return;
        }

        try {
          const google = await loadGoogleMaps(["places"]);
          const acService = new google.maps.places.AutocompleteService();

          const predictions = await new Promise<google.maps.places.AutocompletePrediction[]>((resolve, reject) => {
            const req: google.maps.places.AutocompletionRequest = {
              input,
              componentRestrictions: { country },
            };
            acService.getPlacePredictions(
              req,
              (
                res: google.maps.places.AutocompletePrediction[] | null,
                status: google.maps.places.PlacesServiceStatus
              ) => {
                if (
                  status !== google.maps.places.PlacesServiceStatus.OK &&
                  status !== google.maps.places.PlacesServiceStatus.ZERO_RESULTS
                ) {
                  reject(new Error(`Autocomplete status: ${status}`));
                  return;
                }
                resolve(res || []);
              }
            );
          });

          if (!predictions.length) {
            setHelper("Please pick an address from the list.");
            toast({
              title: "Select from suggestions",
              description: "Please pick an address from the list.",
              variant: "destructive",
            });
            return;
          }

          const top = predictions[0];
          const placeId = top.place_id;

          const placeDetails = await new Promise<google.maps.places.PlaceResult | null>((resolve) => {
            const ps = new google.maps.places.PlacesService(document.createElement("div"));
            ps.getDetails(
              {
                placeId,
                fields: ["address_components", "formatted_address", "geometry", "place_id"],
              },
              (res, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK && res) resolve(res);
                else resolve(null);
              }
            );
          });

          if (!placeDetails) {
            setHelper("Please pick an address from the list.");
            toast({
              title: "Select from suggestions",
              description: "Please pick an address from the list.",
              variant: "destructive",
            });
            return;
          }

          const comps = placeDetails.address_components || [];
          const { oneLine, parts } = toOneLineFromComponents(comps);
          const formatted = placeDetails.formatted_address || oneLine;
          const normalized = normalizeLowerTrim(oneLine);
          const lat = placeDetails.geometry?.location ? placeDetails.geometry.location.lat() : null;
          const lng = placeDetails.geometry?.location ? placeDetails.geometry.location.lng() : null;

          const payload: AddressSelectedPayload = {
            household_address: normalized,
            formatted_address: formatted,
            place_id: placeDetails.place_id || placeId,
            components: {
              parts,
              raw: comps,
            },
            location: { lat, lng },
          };

          setLocalValue(formatted);
          lastPlaceIdRef.current = payload.place_id;
          setHelper("");

          onSelected?.(payload);
        } catch (err) {
          console.error("[AddressInput] Enter fallback failed:", err);
          setHelper("Please pick an address from the list.");
          toast({
            title: "Select from suggestions",
            description: "Please pick an address from the list.",
            variant: "destructive",
          });
        }
      }
    }
  };

  return (
    <div className="w-full">
      <Input
        id={id}
        ref={inputRef}
        value={localValue}
        onChange={(e) => {
          setLocalValue(e.currentTarget.value);
          lastPlaceIdRef.current = null; // reset until a place is chosen
          if (helper) setHelper("");
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn("w-full", className)}
        inputMode="search"
        autoComplete="street-address"
      />
      {helper && (
        <p className="mt-1 text-sm text-muted-foreground">{helper}</p>
      )}
    </div>
  );
}
