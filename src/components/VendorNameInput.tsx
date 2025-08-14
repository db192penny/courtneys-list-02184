import React, { useState, useRef, useEffect, useCallback } from "react";
import { loadGoogleMaps } from "@/utils/mapsLoader";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";

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

interface PlacePrediction {
  description: string;
  place_id: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

export default function VendorNameInput({
  id,
  className,
  placeholder = "Start typing business name...",
  defaultValue,
  onSelected,
  onManualInput,
}: VendorNameInputProps) {
  const { toast } = useToast();
  const [inputValue, setInputValue] = useState(defaultValue || "");
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [helper, setHelper] = useState("");
  const [loading, setLoading] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);
  
  // Initialize Google Places services
  useEffect(() => {
    const initServices = async () => {
      try {
        const google = await loadGoogleMaps(["places"]);
        autocompleteService.current = new google.maps.places.AutocompleteService();
        
        // Create a dummy div for PlacesService (required by API)
        const dummyDiv = document.createElement('div');
        placesService.current = new google.maps.places.PlacesService(dummyDiv);
      } catch (error) {
        console.error("Failed to initialize Google Places services:", error);
        setHelper("Business suggestions are unavailable right now.");
      }
    };
    
    initServices();
  }, []);

  // Handle input changes and fetch predictions
  const handleInputChange = useCallback(async (value: string) => {
    setInputValue(value);
    onManualInput?.(value);
    setSelectedIndex(-1);
    
    if (!value.trim() || !autocompleteService.current) {
      setPredictions([]);
      setShowDropdown(false);
      return;
    }

    try {
      setLoading(true);
      autocompleteService.current.getPlacePredictions({
        input: value,
        types: ['establishment'],
      }, (predictions, status) => {
        setLoading(false);
        if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
          setPredictions(predictions);
          setShowDropdown(true);
        } else {
          setPredictions([]);
          setShowDropdown(false);
        }
      });
    } catch (error) {
      console.error("Error fetching predictions:", error);
      setLoading(false);
      setPredictions([]);
      setShowDropdown(false);
    }
  }, [onManualInput]);

  // Get place details when a prediction is selected
  const selectPrediction = useCallback(async (prediction: PlacePrediction) => {
    console.log("🎯 Selecting prediction:", prediction);
    if (!placesService.current) return;
    
    setLoading(true);
    setShowDropdown(false);
    setInputValue(prediction.description);
    
    placesService.current.getDetails({
      placeId: prediction.place_id,
      fields: ['name', 'place_id', 'formatted_phone_number', 'formatted_address', 'rating', 'user_ratings_total']
    }, (place, status) => {
      setLoading(false);
      
      if (status === google.maps.places.PlacesServiceStatus.OK && place) {
        const payload: VendorSelectedPayload = {
          name: place.name || prediction.structured_formatting.main_text,
          place_id: place.place_id!,
          phone: place.formatted_phone_number,
          formatted_address: place.formatted_address,
          rating: place.rating,
          user_ratings_total: place.user_ratings_total,
        };
        
        setHelper(`Selected: ${payload.name}`);
        onSelected?.(payload);
        setInputValue(payload.name);
      } else {
        toast({
          title: "Failed to get business details",
          description: "Please try selecting a different business.",
          variant: "destructive",
        });
        setHelper("Failed to get business details.");
      }
    });
  }, [onSelected, toast]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showDropdown || predictions.length === 0) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < predictions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          selectPrediction(predictions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        setSelectedIndex(-1);
        break;
    }
  }, [showDropdown, predictions, selectedIndex, selectPrediction]);

  // Handle clicking outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current && 
        !inputRef.current.contains(event.target as Node) &&
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  return (
    <div className="w-full relative">
      <Input
        ref={inputRef}
        id={id}
        className={className}
        placeholder={placeholder}
        value={inputValue}
        onChange={(e) => handleInputChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (predictions.length > 0) {
            setShowDropdown(true);
          }
        }}
      />
      
      {helper && (
        <p className="mt-1 text-sm text-muted-foreground">{helper}</p>
      )}
      
      {loading && (
        <p className="mt-1 text-sm text-muted-foreground">Searching...</p>
      )}

      {/* Dropdown rendered directly in component tree */}
      {showDropdown && predictions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 z-50 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-y-auto mt-1"
          onMouseDown={(e) => {
            console.log("🖱️ Dropdown mousedown");
            e.stopPropagation();
          }}
          onClick={(e) => {
            console.log("🖱️ Dropdown click");
            e.stopPropagation();
          }}
        >
          {predictions.map((prediction, index) => (
            <div
              key={prediction.place_id}
              className={cn(
                "px-3 py-2 cursor-pointer border-b border-border last:border-b-0",
                "hover:bg-accent hover:text-accent-foreground",
                selectedIndex === index && "bg-accent text-accent-foreground"
              )}
              onClick={(e) => {
                console.log("🖱️ Prediction clicked:", prediction);
                e.stopPropagation();
                e.preventDefault();
                selectPrediction(prediction);
              }}
              onMouseDown={(e) => {
                console.log("🖱️ Prediction mousedown:", prediction);
                e.stopPropagation();
                e.preventDefault();
              }}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className="font-medium">
                {prediction.structured_formatting.main_text}
              </div>
              <div className="text-sm text-muted-foreground">
                {prediction.structured_formatting.secondary_text}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}