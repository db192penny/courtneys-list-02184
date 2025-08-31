import { supabase } from '@/integrations/supabase/client';
import { sendInviteNotification } from './send-invite-email';

export async function handleSignupInvite(userId: string) {
  console.log('🔗 [handleSignupInvite] Starting modern invite processing for user:', userId);
  
  try {
    const inviteCode = localStorage.getItem('pending_invite_code');
    const inviterId = localStorage.getItem('pending_inviter_id');
    
    console.log('🔍 [handleSignupInvite] Retrieved invite data from localStorage:', {
      hasInviteCode: !!inviteCode,
      hasInviterId: !!inviterId,
      inviteCodePreview: inviteCode?.substring(0, 8) + '...'
    });
    
    if (!inviteCode || !inviterId || !userId) {
      console.log('⚠️ [handleSignupInvite] Missing invite data:', { inviteCode, inviterId, userId });
      return;
    }

    console.log('✅ [handleSignupInvite] All invite data present, processing...');

    // Check the simple_invites table AND get inviter data in same query to avoid RLS
    console.log('🔍 [handleSignupInvite] Checking invite and fetching inviter data...');
    const { data: inviteData } = await supabase
      .from('simple_invites' as any)
      .select(`
        *,
        inviter:users!simple_invites_inviter_id_fkey(
          id,
          email,
          name,
          points
        )
      `)
      .eq('code', inviteCode)
      .eq('inviter_id', inviterId)
      .is('used_by', null)
      .single();

    if (!inviteData) {
      console.log('❌ [handleSignupInvite] Invite not found or already used');
      return;
    }

    // Extract inviter info from the joined query
    const inviterInfo = (inviteData as any).inviter;
    console.log('📧 [handleSignupInvite] Inviter info from join:', inviterInfo);

    console.log('✅ [handleSignupInvite] Valid invite found, marking as used...');

    // Mark invite as used
    await supabase
      .from('simple_invites' as any)
      .update({ 
        used_by: userId,
        used_at: new Date().toISOString()
      })
      .eq('id', (inviteData as any).id);

    // Award 10 points to inviter
    console.log('💰 [handleSignupInvite] Awarding 10 points to inviter...');
    await supabase
      .from('users')
      .update({ 
        points: (inviterInfo?.points || 0) + 10
      })
      .eq('id', inviterId);

    // Log the point transaction for history
    console.log('📝 [handleSignupInvite] Logging point transaction...');
    await supabase
      .from('user_point_history')
      .insert({
        user_id: inviterId,
        points_earned: 10,
        activity_type: 'successful_invite',
        description: `Invited user successfully`
      });

    // Update invited_by for new user
    console.log('👥 [handleSignupInvite] Recording invitation relationship...');
    await supabase
      .from('users')
      .update({ 
        invited_by: inviterId 
      })
      .eq('id', userId);

    console.log('🎉 [handleSignupInvite] Invite processed successfully!');
    
    // Send email notification to inviter - use data from join query
    console.log('🚨📧 [handleSignupInvite] ABOUT TO CALL sendInviteNotification');
    console.log('📧 [handleSignupInvite] Using inviter data:', {
      email: inviterInfo?.email,
      name: inviterInfo?.name
    });
    
    if (inviterInfo?.email) {
      await sendInviteNotification(inviterId, inviterInfo.email, inviterInfo.name);
      console.log('✅📧 [handleSignupInvite] sendInviteNotification completed');
    } else {
      console.error('❌📧 [handleSignupInvite] No inviter email available - cannot send notification');
    }
    
    // Clean up
    console.log('🧹 [handleSignupInvite] Cleaning up localStorage...');
    localStorage.removeItem('pending_invite_code');
    localStorage.removeItem('pending_inviter_id');
    
    console.log('✅ [handleSignupInvite] Modern invite processing completed successfully');
  } catch (error) {
    console.error('💥 [handleSignupInvite] Error processing invite:', error);
    console.error('💥 [handleSignupInvite] Error stack:', error?.stack);
  }
}