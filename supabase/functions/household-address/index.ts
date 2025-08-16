import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type AddressPayload = {
  household_address: string;
  formatted_address?: string;
  place_id?: string;
  components?: any;
  location?: { lat: number | null; lng: number | null };
};

function normalizeLowerTrim(s: string): string {
  return (s || "").trim().toLowerCase();
}

function normalizeToStreetName(s: string): string {
  let norm = normalizeLowerTrim(s);
  norm = norm.replace(/^\d+\s*/, "");
  norm = norm.replace(/\s*(#|apt|apartment|unit)\s*\w+\s*$/i, "");
  norm = norm.replace(/\s*\d{5}(-\d{4})?\s*(,\s*usa)?\s*$/i, "");
  return norm.trim();
}

function isValidAddress(address: string): boolean {
  const norm = normalizeLowerTrim(address);
  
  if (!norm || norm.length < 5) return false;
  if (norm.includes("pending") || norm.includes("not provided")) return false;
  if (norm.includes("unknown") || norm.includes("n/a")) return false;
  if (!norm.match(/\d/)) return false;
  if (!norm.match(/(st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|ln|lane|ct|court|pl|place|way|circle|cir)/i)) return false;
  
  return true;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }

    const payload: AddressPayload = await req.json();
    const rawAddress = payload.household_address;
    const formattedAddress = payload.formatted_address || rawAddress;
    const normalizedAddress = normalizeLowerTrim(rawAddress);

    // Check if user is admin
    const { data: isAdminData, error: adminError } = await supabase.rpc('is_admin');
    const isAdmin = !adminError && !!isAdminData;

    // Get current user data
    const { data: currentUser } = await supabase
      .from('users')
      .select('address')
      .eq('id', user.id)
      .single();

    const currentAddress = currentUser?.address || '';
    const currentNormalizedAddress = normalizeLowerTrim(currentAddress);

    // If same address, no change needed
    if (normalizedAddress === currentNormalizedAddress) {
      return new Response(JSON.stringify({
        success: true,
        message: 'Address unchanged',
        isAdmin
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // For non-admin users, create address change request
    if (!isAdmin) {
      const { data: requestData, error: requestError } = await supabase
        .from('address_change_requests')
        .insert({
          user_id: user.id,
          current_address: currentAddress,
          current_normalized_address: currentNormalizedAddress,
          requested_address: rawAddress,
          requested_normalized_address: normalizedAddress,
          requested_formatted_address: formattedAddress,
          requested_place_id: payload.place_id,
          status: 'pending'
        })
        .select()
        .single();

      if (requestError) {
        return new Response(JSON.stringify({ 
          error: 'Failed to create address change request' 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'Address change request submitted for admin approval',
        requestCreated: true,
        requestId: requestData.id,
        isAdmin: false
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // For admin users, proceed with direct change
    await supabase
      .from('address_change_log')
      .insert({
        user_id: user.id,
        old_address: currentAddress,
        new_address: rawAddress,
        source: 'admin_direct_change'
      });

    const { error: updateError } = await supabase
      .from('users')
      .update({
        address: rawAddress,
        street_name: normalizeToStreetName(rawAddress),
        formatted_address: formattedAddress,
        google_place_id: payload.place_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      return new Response(JSON.stringify({ 
        error: 'Failed to update address' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Address updated successfully (admin)',
      isAdmin: true,
      directChange: true
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});