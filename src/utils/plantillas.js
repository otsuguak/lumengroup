// Archivo: src/utils/plantillas.js

export const generarCascaronHTML = (tituloCabecera, contenidoTexto) => {
  // Magia: Convertimos los "Enter" que da el admin en saltos de línea reales de HTML (<br>)
  const contenidoFormateado = contenidoTexto.replace(/\n/g, '<br/>');
  
  return `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
      <div style="background-color: #0f172a; padding: 25px; text-align: center; border-bottom: 4px solid #3b82f6;">
        <h2 style="color: #ffffff; margin: 0; letter-spacing: 1px;">${tituloCabecera}</h2>
      </div>
      <div style="padding: 30px; background-color: #ffffff;">
        <p style="font-size: 16px; line-height: 1.6;">${contenidoFormateado}</p>
        
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0 20px 0;" />
        <div style="text-align: center;">
          <p style="font-size: 12px; color: #94a3b8; margin: 0;">Gestionado por</p>
          <p style="font-size: 14px; font-weight: bold; color: #64748b; margin: 5px 0 0 0;">LumenGroup</p>
        </div>
      </div>
    </div>
  `;
};