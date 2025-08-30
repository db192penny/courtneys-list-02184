import { supabase } from '@/integrations/supabase/client';

export async function handleSignupInvite(userId: string) {
  try {
    const inviteCode = localStorage.getItem('pending_invite_code');
    const inviterId = localStorage.getItem('pending_inviter_id');
    
    if (!inviteCode || !inviterId || !userId) {
      console.log('Missing invite data:', { inviteCode, inviterId, userId });
      return;
    }

    console.log('Processing invite:', { inviteCode, inviterId, userId });

    // Check the simple_invites table
    const { data: invite } = await supabase
      .from('simple_invites' as any)
      .select('*')
      .eq('code', inviteCode)
      .eq('inviter_id', inviterId)
      .is('used_by', null)
      .single();

    if (!invite) {
      console.log('Invite not found or already used');
      return;
    }

    // Mark invite as used
    await supabase
      .from('simple_invites' as any)
      .update({ 
        used_by: userId,
        used_at: new Date().toISOString()
      })
      .eq('id', (invite as any).id);

    // Get inviter's current points
    const { data: inviter } = await supabase
      .from('users')
      .select('points')
      .eq('id', inviterId)
      .single();

    // Award 10 points to inviter
    await supabase
      .from('users')
      .update({ 
        points: (inviter?.points || 0) + 10
      })
      .eq('id', inviterId);

    // Update invited_by for new user
    await supabase
      .from('users')
      .update({ 
        invited_by: inviterId 
      })
      .eq('id', userId);

    console.log('Invite processed successfully!');
    
    // Clean up
    localStorage.removeItem('pending_invite_code');
    localStorage.removeItem('pending_inviter_id');
  } catch (error) {
    console.error('Error processing invite:', error);
  }
}