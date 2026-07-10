const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    console.log("1. 🚀 Iniciando Motor de Envíos Masivos...");
    const body = await req.json();
    const { bcc, asunto, html, adjuntos } = body;

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) throw new Error("Falta la llave RESEND_API_KEY en Supabase.");
    if (!bcc || !Array.isArray(bcc) || bcc.length === 0) throw new Error("No hay destinatarios en la lista.");

    // 🔥 1. LA MAGIA DEL "CHUNKING" (Cortar de 50 en 50)
    const MAX_DESTINATARIOS_POR_LOTE = 50;
    const lotes = [];
    
    for (let i = 0; i < bcc.length; i += MAX_DESTINATARIOS_POR_LOTE) {
      lotes.push(bcc.slice(i, i + MAX_DESTINATARIOS_POR_LOTE));
    }

    console.log(`2. 📦 Total correos: ${bcc.length}. Dividido en ${lotes.length} lotes de máximo 50.`);

    // 🔥 2. EL TRUCO DEL HABEAS DATA (BCC TOTAL)
    // Procesamos todos los lotes al mismo tiempo (en paralelo) para que sea instantáneo
    const promesasDeEnvio = lotes.map(async (lote, index) => {
      
      const payload: any = {
        // Usa tu correo verificado
        from: 'Administración <notificaciones@lumengroup.com.co>', 
        // El 'to' va a un correo fantasma para que a todos les llegue como "Copia Oculta"
        to: ['no-responder@lumengroup.com.co'], 
        bcc: lote, // <-- AQUÍ VA LA LISTA OCULTA, NADIE VE A NADIE
        subject: asunto,
        html: html,
      };

      // Si el admin subió un recibo o archivo, se lo pegamos
      if (adjuntos && adjuntos.length > 0) {
        payload.attachments = adjuntos;
      }

      console.log(`Enviando Lote #${index + 1}...`);
      
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error(`Error en Lote #${index + 1}:`, errorData);
        throw new Error(`Fallo en el lote ${index + 1}`);
      }

      return await res.json();
    });

    // Esperamos a que TODOS los pedazos de 50 se envíen
    await Promise.all(promesasDeEnvio);

    console.log("3. ✅ Envío masivo completado con éxito.");

    return new Response(JSON.stringify({ success: true, total_enviados: bcc.length }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
      status: 200 
    })

  } catch (error) {
    console.error("🚨 ERROR FATAL MASIVO:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
      status: 400 
    })
  }
})