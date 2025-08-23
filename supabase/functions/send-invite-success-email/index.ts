import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InviteSuccessRequest {
  inviterId: string;
  inviterName: string;
  inviterEmail: string;
  invitedName: string;
  communityName: string;
  communitySlug?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      inviterId, 
      inviterName, 
      inviterEmail, 
      invitedName, 
      communityName,
      communitySlug 
    }: InviteSuccessRequest = await req.json();

    console.log("[send-invite-success-email] Processing invite success:", {
      inviterId,
      inviterEmail,
      communityName
    });

    // Get inviter's leaderboard position
    const { data: leaderboardData } = await supabase.rpc('get_user_leaderboard_position', {
      _user_id: inviterId,
      _community_name: communityName
    });

    const leaderboardPosition = leaderboardData?.[0];
    const rankPosition = leaderboardPosition?.rank_position || 'N/A';
    const totalUsers = leaderboardPosition?.total_users || 0;
    const currentPoints = leaderboardPosition?.points || 0;

    // Get top 5 community leaderboard for context
    const { data: topUsersData } = await supabase
      .from('users')
      .select('name, points')
      .gte('points', 1)
      .eq('is_verified', true)
      .order('points', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(5);

    const leaderboardText = topUsersData
      ?.map((user, index) => `${index + 1}. ${user.name || 'Anonymous'} - ${user.points} points`)
      .join('\n') || '';

    const currentTime = new Date().toLocaleString('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Create celebration email
    const emailSubject = `🎉 ${invitedName} joined ${communityName} with your invite!`;
    
    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; font-size: 32px; margin: 0; font-weight: bold;">🎉 Great News!</h1>
          <p style="color: rgba(255,255,255,0.9); font-size: 18px; margin: 10px 0 0 0;">${invitedName} just joined your community!</p>
        </div>
        
        <div style="padding: 40px 30px;">
          <div style="background: #f8fafc; border-radius: 12px; padding: 30px; margin-bottom: 30px; border-left: 4px solid #3b82f6;">
            <h2 style="color: #1e293b; margin: 0 0 15px 0; font-size: 24px;">You've Earned +10 Points! 🏆</h2>
            <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0;">
              <strong>${invitedName}</strong> successfully signed up for Courtney's List using your invite link. 
              You now have <strong>${currentPoints} points</strong> and are ranked <strong>#${rankPosition}</strong> out of ${totalUsers} verified neighbors in ${communityName}!
            </p>
          </div>

          <div style="margin-bottom: 30px;">
            <h3 style="color: #1e293b; font-size: 20px; margin: 0 0 15px 0;">Most Importantly...</h3>
            <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0;">
              You're helping your neighbors find the best vendors and eliminate the stress of finding reliable service providers. 
              When neighbors share their experiences, everyone wins with better choices and fair pricing.
            </p>
          </div>

          ${leaderboardText ? `
          <div style="background: #fefce8; border-radius: 12px; padding: 25px; margin-bottom: 30px; border: 1px solid #fbbf24;">
            <h3 style="color: #92400e; margin: 0 0 15px 0; font-size: 18px; display: flex; align-items: center;">
              📊 Current ${communityName} Leaderboard
            </h3>
            <pre style="color: #451a03; font-family: 'Monaco', 'Menlo', monospace; font-size: 14px; line-height: 1.5; margin: 0; white-space: pre-wrap;">${leaderboardText}</pre>
          </div>
          ` : ''}

          <div style="text-align: center; margin: 40px 0;">
            <a href="https://courtneys-list.com/communities/${communitySlug || 'boca-bridges'}" 
               style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">
              View Your Community →
            </a>
          </div>

          <div style="border-top: 1px solid #e2e8f0; padding-top: 25px; margin-top: 30px; text-align: center;">
            <p style="color: #64748b; font-size: 14px; margin: 0;">
              Keep sharing Courtney's List with your neighbors to earn more points and help build the strongest community resource for trusted service recommendations!
            </p>
          </div>
        </div>

        <div style="background: #f1f5f9; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="color: #64748b; font-size: 12px; margin: 0;">
            Sent at ${currentTime} EST • 
            <a href="https://courtneys-list.com" style="color: #3b82f6; text-decoration: none;">Courtney's List</a>
          </p>
        </div>
      </div>
    `;

    const emailResponse = await resend.emails.send({
      from: "Courtney's List <noreply@courtneys-list.com>",
      to: [inviterEmail],
      subject: emailSubject,
      html: emailHtml,
    });

    console.log("[send-invite-success-email] Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("[send-invite-success-email] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);