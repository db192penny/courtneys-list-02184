import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    console.log('=== Fetch Google Place Details Function ===');
    console.log('Request method:', req.method);
    
    const { place_id } = await req.json();
    console.log('Received place_id:', place_id);
    
    if (!place_id) {
      console.error('No place_id provided in request');
      return new Response(
        JSON.stringify({ error: 'place_id is required' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Google Maps API key from environment
    const apiKey = Deno.env.get('GOOGLE_MAPS_KEY');
    console.log('API key status:', apiKey ? 'Present' : 'Missing');
    console.log('API key length:', apiKey ? apiKey.length : 0);
    
    // List all environment variables for debugging
    console.log('Available environment variables:');
    for (const [key, value] of Object.entries(Deno.env.toObject())) {
      if (key.includes('GOOGLE') || key.includes('SUPABASE')) {
        console.log(`${key}: ${value ? 'Present' : 'Missing'}`);
      }
    }
    
    if (!apiKey) {
      console.error('Google Maps API key not configured - GOOGLE_MAPS_KEY environment variable is missing');
      return new Response(
        JSON.stringify({ 
          error: 'Google Maps API key not available',
          details: 'GOOGLE_MAPS_KEY environment variable not set',
          availableEnvVars: Object.keys(Deno.env.toObject()).filter(k => k.includes('GOOGLE'))
        }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch place details from Google Places API
    const fields = 'name,rating,user_ratings_total,reviews,formatted_phone_number,formatted_address';
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=${fields}&key=${apiKey}`;
    
    console.log('Making API call to Google Places API...');
    console.log('URL (key hidden):', url.replace(apiKey, 'API_KEY_HIDDEN'));
    
    const response = await fetch(url);
    console.log('Google API response status:', response.status);
    console.log('Google API response headers:', Object.fromEntries(response.headers.entries()));
    
    const data = await response.json();
    console.log('Google API response data:', JSON.stringify(data, null, 2));
    
    if (response.status !== 200) {
      console.error('HTTP error from Google Places API:', response.status, data);
      return new Response(
        JSON.stringify({ 
          error: 'HTTP error from Google Places API', 
          httpStatus: response.status,
          details: data 
        }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (data.status !== 'OK' || !data.result) {
      console.error('Google Places API returned non-OK status:', data.status, data);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch place details', 
          googleStatus: data.status,
          details: data 
        }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const place = data.result;
    
    // Extract and structure the reviews
    const reviews = place.reviews ? place.reviews.map((review: any) => ({
      author_name: review.author_name,
      rating: review.rating,
      text: review.text,
      time: review.time,
      relative_time_description: review.relative_time_description
    })) : [];

    const result = {
      name: place.name,
      rating: place.rating,
      user_ratings_total: place.user_ratings_total,
      formatted_phone_number: place.formatted_phone_number,
      formatted_address: place.formatted_address,
      reviews: reviews,
      last_updated: new Date().toISOString()
    };

    return new Response(
      JSON.stringify(result), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fetch-google-place-details function:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});