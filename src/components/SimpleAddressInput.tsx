import React, { useEffect, useRef, useState, useCallback } from "react";
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

// Direct Google Maps API key - replace with your actual key
const GOOGLE_MAPS_API_KEY = "AIzaSyBzF8v6i2SrE0QHQlBfJ_H7QrCtL7wU-Ns"; // This should be moved to environment variables

export default function SimpleAddressInput({
  id,
  className,
  placeholder = "Start typing your address...",
  defaultValue,
  country = ["us"],
  onSelected,
}: AddressInputProps) {
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<any>(null);
  const [helper, setHelper] = useState<string>("");
  const [scriptsLoaded, setScriptsLoaded] = useState(false);

  // Load Google Maps JavaScript API
  const loadGoogleMapsScript = useCallback(() => {
    return new Promise<void>((resolve, reject) => {
      // Check if already loaded
      if (window.google && window.google.maps && window.google.maps.places) {
        setScriptsLoaded(true);
        resolve();
        return;
      }

      // Check if script is already being loaded
      if (document.querySelector('script[src*="maps.googleapis.com"]')) {
        // Wait for it to load
        const checkLoaded = setInterval(() => {
          if (window.google && window.google.maps && window.google.maps.places) {
            clearInterval(checkLoaded);
            setScriptsLoaded(true);
            resolve();
          }
        }, 100);
        return;
      }

      // Create and load the script
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&callback=initGoogleMaps`;
      script.async = true;
      script.defer = true;
      
      // Set up global callback
      (window as any).initGoogleMaps = () => {
        setScriptsLoaded(true);
        resolve();
      };
      
      script.onerror = () => {
        reject(new Error('Failed to load Google Maps API'));
      };
      
      document.head.appendChild(script);
    });
  }, []);

  const initAutocomplete = useCallback(async () => {
    if (!scriptsLoaded || !containerRef.current) return;

    try {
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
      if (!autocompleteRef.current && inputRef.current && window.google && window.google.maps && window.google.maps.places) {
        const opts = {
          componentRestrictions: country && country.length ? { country } : undefined,
          types: ["address"],
        } as any;
        
        const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, opts);
        autocompleteRef.current = autocomplete;

        autocomplete.addListener("place_changed", () => {
          try {
            const place = autocomplete.getPlace();
            if (!place.place_id) return;

            const comps = place.address_components || [];
            const formatted = place.formatted_address || "";
            const { oneLine, parts } = toOneLineFromFlexible(comps);
            const normalized = normalizeLowerTrim(oneLine || formatted);

            const loc = place.geometry?.location;
            let lat: number | null = null;
            let lng: number | null = null;
            if (loc) {
              lat = typeof loc.lat === "function" ? loc.lat() : (loc.lat as unknown as number);
              lng = typeof loc.lng === "function" ? loc.lng() : (loc.lng as unknown as number);
            }

            const payload: AddressSelectedPayload = {
              household_address: normalized,
              formatted_address: formatted || oneLine,
              place_id: place.place_id,
              components: { parts, raw: comps },
              location: { lat, lng },
            };

            setHelper("");
            onSelected?.(payload);

            // Keep the selected value visible in the field
            if (inputRef.current) {
              inputRef.current.value = payload.formatted_address || payload.household_address;
            }
          } catch (err) {
            console.error("[SimpleAddressInput] place_changed handler failed:", err);
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
      console.error("[SimpleAddressInput] Autocomplete init failed:", e);
      setHelper("Address suggestions are unavailable right now.");
    }
  }, [scriptsLoaded, placeholder, defaultValue, country, onSelected, toast]);

  useEffect(() => {
    loadGoogleMapsScript()
      .then(() => {
        initAutocomplete();
      })
      .catch((e) => {
        console.error("[SimpleAddressInput] init failed:", e);
        setHelper("Address suggestions are unavailable right now.");
      });
  }, [loadGoogleMapsScript, initAutocomplete]);

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

  return (
    <div className="w-full">
      <div id={id} ref={containerRef} className={cn("w-full", className)} />
      {helper && (
        <p className="mt-1 text-sm text-muted-foreground">{helper}</p>
      )}
    </div>
  );
}
