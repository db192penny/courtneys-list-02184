import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VIPSignupRequest {
  email: string;
  name: string;
  address: string;
  streetName: string;
  residentStatus: string;
  signupSource: string;
  formattedAddress?: string;
  googlePlaceId?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { 
      email, 
      name, 
      address, 
      streetName, 
      residentStatus, 
      signupSource,
      formattedAddress,
      googlePlaceId 
    }: VIPSignupRequest = await req.json();

    console.log("[VIP Signup] Processing VIP signup for:", email);

    // First, check if user already exists by trying to list users with this email
    const { data: userList, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000 // Get all users to search through
    });
    
    let existingUser = null;
    if (userList?.users) {
      existingUser = userList.users.find(user => user.email?.toLowerCase() === email.toLowerCase());
    }
    
    let userId: string;

    if (existingUser) {
      // User exists in auth, use their ID
      userId = existingUser.id;
      console.log("[VIP Signup] Found existing auth user:", userId);
    } else {
      // Create new user without email confirmation
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: crypto.randomUUID(), // Random password since they won't use it
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          name,
          address,
          street_name: streetName,
          signup_source: signupSource
        }
      });

      if (createError) {
        console.error("[VIP Signup] Error creating user:", createError);
        return new Response(
          JSON.stringify({ error: createError.message }),
          { 
            status: 400, 
            headers: { 'Content-Type': 'application/json', ...corsHeaders } 
          }
        );
      }

      userId = newUser.user.id;
      console.log("[VIP Signup] Created new auth user:", userId);
    }

    // Check if public.users record exists
    const { data: existingPublicUser, error: publicCheckError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (!existingPublicUser) {
      // Create public.users record
      const { error: publicUserError } = await supabaseAdmin
        .from('users')
        .insert({
          id: userId,
          email: email,
          name: name,
          address: address,
          street_name: streetName,
          formatted_address: formattedAddress,
          google_place_id: googlePlaceId,
          signup_source: signupSource,
          is_verified: true, // Auto-verify VIP users
          points: 5 // Join points
        });

      if (publicUserError) {
        console.error("[VIP Signup] Error creating public user:", publicUserError);
        return new Response(
          JSON.stringify({ error: publicUserError.message }),
          { 
            status: 400, 
            headers: { 'Content-Type': 'application/json', ...corsHeaders } 
          }
        );
      }

      // Add to point history
      await supabaseAdmin
        .from('user_point_history')
        .insert({
          user_id: userId,
          activity_type: 'join_site',
          points_earned: 5,
          description: 'Joined as VIP user'
        });

      console.log("[VIP Signup] Created public user record");
    } else {
      console.log("[VIP Signup] Public user record already exists");
    }

    // Generate a session token for immediate login
    const { data: tokenData, error: tokenError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email: email
    });

    if (tokenError) {
      console.error("[VIP Signup] Error generating token:", tokenError);
      return new Response(
        JSON.stringify({ error: tokenError.message }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    console.log("[VIP Signup] ✅ VIP signup completed successfully");

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId: userId,
        redirectUrl: '/community/boca-bridges',
        message: 'VIP account created successfully'
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );

  } catch (error: any) {
    console.error("[VIP Signup] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );
  }
};

serve(handler);