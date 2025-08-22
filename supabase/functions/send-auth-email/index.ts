import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";

// Helper function to format community names for display
function formatCommunityName(name: string): string {
  if (!name) return '';
  
  return name
    .replace(/-/g, ' ')  // Replace hyphens with spaces
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// Auth email function with basic webhook verification and community detection
Deno.serve(async (req) => {
  console.log('🚀 Auth email webhook triggered')
  
  if (req.method !== 'POST') {
    console.log('❌ Method not allowed:', req.method)
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    console.log('📦 Reading payload...')
    const payload = await req.text()
    console.log('📦 Payload length:', payload.length)
    
    // Parse the webhook payload directly without verification for now
    let webhookData
    try {
      webhookData = JSON.parse(payload)
      console.log('✅ Payload parsed successfully')
    } catch (parseError) {
      console.error('❌ Failed to parse payload:', parseError.message)
      return new Response(JSON.stringify({ error: 'Invalid payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    console.log('👤 Processing email for user:', webhookData.user?.email)
    
    if (!webhookData.user?.email) {
      console.error('❌ No user email in payload')
      return new Response(JSON.stringify({ error: 'No user email found' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Detect community for better redirect and email personalization
    let communityRedirect = 'https://courtneys-list.com'
    let communityName = null
    let userName = null
    
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      
      if (supabaseUrl && serviceKey) {
        const supabase = createClient(supabaseUrl, serviceKey)
        
        // Try to find user and their community
        const { data: user } = await supabase
          .from('users')
          .select('name, signup_source, address')
          .eq('email', webhookData.user.email)
          .single()
        
        if (user) {
          console.log('📍 User found:', { signup_source: user.signup_source, has_address: !!user.address })
          
          // Store user name for personalization
          userName = user.name
          
          // Check signup_source first - handle both community: and homepage: patterns
          if (user.signup_source?.startsWith('community:')) {
            const communitySlug = user.signup_source.split('community:')[1]
            communityName = communitySlug
            console.log('🏘️ Community slug from signup_source:', communitySlug)
            // For new community signups, redirect to the community page with welcome toolbar
            communityRedirect = `https://courtneys-list.com/communities/${encodeURIComponent(communitySlug)}?welcome=true`
            console.log('🏘️ Setting community signup redirect to:', communityRedirect)
          } else if (user.signup_source?.startsWith('homepage:')) {
            communityName = user.signup_source.split('homepage:')[1]
            console.log('🏘️ Community from signup_source (homepage:):', communityName)
            // For homepage signups, keep existing auth redirect
            communityRedirect = `https://courtneys-list.com/auth?community=${encodeURIComponent(communityName)}&verified=true`
            console.log('🏘️ Setting homepage redirect to:', communityRedirect)
          } else if (user.address) {
            // Query household_hoa to find their community
            console.log('🔍 Looking up community by address:', user.address)
            try {
              // First normalize the address
              const { data: normalizedAddr, error: normalizeError } = await supabase
                .rpc('normalize_address', { _addr: user.address })
              
              if (normalizeError) {
                console.log('⚠️ Address normalization error:', normalizeError.message)
              } else if (normalizedAddr) {
                console.log('🔧 Normalized address:', normalizedAddr)
                
                // Then query with the normalized address
                const { data: hoa, error: hoaError } = await supabase
                  .from('household_hoa')
                  .select('hoa_name')
                  .eq('normalized_address', normalizedAddr)
                  .single()
                
                if (hoaError) {
                  console.log('⚠️ HOA lookup error:', hoaError.message)
                } else if (hoa?.hoa_name) {
                  communityName = hoa.hoa_name
                  communityRedirect = `https://courtneys-list.com/auth?community=${encodeURIComponent(hoa.hoa_name)}&verified=true`
                  console.log('🏘️ Community from address:', hoa.hoa_name)
                } else {
                  console.log('⚠️ No HOA found for normalized address:', normalizedAddr)
                }
              }
            } catch (addressError) {
              console.log('⚠️ Address-based lookup failed:', addressError.message)
            }
          }
        }
      }
    } catch (communityError) {
      console.log('⚠️ Community detection failed:', communityError.message)
      // Continue with default redirect
    }

    // Create magic link
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const token = webhookData.email_data?.token_hash || webhookData.email_data?.token || 'missing-token'
    const emailActionType = webhookData.email_data?.email_action_type || 'recovery'
    const redirectTo = webhookData.email_data?.redirect_to || communityRedirect
    
    console.log('🔗 Magic link details:', {
      token: token.substring(0, 10) + '...',
      emailActionType,
      providedRedirectTo: webhookData.email_data?.redirect_to,
      finalRedirectTo: redirectTo
    })
    
    const magicLinkUrl = `${supabaseUrl}/auth/v1/verify?token=${token}&type=${emailActionType}&redirect_to=${redirectTo}`
    
    // Extract first name for personalization
    const firstName = userName ? userName.split(' ')[0] : 'there'
    const neighborhoodName = communityName || 'Your Neighborhood'
    
    const html = `
      <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <p style="color: #333; font-size: 14px; margin: 24px 0; line-height: 1.5;">Hi ${firstName},</p>
          
          <p style="color: #333; font-size: 14px; margin: 24px 0; line-height: 1.5;">Excited to have you back! Please click here to return to the ${neighborhoodName} list:</p>
          
          <a href="${magicLinkUrl}" style="display: block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; text-align: center; margin-bottom: 24px;">See List of Providers</a>
          
          <p style="color: #333; font-size: 14px; margin: 24px 0; line-height: 1.5;">I hope this list makes your life a little easier. And thanks for all your contributions.</p>
          
          <p style="color: #333; font-size: 14px; margin: 24px 0; line-height: 1.5;">Cheers,<br/>Courtney</p>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #ccc; font-size: 12px; text-align: center; line-height: 18px;">
              <a href="https://courtneys-list.com/unsubscribe?email=${encodeURIComponent(webhookData.user.email)}" style="color: #ccc; text-decoration: underline;">Unsubscribe</a> | 
              <a href="https://courtneys-list.com/contact" style="color: #ccc; text-decoration: underline;">Contact Us</a>
            </p>
          </div>
        </body>
      </html>
    `

    console.log('📤 Sending email via Resend...')
    
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      console.error('❌ RESEND_API_KEY not found')
      return new Response(JSON.stringify({ error: 'Email service not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: "Courtney's List <courtney@courtneys-list.com>",
        to: [webhookData.user.email],
        subject: `${formatCommunityName(communityName) || 'Your Neighborhood'} Access is Ready - Unlock it Now`,
        html: html,
      }),
    })

    const emailResult = await emailResponse.json()
    
    if (!emailResponse.ok) {
      console.error('❌ Resend error:', emailResult)
      throw new Error(`Resend API error: ${JSON.stringify(emailResult)}`)
    }

    console.log('✅ Email sent successfully:', emailResult.id)

    return new Response(JSON.stringify({ success: true, emailId: emailResult.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
    
  } catch (error) {
    console.error('💥 Error in send-auth-email function:', error.message)
    console.error('💥 Error stack:', error.stack)
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})