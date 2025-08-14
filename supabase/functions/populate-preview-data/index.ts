import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Starting to populate preview data...')

    // First, create some dummy preview sessions
    const dummySessions = [
      {
        session_token: 'preview-session-1',
        name: 'Sarah M.',
        address: '123 Oak Street',
        street_name: 'Oak Street',
        community: 'Boca Bridges',
        normalized_address: 'oak street',
        source: 'sample_data'
      },
      {
        session_token: 'preview-session-2', 
        name: 'Mike R.',
        address: '456 Pine Avenue',
        street_name: 'Pine Avenue',
        community: 'Boca Bridges',
        normalized_address: 'pine avenue',
        source: 'sample_data'
      },
      {
        session_token: 'preview-session-3',
        name: 'Lisa K.',
        address: '789 Maple Drive',
        street_name: 'Maple Drive', 
        community: 'Boca Bridges',
        normalized_address: 'maple drive',
        source: 'sample_data'
      }
    ]

    // Insert dummy sessions
    const { data: sessions, error: sessionError } = await supabase
      .from('preview_sessions')
      .upsert(dummySessions, { onConflict: 'session_token' })
      .select()

    if (sessionError) {
      console.error('Error creating preview sessions:', sessionError)
      throw sessionError
    }

    console.log(`Created ${sessions?.length} preview sessions`)

    // Get existing reviews and copy them to preview_reviews
    const { data: existingReviews, error: reviewsError } = await supabase
      .from('reviews')
      .select('vendor_id, rating, comments, recommended')
      .limit(50) // Limit to avoid too much data

    if (reviewsError) {
      console.error('Error fetching reviews:', reviewsError)
      throw reviewsError
    }

    if (existingReviews && existingReviews.length > 0) {
      const previewReviews = existingReviews.map((review, index) => ({
        vendor_id: review.vendor_id,
        session_id: sessions[index % sessions.length].id,
        rating: review.rating,
        comments: review.comments,
        recommended: review.recommended,
        anonymous: Math.random() > 0.7 // 30% chance of being anonymous
      }))

      const { error: insertReviewError } = await supabase
        .from('preview_reviews')
        .insert(previewReviews)

      if (insertReviewError) {
        console.error('Error inserting preview reviews:', insertReviewError)
      } else {
        console.log(`Inserted ${previewReviews.length} preview reviews`)
      }
    }

    // Get existing costs and copy them to preview_costs  
    const { data: existingCosts, error: costsError } = await supabase
      .from('costs')
      .select('vendor_id, amount, unit, period, cost_kind, notes, currency, quantity')
      .is('deleted_at', null)
      .limit(50) // Limit to avoid too much data

    if (costsError) {
      console.error('Error fetching costs:', costsError)
      throw costsError
    }

    if (existingCosts && existingCosts.length > 0) {
      const previewCosts = existingCosts.map((cost, index) => ({
        vendor_id: cost.vendor_id,
        session_id: sessions[index % sessions.length].id,
        amount: cost.amount,
        unit: cost.unit,
        period: cost.period,
        cost_kind: cost.cost_kind,
        notes: cost.notes,
        currency: cost.currency,
        quantity: cost.quantity,
        anonymous: Math.random() > 0.6 // 40% chance of being anonymous
      }))

      const { error: insertCostError } = await supabase
        .from('preview_costs')
        .insert(previewCosts)

      if (insertCostError) {
        console.error('Error inserting preview costs:', insertCostError)
      } else {
        console.log(`Inserted ${previewCosts.length} preview costs`)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Preview data populated successfully',
        sessions: sessions?.length || 0,
        reviews: existingReviews?.length || 0,
        costs: existingCosts?.length || 0
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error in populate-preview-data function:', error)
    return new Response(
      JSON.stringify({
        error: error.message,
        success: false
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})