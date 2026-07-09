import { supabase } from '../supabase';

export const enviarNotificacionInteligente = async ({
  tipoEvento, 
  copropiedadId, 
  userId = null, 
  emailsDestino = [], 
  datosDinamicos = {}, 
  enviarMail = false,  
  enviarPush = false   
}) => {
  try {
    // Si no hay nada que enviar, salimos
    if (!enviarMail && !enviarPush) return false;

    // ==========================================
    // 1. BLOQUE DE ENVÍO: CORREO (RESEND)
    // ==========================================
    if (enviarMail && emailsDestino.length > 0) {
      // Buscamos específicamente la plantilla de EMAIL
      const { data: plantillaMail, error: errMailDB } = await supabase
        .from('plantillas_notificaciones')
        .select('*')
        .eq('copropiedad_id', copropiedadId)
        .eq('tipo_evento', tipoEvento)
        .eq('canal', 'email')
        .single();

      if (plantillaMail && plantillaMail.modulo_activo) {
        let tituloMail = plantillaMail.asunto;
        let mensajeMail = plantillaMail.mensaje_base;
        
        // Reemplazo de variables (usamos /g para reemplazar todas las coincidencias)
        if (datosDinamicos.nombre_residente) mensajeMail = mensajeMail.replace(/{nombre}/g, datosDinamicos.nombre_residente);
        if (datosDinamicos.titulo_noticia) tituloMail = tituloMail.replace(/{titulo}/g, datosDinamicos.titulo_noticia);

        const payloadCorreo = {
          titulo: tituloMail,
          mensaje: mensajeMail,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                <h2 style="color: #4F46E5;">${tituloMail}</h2>
                <p>${mensajeMail}</p>
                <br>
                <p style="font-size: 12px; color: #999;">Enviado desde <b>${plantillaMail.nombre_remitente}</b> a través de LumenGroup.</p>
            </div>
          `,
          nombre_remitente: plantillaMail.nombre_remitente
        };

        const { error: errMail } = await supabase.functions.invoke('enviar_correo', {
          body: {
            eventType: tipoEvento,
            copropiedadId: copropiedadId,
            userId: userId,
            targetEmails: emailsDestino,
            payload: payloadCorreo
          }
        });

        if (errMail) console.error("❌ Error enviando Mail:", errMail);
        else console.log(`📧 Mail de ${tipoEvento} enviado con éxito!`);
      } else {
        console.log(`⚠️ No se envió Mail: Plantilla inactiva o no existe para ${tipoEvento}`);
      }
    }

    // ==========================================
    // 2. BLOQUE DE ENVÍO: PUSH (ONESIGNAL)
    // ==========================================
    if (enviarPush) {
      // Buscamos específicamente la plantilla de PUSH
      const { data: plantillaPush, error: errPushDB } = await supabase
        .from('plantillas_notificaciones')
        .select('*')
        .eq('copropiedad_id', copropiedadId)
        .eq('tipo_evento', tipoEvento)
        .eq('canal', 'push')
        .single();

      if (plantillaPush && plantillaPush.modulo_activo) {
        let tituloPush = plantillaPush.asunto;
        let mensajePush = plantillaPush.mensaje_base;
        
        if (datosDinamicos.nombre_residente) mensajePush = mensajePush.replace(/{nombre}/g, datosDinamicos.nombre_residente);
        if (datosDinamicos.titulo_noticia) tituloPush = tituloPush.replace(/{titulo}/g, datosDinamicos.titulo_noticia);

        const { error: errPush } = await supabase.functions.invoke('enviar_push', {
          body: {
            eventType: tipoEvento,
            copropiedadId: copropiedadId,
            userId: userId, 
            titulo: tituloPush,
            mensaje: mensajePush,
            datosExtra: datosDinamicos
          }
        });

        if (errPush) console.error("❌ Error enviando Push:", errPush);
        else console.log(`🔔 Push de ${tipoEvento} enviado con éxito!`);
      } else {
        console.log(`⚠️ No se envió Push: Plantilla inactiva o no existe para ${tipoEvento}`);
      }
    }

    return true;

  } catch (error) {
    console.error("❌ Error general en enviarNotificacionInteligente:", error);
    return false;
  }
};