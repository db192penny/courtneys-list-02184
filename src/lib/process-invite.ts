import { supabase } from '@/integrations/supabase/client';
import { sendInviteNotification } from './send-invite-email';




export async function processInviteCode(userId: string, inviteCode: string, inviterId: string) {
  console.log('🔗 [processInviteCode] Starting legacy invite processing:', {
    userId,
    inviteCode: inviteCode?.substring(0, 8) + '...',
    inviterId
  });
  
  try {
    // First check if this invite code matches the inviter's pending code
    console.log('🔍 [processInviteCode] Checking invite code validity...');
    const { data: inviter } = await supabase
      .from('users')
      .select('pending_invite_code, points')
      .eq('id', inviterId)
      .single();

    if (!inviter || inviter.pending_invite_code !== inviteCode) {
      console.log('❌ [processInviteCode] Invalid invite code or inviter not found');
      return false;
    }

    console.log('✅ [processInviteCode] Valid invite code found, processing...');

    // Award 10 points to inviter
    console.log('💰 [processInviteCode] Awarding 10 points to inviter...');
    await supabase
      .from('users')
      .update({ 
        points: (inviter.points || 0) + 10,
        pending_invite_code: null // Clear the used code
      })
      .eq('id', inviterId);

    // Send invite notification email
    console.log('📧 [processInviteCode] Calling sendInviteNotification...');
    await sendInviteNotification(inviterId);

    // Track who invited this user
    console.log('👥 [processInviteCode] Recording invitation relationship...');
    await supabase
      .from('users')
      .update({ 
        invited_by: inviterId 
      })
      .eq('id', userId);

    console.log('🎉 [processInviteCode] Legacy invite processing completed successfully');
    return true;
  } catch (error) {
    console.error('💥 [processInviteCode] Error processing invite:', error);
    return false;
  }
}