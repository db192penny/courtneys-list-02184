import { supabase } from '@/integrations/supabase/client';
import { sendInviteNotification } from './send-invite-email';

export async function handleSignupInvite(userId: string) {
  console.log('🔗 [handleSignupInvite] Starting modern invite processing for user:', userId);
  
  // Store inviter email/name to use later
  let inviterEmail: string | undefined;
  let inviterName: string | undefined;
  
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

    // Check the simple_invites table
    console.log('🔍 [handleSignupInvite] Checking simple_invites table...');
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

    // Try to get inviter's data using service role if available, otherwise it will fail gracefully
    console.log('💰 [handleSignupInvite] Attempting to fetch inviter data...');
    try {
      const { data: inviter } = await supabase
        .from('users' as any)
        .select('points, email, name')
        .eq('id', inviterId)
        .single();
      
      if (inviter) {
        inviterEmail = inviter.email;
        inviterName = inviter.name;
        console.log('📧 [handleSignupInvite] Got inviter email:', inviterEmail);
        
        // Award points using fetched data
        await supabase
          .from('users')
          .update({ 
            points: (inviter.points || 0) + 10
          })
          .eq('id', inviterId);
      } else {
        // Fallback: just add 10 points without fetching current value
        console.log('⚠️ [handleSignupInvite] Could not fetch inviter data, using fallback');
        await supabase.rpc('increment' as any, {
          x: 10,
          row_id: inviterId,
          table_name: 'users',
          column_name: 'points'
        }).catch(() => {
          // If RPC doesn't exist, try raw SQL
          return supabase.from('users').update({ 
            points: supabase.raw('points + 10' as any)
          }).eq('id', inviterId);
        });
      }
    } catch (error) {
      console.log('⚠️ [handleSignupInvite] Error fetching inviter, using fallback:', error);
      // Just update points without fetching
      await supabase.from('users').update({ 
        points: supabase.raw('points + 10' as any)
      }).eq('id', inviterId);
    }

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
      console.log('⚠️📧 [handleSignupInvite] No email available - points awarded but no notification sent');
      // Optionally: Store a pending notification to send later
      await supabase
        .from('pending_notifications' as any)
        .insert({
          type: 'invite_success',
          user_id: inviterId,
          data: { invited_user_id: userId }
        })
        .catch(() => console.log('Could not store pending notification'));
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