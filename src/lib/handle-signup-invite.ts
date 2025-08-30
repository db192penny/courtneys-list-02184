import { supabase } from '@/integrations/supabase/client';

export async function handleSignupInvite(userId: string) {
  try {
    const inviteCode = localStorage.getItem('pending_invite_code');
    const inviterId = localStorage.getItem('pending_inviter_id');
    
    if (!inviteCode || !inviterId || !userId) return;

    // Get inviter's current points
    const { data: inviter } = await supabase
      .from('users')
      .select('points, pending_invite_code')
      .eq('id', inviterId)
      .single();

    // Verify the invite code matches
    if (inviter?.pending_invite_code === inviteCode) {
      // Award 10 points to inviter
      await supabase
        .from('users')
        .update({ 
          points: (inviter.points || 0) + 10,
          pending_invite_code: null // Clear used code
        })
        .eq('id', inviterId);

      // Track who invited this user
      await supabase
        .from('users')
        .update({ 
          invited_by: inviterId 
        })
        .eq('id', userId);
    }

    // Clean up
    localStorage.removeItem('pending_invite_code');
    localStorage.removeItem('pending_inviter_id');
  } catch (error) {
    console.error('Error processing invite:', error);
  }
}