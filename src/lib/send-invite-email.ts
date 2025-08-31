import { supabase } from '@/integrations/supabase/client';

export async function sendInviteNotification(inviterId: string, inviterEmail?: string, inviterName?: string) {
  console.log('[sendInviteNotification] Starting with:', { inviterId, inviterEmail, inviterName });
  
  try {
    // If email not provided, we can't send
    if (!inviterEmail) {
      console.log('[sendInviteNotification] No email provided, attempting to fetch...');
      // This will likely fail due to RLS, but try anyway
      const { data: inviter } = await supabase
        .from('users')
        .select('email, name')
        .eq('id', inviterId)
        .single();
      
      if (!inviter?.email) {
        console.error('[sendInviteNotification] Cannot get inviter email due to RLS');
        return;
      }
      inviterEmail = inviter.email;
      inviterName = inviter.name;
    }
    
    console.log('[sendInviteNotification] Sending email to:', inviterEmail);
    
    // Call the edge function
    const { data, error: emailError } = await supabase.functions.invoke('send-invite-success-email', {
      body: {
        inviterId: inviterId,
        inviterName: inviterName || 'Neighbor',
        inviterEmail: inviterEmail,
        invitedName: 'New Member',
        communityName: 'Boca Bridges',
        communitySlug: 'boca-bridges'
      }
    });
    
    if (emailError) {
      console.error('[sendInviteNotification] Email error:', emailError);
    } else {
      console.log('[sendInviteNotification] Email sent successfully');
    }
  } catch (error) {
    console.error('[sendInviteNotification] Unexpected error:', error);
  }
}