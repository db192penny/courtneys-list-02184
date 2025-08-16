
import React, { useEffect, useRef, useState, useCallback } from "react";
import { loadGoogleMaps } from "@/utils/mapsLoader";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export type AddressSelectedPayload = {
  household_address: string; // normalized lower+trim
  formatted_address: string;
  place_id: string;
  components: Record<string, any>;
  location: { lat: number | null; lng: number | null };
};

type CountryCodes = string[];

type AddressInputProps = {
  id?: string;
  className?: string;
  placeholder?: string;
  defaultValue?: string;
  country?: CountryCodes; // default ['us']
  onSelected?: (payload: AddressSelectedPayload) => void;
};

function normalizeLowerTrim(input: string) {
  return (input || "").trim().toLowerCase();
}

function toOneLineFromFlexible(components: any[]) {
  const get = (type: string) => {
    const c = components?.find((c: any) => Array.isArray(c.types) && c.types.includes(type));
    if (!c) return "";
    return (
      c.longText || c.long_name || c.shortText || c.short_name || c.text || ""
    );
  };

  const streetNumber = get("street_number");
  const route = get("route");
  const city = get("locality") || get("sublocality") || get("postal_town");
  const state = get("administrative_area_level_1");
  const postalCode = get("postal_code");

  const left = [streetNumber, route].filter(Boolean).join(" ").trim();
  const right = [city, state, postalCode].filter(Boolean).join(", ").trim();
  const oneLine = [left, right]
    .filter(Boolean)
    .join(", ")
    .replace(/\s+,/g, ",")
    .replace(/,\s+/g, ", ");

  return { oneLine, parts: { streetNumber, route, city, state, postalCode } };
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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const elementRef = useRef<any>(null);
  const [helper, setHelper] = useState<string>("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<any>(null);
  const onSelectedRef = useRef<AddressInputProps["onSelected"]>();
  onSelectedRef.current = onSelected;

  const initAutocomplete = useCallback(async () => {
    try {
      console.log("[AddressInput] Starting initAutocomplete");
      const google = await loadGoogleMaps(["places"]);
      console.log("[AddressInput] Google Maps loaded successfully", google);
      if (!containerRef.current) {
        console.log("[AddressInput] Container ref not available");
        return;
      }

      // Create input once
      if (!inputRef.current) {
        const input = document.createElement("input");
        input.type = "text";
        input.placeholder = placeholder;
        input.className = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
        if (defaultValue) input.value = defaultValue;
        containerRef.current.innerHTML = "";
        containerRef.current.appendChild(input);
        inputRef.current = input;
      }

      // Create autocomplete once
      if (!autocompleteRef.current && inputRef.current) {
        const opts = {
          componentRestrictions: country && country.length ? { country } : undefined,
          types: ["address"],
        } as any;
        const autocomplete = new google.maps.places.Autocomplete(inputRef.current, opts);
        autocompleteRef.current = autocomplete;
        elementRef.current = autocomplete;

        autocomplete.addListener("place_changed", () => {
          try {
            const place = autocomplete.getPlace();
            console.log("[AddressInput] place selected:", place);
            
            if (!place || !place.geometry || !place.place_id) {
              console.warn("[AddressInput] Invalid place selection - missing required data");
              setHelper("Please select a valid address from the suggestions.");
              return;
            }

            // Validate the formatted address
            const formattedAddress = place.formatted_address || '';
            if (!formattedAddress || formattedAddress.trim().length === 0) {
              console.warn("[AddressInput] Empty formatted address");
              setHelper("Please select a valid address from the suggestions.");
              return;
            }

            // Check for obviously invalid addresses
            const normalized = formattedAddress.toLowerCase().trim();
            const invalidPatterns = [
              'address not provided',
              'no address',
              'unknown',
              'pending',
              'not specified',
              'n/a'
            ];
            
            if (invalidPatterns.some(pattern => normalized.includes(pattern))) {
              console.warn("[AddressInput] Invalid address pattern detected:", formattedAddress);
              setHelper("Please select a valid street address from the suggestions.");
              return;
            }

            const comps = place.address_components || [];
            const formatted = place.formatted_address || "";
            const { oneLine, parts } = toOneLineFromFlexible(comps);
            const normalizedAddress = normalizeLowerTrim(oneLine || formatted);

            const loc = place.geometry?.location;
            let lat: number | null = null;
            let lng: number | null = null;
            if (loc) {
              lat = typeof loc.lat === "function" ? loc.lat() : (loc.lat as unknown as number);
              lng = typeof loc.lng === "function" ? loc.lng() : (loc.lng as unknown as number);
            }

            const payload: AddressSelectedPayload = {
              household_address: normalizedAddress,
              formatted_address: formatted || oneLine,
              place_id: place.place_id,
              components: { parts, raw: comps },
              location: { lat, lng },
            };

            setHelper("");
            onSelectedRef.current?.(payload);

            // Keep the selected value visible in the field
            if (inputRef.current) {
              inputRef.current.value = payload.formatted_address || payload.household_address;
            }
          } catch (err) {
            console.error("[AddressInput] place_changed handler failed:", err);
            setHelper("Address selection failed. Please try again.");
            toast({
              title: "Address selection failed",
              description: "Please try again or type a different address.",
              variant: "destructive",
            });
          }
        });
      }
    } catch (e) {
      console.error("[AddressInput] Autocomplete init failed:", e);
      setHelper("Address suggestions are unavailable right now. Please try refreshing the page.");
    }
  }, [placeholder, defaultValue, country]);

  useEffect(() => {
    initAutocomplete().catch((e) => {
      console.error("[AddressInput] init failed:", e);
      setHelper("Address suggestions are unavailable right now.");
    });
  }, []);

  // Keep latest onSelected in a ref to avoid re-initializing Autocomplete
  useEffect(() => {
    onSelectedRef.current = onSelected;
  }, [onSelected]);

  // Update placeholder dynamically
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.placeholder = placeholder;
    }
  }, [placeholder]);

  // Update input value if defaultValue changes
  useEffect(() => {
    if (inputRef.current && defaultValue) {
      inputRef.current.value = defaultValue;
    }
  }, [defaultValue]);

  // Update country restriction without re-creating Autocomplete
  useEffect(() => {
    if (autocompleteRef.current) {
      try {
        autocompleteRef.current.setOptions({
          componentRestrictions: country && country.length ? { country } : undefined,
        });
      } catch (e) {
        console.warn("[AddressInput] failed to update country restrictions", e);
      }
    }
  }, [country]);
  return (
    <div className="w-full">
      <div id={id} ref={containerRef} className={cn("w-full", className)} />
      {helper && (
        <p className="mt-1 text-sm text-muted-foreground">{helper}</p>
      )}
    </div>
  );
}
