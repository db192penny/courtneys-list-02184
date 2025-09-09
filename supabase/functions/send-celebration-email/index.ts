import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const resendApiKey = Deno.env.get("RESEND_API_KEY");
console.log('✅ Celebration function - API Key exists:', !!resendApiKey);

const resend = new Resend(resendApiKey);
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Safety check for API key
    if (!resendApiKey) {
      throw new Error('Resend API key not configured for celebration emails');
    }

    const { subject, body, recipients, testMode = false } = await req.json();
    
    console.log(`🎉 Celebration email: ${recipients.length} recipients (test mode: ${testMode})`);

    // Validate inputs
    if (!recipients || recipients.length === 0) {
      throw new Error('No recipients specified');
    }

    if (recipients.length > 100) {
      throw new Error('Too many recipients (max 100 per batch)');
    }

    // Get top 10 leaderboard with names and points
    const { data: leaderboard, error: leaderboardError } = await supabase
      .from('users')
      .select('name, points')
      .eq('is_verified', true)
      .gt('points', 0)
      .order('points', { ascending: false })
      .order('name', { ascending: true }) // Alphabetical for ties
      .limit(10);

    if (leaderboardError) {
      console.error('Leaderboard fetch error:', leaderboardError);
    }

    // Format leaderboard with medals and name formatting
    const medals = ['🥇', '🥈', '🥉', '🏅', '⭐', '⭐', '⭐', '⭐', '⭐', '⭐'];
    const leaderboardText = leaderboard?.map((user, i) => {
      const nameParts = (user.name || 'Neighbor').trim().split(' ');
      const firstName = nameParts[0];
      const lastInitial = nameParts.length > 1 ? nameParts[nameParts.length - 1][0] + '.' : '';
      const displayName = lastInitial ? `${firstName} ${lastInitial}` : firstName;
      return `${medals[i]} ${displayName} – ${user.points} pts`;
    }).join('\n') || 'Leaderboard coming soon!';

    // Get user details for personalization
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('email, name')
      .in('email', recipients);

    if (usersError) {
      console.error('Users fetch error:', usersError);
      throw new Error('Failed to fetch user details');
    }

    // Process each recipient
    const results = [];
    for (const user of (users || [])) {
      try {
        // Generate magic link for auto-login
        const { data: authData, error: authError } = await supabase.auth.admin.generateLink({
          type: 'magiclink',
          email: user.email,
          options: {
            redirectTo: 'https://courtneys-list.com/communities/boca-bridges?welcome=true'
          }
        });

        if (authError) {
          console.error(`Magic link generation failed for ${user.email}:`, authError);
          results.push({ email: user.email, success: false, error: 'Magic link generation failed' });
          continue;
        }

        const magicLink = authData?.properties?.action_link;
        
        if (!magicLink || !magicLink.includes('#access_token=')) {
          console.error(`Invalid magic link format for ${user.email}`);
          results.push({ email: user.email, success: false, error: 'Invalid magic link format' });
          continue;
        }

        // Replace placeholders in email body
        let personalizedBody = body
          .replace('{{LEADERBOARD}}', leaderboardText);

        // Create the magic link button
        const magicLinkButton = `
          <div style="text-align: center; margin: 40px 0;">
            <a href="${magicLink}" 
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                      color: white;
                      padding: 14px 32px;
                      text-decoration: none;
                      border-radius: 8px;
                      font-weight: 600;
                      display: inline-block;
                      font-size: 16px;
                      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
              🎊 See Newest Providers
            </a>
            <p style="color: #6b7280; font-size: 12px; margin: 10px 0 0 0;">
              This link will sign you in automatically
            </p>
          </div>`;

        // Beautiful HTML email template
        const html = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; background-color: #f5f5f5;">
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: white;">
              <!-- Header with gradient -->
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 0;">
                <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Celebration Time!</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Courtney's List • Boca Bridges</p>
              </div>
              
              <!-- Main content -->
              <div style="padding: 40px 30px;">
                <div style="white-space: pre-wrap; color: #374151; font-size: 16px; line-height: 1.6;">
${personalizedBody}
                </div>
                
                ${magicLinkButton}
              </div>
              
              <!-- Footer -->
              <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 12px; margin: 0;">
                  Courtney's List • Boca Bridges • Boca Raton, FL<br>
                  You're receiving this because you're a verified member of our community
                </p>
              </div>
            </div>
          </body>
          </html>`;

        // Send email via Resend
        console.log(`Sending to ${user.email} (test mode: ${testMode})`);
        
        const emailResult = await resend.emails.send({
          from: "Courtney's List <noreply@courtneys-list.com>",
          to: testMode ? ['your-test-email@example.com'] : [user.email], // REPLACE with your test email
          subject: testMode ? `[TEST] ${subject}` : subject,
          html: html,
          tags: [
            { name: 'campaign', value: 'hundred-homes-celebration' },
            { name: 'test_mode', value: String(testMode) },
            { name: 'template', value: 'celebration-v2' }
          ],
          headers: {
            'X-Entity-Ref-ID': `celebration-${Date.now()}`,
          }
        });

        results.push({ 
          email: user.email, 
          success: true, 
          id: emailResult.id 
        });
        
        console.log(`✅ Sent successfully to ${user.email}`);
        
      } catch (emailError) {
        console.error(`Failed to send to ${user.email}:`, emailError);
        results.push({ 
          email: user.email, 
          success: false, 
          error: emailError.message 
        });
      }
    }

    // Return detailed results
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    
    console.log(`🎉 Celebration emails complete: ${successCount} sent, ${failureCount} failed`);
    
    return new Response(
      JSON.stringify({ 
        success: true,
        sent: successCount,
        failed: failureCount,
        details: testMode ? results : undefined // Only show details in test mode
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );
    
  } catch (error) {
    console.error('❌ Celebration email function error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        help: 'Check edge function logs for details'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});