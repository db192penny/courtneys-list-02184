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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get vendors with google_place_id but missing ratings
    const { data: vendors, error: vendorsError } = await supabase
      .from('vendors')
      .select('id, name, google_place_id')
      .not('google_place_id', 'is', null)
      .or('google_rating.is.null,google_rating_count.is.null');

    if (vendorsError) {
      console.error('Error fetching vendors:', vendorsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch vendors' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${vendors?.length || 0} vendors to backfill`);

    const results = [];

    for (const vendor of vendors || []) {
      try {
        // Call our own fetch-google-place-details function
        const { data: placeData, error: placeError } = await supabase.functions.invoke(
          'fetch-google-place-details',
          { body: { place_id: vendor.google_place_id } }
        );

        if (placeError || !placeData) {
          console.error(`Failed to fetch place details for ${vendor.name}:`, placeError);
          results.push({ vendor: vendor.name, success: false, error: placeError?.message });
          continue;
        }

        // Update vendor with Google ratings and reviews
        const { error: updateError } = await supabase
          .from('vendors')
          .update({
            google_rating: placeData.rating,
            google_rating_count: placeData.user_ratings_total,
            google_reviews_json: placeData.reviews,
            google_last_updated: new Date().toISOString()
          })
          .eq('id', vendor.id);

        if (updateError) {
          console.error(`Failed to update vendor ${vendor.name}:`, updateError);
          results.push({ vendor: vendor.name, success: false, error: updateError.message });
        } else {
          console.log(`Successfully updated ${vendor.name} with Google ratings`);
          results.push({ 
            vendor: vendor.name, 
            success: true, 
            rating: placeData.rating,
            rating_count: placeData.user_ratings_total
          });
        }
      } catch (error) {
        console.error(`Error processing vendor ${vendor.name}:`, error);
        results.push({ vendor: vendor.name, success: false, error: error.message });
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `Processed ${results.length} vendors`,
        results 
      }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in backfill-google-ratings function:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});