import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Emergency stop: block all sends by default unless explicitly disabled
    const emergencyStop = (Deno.env.get("EMERGENCY_EMAIL_STOP") ?? "true").toLowerCase() === "true";
    if (emergencyStop) {
      console.warn("[send-weekly-update] Emergency stop active — aborting send");
      return new Response(
        JSON.stringify({ success: false, error: "Weekly emails are temporarily disabled (emergency stop)." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 503 }
      );
    }

    const { 
      testMode = true,
      fiveStarHtml = '',
      alertsHtml = '',
      activityHtml = ''
    } = await req.json();
    
    console.log(`[send-weekly-update] Starting. Test mode: ${testMode}`);
    console.log("[send-weekly-update] Function is live and ready");
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Use the SQL function to get recipients
    const { data: users, error } = await supabaseAdmin
      .rpc('get_weekly_email_recipients');
    
    if (error || !users || users.length === 0) {
      throw new Error('No recipients found');
    }
    
    const recipients = testMode ? users.slice(0, 1) : users;
    console.log(`[send-weekly-update] Sending to ${recipients.length} recipients`);
    
    const results = [];
    
    for (const user of recipients) {
      try {
        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background: #f5f5f5;">
    <div style="max-width: 600px; margin: 20px auto; background: white; border-radius: 12px;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0;">Boca Bridges Weekly Update</h1>
            <p style="color: rgba(255,255,255,0.9); margin-top: 10px;">
                Hey ${user.name?.split(' ')[0] || 'Neighbor'}!
            </p>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px;">
            <!-- 5-Star Reviews -->
            ${fiveStarHtml || `
            <div style="background: #f8f9ff; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="color: #667eea; margin-top: 0;">🌟 This Week's 5-Star Reviews</h3>
                <p>Check the community page for the latest reviews!</p>
            </div>
            `}
            
            <!-- Service Alerts -->
            ${alertsHtml || ''}
            
            <!-- Community Activity -->
            ${activityHtml || `
            <div style="background: #f0fff4; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="color: #38a169; margin-top: 0;">📊 Community Activity</h3>
                <p>Visit the site to see this week's most active categories!</p>
            </div>
            `}
            
            <!-- CTA Button -->
            <div style="text-align: center; margin: 30px 0;">
                <a href="https://courtneys-list.com/communities/boca-bridges" 
                   style="display: inline-block; padding: 15px 40px; background: #667eea; color: white; text-decoration: none; border-radius: 30px; font-weight: bold;">
                    View All Providers →
                </a>
            </div>
            
            <!-- Raffle -->
            <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 20px; border-radius: 8px; text-align: center; color: white;">
                <h3 style="margin-top: 0;">🎁 Monthly $200 Raffle!</h3>
                <p>Every point = 1 raffle entry</p>
            </div>
        </div>
        
        <!-- Footer -->
        <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 12px 12px;">
            <p style="color: #666;">The Courtney's List Team</p>
        </div>
    </div>
</body>
</html>`;
        
        await resend.emails.send({
          from: "Courtney's List <noreply@courtneys-list.com>",
          to: user.email,
          subject: "Boca Bridges Weekly Update - 5-star reviews & $200 raffle",
          html: emailHtml
        });
        
        results.push({ email: user.email, success: true });
        
      } catch (err) {
        results.push({ email: user.email, success: false, error: err.message });
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: results.filter(r => r.success).length,
        results 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
};

serve(handler);