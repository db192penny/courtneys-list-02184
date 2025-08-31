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

    // First, just check if invite exists and is valid
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

    // Now try a separate query for inviter info using raw SQL
    console.log('💰 [handleSignupInvite] Fetching inviter info via SQL...');
    const { data: inviterData, error: inviterError } = await supabase.rpc('get_inviter_info' as any, {
      inviter_id: inviterId
    });

    let inviterEmail = inviterData?.email;
    let inviterName = inviterData?.name;
    let inviterPoints = inviterData?.points || 0;

    if (inviterError) {
      console.log('⚠️ [handleSignupInvite] Could not fetch inviter info, continuing without email');
    } else {
      console.log('📧 [handleSignupInvite] Got inviter info:', { email: inviterEmail, name: inviterName });
    }

    // Award 10 points to inviter
    console.log('💰 [handleSignupInvite] Awarding 10 points to inviter...');
    await supabase
      .from('users')
      .update({ 
        points: inviterPoints + 10
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
    
    // Send email notification if we have the email
    if (inviterEmail) {
      console.log('🚨📧 [handleSignupInvite] Sending email to:', inviterEmail);
      await sendInviteNotification(inviterId, inviterEmail, inviterName);
      console.log('✅📧 [handleSignupInvite] Email sent');
    } else {
      console.log('⚠️📧 [handleSignupInvite] No email available - but check email_queue table!');
      // The trigger you created will handle it via email_queue
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