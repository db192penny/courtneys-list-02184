
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { Database } from "https://esm.sh/v135/@supabase/supabase-js@2/dist/module/lib/schema";

// Minimal CORS helper with regex allowlist
const ALLOWLIST = [
  /^http:\/\/localhost(:\d+)?$/i,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/i,
  /^https:\/\/.*\.lovable\.dev$/i,
  /^https:\/\/.*\.lovableproject\.com$/i,
];

function cors(req: Request) {
  const origin = req.headers.get('origin') ?? '';
  const allowed = ALLOWLIST.some(rx => rx.test(origin));
  const base = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  } as const;
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: { ...base, ...(allowed ? { 'Access-Control-Allow-Origin': origin } : {}) },
    });
  }
  return { allowed, origin, headers: { ...(allowed ? { 'Access-Control-Allow-Origin': origin } : {}), ...base } };
}

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
  const pre = cors(req);
  if (pre instanceof Response) return pre;

  if (!pre.allowed) {
    return new Response(JSON.stringify({ error: "Origin not allowed" }), {
      status: 403,
      headers: { ...pre.headers, "Content-Type": "application/json", "Vary": "Origin" },
    });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...pre.headers, "Content-Type": "application/json", "Vary": "Origin" },
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
        headers: { ...pre.headers, "Content-Type": "application/json", "Vary": "Origin" },
      });
    }
    const user = userRes.user;

    const payload: AddressPayload = await req.json();
    if (!payload || !payload.place_id) {
      return new Response(JSON.stringify({ error: "Missing place_id" }), {
        status: 400,
        headers: { ...pre.headers, "Content-Type": "application/json", "Vary": "Origin" },
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
        headers: { ...pre.headers, "Content-Type": "application/json", "Vary": "Origin" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...pre.headers, "Content-Type": "application/json", "Vary": "Origin" },
    });
  } catch (e) {
    console.error("[household-address] unhandled error:", e);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: { ...pre.headers, "Content-Type": "application/json", "Vary": "Origin" },
    });
  }
});
