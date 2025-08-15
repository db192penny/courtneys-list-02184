// Extremely minimal test function
Deno.serve(async (req) => {
  console.log('BASIC TEST: Function called')
  
  try {
    console.log('BASIC TEST: Method is', req.method)
    
    if (req.method !== 'POST') {
      console.log('BASIC TEST: Returning 405')
      return new Response('Method not allowed', { status: 405 })
    }

    console.log('BASIC TEST: About to read payload')
    const payload = await req.text()
    console.log('BASIC TEST: Payload read, length:', payload.length)
    
    console.log('BASIC TEST: Checking environment variables')
    const hasHookSecret = !!Deno.env.get('SEND_AUTH_EMAIL_HOOK_SECRET')
    const hasResendKey = !!Deno.env.get('RESEND_API_KEY')
    
    console.log('BASIC TEST: Hook secret exists:', hasHookSecret)
    console.log('BASIC TEST: Resend key exists:', hasResendKey)
    
    // Just return success for now to test if function works
    console.log('BASIC TEST: Returning success')
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Basic test successful',
      hasHookSecret,
      hasResendKey,
      payloadLength: payload.length
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
    
  } catch (error) {
    console.error('BASIC TEST ERROR:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})