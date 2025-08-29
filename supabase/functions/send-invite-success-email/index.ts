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

    // Get badge levels and calculate next badge
    const { data: badgeLevelsData } = await supabase
      .from('badge_levels')
      .select('*')
      .order('min_points', { ascending: true });

    const badgeLevels = badgeLevelsData || [];
    
    // Find current and next badge
    const qualifiedBadges = badgeLevels.filter(badge => currentPoints >= badge.min_points);
    const currentBadge = qualifiedBadges.length > 0 ? qualifiedBadges[qualifiedBadges.length - 1] : badgeLevels[0];
    const nextBadge = badgeLevels.find(badge => currentPoints < badge.min_points);
    
    const nextBadgeName = nextBadge ? nextBadge.name : 'Maximum Level';
    const nextBadgePoints = nextBadge ? nextBadge.min_points : currentPoints;

    // Create celebration email with exact copy
    const emailSubject = `🎉 ${invitedName} just joined thanks to you!`;
    
    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="padding: 40px 30px;">
          <p style="color: #1a1a1a; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
            Hi ${inviterName},
          </p>
          
          <p style="color: #1a1a1a; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
            Great news — <strong>${invitedName}</strong> just joined Courtney's List using your invite link!
          </p>
          
          <p style="color: #1a1a1a; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
            👉 <strong>You've earned +10 points for inviting a neighbor.</strong>
          </p>
          
          <p style="color: #1a1a1a; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
            Here's where you stand now:
          </p>
          
          <ul style="color: #1a1a1a; font-size: 16px; line-height: 1.6; margin: 0 0 24px 20px; padding: 0;">
            <li style="margin-bottom: 8px;">Total Points: <strong>${currentPoints}</strong></li>
            <li style="margin-bottom: 8px;">Leaderboard Rank: <strong>#${rankPosition}</strong> in ${communityName}</li>
            <li style="margin-bottom: 8px;">Next Level: <strong>${nextBadgeName}</strong> at <strong>${nextBadgePoints}</strong> points</li>
          </ul>
          
          <p style="color: #1a1a1a; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
            Want to climb faster? 🚀
          </p>
          
          <ul style="color: #1a1a1a; font-size: 16px; line-height: 1.6; margin: 0 0 24px 20px; padding: 0;">
            <li style="margin-bottom: 8px;">Invite more neighbors (your link is on your Profile page)</li>
            <li style="margin-bottom: 8px;">Rate your vendors (+5 pts each)</li>
            <li style="margin-bottom: 8px;">Submit new vendors (+5 pts each)</li>
          </ul>
          
          <p style="color: #1a1a1a; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
            The more we all contribute, the more useful this list becomes for everyone in BB — and you're leading the way.
          </p>
          
          <p style="color: #1a1a1a; font-size: 16px; line-height: 1.6; margin: 0 0 32px 0;">
            💜 Courtney
          </p>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="https://courtneys-list.com/profile" 
               style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">
              View My Profile & Points
            </a>
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