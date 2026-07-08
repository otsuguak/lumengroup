import { supabase } from '../supabase'; // Asegúrate de que esta ruta apunte a tu archivo supabase.js

export const enviarNotificacionInteligente = async (
  tipoEvento, 
  copropiedadId, 
  userId, 
  emailsDestino, 
  datosDinamicos // Ej: { nombre_residente: 'Juan', paquete: 'Caja Amazon' }
) => {
  try {
    // 1. Buscamos cómo el administrador personalizó este correo
    const { data: plantilla, error: errPlantilla } = await supabase
      .from('plantillas_notificaciones')
      .select('*')
      .eq('copropiedad_id', copropiedadId)
      .eq('tipo_evento', tipoEvento)
      .single();

    if (errPlantilla || !plantilla) {
      console.warn(`No hay plantilla configurada para ${tipoEvento} en el conjunto ${copropiedadId}`);
      return false; 
    }

    // Si el administrador apagó este módulo de correos, no enviamos nada
    if (!plantilla.modulo_activo) return false;

    // 2. Armamos el correo mezclando la plantilla del Admin con los datos reales
    const tituloFinal = plantilla.asunto;
    // Aquí puedes reemplazar variables. Ej: "Hola {nombre}" -> "Hola Juan"
    let mensajeFinal = plantilla.mensaje_base;
    if (datosDinamicos.nombre_residente) {
        mensajeFinal = mensajeFinal.replace('{nombre}', datosDinamicos.nombre_residente);
    }

    const payload = {
      titulo: tituloFinal,
      mensaje: mensajeFinal,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #4F46E5;">${tituloFinal}</h2>
            <p>${mensajeFinal}</p>
            <br>
            <p style="font-size: 12px; color: #999;">Enviado desde <b>${plantilla.nombre_remitente}</b> a través de LumenGroup SaaS.</p>
        </div>
      `,
      nombre_remitente: plantilla.nombre_remitente // Le pasamos a Resend el nombre personalizado
    };

    // 3. ¡Llamamos al cerebro en la nube (Edge Function)!
    const { data, error } = await supabase.functions.invoke('enviar_correo', {
      body: {
        eventType: tipoEvento,
        copropiedadId: copropiedadId,
        userId: userId || null,
        targetEmails: emailsDestino,
        payload: payload
      }
    });

    if (error) throw error;
    console.log(`✅ Notificación ${tipoEvento} enviada con éxito!`);
    return true;

  } catch (error) {
    console.error("❌ Error enviando notificación:", error);
    return false;
  }
};