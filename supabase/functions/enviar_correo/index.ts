const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  // 1. BLINDAJE CORS 
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    console.log("1. 🚀 Iniciando envío de Correo...");
    const body = await req.json();
    console.log("2. 📦 Datos recibidos:", body);
    
    const { targetEmails, payload } = body;
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

    if (!RESEND_API_KEY) throw new Error("Falta la llave RESEND_API_KEY en Supabase.");
    if (!targetEmails || targetEmails.length === 0) throw new Error("No hay destinatarios en la lista.");

    console.log(`3. ✉️ Enviando correo a: ${targetEmails.join(', ')}`);
    
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        // 🔥 ¡OJO AQUÍ! 🔥
        // Debes poner el correo que tengas verificado en tu cuenta de Resend.
        // Si no tienes dominio, usa: 'onboarding@resend.dev'
        from: `${payload.nombre_remitente || 'LumenGroup'} <no-responder@lumengroup.com.co>`,
        to: targetEmails,
        subject: payload.titulo,
        html: payload.html,
      })
    });

    const data = await res.json();
    console.log("4. 📬 Respuesta de Resend:", data);
    
    if (!res.ok) throw new Error(data.message || "Error devuelto por la API de Resend");

    return new Response(JSON.stringify({ success: true, data }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
      status: 200 
    })

  } catch (error) {
    console.error("🚨 ERROR FATAL DETECTADO EN CORREO:", error.message);
    
    return new Response(JSON.stringify({ error: error.message }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
      status: 400 
    })
  }
})