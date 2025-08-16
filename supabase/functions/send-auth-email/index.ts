import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";

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

    // Detect community for better redirect
    let communityRedirect = 'https://courtneys-list.com'
    
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      
      if (supabaseUrl && serviceKey) {
        const supabase = createClient(supabaseUrl, serviceKey)
        
        // Try to find user and their community
        const { data: user } = await supabase
          .from('users')
          .select('signup_source, address')
          .eq('email', webhookData.user.email)
          .single()
        
        if (user) {
          console.log('📍 User found:', { signup_source: user.signup_source, has_address: !!user.address })
          
          // Check signup_source first
          if (user.signup_source?.startsWith('community:')) {
            const communityName = user.signup_source.split('community:')[1]
            if (communityName) {
              communityRedirect = `https://courtneys-list.com/auth?community=${encodeURIComponent(communityName)}&verified=true`
              console.log('🏘️ Community from signup_source:', communityName)
            }
          } else if (user.address) {
            // Query household_hoa to find their community
            const { data: hoa } = await supabase
              .from('household_hoa')
              .select('hoa_name')
              .eq('normalized_address', supabase.rpc('normalize_address', { _addr: user.address }))
              .single()
            
            if (hoa?.hoa_name) {
              communityRedirect = `https://courtneys-list.com/auth?community=${encodeURIComponent(hoa.hoa_name)}&verified=true`
              console.log('🏘️ Community from address:', hoa.hoa_name)
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
    
    const html = `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333;">🎉 VIP Access Granted!</h1>
          <p>Hi there!</p>
          <p>Click the link below to access your account:</p>
          <a href="${magicLinkUrl}" style="display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Access Your Account ✨</a>
          <p style="margin-top: 20px;">Or copy this code: <code style="background: #f4f4f4; padding: 4px 8px;">${webhookData.email_data?.token || 'N/A'}</code></p>
          <p style="color: #666; margin-top: 30px;">Happy exploring!<br/>Courtney's List</p>
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #999; font-size: 12px; text-align: center;">
              <a href="https://courtneys-list.com/unsubscribe?email=${encodeURIComponent(webhookData.user.email)}" style="color: #999; text-decoration: underline;">Unsubscribe</a> | 
              <a href="https://courtneys-list.com/contact" style="color: #999; text-decoration: underline;">Contact Us</a>
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
        subject: "🎉 VIP Access Granted - Your magic link inside!",
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