import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Payload {
  email: string;
  redirectUrl?: string;
  name?: string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") as string;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
    const resendKey = Deno.env.get("RESEND_API_KEY") as string;

    if (!supabaseUrl || !anonKey || !serviceKey) {
      return new Response(JSON.stringify({ error: "Missing Supabase environment variables" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!resendKey) {
      return new Response(JSON.stringify({ error: "Missing RESEND_API_KEY" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { email, redirectUrl, name }: Payload = await req.json();

    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ error: "Invalid email" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Client with the caller's JWT to check admin rights
    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: {
        headers: { Authorization: req.headers.get("Authorization") || "" },
      },
    });

    const { data: isAdmin, error: adminErr } = await supabaseUser.rpc("is_admin" as any);
    if (adminErr) {
      console.error("[send-approval-email] is_admin error:", adminErr);
      return new Response(JSON.stringify({ error: adminErr.message }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Not authorized" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Admin client to generate magic link
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const targetRedirect = redirectUrl || `${new URL(req.url).origin}/`;

    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: {
        redirectTo: targetRedirect,
      },
    });

    if (linkErr) {
      console.error("[send-approval-email] generateLink error:", linkErr);
      return new Response(JSON.stringify({ error: linkErr.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const actionLink = (linkData as any)?.properties?.action_link as string | undefined;

    if (!actionLink) {
      return new Response(JSON.stringify({ error: "Could not generate magic link" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const resend = new Resend(resendKey);

    const displayName = name || email;

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', 'Apple Color Emoji', 'Segoe UI Emoji'; line-height: 1.6; color: #111">
        <h2 style="margin: 0 0 12px;">You're approved! 🎉</h2>
        <p>Hi ${displayName},</p>
        <p>Your access to Courtney’s List has been approved. Use the secure link below to sign in:</p>
        <p style="margin: 20px 0">
          <a href="${actionLink}"
             style="display:inline-block;background:#111;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">
            Sign in now
          </a>
        </p>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color:#555">${actionLink}</p>
        <p style="margin-top:24px;color:#666">If you didn't expect this email, you can safely ignore it.</p>
        <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
            <a href="https://courtneys-list.com/unsubscribe?email=${encodeURIComponent(email)}" style="color: #999; text-decoration: underline;">Unsubscribe</a> | 
            <a href="https://courtneys-list.com/contact" style="color: #999; text-decoration: underline;">Contact Us</a>
          </p>
        </div>
      </div>
    `;

    const { data: emailRes, error: emailErr } = await resend.emails.send({
      from: "Courtney’s List <onboarding@resend.dev>",
      to: [email],
      subject: "You're approved — sign in to Courtney’s List",
      html,
    });

    if (emailErr) {
      console.error("[send-approval-email] resend error:", emailErr);
      return new Response(JSON.stringify({ error: emailErr.message }), {
        status: 502,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ ok: true, emailId: (emailRes as any)?.id }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (e: any) {
    console.error("[send-approval-email] unexpected error:", e);
    return new Response(JSON.stringify({ error: e?.message || "Unexpected error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
