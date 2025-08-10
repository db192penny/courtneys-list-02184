
import { Loader } from "@googlemaps/js-api-loader";

/**
 * Small reusable loader for Google Maps JS API.
 * - Reads API key from process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY
 * - Loads with "places" library by default
 * - Returns the global google object once loaded
 */
let loader: Loader | null = null;

export async function loadGoogleMaps(libraries: ("places" | "geometry" | "marker")[] = ["places"]) {
  // IMPORTANT: key is not hardcoded; read from process.env as requested.
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  if (!apiKey) {
    console.error("[mapsLoader] NEXT_PUBLIC_GOOGLE_MAPS_KEY is not set.");
    throw new Error("Google Maps API key is missing");
  }

  if (!loader) {
    loader = new Loader({
      apiKey,
      version: "weekly",
      libraries,
    });
  }
  // If loader was constructed with different libraries, it will still load those; this is fine for now.
  return loader.load();
}
