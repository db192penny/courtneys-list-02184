import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== Google API Test Function ===');
    
    // Test 1: Check if API key is available
    const apiKey = Deno.env.get('GOOGLE_MAPS_KEY');
    console.log('API Key status:', apiKey ? 'Present' : 'Missing');
    console.log('API Key length:', apiKey ? apiKey.length : 0);
    console.log('API Key first 10 chars:', apiKey ? apiKey.substring(0, 10) + '...' : 'N/A');
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ 
          error: 'Google Maps API key not available',
          details: 'GOOGLE_MAPS_KEY environment variable not set'
        }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Test 2: Try a simple API call with a known Place ID
    const testPlaceId = 'ChIJN1t_tDeuEmsRUsoyG83frY4'; // Google Sydney office
    const fields = 'name,rating,user_ratings_total,formatted_phone_number';
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${testPlaceId}&fields=${fields}&key=${apiKey}`;
    
    console.log('Making test API call to:', url.replace(apiKey, 'API_KEY_HIDDEN'));
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log('API Response status:', response.status);
    console.log('API Response data:', JSON.stringify(data, null, 2));
    
    if (response.status !== 200) {
      return new Response(
        JSON.stringify({ 
          error: 'HTTP error from Google API',
          status: response.status,
          details: data
        }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (data.status !== 'OK') {
      return new Response(
        JSON.stringify({ 
          error: 'Google API returned non-OK status',
          googleStatus: data.status,
          details: data
        }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Test 3: Check environment variables
    const envTest = {
      SUPABASE_URL: Deno.env.get('SUPABASE_URL') ? 'Present' : 'Missing',
      SUPABASE_ANON_KEY: Deno.env.get('SUPABASE_ANON_KEY') ? 'Present' : 'Missing',
      SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ? 'Present' : 'Missing',
      GOOGLE_MAPS_KEY: Deno.env.get('GOOGLE_MAPS_KEY') ? 'Present' : 'Missing',
    };

    const result = {
      success: true,
      message: 'Google API test successful!',
      apiKeyStatus: 'Valid and working',
      testPlace: data.result,
      environmentVariables: envTest,
      timestamp: new Date().toISOString()
    };

    console.log('Test completed successfully:', result);

    return new Response(
      JSON.stringify(result), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in test-google-api function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Test function error',
        message: error.message,
        stack: error.stack
      }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});