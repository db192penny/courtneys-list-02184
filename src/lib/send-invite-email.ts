import { supabase } from '@/integrations/supabase/client';

export async function sendInviteNotification(inviterId: string) {
  try {
    const { data: inviter } = await supabase
      .from('users')
      .select('email, name, points')
      .eq('id', inviterId)
      .single();

    if (!inviter?.email) {
      console.log('No email found for inviter');
      return;
    }

    const { error } = await supabase.functions.invoke('send-email', {
      body: {
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
      }
    });

    if (error) {
      console.error('Error sending email:', error);
    } else {
      console.log('Invite success email sent to:', inviter.email);
    }
  } catch (error) {
    console.error('Error in sendInviteNotification:', error);
  }
}