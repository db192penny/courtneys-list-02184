import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'
import { Resend } from 'npm:resend@4.0.0'

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string)
const hookSecret = Deno.env.get('SEND_AUTH_EMAIL_HOOK_SECRET') as string

Deno.serve(async (req) => {
  console.log('🚀 Auth email webhook triggered - simplified version')
  
  if (req.method !== 'POST') {
    console.log('❌ Method not allowed:', req.method)
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    console.log('📦 Reading payload...')
    const payload = await req.text()
    console.log('📦 Payload length:', payload.length)
    
    console.log('📋 Reading headers...')
    const headers = Object.fromEntries(req.headers)
    console.log('📋 Headers count:', Object.keys(headers).length)
    
    if (!hookSecret) {
      console.error('❌ SEND_AUTH_EMAIL_HOOK_SECRET not configured')
      return new Response(JSON.stringify({ error: 'Hook secret not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    console.log('🔐 Creating webhook verifier...')
    const wh = new Webhook(hookSecret)
    
    console.log('✅ Verifying webhook payload...')
    const webhookData = wh.verify(payload, headers) as any

    console.log('👤 Webhook verified for user:', webhookData.user?.email)
    
    // Create simple HTML email
    const magicLinkUrl = `${Deno.env.get('SUPABASE_URL')}/auth/v1/verify?token=${webhookData.email_data.token_hash}&type=${webhookData.email_data.email_action_type}&redirect_to=${webhookData.email_data.redirect_to}`
    
    const html = `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333;">🎉 VIP Access Granted!</h1>
          <p>Hi there!</p>
          <p>Click the link below to access your account:</p>
          <a href="${magicLinkUrl}" style="display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Access Your Account ✨</a>
          <p style="margin-top: 20px;">Or copy this code: <code style="background: #f4f4f4; padding: 4px 8px;">${webhookData.email_data.token}</code></p>
          <p style="color: #666; margin-top: 30px;">Happy exploring!<br/>Courtney's List</p>
        </body>
      </html>
    `

    console.log('📤 Sending email via Resend...')
    const emailResponse = await resend.emails.send({
      from: "Courtney's List <onboarding@resend.dev>",
      to: [webhookData.user.email],
      subject: "🎉 VIP Access Granted - Your magic link inside!",
      html,
    })

    if (emailResponse.error) {
      console.error('❌ Resend error:', emailResponse.error)
      throw emailResponse.error
    }

    console.log('✅ Email sent successfully:', emailResponse.data?.id)

    return new Response(JSON.stringify({ success: true, emailId: emailResponse.data?.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('💥 Error in send-auth-email function:', error.message)
    console.error('🔍 Error details:', error)
    return new Response(
      JSON.stringify({
        error: {
          message: error.message,
        },
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})