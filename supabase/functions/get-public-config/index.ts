// Supabase Edge Function: get-public-config
// Returns public configuration values such as the Google Maps API key
// CORS: strict allowlist, caching headers included

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders: HeadersInit = {
  "Access-Control-Allow-Origin": "*", // Will validate Origin manually below
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Strict allowlist for origins
const ALLOWLIST = new Set<string>([
  "http://localhost:3000",
  "http://localhost",
]);

function isLovableDomain(origin: string) {
  try {
    const u = new URL(origin);
    return u.hostname.endsWith(".lovable.dev");
  } catch {
    return false;
  }
}

serve(async (req) => {
  const origin = req.headers.get("Origin") || "";
  const isAllowed = ALLOWLIST.has(origin) || isLovableDomain(origin);

  // Preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        ...corsHeaders,
        "Access-Control-Allow-Origin": isAllowed ? origin : "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Vary": "Origin",
      },
    });
  }

  if (!isAllowed) {
    return new Response(JSON.stringify({ error: "Origin not allowed" }), {
      status: 403,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Vary": "Origin",
      },
    });
  }

  try {
    const googleMapsKey = Deno.env.get("GOOGLE_MAPS_KEY") || "";

    return new Response(
      JSON.stringify({ googleMapsKey }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Access-Control-Allow-Origin": origin,
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=86400, s-maxage=86400",
          "Vary": "Origin",
        },
      }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Access-Control-Allow-Origin": origin,
        "Content-Type": "application/json",
        "Vary": "Origin",
      },
    });
  }
});
