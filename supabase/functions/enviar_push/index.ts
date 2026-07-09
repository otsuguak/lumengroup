import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Los permisos para que Vercel no sea bloqueado
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// FORMATO MODERNO DE SUPABASE (Deno.serve)
Deno.serve(async (req) => {
  // 1. Manejar el bloqueo de CORS de Vercel
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { titulo, mensaje, copropiedadId } = await req.json()

    // 2. Conectarnos a base de datos (con rol de administrador para saltar reglas de seguridad)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 3. Buscar llaves
    const { data: cliente, error: dbError } = await supabase
      .from('cliente_saas')
      .select('onesignal_app_id, onesignal_rest_api_key')
      .eq('id', copropiedadId)
      .single()

    if (dbError || !cliente?.onesignal_app_id || !cliente?.onesignal_rest_api_key) {
      throw new Error(`Faltan llaves de OneSignal para: ${copropiedadId}`);
    }

    // 4. Enviar a OneSignal
    const payload = {
      app_id: cliente.onesignal_app_id,
      headings: { en: titulo, es: titulo },
      contents: { en: mensaje, es: mensaje },
      included_segments: ["Subscribed Users"]
    };

    const res = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${cliente.onesignal_rest_api_key}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    return new Response(JSON.stringify({ success: true, data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
  }
})