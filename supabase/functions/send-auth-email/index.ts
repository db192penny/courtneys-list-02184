import React from 'npm:react@18.3.1'
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'
import { Resend } from 'npm:resend@4.0.0'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { MagicLinkEmail } from './_templates/magic-link.tsx'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0'

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string)
const hookSecret = Deno.env.get('SEND_AUTH_EMAIL_HOOK_SECRET') as string

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

Deno.serve(async (req) => {
  console.log('Auth email webhook triggered')
  
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const payload = await req.text()
  const headers = Object.fromEntries(req.headers)
  const wh = new Webhook(hookSecret)
  
  try {
    const {
      user,
      email_data: { token, token_hash, redirect_to, email_action_type },
    } = wh.verify(payload, headers) as {
      user: {
        id: string
        email: string
      }
      email_data: {
        token: string
        token_hash: string
        redirect_to: string
        email_action_type: string
      }
    }

    console.log('Processing auth email for user:', user.email)

    // Get pending profile data from the redirect URL or stored data
    let name = 'Neighbor'
    let communityName = ''
    let signupSource = ''

    try {
      // Try to get user profile data from the users table
      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('name, signup_source')
        .eq('email', user.email)
        .single()

      if (userData) {
        name = userData.name || 'Neighbor'
        signupSource = userData.signup_source || ''
        
        // Extract community from signup source
        if (signupSource.startsWith('community:')) {
          communityName = signupSource.replace('community:', '')
        } else if (signupSource.startsWith('homepage:')) {
          communityName = signupSource.replace('homepage:', '')
        }
      }
    } catch (error) {
      console.log('Could not fetch user data, using defaults:', error)
    }

    console.log('Rendering email for:', { name, communityName, signupSource })

    const html = await renderAsync(
      React.createElement(MagicLinkEmail, {
        name,
        communityName,
        signupSource,
        supabase_url: Deno.env.get('SUPABASE_URL') ?? '',
        token,
        token_hash,
        redirect_to,
        email_action_type,
      })
    )

    const emailResponse = await resend.emails.send({
      from: "Courtney's List <onboarding@resend.dev>",
      to: [user.email],
      subject: `🎉 VIP Access Granted${communityName ? ` - ${communityName}` : ''} - Your magic link inside!`,
      html,
    })

    if (emailResponse.error) {
      throw emailResponse.error
    }

    console.log('Custom magic link email sent successfully:', emailResponse.data?.id)

    return new Response(JSON.stringify({ success: true, emailId: emailResponse.data?.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error in send-auth-email function:', error)
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