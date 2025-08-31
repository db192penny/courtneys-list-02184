import { supabase } from '@/integrations/supabase/client';

export async function sendInviteNotification(inviterId: string) {
  console.log('[sendInviteNotification] START with inviterId:', inviterId);
  
  try {
    // Simplified - just get email, skip points
    const { data: inviter, error } = await supabase
      .from('users' as any)
      .select('email, name')  // Removed 'points'
      .eq('id', inviterId)
      .single() as any;

    console.log('[sendInviteNotification] Query result:', { inviter, error });

    if (!inviter?.email) {
      console.error('[sendInviteNotification] No email found');
      return;
    }

    console.log('[sendInviteNotification] Sending to:', inviter.email);

    const { data, error: emailError } = await supabase.functions.invoke('send-email', {
      body: {
        to: inviter.email,
        subject: 'Your invite was accepted! 🎉',
        html: `<div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <h2>Congratulations!</h2>
          <p>Hi ${inviter.name || 'Neighbor'},</p>
          <p>Someone just joined using your invite! You earned 10 points.</p>
        </div>`,
        text: 'Someone joined using your invite! You earned 10 points.'
      }
    });
    console.log('[sendInviteNotification] Email result:', { data, emailError });
    
  } catch (error) {
    console.error('[sendInviteNotification] Error:', error);
  }
}