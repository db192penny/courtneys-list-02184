import { supabase } from '@/integrations/supabase/client';

export async function sendInviteNotification(inviterId: string) {
  console.log('🎉 [sendInviteNotification] Starting invite notification for inviter:', inviterId);
  
  try {
    console.log('📊 [sendInviteNotification] Fetching inviter data from database...');
    const { data: inviter, error: fetchError } = await supabase
      .from('users')
      .select('email, name, points')
      .eq('id', inviterId)
      .single();

    if (fetchError) {
      console.error('❌ [sendInviteNotification] Database error fetching inviter:', fetchError);
      return;
    }

    if (!inviter) {
      console.log('⚠️ [sendInviteNotification] No inviter found in database for ID:', inviterId);
      return;
    }

    if (!inviter.email) {
      console.log('⚠️ [sendInviteNotification] No email found for inviter:', inviterId);
      return;
    }

    console.log('✅ [sendInviteNotification] Inviter data retrieved:', {
      email: inviter.email,
      name: inviter.name,
      points: inviter.points
    });

    console.log('📧 [sendInviteNotification] Calling send-email function...');
    const emailPayload = {
      to: inviter.email,
      subject: 'Your invite was accepted! 🎉',
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <h2>Congratulations!</h2>
          <p>Hi ${inviter.name || 'Neighbor'},</p>
          <p>Great news! Someone just joined Courtney's List using your invite link.</p>
          <p>You've earned <strong>10 points</strong> for helping grow our community!</p>
          <p>Your total points: <strong>${inviter.points || 0}</strong></p>
          <p>Thank you for making our neighborhood stronger. Keep inviting!</p>
          <br>
          <p>Best regards,<br>The Courtney's List Team</p>
        </div>
      `,
      text: `Hi ${inviter.name || 'Neighbor'}, Someone just joined using your invite! You earned 10 points. Total points: ${inviter.points || 0}.`
    };

    console.log('📧 [sendInviteNotification] Email payload prepared:', {
      to: emailPayload.to,
      subject: emailPayload.subject
    });

    const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-email', {
      body: emailPayload
    });

    if (emailError) {
      console.error('❌ [sendInviteNotification] Error calling send-email function:', emailError);
      console.error('❌ [sendInviteNotification] Full error details:', JSON.stringify(emailError, null, 2));
    } else {
      console.log('✅ [sendInviteNotification] send-email function called successfully');
      console.log('📧 [sendInviteNotification] Email result:', emailResult);
      console.log('🎉 [sendInviteNotification] Invite success email sent to:', inviter.email);
    }
  } catch (error) {
    console.error('💥 [sendInviteNotification] Unexpected error:', error);
    console.error('💥 [sendInviteNotification] Error stack:', error?.stack);
  }
}