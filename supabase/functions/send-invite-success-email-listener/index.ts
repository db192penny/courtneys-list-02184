import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // This function is called directly when invite is accepted
    const payload = await req.json();
    console.log("[invite-success-listener] Received payload:", payload);

    const {
      inviter_id: inviterId,
      inviter_name: inviterName,
      inviter_email: inviterEmail,
      invited_name: invitedName,
      community_name: communityName,
      community_slug: communitySlug
    } = payload;

    // Call the email sending function
    const { error } = await supabase.functions.invoke('send-invite-success-email', {
      body: {
        inviterId,
        inviterName,
        inviterEmail,
        invitedName,
        communityName,
        communitySlug
      }
    });

    if (error) {
      console.error("[invite-success-listener] Error calling email function:", error);
      throw error;
    }

    console.log("[invite-success-listener] Successfully triggered invite success email");

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("[invite-success-listener] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);