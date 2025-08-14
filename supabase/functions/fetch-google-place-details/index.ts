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
    const { place_id } = await req.json();
    
    if (!place_id) {
      return new Response(
        JSON.stringify({ error: 'place_id is required' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Google Maps API key from environment
    const apiKey = Deno.env.get('GOOGLE_MAPS_KEY');
    
    if (!apiKey) {
      console.error('Google Maps API key not configured');
      return new Response(
        JSON.stringify({ error: 'Google Maps API key not available' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch place details from Google Places API
    const fields = 'name,rating,user_ratings_total,reviews,formatted_phone_number,formatted_address';
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=${fields}&key=${apiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status !== 'OK' || !data.result) {
      console.error('Google Places API error:', data);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch place details', details: data }), 
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