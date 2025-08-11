
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

  const initAutocomplete = useCallback(async () => {
    const google = await loadGoogleMaps(["places"]);
    if (!containerRef.current) return;

    try {
      // Create input element
      const input = document.createElement("input");
      input.type = "text";
      input.placeholder = placeholder;
      input.className = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
      if (defaultValue) input.value = defaultValue;

      // Mount input
      containerRef.current.innerHTML = "";
      containerRef.current.appendChild(input);

      // Create autocomplete
      const autocomplete = new google.maps.places.Autocomplete(input, {
        componentRestrictions: country && country.length ? { country } : undefined,
        types: ["address"],
      });

      elementRef.current = autocomplete;

      // Handle place selection
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
    } catch (e) {
      console.error("[AddressInput] Autocomplete init failed:", e);
      setHelper("Address suggestions are unavailable right now.");
    }
  }, [country, defaultValue, onSelected, placeholder, toast]);

  useEffect(() => {
    initAutocomplete().catch((e) => {
      console.error("[AddressInput] init failed:", e);
      setHelper("Address suggestions are unavailable right now.");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-full">
      <div id={id} ref={containerRef} className={cn("w-full", className)} />
      {helper && (
        <p className="mt-1 text-sm text-muted-foreground">{helper}</p>
      )}
    </div>
  );
}
