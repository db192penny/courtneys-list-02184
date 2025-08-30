import { supabase } from '@/integrations/supabase/client';




export async function processInviteCode(userId: string, inviteCode: string, inviterId: string) {
  try {
    // First check if this invite code matches the inviter's pending code
    const { data: inviter } = await supabase
      .from('users')
      .select('pending_invite_code, points')
      .eq('id', inviterId)
      .single();




    if (!inviter || inviter.pending_invite_code !== inviteCode) {
      console.log('Invalid invite code');
      return false;
    }




    // Award 10 points to inviter
    await supabase
      .from('users')
      .update({ 
        points: (inviter.points || 0) + 10,
        pending_invite_code: null // Clear the used code
      })
      .eq('id', inviterId);




    // Track who invited this user
    await supabase
      .from('users')
      .update({ 
        invited_by: inviterId 
      })
      .eq('id', userId);




    return true;
  } catch (error) {
    console.error('Error processing invite:', error);
    return false;
  }
}