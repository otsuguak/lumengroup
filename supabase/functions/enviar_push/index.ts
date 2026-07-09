import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    console.log("1. 🚀 Iniciando envío de Push...");
    const body = await req.json();
    console.log("2. 📦 Datos recibidos desde React:", body);
    
    const { titulo, mensaje, copropiedadId } = body;

    if (!copropiedadId) {
        throw new Error("🚨 El frontend no envió el ID de la copropiedad (copropiedadId está vacío).");
    }

    console.log(`3. 🔍 Buscando llaves para el conjunto: ${copropiedadId}`);
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: cliente, error: dbError } = await supabase
      .from('clientes_saas')
      .select('onesignal_app_id, onesignal_rest_api_key')
      .eq('copropiedad_id', copropiedadId) // 🔥 AQUÍ ESTABA EL BENDITO ERROR
      .single()

    if (dbError) {
         console.error("🚨 4. Error al buscar en la tabla cliente_saas:", dbError);
         throw new Error("Error en base de datos: " + dbError.message);
    }

    if (!cliente?.onesignal_app_id || !cliente?.onesignal_rest_api_key) {
         console.error("🚨 4. La base de datos no tiene las llaves:", cliente);
         throw new Error(`Las llaves están vacías en la base de datos para el conjunto: ${copropiedadId}`);
    }

    console.log("5. ✅ Llaves encontradas, enviando a OneSignal...");
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
    console.log("6. 📬 Respuesta de OneSignal:", data);
    
    if (!res.ok) {
        throw new Error("OneSignal rechazó el envío: " + JSON.stringify(data));
    }

    return new Response(JSON.stringify({ success: true, data }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
      status: 200 
    })

  } catch (error) {
    // ESTO ES LO QUE NOS SALVARÁ LA VIDA
    console.error("🚨 ERROR FATAL DETECTADO:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
      status: 400 
    })
  }
})