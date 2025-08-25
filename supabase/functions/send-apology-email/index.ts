import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ApologyEmailRequest {
  recipients: Array<{ email: string; name: string }>;
  communityName: string;
  communitySlug: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recipients, communityName, communitySlug }: ApologyEmailRequest = await req.json();

    console.log(`Sending apology emails to ${recipients.length} recipients for ${communityName}`);

    // Initialize Supabase client with service role for creating magic links
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Send emails to all recipients
    const emailPromises = recipients.map(async (recipient) => {
      try {
        // Generate a fresh magic link for this user
        const { data: magicLinkData, error: magicLinkError } = await supabase.auth.admin.generateLink({
          type: 'magiclink',
          email: recipient.email,
          options: {
            redirectTo: `${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.supabase.app') || 'https://courtneys-list.com'}/communities/${communitySlug}`
          }
        });

        if (magicLinkError) {
          console.error(`Failed to generate magic link for ${recipient.email}:`, magicLinkError);
          return { success: false, email: recipient.email, error: magicLinkError.message };
        }

        const magicLink = magicLinkData.properties?.action_link;
        const communityUrl = `https://courtneys-list.com/communities/${communitySlug}`;

        if (!magicLink) {
          console.error(`No magic link generated for ${recipient.email}`);
          return { success: false, email: recipient.email, error: "No magic link generated" };
        }

        // Send the apology email
        const emailResult = await resend.emails.send({
          from: "Courtney <courtney@courtneys-list.com>",
          to: [recipient.email],
          subject: "Apologies for the login issue - fresh link inside! 🔐",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #333; margin-bottom: 20px;">Hi ${recipient.name.split(' ')[0]} 💜,</h2>
              
              <p style="line-height: 1.6; color: #555; margin-bottom: 16px;">
                Thank you for joining Courtney's List! Apologies for not allowing you in - you are VIP but we had a little bug.
              </p>
              
              <p style="line-height: 1.6; color: #555; margin-bottom: 24px;">
                Hopefully now it's fixed, so please click here for access:
              </p>
              
              <div style="text-align: center; margin: 32px 0;">
                <a href="${magicLink}" 
                   style="background: #007bff; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px;">
                  🔐 Login to Your Account
                </a>
              </div>
              
              <p style="line-height: 1.6; color: #555; margin-bottom: 16px;">
                Once you're in, click here to see all the amazing service providers:
              </p>
              
              <div style="text-align: center; margin: 32px 0;">
                <a href="${communityUrl}" 
                   style="background: #28a745; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px;">
                  🏘️ See ${communityName} Providers
                </a>
              </div>
              
              <p style="line-height: 1.6; color: #555; margin-top: 32px;">
                Thanks for your patience! 💜<br>
                Courtney
              </p>
              
              <hr style="margin: 32px 0; border: none; border-top: 1px solid #eee;">
              
              <p style="font-size: 12px; color: #888; text-align: center;">
                If you're having trouble with the buttons above, you can copy and paste this link into your browser:<br>
                <a href="${magicLink}" style="color: #007bff; word-break: break-all;">${magicLink}</a>
              </p>
            </div>
          `,
        });

        console.log(`Apology email sent successfully to ${recipient.email}`);
        return { success: true, email: recipient.email, messageId: emailResult.data?.id };

      } catch (error) {
        console.error(`Failed to send apology email to ${recipient.email}:`, error);
        return { success: false, email: recipient.email, error: error.message };
      }
    });

    const results = await Promise.all(emailPromises);
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success);

    console.log(`Apology email results: ${successful} successful, ${failed.length} failed`);

    if (failed.length > 0) {
      console.error("Failed emails:", failed);
    }

    return new Response(
      JSON.stringify({
        success: true,
        totalSent: successful,
        totalFailed: failed.length,
        results: results
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    console.error("Error in send-apology-email function:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);