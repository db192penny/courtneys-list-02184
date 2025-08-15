import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  email: string;
  name: string;
  communityName?: string;
  signupSource?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, communityName, signupSource }: WelcomeEmailRequest = await req.json();

    console.log("Sending welcome email to:", email, "Community:", communityName, "Source:", signupSource);

    const isHomepageSignup = signupSource?.startsWith('homepage:');
    const isCommunitySignup = signupSource?.startsWith('community:');
    
    // Create community-specific content with proper domain
    const communityLink = communityName 
      ? `https://courtneys-list.com/communities/${encodeURIComponent(communityName.toLowerCase().replace(/\s+/g, '-'))}`
      : 'https://courtneys-list.com';

    const welcomeMessage = communityName
      ? `Welcome to Courtney's List for ${communityName}!`
      : `Welcome to Courtney's List!`;

    const personalizedContent = isHomepageSignup
      ? `<p>Thanks for joining from our homepage! We're excited to connect you with your community's trusted vendors.</p>`
      : isCommunitySignup
      ? `<p>Thanks for joining through your community invitation! Your neighbors are already sharing their trusted vendor recommendations.</p>`
      : `<p>Thanks for joining Courtney's List! We're excited to help you discover trusted vendors in your community.</p>`;

    const emailResponse = await resend.emails.send({
      from: "Courtney's List <onboarding@resend.dev>",
      to: [email],
      subject: `${welcomeMessage} Your trusted vendor directory awaits`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; font-size: 28px; font-weight: bold; margin: 0;">${welcomeMessage}</h1>
          </div>
          
          <div style="background-color: #f8fafc; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
            <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">Hi ${name},</p>
            
            ${personalizedContent}
            
            <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 16px 0;">You now have access to:</p>
            
            <ul style="color: #334155; font-size: 16px; line-height: 1.6; margin: 16px 0; padding-left: 20px;">
              <li style="margin-bottom: 8px;"><strong>Trusted Vendor Directory</strong> - Discover vetted service providers your neighbors recommend</li>
              <li style="margin-bottom: 8px;"><strong>Real Cost Insights</strong> - See what your neighbors actually paid for services</li>
              <li style="margin-bottom: 8px;"><strong>Community Reviews</strong> - Read honest feedback from people in your area</li>
              <li style="margin-bottom: 8px;"><strong>Share & Earn</strong> - Contribute your own experiences and build community trust</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${communityLink}" style="display: inline-block; background-color: #2563eb; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 16px;">
              ${communityName ? `Explore ${communityName} Vendors` : 'Start Exploring'}
            </a>
          </div>
          
          <div style="border-top: 1px solid #e2e8f0; padding-top: 24px; margin-top: 32px;">
            <p style="color: #64748b; font-size: 14px; line-height: 1.5; margin: 0;">
              Questions? Just reply to this email - we're here to help!
            </p>
            <p style="color: #64748b; font-size: 14px; line-height: 1.5; margin: 16px 0 0 0;">
              Best regards,<br>
              The Courtney's List Team
            </p>
            <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
              <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
                <a href="https://courtneys-list.com/unsubscribe?email=${encodeURIComponent(email)}" style="color: #94a3b8; text-decoration: underline;">Unsubscribe</a> | 
                <a href="https://courtneys-list.com/contact" style="color: #94a3b8; text-decoration: underline;">Contact Us</a>
              </p>
            </div>
          </div>
        </div>
      `,
    });

    console.log("Welcome email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailId: emailResponse.data?.id }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-welcome-email function:", error);
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