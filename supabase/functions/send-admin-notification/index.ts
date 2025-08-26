import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AdminNotificationRequest {
  userEmail: string;
  userName: string;
  userAddress: string;
  community: string;
  signupSource?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userEmail, userName, userAddress, community, signupSource }: AdminNotificationRequest = await req.json();

    const currentTime = new Date().toLocaleString('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const emailResponse = await resend.emails.send({
      from: "Courtney's List <noreply@courtneys-list.com>",
      to: ["db@fivefourventures.com", "clkramer@gmail.com"],
      subject: `New Signup: ${userName} - ${community}`,
      html: `
        <h2>New User Signup</h2>
        <p><strong>Time:</strong> ${currentTime} EST</p>
        <p><strong>Name:</strong> ${userName}</p>
        <p><strong>Email:</strong> ${userEmail}</p>
        <p><strong>Address:</strong> ${userAddress}</p>
        <p><strong>Community:</strong> ${community}</p>
        <p><strong>Signup Source:</strong> ${signupSource || 'Direct'}</p>
        
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #ccc;">
        
        <p><small>This is an automated notification from Courtney's List admin system.</small></p>
      `,
    });

    console.log("Admin notification sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-admin-notification function:", error);
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