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

    // Test mode - just log for now
    console.log('=================================');
    console.log('EMAIL WOULD BE SENT:');
    console.log('To:', inviter.email);
    console.log('Name:', inviter.name || 'Neighbor');
    console.log('=================================');
    
    // Later, uncomment this to actually send:
    /*
    const { data, error: emailError } = await supabase.functions.invoke('send-email', {
      body: {
        to: inviter.email,
        subject: 'Your invite was accepted! 🎉',
        html: '<p>Someone joined using your invite! You earned 10 points.</p>',
        text: 'Someone joined using your invite! You earned 10 points.'
      }
    });
    console.log('[sendInviteNotification] Email result:', { data, emailError });
    */
    
  } catch (error) {
    console.error('[sendInviteNotification] Error:', error);
  }
}