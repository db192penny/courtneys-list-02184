import { Loader } from "@googlemaps/js-api-loader";
import { supabase } from "@/integrations/supabase/client";

/**
 * Google Maps JS API loader with runtime key fetch via Edge Function.
 * - Loads once (memoized) and reuses the same loader
 * - Libraries default to ["places"]
 */
let loader: Loader | null = null;
let cachedKey: string | null = null;
let loadPromise: Promise<typeof google> | null = null;

async function fetchGoogleKey(): Promise<string> {
  if (cachedKey) return cachedKey;

  const attempt = async () => {
    console.log("[mapsLoader] Attempting to fetch Google Maps key...");
    const { data, error } = await supabase.functions.invoke("get-public-config");
    console.log("[mapsLoader] Response:", { data, error });
    if (error) {
      throw new Error(error.message || "Failed to load Google Maps key");
    }
    const key = (data as any)?.googleMapsKey || "";
    if (!key) {
      throw new Error("Google Maps API key is missing");
    }
    console.log("[mapsLoader] Successfully fetched API key");
    return key;
  };

  try {
    const key = await attempt();
    cachedKey = key;
    return key;
  } catch (e) {
    console.warn("[mapsLoader] First attempt to fetch key failed, retrying once...", e);
    await new Promise((r) => setTimeout(r, 500));
    const key = await attempt();
    cachedKey = key;
    return key;
  }
}

export async function loadGoogleMaps(libraries: ("places" | "geometry" | "marker")[] = ["places"]) {
  if (typeof window === "undefined") {
    throw new Error("Google Maps can only be loaded in the browser");
  }

  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    console.log("[mapsLoader] Loading Google Maps...");
    const apiKey = await fetchGoogleKey();
    if (!loader) {
      console.log("[mapsLoader] Creating new Google Maps loader with key:", apiKey ? "present" : "missing");
      loader = new Loader({ apiKey, version: "weekly", libraries });
    }
    try {
      console.log("[mapsLoader] Loading Google Maps API...");
      const g = await loader.load();
      console.log("[mapsLoader] Google Maps API loaded successfully");
      return g;
    } catch (e) {
      console.error("[mapsLoader] Loader failed:", e);
      // Reset promise so future attempts can retry
      loadPromise = null;
      throw e;
    }
  })();

  return loadPromise;
}
