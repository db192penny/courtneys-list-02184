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

    // Check invite validity
    console.log('🔍 [handleSignupInvite] Checking invite validity...');
    const { data: invite } = await supabase
      .from('simple_invites' as any)
      .select('*')
      .eq('code', inviteCode)
      .eq('inviter_id', inviterId)
      .is('used_by', null)
      .single();

    if (!invite) {
      console.log('❌ [handleSignupInvite] Invite not found or already used');
      return;
    }

    console.log('✅ [handleSignupInvite] Valid invite found, marking as used...');

    // Mark invite as used
    await supabase
      .from('simple_invites' as any)
      .update({ 
        used_by: userId,
        used_at: new Date().toISOString()
      })
      .eq('id', (invite as any).id);

    // Get inviter info using database function (bypasses RLS)
    console.log('💰 [handleSignupInvite] Fetching inviter info via database function...');
    const { data: inviterData, error: inviterError } = await supabase
      .rpc('get_inviter_info' as any, { p_inviter_id: inviterId });

    let inviterEmail: string | undefined;
    let inviterName: string | undefined;
    let inviterPoints = 0;

    if (!inviterError && inviterData && inviterData.length > 0) {
      inviterEmail = inviterData[0].email;
      inviterName = inviterData[0].name;
      inviterPoints = inviterData[0].points || 0;
      console.log('📧 [handleSignupInvite] Got inviter info via function:', { email: inviterEmail, name: inviterName });
    } else {
      console.log('⚠️ [handleSignupInvite] Could not fetch inviter info:', inviterError);
    }

    // Award 10 points to inviter
    console.log('💰 [handleSignupInvite] Awarding 10 points to inviter...');
    await supabase
      .from('users')
      .update({ 
        points: inviterPoints + 10
      })
      .eq('id', inviterId);

    // Log the point transaction
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
    
    // Send email notification if we have the email
    if (inviterEmail) {
      console.log('🚨📧 [handleSignupInvite] Sending email to:', inviterEmail);
      await sendInviteNotification(inviterId, inviterEmail, inviterName);
      console.log('✅📧 [handleSignupInvite] Email sent');
    } else {
      console.log('⚠️📧 [handleSignupInvite] No email available - check email_queue table');
    }
    
    // Clean up
    console.log('🧹 [handleSignupInvite] Cleaning up localStorage...');
    localStorage.removeItem('pending_invite_code');
    localStorage.removeItem('pending_inviter_id');
    
    console.log('✅ [handleSignupInvite] Modern invite processing completed successfully');
  } catch (error) {
    console.error('💥 [handleSignupInvite] Error processing invite:', error);
  }
}