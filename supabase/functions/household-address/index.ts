
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

// Check if an address looks like a real, valid address
function isValidAddress(address: string): boolean {
  if (!address || address.trim().length === 0) return false;
  
  const normalized = address.toLowerCase().trim();
  
  // Reject clearly invalid addresses
  const invalidPatterns = [
    'address not provided',
    'no address',
    'unknown',
    'pending',
    'not specified',
    'n/a',
    'null',
    'undefined'
  ];
  
  if (invalidPatterns.some(pattern => normalized.includes(pattern))) {
    return false;
  }
  
  // Must have some basic address components (number + street name or specific location)
  const hasNumber = /\d/.test(address);
  const hasStreetIndicator = /\b(st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|ln|lane|ct|court|pl|place|way|circle|cir)\b/i.test(address);
  const hasComma = address.includes(','); // Usually indicates city/state
  
  return hasNumber && (hasStreetIndicator || hasComma);
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

    const incomingAddress = payload.household_address || payload.formatted_address || "";
    const normalizedOneLine = normalizeLowerTrim(incomingAddress);
    const streetName = normalizeToStreetName(incomingAddress);

    // Validate the incoming address
    if (!isValidAddress(incomingAddress)) {
      console.error("[household-address] Invalid address provided:", incomingAddress);
      return new Response(JSON.stringify({ 
        error: "Invalid address provided. Please enter a valid street address." 
      }), {
        status: 400,
        headers: { ...pre.headers, "Content-Type": "application/json", "Vary": "Origin" },
      });
    }

    // Get current user data to check if we're overwriting a valid address
    const { data: currentUser, error: userFetchErr } = await supabase
      .from("users")
      .select("address, street_name, formatted_address")
      .eq("id", user.id)
      .maybeSingle();

    if (userFetchErr) {
      console.error("[household-address] Error fetching current user:", userFetchErr);
    }

    // Log the address change attempt
    if (currentUser) {
      const addressChangeLog = {
        user_id: user.id,
        old_address: currentUser.address,
        new_address: incomingAddress,
        old_street_name: currentUser.street_name,
        new_street_name: streetName,
        source: 'profile_page',
        metadata: {
          formatted_address: payload.formatted_address,
          google_place_id: payload.place_id,
          user_agent: req.headers.get('user-agent'),
          timestamp: new Date().toISOString()
        }
      };

      // Log the change
      await supabase.from("address_change_log").insert(addressChangeLog);

      // Additional validation: don't overwrite a good address with a generic one
      if (currentUser.address && 
          isValidAddress(currentUser.address) && 
          currentUser.address !== 'Address Not Provided' && 
          !isValidAddress(incomingAddress)) {
        console.warn("[household-address] Preventing overwrite of valid address with invalid one:", {
          current: currentUser.address,
          incoming: incomingAddress
        });
        return new Response(JSON.stringify({ 
          error: "Cannot overwrite valid address with invalid address" 
        }), {
          status: 400,
          headers: { ...pre.headers, "Content-Type": "application/json", "Vary": "Origin" },
        });
      }
    }

    console.log("[household-address] updating user:", user.id, {
      address: normalizedOneLine,
      street_name: streetName,
      formatted_address: payload.formatted_address,
      google_place_id: payload.place_id,
      previous_address: currentUser?.address || 'none'
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
