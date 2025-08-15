// Supabase Edge Function: get-public-config
// Returns public configuration values such as the Google Maps API key
// CORS: strict allowlist with echo, caching headers included

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

// Minimal CORS helper with regex allowlist
const ALLOWLIST = [
  /^http:\/\/localhost(:\d+)?$/i,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/i,
  /^https:\/\/.*\.lovable\.dev$/i,
  /^https:\/\/.*\.lovableproject\.com$/i,
  /^https:\/\/.*\.lovable\.app$/i,
  /^https:\/\/id-preview--.*\.lovable\.app$/i,
];

function cors(req: Request) {
  const origin = req.headers.get('origin') ?? '';
  const allowed = ALLOWLIST.some(rx => rx.test(origin));
  const base = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  } as const;
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: { ...base, ...(allowed ? { 'Access-Control-Allow-Origin': origin } : {}) },
    });
  }
  return { allowed, origin, headers: { ...(allowed ? { 'Access-Control-Allow-Origin': origin } : {}), ...base } };
}

serve(async (req) => {
  const pre = cors(req);
  if (pre instanceof Response) return pre;

  // Log the origin for debugging
  console.log('Request origin:', req.headers.get('origin'));
  console.log('Origin allowed:', pre.allowed);

  // Strict origin validation: only proceed if allowed
  if (!pre.allowed) {
    console.log('Origin not allowed:', req.headers.get('origin'));
    return new Response(JSON.stringify({ error: 'Origin not allowed', origin: req.headers.get('origin') }), {
      status: 403,
      headers: { 'Content-Type': 'application/json', ...pre.headers, 'Vary': 'Origin' },
    });
  }

  // Accept GET or POST for flexibility with callers
  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...pre.headers, 'Vary': 'Origin' },
    });
  }

  try {
    const googleMapsKey = Deno.env.get('GOOGLE_MAPS_KEY') || '';
    console.log('Environment check:', {
      hasKey: !!googleMapsKey,
      keyLength: googleMapsKey.length,
      keyPrefix: googleMapsKey.substring(0, 10)
    });
    
    if (!googleMapsKey) {
      console.error('GOOGLE_MAPS_KEY not found in environment');
      return new Response(JSON.stringify({ error: 'Google Maps key not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...pre.headers, 'Vary': 'Origin' },
      });
    }

    return new Response(JSON.stringify({ googleMapsKey }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
        'Vary': 'Origin',
        ...pre.headers,
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...pre.headers, 'Vary': 'Origin' },
    });
  }
});
