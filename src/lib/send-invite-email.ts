import { supabase } from '@/integrations/supabase/client';

export async function sendInviteNotification(inviterId: string) {
  try {
    // Get inviter's email
    const { data: inviter } = await supabase
      .from('users')
      .select('email, name')
      .eq('id', inviterId)
      .single();

    if (!inviter?.email) return;

    // If you have Resend configured, you can send the email here
    // For now, we'll just log it
    console.log(`Would send email to ${inviter.email}: Someone joined using your invite!`);
    
    // If Resend is set up in your project:
    // await resend.emails.send({
    //   from: 'noreply@yoursite.com',
    //   to: inviter.email,
    //   subject: 'Someone joined using your invite!',
    //   html: `<p>Hi ${inviter.name}, someone just joined using your invite link! You earned 10 points!</p>`
    // });
  } catch (error) {
    console.error('Error sending email:', error);
  }
}