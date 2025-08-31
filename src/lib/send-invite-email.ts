import { supabase } from '@/integrations/supabase/client';

export async function sendInviteNotification(inviterId: string) {
  console.log('[sendInviteNotification] Starting with inviterId:', inviterId);
  
  try {
    // Fixed query - removed 'as any' that was causing 406 errors
    const { data: inviter, error } = await supabase
      .from('users')
      .select('email, name')
      .eq('id', inviterId)
      .single();
    
    console.log('[sendInviteNotification] Query result:', { inviter, error });
    
    if (error || !inviter?.email) {
      console.error('[sendInviteNotification] No inviter found or no email:', error);
      return;
    }
    
    console.log('[sendInviteNotification] Calling send-invite-success-email for:', inviter.email);
    
    // Use the existing send-invite-success-email function
    const { data, error: emailError } = await supabase.functions.invoke('send-invite-success-email', {
      body: {
        inviterId: inviterId,
        inviterName: inviter.name || 'Neighbor',
        inviterEmail: inviter.email,
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