import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const formatNameWithLastInitial = (fullName: string): string => {
  if (!fullName || !fullName.trim()) return "Neighbor";
  
  const parts = fullName.trim().split(" ");
  if (parts.length === 0) return "Neighbor";
  
  const firstName = parts[0];
  const lastInitial = parts.length > 1 ? parts[parts.length - 1][0] : "";
  
  return lastInitial ? `${firstName} ${lastInitial}.` : firstName;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CommunityEmailRequest {
  subject: string;
  body: string;
  recipients: string[];
  communityName: string;
  senderName: string;
}

interface LeaderboardEntry {
  name: string;
  points: number;
}

interface UserData {
  id: string;
  email: string;
  name: string;
  points: number;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subject, body, recipients, communityName, senderName }: CommunityEmailRequest = await req.json();

    console.log(`📧 Sending community email to ${recipients.length} recipients for ${communityName}`);

    // Validate required fields
    if (!subject || !body || !recipients?.length || !communityName) {
      throw new Error("Missing required fields: subject, body, recipients, or communityName");
    }

    // Fetch leaderboard data for this specific community, excluding test users
    const { data: leaderboardData, error: leaderboardError } = await supabase
      .from('users')
      .select(`
        name, 
        points, 
        street_name,
        household_hoa!inner(hoa_name)
      `)
      .eq('is_verified', true)
      .not('email', 'in', '("davebirnbaum@gmail.com","clkramer@gmail.com")')
      .eq('household_hoa.hoa_name', communityName)
      .order('points', { ascending: false })
      .limit(5);

    if (leaderboardError) {
      console.error("Error fetching leaderboard:", leaderboardError);
    }

    // Create leaderboard text with street names
    const leaderboard = leaderboardData ? leaderboardData.map((user: any, index: number) => {
      const medals = ['🥇', '🥈', '🥉', '🏅', '⭐'];
      const displayName = formatNameWithLastInitial(user.name || 'Neighbor');
      const streetName = user.street_name || 'Unknown Street';
      return `${medals[index]} ${displayName} on ${streetName} – ${user.points} pts`;
    }).join('\n') : '🥇 Loading leaderboard...';

    // Fetch all user data to get individual emails and generate invite links
    const { data: allUsers, error: usersError } = await supabase
      .from('users')
      .select('id, email, name, points')
      .eq('is_verified', true)
      .in('email', recipients);

    if (usersError) {
      console.error("Error fetching user data:", usersError);
      throw new Error("Failed to fetch user data for personalization");
    }

    // Send personalized emails to each user
    const emailPromises = allUsers.map(async (user: any) => {
      // Generate a unique invite token for this user to share
      const inviteToken = crypto.randomUUID();
      
      // Convert community name to slug format
      const communitySlug = communityName.toLowerCase().replace(/\s+/g, '-');
      
      // Create invite record in the database for tracking
      const { error: inviteError } = await supabase
        .from('invitations')
        .insert({
          invite_token: inviteToken,
          invited_by: user.id,
          community_name: communityName,
          community_slug: communitySlug,
          status: 'pending'
        });
      
      if (inviteError) {
        console.error(`Error creating invite record for user ${user.id}:`, inviteError);
      }
      
      // Generate proper custom invite link
      const inviteLink = `https://courtneys-list.com/invite/${inviteToken}`;
      
      // Generate view latest list link
      const viewListLink = `https://courtneys-list.com/community-preview/${communitySlug}`;
      
      const personalizedBody = body
        .replace('{{LEADERBOARD}}', leaderboard)
        .replace('{{INVITE_LINK}}', inviteLink)
        .replace('{{VIEW_LIST_LINK}}', viewListLink);

      return resend.emails.send({
        from: `${senderName} <noreply@courtneys-list.com>`,
        to: [user.email],
        subject: subject,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.6;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">${communityName}</h1>
              <p style="margin: 5px 0 0; opacity: 0.9;">Neighbor Updates</p>
            </div>
            
            <div style="background: white; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
              <div style="white-space: pre-wrap; color: #2d3748; font-size: 16px;">
${personalizedBody}
              </div>
              
              <div style="margin-top: 20px; text-align: center;">
                <a href="${communitySlug ? `https://courtneys-list.com/community-preview/${communitySlug}` : '#'}" 
                   style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 10px 0;">
                  📋 View Latest List
                </a>
              </div>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center;">
                <p style="color: #718096; font-size: 14px; margin: 0;">
                  This email was sent to verified members of ${communityName}
                </p>
                <p style="color: #718096; font-size: 12px; margin: 5px 0 0;">
                  You received this because you're part of our community directory.
                </p>
              </div>
            </div>
          </div>
        `,
      });
    });

    const emailResults = await Promise.all(emailPromises);
    console.log("✅ All personalized emails sent successfully");

    return new Response(JSON.stringify({
      success: true,
      recipientCount: recipients.length,
      emailsSent: emailResults.length
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("❌ Error in send-community-email function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);