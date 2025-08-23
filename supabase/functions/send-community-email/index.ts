import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CommunityEmailRequest {
  subject: string;
  body: string;
  recipients: string[];
  communityName: string;
  senderName: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subject, body, recipients, communityName, senderName }: CommunityEmailRequest = await req.json();

    console.log(`📧 Sending community email to ${recipients.length} recipients for ${communityName}`);

    // Validate required fields
    if (!subject || !body || !recipients?.length || !communityName) {
      throw new Error("Missing required fields: subject, body, recipients, or communityName");
    }

    // Send email to all recipients
    const emailResponse = await resend.emails.send({
      from: `${senderName} <noreply@courtneys-list.com>`,
      to: recipients,
      subject: subject,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.6;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">${communityName}</h1>
            <p style="margin: 5px 0 0; opacity: 0.9;">Neighbor Updates</p>
          </div>
          
          <div style="background: white; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
            <div style="white-space: pre-wrap; color: #2d3748; font-size: 16px;">
${body}
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="color: #718096; font-size: 14px; margin: 0;">
                This email was sent to verified members of ${communityName}
              </p>
              <p style="color: #718096; font-size: 12px; margin: 5px 0 0;">
                You received this because you're part of our community directory.
              </p>
            </div>
          </div>
        </div>
      `,
    });

    console.log("✅ Community email sent successfully:", emailResponse);

    return new Response(JSON.stringify({
      success: true,
      emailId: emailResponse.data?.id,
      recipientCount: recipients.length
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("❌ Error in send-community-email function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);