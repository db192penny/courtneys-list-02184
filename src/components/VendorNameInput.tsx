import React, { useEffect, useRef, useState, useCallback } from "react";
import { loadGoogleMaps } from "@/utils/mapsLoader";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export type VendorSelectedPayload = {
  name: string;
  place_id: string;
  phone?: string;
  formatted_address?: string;
  rating?: number;
  user_ratings_total?: number;
};

type VendorNameInputProps = {
  id?: string;
  className?: string;
  placeholder?: string;
  defaultValue?: string;
  onSelected?: (payload: VendorSelectedPayload) => void;
  onManualInput?: (name: string) => void;
};

export default function VendorNameInput({
  id,
  className,
  placeholder = "Start typing business name...",
  defaultValue,
  onSelected,
  onManualInput,
}: VendorNameInputProps) {
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [helper, setHelper] = useState<string>("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<any>(null);
  const onSelectedRef = useRef<VendorNameInputProps["onSelected"]>();
  const onManualInputRef = useRef<VendorNameInputProps["onManualInput"]>();
  onSelectedRef.current = onSelected;
  onManualInputRef.current = onManualInput;

  const initAutocomplete = useCallback(async () => {
    const google = await loadGoogleMaps(["places"]);
    if (!containerRef.current) return;

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

        // Handle manual input changes
        input.addEventListener('input', (e) => {
          const value = (e.target as HTMLInputElement).value;
          onManualInputRef.current?.(value);
        });
      }

      // Create autocomplete once
      if (!autocompleteRef.current && inputRef.current) {
        const opts = {
          types: ["establishment"],
          fields: ["name", "place_id", "formatted_phone_number", "formatted_address", "rating", "user_ratings_total"]
        } as any;
        const autocomplete = new google.maps.places.Autocomplete(inputRef.current, opts);
        autocompleteRef.current = autocomplete;

        autocomplete.addListener("place_changed", () => {
          try {
            const place = autocomplete.getPlace();
            if (!place.place_id || !place.name) return;

            const payload: VendorSelectedPayload = {
              name: place.name,
              place_id: place.place_id,
              phone: place.formatted_phone_number,
              formatted_address: place.formatted_address,
              rating: place.rating,
              user_ratings_total: place.user_ratings_total,
            };

            setHelper(`Selected: ${place.name}`);
            onSelectedRef.current?.(payload);

            // Keep the selected value visible in the field
            if (inputRef.current) {
              inputRef.current.value = place.name;
            }
          } catch (err) {
            console.error("[VendorNameInput] place_changed handler failed:", err);
            setHelper("Business selection failed. Please try again.");
            toast({
              title: "Business selection failed",
              description: "Please try again or type a different business name.",
              variant: "destructive",
            });
          }
        });
      }
    } catch (e) {
      console.error("[VendorNameInput] Autocomplete init failed:", e);
      setHelper("Business suggestions are unavailable right now.");
    }
  }, []);

  useEffect(() => {
    initAutocomplete().catch((e) => {
      console.error("[VendorNameInput] init failed:", e);
      setHelper("Business suggestions are unavailable right now.");
    });
  }, []);

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
