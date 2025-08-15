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

    console.log('Starting to populate preview data with real user data...')

    // Create preview sessions using real user data from David and Courtney Birnbaum
    const realSessions = [
      {
        session_token: 'preview-session-david',
        name: 'David B.',
        address: '123 Rosella Rd',
        street_name: 'Rosella Rd',
        community: 'Boca Bridges',
        normalized_address: 'rosella rd',
        source: 'real_data'
      },
      {
        session_token: 'preview-session-courtney',
        name: 'Courtney B.',
        address: '456 Rosella Rd',
        street_name: 'Rosella Rd',
        community: 'Boca Bridges',
        normalized_address: 'rosella rd',
        source: 'real_data'
      }
    ]

    // Insert preview sessions
    const { data: sessions, error: sessionError } = await supabase
      .from('preview_sessions')
      .upsert(realSessions, { onConflict: 'session_token' })
      .select()

    if (sessionError) {
      console.error('Error creating preview sessions:', sessionError)
      throw sessionError
    }

    console.log(`Created ${sessions?.length} preview sessions`)

    // Get real reviews from David and Courtney Birnbaum
    const { data: realReviews, error: reviewsError } = await supabase
      .from('reviews')
      .select(`
        vendor_id, 
        rating, 
        comments, 
        recommended,
        user_id
      `)
      .in('user_id', ['4a6da6d8-7a14-4f65-a7e0-0f4a9bb68a25', '59e15d3e-e3da-4e80-9c15-c8f9b8b3c1ba'])

    if (reviewsError) {
      console.error('Error fetching real reviews:', reviewsError)
      throw reviewsError
    }

    if (realReviews && realReviews.length > 0 && sessions && sessions.length > 0) {
      const previewReviews = realReviews.map((review) => {
        // Assign David's reviews to David's session, Courtney's to Courtney's
        const sessionId = review.user_id === '4a6da6d8-7a14-4f65-a7e0-0f4a9bb68a25' 
          ? sessions.find(s => s.session_token === 'preview-session-david')?.id
          : sessions.find(s => s.session_token === 'preview-session-courtney')?.id

        return {
          vendor_id: review.vendor_id,
          session_id: sessionId,
          rating: review.rating,
          comments: review.comments,
          recommended: review.recommended,
          anonymous: false // Use real names for authenticity
        }
      }).filter(review => review.session_id) // Filter out any that couldn't find a session

      const { error: insertReviewError } = await supabase
        .from('preview_reviews')
        .insert(previewReviews)

      if (insertReviewError) {
        console.error('Error inserting preview reviews:', insertReviewError)
      } else {
        console.log(`Inserted ${previewReviews.length} real preview reviews`)
      }
    }

    // Get real costs from David and Courtney Birnbaum
    const { data: realCosts, error: costsError } = await supabase
      .from('costs')
      .select(`
        vendor_id, 
        amount, 
        unit, 
        period, 
        cost_kind, 
        notes, 
        currency, 
        quantity,
        created_by
      `)
      .in('created_by', ['4a6da6d8-7a14-4f65-a7e0-0f4a9bb68a25', '59e15d3e-e3da-4e80-9c15-c8f9b8b3c1ba'])
      .is('deleted_at', null)

    if (costsError) {
      console.error('Error fetching real costs:', costsError)
      throw costsError
    }

    if (realCosts && realCosts.length > 0 && sessions && sessions.length > 0) {
      const previewCosts = realCosts.map((cost) => {
        // Assign David's costs to David's session, Courtney's to Courtney's
        const sessionId = cost.created_by === '4a6da6d8-7a14-4f65-a7e0-0f4a9bb68a25' 
          ? sessions.find(s => s.session_token === 'preview-session-david')?.id
          : sessions.find(s => s.session_token === 'preview-session-courtney')?.id

        return {
          vendor_id: cost.vendor_id,
          session_id: sessionId,
          amount: cost.amount,
          unit: cost.unit,
          period: cost.period,
          cost_kind: cost.cost_kind,
          notes: cost.notes,
          currency: cost.currency,
          quantity: cost.quantity,
          anonymous: false // Use real names for authenticity
        }
      }).filter(cost => cost.session_id) // Filter out any that couldn't find a session

      const { error: insertCostError } = await supabase
        .from('preview_costs')
        .insert(previewCosts)

      if (insertCostError) {
        console.error('Error inserting preview costs:', insertCostError)
      } else {
        console.log(`Inserted ${previewCosts.length} real preview costs`)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Preview data populated with real user data successfully',
        sessions: sessions?.length || 0,
        reviews: realReviews?.length || 0,
        costs: realCosts?.length || 0
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