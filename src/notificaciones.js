// src/notificaciones.js
export const enviarNotificacion = async (userId, titulo, mensaje) => {
  // Esta función llamará a una Edge Function de Supabase que enviará el mensaje
  // Por ahora, solo logueamos para probar el flujo
  console.log(`Enviando notificación a ${userId}: ${titulo} - ${mensaje}`);
  
  // Aquí después pondremos el fetch a tu Edge Function de Supabase
};