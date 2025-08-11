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
    const { data, error } = await supabase.functions.invoke("get-public-config");
    if (error) {
      throw new Error(error.message || "Failed to load Google Maps key");
    }
    const key = (data as any)?.googleMapsKey || "";
    if (!key) {
      throw new Error("Google Maps API key is missing");
    }
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
    const apiKey = await fetchGoogleKey();
    if (!loader) {
      loader = new Loader({ apiKey, version: "weekly", libraries });
    }
    try {
      const g = await loader.load();
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
