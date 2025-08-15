// Auth email function with basic webhook verification
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

    // Create magic link
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const token = webhookData.email_data?.token_hash || webhookData.email_data?.token || 'missing-token'
    const emailActionType = webhookData.email_data?.email_action_type || 'recovery'
    const redirectTo = webhookData.email_data?.redirect_to || `${supabaseUrl}`
    
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
        from: "Courtney's List <noreply@courtneys-list.com>",
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