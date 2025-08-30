import { supabase } from '@/integrations/supabase/client';

export async function sendInviteNotification(inviterId: string) {
  try {
    // Get inviter's info
    const { data: inviter } = await supabase
      .from('users')
      .select('email, name, points')
      .eq('id', inviterId)
      .single();

    if (!inviter?.email) {
      console.log('No email found for inviter');
      return;
    }

    // Call your existing Resend edge function
    const { error } = await supabase.functions.invoke('send-email', {
      body: {
        to: inviter.email,
        subject: 'Your invite was accepted! 🎉',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #4A90E2; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
                .points { font-size: 24px; color: #4A90E2; font-weight: bold; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Congratulations!</h1>
                </div>
                <div class="content">
                  <p>Hi ${inviter.name || 'Neighbor'},</p>
                  <p>Great news! Someone just joined Courtney's List using your invite link.</p>
                  <p>You've earned <span class="points">10 points</span> for helping grow our community!</p>
                  <p>Your total points: <strong>${inviter.points || 0}</strong></p>
                  <p>Thank you for making our neighborhood stronger. Keep inviting!</p>
                  <br>
                  <p>Best regards,<br>The Courtney's List Team</p>
                </div>
              </div>
            </body>
          </html>
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