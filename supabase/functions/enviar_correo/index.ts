import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// Configuración de CORS para que tu React pueda comunicarse con este servidor
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Si es una petición de validación (CORS), responder OK
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Recibimos los datos desde tu React (Celador)
    const { to, subject, html } = await req.json()
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

    // Hacemos la petición a Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'Copropiedapp <onboarding@resend.dev>', // Correo temporal de prueba
        to: [to],
        subject: subject,
        html: html
      })
    })

    const data = await res.json()
    
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})