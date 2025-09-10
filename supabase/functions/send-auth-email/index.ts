// Force redeployment with better error handling - updated 2025-09-02 16:30
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";
import { Resend } from "npm:resend@2.0.0";

// Debug environment variables
console.log('🔧 Environment check on startup:');
console.log('- SUPABASE_URL:', !!Deno.env.get("SUPABASE_URL"));
console.log('- SUPABASE_SERVICE_ROLE_KEY:', !!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
console.log('- RESEND_API_KEY:', !!Deno.env.get("RESEND_API_KEY"));

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

if (!RESEND_API_KEY) {
  console.error("❌ CRITICAL: RESEND_API_KEY not found in environment!");
} else {
  console.log("✅ RESEND_API_KEY found, length:", RESEND_API_KEY.length);
}

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

// Helper function to format community names for display
function formatCommunityName(name: string): string {
  if (!name) return '';
  
  return name
    .replace(/-/g, ' ')  // Replace hyphens with spaces
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Auth email function with webhook verification and direct call support
Deno.serve(async (req) => {
  console.log('🚀 Auth email function triggered')
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  if (req.method !== 'POST') {
    console.log('❌ Method not allowed:', req.method)
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    console.log('📦 Reading payload...')
    const payload = await req.text()
    console.log('📦 Payload length:', payload.length)
    
    let webhookData
    let isDirectCall = false
    
    try {
      webhookData = JSON.parse(payload)
      console.log('✅ Payload parsed successfully')
      
      // Check if this is a direct call (has userEmail field) vs webhook call (has user.email)
      if (webhookData.userEmail && !webhookData.user) {
        isDirectCall = true
        console.log('📞 Direct function call detected')
        
        // Transform direct call format to webhook format for processing
        webhookData = {
          user: { email: webhookData.userEmail },
          email_data: {
            email_action_type: 'signup',
            redirect_to: webhookData.redirectTo || `https://courtneys-list.com/communities/boca-bridges?welcome=true`
          }
        }
      }
    } catch (parseError) {
      console.error('❌ Failed to parse payload:', parseError.message)
      return new Response(JSON.stringify({ error: 'Invalid payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    console.log('👤 Processing email for user:', webhookData.user?.email)
    
    if (!webhookData.user?.email) {
      console.error('❌ No user email in payload')
      return new Response(JSON.stringify({ error: 'No user email found' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    // Detect community for better redirect and email personalization
    let communityRedirect = 'https://courtneys-list.com/communities/boca-bridges?welcome=true'
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
            // Always redirect to community page now
            communityRedirect = `https://courtneys-list.com/communities/boca-bridges?welcome=true`
            console.log('🏘️ Setting community redirect to:', communityRedirect)
          } else if (user.signup_source?.startsWith('homepage:')) {
            communityName = user.signup_source.split('homepage:')[1]
            console.log('🏘️ Community from signup_source (homepage:):', communityName)
            // Always redirect to community page now
            communityRedirect = `https://courtneys-list.com/communities/boca-bridges?welcome=true`
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
                  // Always redirect to community page now
                  communityRedirect = `https://courtneys-list.com/communities/boca-bridges?welcome=true`
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
    let token, emailActionType
    
    if (isDirectCall) {
      // For direct calls, generate a new magic link token
      console.log('🔑 Generating magic link for direct call')
      
      try {
        const supabase = createClient(supabaseUrl!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
        
        // Generate OTP for the user - ensure we target the right account
        console.log('🎯 Generating magic link for specific user:', webhookData.user.email)
        
        // Verify this email exists in auth.users before generating link
        const { data: authUser } = await supabase.auth.admin.getUserByEmail(webhookData.user.email)
        if (!authUser.user) {
          console.error('❌ User not found in auth system:', webhookData.user.email)
          throw new Error('User not found in authentication system')
        }
        console.log('✅ Verified user exists in auth system with ID:', authUser.user.id)
        
        const { data: otpData, error: otpError } = await supabase.auth.admin.generateLink({
          type: 'magiclink',
          email: webhookData.user.email,
          options: {
            redirectTo: webhookData.email_data.redirect_to
          }
        })
        
        if (otpError || !otpData.properties) {
          console.error('❌ Failed to generate OTP:', otpError)
          throw new Error('Failed to generate magic link')
        }
        
        // Extract token from the generated link
        const generatedUrl = new URL(otpData.properties.action_link)
        token = generatedUrl.searchParams.get('token')
        emailActionType = generatedUrl.searchParams.get('type') || 'magiclink'
        
        console.log('✅ Magic link generated successfully')
      } catch (otpError) {
        console.error('❌ OTP generation failed:', otpError)
        throw new Error('Failed to generate magic link token')
      }
    } else {
      // For webhook calls, use provided tokens
      token = webhookData.email_data?.token_hash || webhookData.email_data?.token || 'missing-token'
      emailActionType = webhookData.email_data?.email_action_type || 'recovery'
    }
    
    const redirectTo = webhookData.email_data?.redirect_to || communityRedirect
    
    console.log('🔗 Magic link details:', {
      token: token?.substring(0, 10) + '...',
      emailActionType,
      providedRedirectTo: webhookData.email_data?.redirect_to,
      finalRedirectTo: redirectTo,
      isDirectCall
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
    console.log('📧 Target email address:', webhookData.user.email)
    console.log('🔗 Magic link URL:', magicLinkUrl)
    
    // Check RESEND_API_KEY early
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    // Send email using Resend
    try {
      const { data, error } = await resend!.emails.send({
        from: "Courtney's List <courtney@courtneys-list.com>",
        to: webhookData.user.email,
        subject: `${formatCommunityName(communityName) || 'Your Neighborhood'} Access is Ready - Unlock it Now`,
        html: html
      });

      if (error) {
        console.error('Resend error:', error);
        throw new Error(`Failed to send email: ${error.message}`);
      }

      console.log('Email sent successfully:', data?.id);
      
      return new Response(
        JSON.stringify({ success: true, emailId: data?.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      console.error('Send error:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
  } catch (error) {
    console.error('💥 Error in send-auth-email function:', error.message)
    console.error('💥 Error stack:', error.stack)
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
})