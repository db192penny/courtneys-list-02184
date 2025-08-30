import { supabase } from '@/integrations/supabase/client';

export async function sendInviteNotification(inviterId: string) {
  try {
    // Get inviter's information and community details
    const { data: inviter } = await supabase
      .from('users')
      .select('email, name, address')
      .eq('id', inviterId)
      .single();

    if (!inviter?.email) return;

    // Get community info from household_hoa
    const { data: household } = await supabase
      .from('household_hoa')
      .select('hoa_name')
      .eq('normalized_address', inviter.address?.toLowerCase().trim())
      .single();

    // Call the Supabase edge function to send the invite success email
    const { error } = await supabase.functions.invoke('send-invite-success-email', {
      body: {
        inviterId: inviterId,
        inviterName: inviter.name || 'Neighbor',
        inviterEmail: inviter.email,
        invitedName: 'New Member', // We don't have the invited person's name in this context
        communityName: household?.hoa_name || 'Your Community',
        communitySlug: household?.hoa_name?.toLowerCase().replace(/\s+/g, '-') || 'community'
      }
    });

    if (error) {
      console.error('Error sending invite success email:', error);
    } else {
      console.log(`Invite success email sent to ${inviter.email}`);
    }
  } catch (error) {
    console.error('Error sending invite notification:', error);
  }
}