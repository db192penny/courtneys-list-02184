import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

serve(async (req) => {
  try {
    // Create Supabase client with service role key (bypasses RLS)
    const supabase = createClient(
      SUPABASE_URL!,
      SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get pending emails from queue
    const { data: pending, error } = await supabase
      .from('email_queue')
      .select('*')
      .eq('sent', false)
      .limit(10);

    if (error) throw error;

    const results = [];
    
    for (const email of pending || []) {
      try {
        // Send email using Resend based on template
        let subject = '';
        let html = '';
        
        if (email.template === 'invite_success') {
          subject = 'Your invite was accepted! 🎉';
          html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Congratulations!</h2>
              <p>Hi ${email.data?.inviter_name || 'Neighbor'},</p>
              <p>Someone just joined Courtney's List using your invite link!</p>
              <p>You've earned <strong>10 points</strong> for helping grow our community.</p>
              <p>Keep inviting neighbors to make our community even stronger!</p>
              <br>
              <p>Best regards,<br>The Courtney's List Team</p>
            </div>
          `;
        }

        // Send via Resend
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: 'Courtney\'s List <noreply@courtneys-list.com>',
            to: email.to_email,
            subject,
            html,
          }),
        });

        if (res.ok) {
          // Mark as sent
          await supabase
            .from('email_queue')
            .update({ sent: true })
            .eq('id', email.id);
          
          results.push({ id: email.id, status: 'sent' });
        } else {
          results.push({ id: email.id, status: 'failed', error: await res.text() });
        }
      } catch (err) {
        results.push({ id: email.id, status: 'error', error: err.message });
      }
    }

    return new Response(
      JSON.stringify({ processed: results.length, results }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});