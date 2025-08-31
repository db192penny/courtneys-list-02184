import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';
import { Resend } from 'npm:resend@2.0.0';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const resend = new Resend(RESEND_API_KEY);
const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailQueueItem {
  id: string;
  to_email: string;
  template: string;
  data: any;
  sent: boolean;
  created_at: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[process-email-queue] Starting email queue processing...');
    
    // Get unprocessed emails from queue
    const { data: queuedEmails, error: queueError } = await supabase
      .from('email_queue')
      .select('*')
      .eq('sent', false)
      .order('created_at', { ascending: true })
      .limit(10); // Process in batches

    if (queueError) {
      console.error('[process-email-queue] Error fetching queue:', queueError);
      throw queueError;
    }

    if (!queuedEmails || queuedEmails.length === 0) {
      console.log('[process-email-queue] No emails in queue to process');
      return new Response(JSON.stringify({ processed: 0, message: 'No emails to process' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    console.log(`[process-email-queue] Processing ${queuedEmails.length} emails`);
    
    let processed = 0;
    let errors = 0;

    for (const email of queuedEmails as EmailQueueItem[]) {
      try {
        console.log(`[process-email-queue] Processing email ${email.id} (${email.template})`);
        
        let emailContent;
        
        switch (email.template) {
          case 'invite_success':
            emailContent = await generateInviteSuccessEmail(email.data);
            break;
          case 'welcome':
            emailContent = await generateWelcomeEmail(email.data);
            break;
          case 'generic':
            emailContent = {
              subject: email.data.subject || 'Notification',
              html: email.data.html || email.data.text || 'Hello!'
            };
            break;
          default:
            console.warn(`[process-email-queue] Unknown template: ${email.template}`);
            continue;
        }

        // Send email via Resend
        const emailResponse = await resend.emails.send({
          from: "Courtney's List <noreply@courtneys-list.com>",
          to: [email.to_email],
          subject: emailContent.subject,
          html: emailContent.html,
        });

        if (emailResponse.error) {
          console.error(`[process-email-queue] Resend error for ${email.id}:`, emailResponse.error);
          errors++;
          continue;
        }

        console.log(`[process-email-queue] Email sent successfully: ${email.id}`);

        // Mark as sent
        const { error: updateError } = await supabase
          .from('email_queue')
          .update({ sent: true })
          .eq('id', email.id);

        if (updateError) {
          console.error(`[process-email-queue] Error marking email as sent: ${email.id}`, updateError);
          errors++;
        } else {
          processed++;
        }

        // Rate limiting - small delay between emails
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (emailError) {
        console.error(`[process-email-queue] Error processing email ${email.id}:`, emailError);
        errors++;
      }
    }

    const result = {
      processed,
      errors,
      total: queuedEmails.length,
      message: `Processed ${processed} emails successfully, ${errors} errors`
    };

    console.log('[process-email-queue] Batch complete:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('[process-email-queue] Fatal error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

async function generateInviteSuccessEmail(data: any) {
  const { inviterName, inviterEmail, invitedName = 'New Member', communityName = 'Boca Bridges', inviterId } = data;
  
  // Get inviter's current stats with service role privileges
  let leaderboardInfo = '';
  let badgeInfo = '';
  
  try {
    // Get leaderboard position
    const { data: leaderboard } = await supabase.rpc('get_user_leaderboard_position', {
      _user_id: inviterId,
      _community_name: communityName
    });
    
    if (leaderboard && leaderboard.length > 0) {
      const position = leaderboard[0];
      leaderboardInfo = `
        <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <h3 style="color: #1e293b; margin: 0 0 8px 0;">🏆 Your Community Standing</h3>
          <p style="margin: 0; color: #475569;">You're ranked #${position.rank_position} out of ${position.total_users} members with ${position.points} points!</p>
        </div>
      `;
    }
    
    // Get badge level
    const { data: badgeLevels } = await supabase
      .from('badge_levels')
      .select('*')
      .order('min_points', { ascending: true });
    
    if (badgeLevels && badgeLevels.length > 0) {
      const userPoints = leaderboard?.[0]?.points || 0;
      const currentBadge = badgeLevels.reverse().find(b => userPoints >= b.min_points);
      const nextBadge = badgeLevels.find(b => userPoints < b.min_points);
      
      if (currentBadge) {
        badgeInfo = `
          <div style="background: #f0f9ff; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <h3 style="color: #0369a1; margin: 0 0 8px 0;">🎖️ Current Badge: ${currentBadge.name}</h3>
            ${nextBadge ? `<p style="margin: 0; color: #0284c7;">Next badge "${nextBadge.name}" at ${nextBadge.min_points} points (${nextBadge.min_points - userPoints} to go!)</p>` : '<p style="margin: 0; color: #0284c7;">You\'ve reached the highest badge level!</p>'}
          </div>
        `;
      }
    }
  } catch (error) {
    console.error('[generateInviteSuccessEmail] Error fetching user stats:', error);
  }

  const subject = `🎉 Great news ${inviterName}! Your invite worked!`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #059669; text-align: center;">🎉 Invite Success!</h1>
      
      <p style="font-size: 16px; line-height: 1.5; color: #374151;">
        Hi ${inviterName},
      </p>
      
      <p style="font-size: 16px; line-height: 1.5; color: #374151;">
        Fantastic news! ${invitedName} just joined ${communityName} using your invite code. 
        <strong style="color: #059669;">You've earned 10 bonus points!</strong> 🎯
      </p>
      
      ${leaderboardInfo}
      ${badgeInfo}
      
      <div style="background: #ecfdf5; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
        <h3 style="color: #065f46; margin: 0 0 8px 0;">Keep Growing Our Community!</h3>
        <p style="margin: 0; color: #047857;">Every new member makes our neighborhood stronger. Share your experience and help others discover great local vendors!</p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://courtneys-list.com/dashboard" style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          View Your Dashboard
        </a>
      </div>
      
      <p style="font-size: 14px; color: #6b7280; text-align: center; margin-top: 30px;">
        Thanks for helping grow our ${communityName} community!<br>
        <strong>Courtney's List Team</strong>
      </p>
    </div>
  `;

  return { subject, html };
}

async function generateWelcomeEmail(data: any) {
  const { userName = 'Neighbor', communityName = 'Community' } = data;
  
  const subject = `Welcome to ${communityName}, ${userName}! 🏡`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #059669; text-align: center;">Welcome to ${communityName}! 🏡</h1>
      
      <p style="font-size: 16px; line-height: 1.5; color: #374151;">
        Hi ${userName},
      </p>
      
      <p style="font-size: 16px; line-height: 1.5; color: #374151;">
        Welcome to Courtney's List! We're excited to have you as part of our ${communityName} community.
      </p>
      
      <div style="background: #f0f9ff; padding: 16px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #0369a1; margin: 0 0 12px 0;">🚀 Get Started:</h3>
        <ul style="margin: 0; padding-left: 20px; color: #0284c7;">
          <li>Browse and rate local vendors</li>
          <li>Share cost information to help neighbors</li>
          <li>Earn points and badges for your contributions</li>
          <li>Connect with your community</li>
        </ul>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://courtneys-list.com/dashboard" style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Explore Your Dashboard
        </a>
      </div>
      
      <p style="font-size: 14px; color: #6b7280; text-align: center; margin-top: 30px;">
        Welcome to the neighborhood!<br>
        <strong>Courtney's List Team</strong>
      </p>
    </div>
  `;

  return { subject, html };
}