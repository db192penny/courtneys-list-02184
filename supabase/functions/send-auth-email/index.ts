// Simplified auth email function to debug the issue
Deno.serve(async (req) => {
  console.log('🚀 SIMPLE AUTH EMAIL FUNCTION CALLED')
  
  if (req.method !== 'POST') {
    console.log('❌ Wrong method:', req.method)
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    console.log('📦 Reading request payload...')
    const payload = await req.text()
    console.log('📦 Payload received, length:', payload.length)
    
    console.log('🔍 Environment check...')
    const hasHookSecret = !!Deno.env.get('SEND_AUTH_EMAIL_HOOK_SECRET')
    const hasResendKey = !!Deno.env.get('RESEND_API_KEY')
    console.log('🔐 Hook secret exists:', hasHookSecret)
    console.log('🔑 Resend key exists:', hasResendKey)
    
    if (!hasHookSecret || !hasResendKey) {
      console.error('❌ Missing required environment variables')
      return new Response(JSON.stringify({ 
        error: 'Missing environment variables',
        hasHookSecret,
        hasResendKey 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    
    // For now, just return success to test if the basic function works
    console.log('✅ Basic function test successful')
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Simplified function working',
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
    
  } catch (error) {
    console.error('💥 SIMPLE FUNCTION ERROR:', error.message)
    console.error('🔍 Error stack:', error.stack)
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})