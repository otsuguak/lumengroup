import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 1. Manejar el bloqueo de CORS de Vercel
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { targetEmails, payload } = await req.json()

    // 2. Traer la llave secreta de Resend
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

    if (!RESEND_API_KEY) {
      throw new Error("Falta la llave de Resend en Supabase.");
    }

    if (!targetEmails || targetEmails.length === 0) {
      throw new Error("No hay destinatarios para enviar el correo.");
    }

    // 3. Disparar el mensaje a Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        // IMPORTANTE: Aquí pon el dominio que verificaste en Resend
        from: `${payload.nombre_remitente || 'LumenGroup'} <notificaciones@tudominio.com>`, 
        to: targetEmails,
        subject: payload.titulo,
        html: payload.html,
      })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Error al comunicarse con Resend");
    }

    return new Response(JSON.stringify({ success: true, data }), {
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