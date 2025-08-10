
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { Database } from "https://esm.sh/v135/@supabase/supabase-js@2/dist/module/lib/schema";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type AddressPayload = {
  household_address: string;
  formatted_address: string;
  place_id: string;
  components?: Record<string, any>;
  location?: { lat: number | null; lng: number | null };
};

function normalizeLowerTrim(s: string) {
  return (s || "").trim().toLowerCase();
}

// Approximate the SQL normalize_address() to get the street-only form for street_name.
function normalizeToStreetName(s: string) {
  const lowerTrim = (s || "").toLowerCase().trim();
  // remove trailing apt/unit annotations
  const withoutApt = lowerTrim.replace(/\s*(#|\bapt\b|\bapartment\b|\bunit\b)\s*\w+\s*$/i, "");
  // remove leading house number and optional hyphen
  const withoutHouseNo = withoutApt.replace(/^\s*\d+[\s-]*/, "");
  // collapse spaces
  return withoutHouseNo.replace(/\s+/g, " ").trim();
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient<Database>(supabaseUrl, supabaseAnon, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userRes?.user) {
      console.error("[household-address] auth error:", userErr);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = userRes.user;

    const payload: AddressPayload = await req.json();
    if (!payload || !payload.place_id) {
      return new Response(JSON.stringify({ error: "Missing place_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedOneLine = normalizeLowerTrim(payload.household_address || payload.formatted_address || "");
    const streetName = normalizeToStreetName(payload.household_address || payload.formatted_address || "");

    console.log("[household-address] updating user:", user.id, {
      address: normalizedOneLine,
      street_name: streetName,
      formatted_address: payload.formatted_address,
      google_place_id: payload.place_id,
    });

    const { error: upErr } = await supabase
      .from("users")
      .update({
        address: normalizedOneLine,
        street_name: streetName,
        formatted_address: payload.formatted_address || null,
        google_place_id: payload.place_id || null,
      })
      .eq("id", user.id);

    if (upErr) {
      console.error("[household-address] update error:", upErr);
      return new Response(JSON.stringify({ error: upErr.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[household-address] unhandled error:", e);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
