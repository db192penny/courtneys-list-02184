import { supabase } from '@/integrations/supabase/client';

export async function sendInviteNotification(inviterId: string) {
  console.log('[sendInviteNotification] Starting with inviterId:', inviterId);
  
  try {
    // Get inviter's basic info - cast to any to bypass TypeScript
    const { data: inviter, error: fetchError } = await supabase
      .from('users' as any)
      .select('email, name, points')
      .eq('id', inviterId)
      .single() as any;

    console.log('[sendInviteNotification] Inviter data:', inviter);
    
    if (fetchError || !inviter || !inviter.email) {
      console.error('[sendInviteNotification] No inviter found or no email:', fetchError);
      return;
    }

    console.log('[sendInviteNotification] Sending email to:', inviter.email);

    // Call the simple send-email function
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        to: inviter.email,
        subject: 'Your invite was accepted! 🎉',
        html: `
          <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
            <h2>Congratulations!</h2>
            <p>Hi ${inviter.name || 'Neighbor'},</p>
            <p>Someone just joined Courtney's List using your invite link!</p>
            <p>You've earned <strong>10 points</strong> for helping grow our community.</p>
            <p>Your total points: <strong>${inviter.points || 0}</strong></p>
            <br>
            <p>Keep inviting neighbors!</p>
            <p>Best regards,<br>The Courtney's List Team</p>
          </div>
        `,
        text: `Hi ${inviter.name || 'Neighbor'}, someone joined using your invite! You earned 10 points. Total points: ${inviter.points || 0}.`
      }
    });

    if (error) {
      console.error('[sendInviteNotification] Email error:', error);
    } else {
      console.log('[sendInviteNotification] Email sent successfully');
    }
  } catch (error) {
    console.error('[sendInviteNotification] Unexpected error:', error);
  }
}