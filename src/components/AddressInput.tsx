
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
      // Create and mount the new Place Autocomplete Element
      // @ts-ignore - Using new element not yet fully in @types
      const el = new (google.maps as any).places.PlaceAutocompleteElement();
      elementRef.current = el;

      // Basic configuration
      el.style.width = "100%";
      // Component restrictions if supported
      try {
        if (country && country.length) el.componentRestrictions = { country };
      } catch (e) {
        console.warn("[AddressInput] componentRestrictions not supported on element", e);
      }

      // Placeholder and default value
      try {
        el.placeholder = placeholder;
      } catch {}
      if (defaultValue) {
        try {
          el.value = defaultValue;
        } catch {}
      }

      // Mount element
      containerRef.current.innerHTML = "";
      containerRef.current.appendChild(el);

      // Selection handler using the new gmp-select event
      el.addEventListener("gmp-select", async (evt: any) => {
        try {
          const placePrediction = evt?.placePrediction;
          if (!placePrediction) return;

          const place = placePrediction.toPlace();
          await place.fetchFields({
            fields: [
              "id",
              "displayName",
              "formattedAddress",
              "location",
              "addressComponents",
            ],
          });

          const comps = (place as any).addressComponents || (place as any).address_components || [];
          const formatted: string = (place as any).formattedAddress || (place as any).displayName || "";
          const { oneLine, parts } = toOneLineFromFlexible(comps);
          const normalized = normalizeLowerTrim(oneLine || formatted);

          // location may be LatLng or LatLngLiteral depending on API
          const loc: any = (place as any).location || null;
          const lat = loc && typeof loc.lat === "function" ? loc.lat() : loc?.lat ?? null;
          const lng = loc && typeof loc.lng === "function" ? loc.lng() : loc?.lng ?? null;

          const payload: AddressSelectedPayload = {
            household_address: normalized,
            formatted_address: formatted || oneLine,
            place_id: (place as any).id || "",
            components: { parts, raw: comps },
            location: { lat, lng },
          };

          setHelper("");
          onSelected?.(payload);
        } catch (err) {
          console.error("[AddressInput] gmp-select handler failed:", err);
          setHelper("Address selection failed. Please try again.");
          toast({
            title: "Address selection failed",
            description: "Please try again or type a different address.",
            variant: "destructive",
          });
        }
      });
    } catch (e) {
      console.error("[AddressInput] PlaceAutocompleteElement init failed:", e);
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
