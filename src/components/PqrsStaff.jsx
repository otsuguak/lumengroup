import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabase';
import Swal from 'sweetalert2';
import { generarCascaronHTML } from '../utils/plantillas'; // 🔥 1. IMPORTAMOS NUESTRA FÁBRICA DE DISEÑO HTML

const formatearCodigo = (codigo) => {
  if (!codigo) return 'S/N';
  return `TKT-${String(codigo).padStart(5, '0')}`;
};

export default function PqrsStaff() {
  const [tickets, setTickets] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [usuarioActual, setUsuarioActual] = useState(null);
  
  // FILTROS 
  const [filtroBusqueda, setFiltroBusqueda] = useState('');
  const [filtroInmueble, setFiltroInmueble] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  // Gestión de Modal
  const [ticketSeleccionado, setTicketSeleccionado] = useState(null);
  const [gestionEstado, setGestionEstado] = useState('');
  const [gestionNotas, setGestionNotas] = useState('');
  const [evidenciaStaff, setEvidenciaStaff] = useState(null);

  useEffect(() => {
    cargarCasosAsignados();
  }, []);

  const cargarCasosAsignados = async () => {
    setCargando(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      // 1. Traemos al usuario actual para saber a qué copropiedad pertenece
      const { data: userData } = await supabase.from('usuarios').select('*').eq('id', session.user.id).single();
      setUsuarioActual(userData);

      // 2. REGLA DE ORO: Filtramos por asignado_a Y copropiedad_id
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('asignado_a', session.user.id)
        .eq('copropiedad_id', userData.copropiedad_id) // <-- CANDADO DE SEGURIDAD
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);

      // 3. Suscripción en tiempo real para que todos vean el cambio de estado de inmediato
      supabase.channel('tickets-staff')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets', filter: `asignado_a=eq.${session.user.id}` }, 
        async () => {
          const { data: refresh } = await supabase
            .from('tickets')
            .select('*')
            .eq('asignado_a', session.user.id)
            .eq('copropiedad_id', userData.copropiedad_id) // <-- CANDADO DE SEGURIDAD AL REFRESCAR
            .order('created_at', { ascending: false });
          setTickets(refresh || []);
        }).subscribe();

    } catch (error) {
      console.error("Error cargando casos del staff:", error);
    } finally {
      setCargando(false);
    }
  };

  // LÓGICA DE FILTRADO
  const ticketsFiltrados = useMemo(() => {
    return tickets.filter(t => {
      const busquedaTexto = filtroBusqueda.toLowerCase();
      const coincideTexto = (t.codigo_ticket && String(t.codigo_ticket).includes(busquedaTexto)) || 
                            (t.nombre_usuario || '').toLowerCase().includes(busquedaTexto) ||
                            (t.categoria || '').toLowerCase().includes(busquedaTexto);
                            
      const coincideInmueble = (t.inmueble || '').toLowerCase().includes(filtroInmueble.toLowerCase());
      const coincideEstado = filtroEstado === '' || t.estado === filtroEstado;
      
      return coincideTexto && coincideInmueble && coincideEstado;
    });
  }, [tickets, filtroBusqueda, filtroInmueble, filtroEstado]);

  const abrirDetalle = (ticket) => {
    setTicketSeleccionado(ticket);
    setGestionEstado(ticket.estado === 'Escalado' ? 'En proceso' : ticket.estado);
    setGestionNotas('');
    setEvidenciaStaff(null);
  };

  const guardarRespuesta = async () => {
    if (!gestionNotas.trim() && !evidenciaStaff && gestionEstado === ticketSeleccionado.estado) {
      return Swal.fire('Atención', 'Debes escribir una respuesta, adjuntar evidencia o cambiar el estado.', 'warning');
    }

    setCargando(true);
    Swal.fire({ title: 'Enviando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
      let urlEvidencia = null;
      if (evidenciaStaff) {
        const ext = evidenciaStaff.name.split('.').pop();
        const ruta = `${ticketSeleccionado.copropiedad_id}/staff_${ticketSeleccionado.id}_${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('evidencias').upload(ruta, evidenciaStaff);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('evidencias').getPublicUrl(ruta);
        urlEvidencia = publicUrl;
      }

      let historialActualizado = Array.isArray(ticketSeleccionado.historial) ? [...ticketSeleccionado.historial] : [];
      if (gestionNotas.trim() !== '' || urlEvidencia) {
        historialActualizado.push({ 
          fecha: new Date().toISOString(), 
          autor: `${usuarioActual.nombre} (Staff)`, 
          mensaje: gestionNotas.trim() || 'Archivo adjunto enviado',
          evidencia_url: urlEvidencia
        });
      }

      const { error } = await supabase.from('tickets').update({
        estado: gestionEstado,
        historial: historialActualizado
      }).eq('id', ticketSeleccionado.id);

      if (error) throw error;

      // =========================================================================
      // 🔥 2. MAGIA DE NOTIFICACIONES SAAS DESDE EL STAFF (PQRS) 🔥
      // =========================================================================
      try {
        const emailDestino = ticketSeleccionado.email;
        const targetUserId = ticketSeleccionado.usuario_id;
        const numeroTicketFormat = formatearCodigo(ticketSeleccionado.codigo_ticket);

        if (emailDestino || targetUserId) {
          // Buscamos si la administración configuró la plantilla para 'PQRS'
          const { data: plantillasActivas } = await supabase
            .from('plantillas_notificaciones')
            .select('*')
            .eq('copropiedad_id', usuarioActual.copropiedad_id)
            .eq('tipo_evento', 'PQRS')
            .eq('modulo_activo', true);

          const plantillaEmail = plantillasActivas?.find(p => p.canal === 'email');
          const plantillaPush = plantillasActivas?.find(p => p.canal === 'push');

          const reemplazarVariables = (texto) => {
            if (!texto) return '';
            return texto
              .replace(/{nombre}/g, ticketSeleccionado.nombre_usuario || 'Residente')
              .replace(/{inmueble}/g, ticketSeleccionado.inmueble || 'S/N')
              .replace(/{numero_ticket}/g, numeroTicketFormat)
              .replace(/{estado}/g, gestionEstado);
          };

          // ✉️ ENVIAR CORREO AL RESIDENTE (Usa el cascarón estético LumenGroup)
          if (emailDestino) {
            const asuntoEmail = plantillaEmail ? reemplazarVariables(plantillaEmail.asunto) : `🛠️ Actualización de Ticket ${numeroTicketFormat}`;
            const remitenteEmail = plantillaEmail?.nombre_remitente || 'Soporte Técnico Operativo';
            const textoBaseEmail = plantillaEmail 
              ? reemplazarVariables(plantillaEmail.mensaje_base) 
              : `Hola ${ticketSeleccionado.nombre_usuario},\n\nUn miembro de nuestro equipo técnico (Staff) ha gestionado tu solicitud.\n\nEstado actual: ${gestionEstado}\nRespuesta técnica: ${gestionNotas.trim() || 'Se adjuntaron evidencias físicas al caso.'}`;
            
            const htmlFinal = generarCascaronHTML(asuntoEmail, textoBaseEmail);

            await supabase.functions.invoke('enviar_correo', {
              body: {
                targetEmails: [emailDestino],
                payload: { titulo: asuntoEmail, html: htmlFinal, nombre_remitente: remitenteEmail }
              }
            });
          }

          // 📱 ENVIAR ALERTAS PUSH
          if (targetUserId) {
            const tituloPush = plantillaPush ? reemplazarVariables(plantillaPush.asunto) : `Ticket ${numeroTicketFormat} Respondido`;
            const mensajePush = plantillaPush 
              ? reemplazarVariables(plantillaPush.mensaje_base) 
              : `El equipo técnico actualizó tu solicitud a estado: ${gestionEstado}.`;

            await supabase.functions.invoke('enviar_push', {
              body: { titulo: tituloPush, mensaje: mensajePush, copropiedadId: usuarioActual.copropiedad_id, targetUserId: targetUserId }
            });
          }
        }
      } catch (notifError) {
        console.error("Error silencioso en notificaciones PQRS desde el Staff:", notifError);
      }
      // =========================================================================
      
      Swal.fire('Gestión Guardada', 'Respuesta enviada al residente y estado actualizado.', 'success');
      setTicketSeleccionado(null);
      
      // 🔥 RECARGAMOS LA TABLA EN TIEMPO REAL 🔥
      await cargarCasosAsignados();
      
    } catch (e) {
      console.error(e);
      Swal.fire('Error', 'No se pudo enviar la respuesta', 'error');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Mis Casos <span className="text-indigo-600">Asignados</span></h2>
          <p className="text-slate-500 font-medium">Bandeja de resolución de Peticiones, Quejas y Reclamos.</p>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
        
        {/* BARRA DE FILTROS */}
        <div className="p-6 bg-slate-50/50 border-b border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4">
          <input 
            type="text" 
            placeholder="🔍 Buscar por código, usuario o tema..." 
            value={filtroBusqueda} 
            onChange={e => setFiltroBusqueda(e.target.value)} 
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500" 
          />
          <input 
            type="text" 
            placeholder="🏠 Buscar Inmueble (Ej: 2101)..." 
            value={filtroInmueble} 
            onChange={e => setFiltroInmueble(e.target.value)} 
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500" 
          />
          <select 
            value={filtroEstado} 
            onChange={e => setFiltroEstado(e.target.value)} 
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
          >
            <option value="">Cualquier Estado</option>
            <option value="Escalado">Escalado (Nuevos)</option>
            <option value="En proceso">En Proceso</option>
            <option value="Resuelto">Resuelto</option>
            <option value="Cerrado">Cerrado</option>
          </select>
        </div>

        <div className="overflow-x-auto p-4">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="text-slate-400 font-bold uppercase text-[9px] tracking-widest border-b border-slate-50">
              <tr>
                <th className="p-4">Ticket ID</th>
                <th className="p-4">Estado</th>
                <th className="p-4">Fecha Asignación</th>
                <th className="p-4">Usuario (Residente)</th>
                <th className="p-4">Categoría</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {cargando && tickets.length === 0 ? (
                <tr><td colSpan="5" className="text-center py-10 text-slate-400 font-bold">Cargando bandeja...</td></tr>
              ) : ticketsFiltrados.map((t) => {
                let badge = 'bg-slate-100 text-slate-800';
                if (t.estado === 'En proceso' || t.estado === 'En Proceso') badge = 'bg-orange-50 text-orange-600 border border-orange-100';
                if (t.estado === 'Escalado') badge = 'bg-indigo-50 text-indigo-700 border border-indigo-200';
                if (t.estado === 'Resuelto' || t.estado === 'Cerrado') badge = 'bg-emerald-50 text-emerald-600 border border-emerald-100';
                
                return (
                  <tr key={t.id} onClick={() => abrirDetalle(t)} className="hover:bg-slate-50 transition-colors cursor-pointer group">
                    <td className="p-4 font-mono font-bold text-indigo-600">{formatearCodigo(t.codigo_ticket)}</td>
                    <td className="p-4"><span className={`px-3 py-1 rounded-lg font-bold ${badge}`}>{t.estado}</span></td>
                    <td className="p-4 text-slate-500">{new Date(t.created_at).toLocaleDateString()}</td>
                    <td className="p-4 font-bold text-slate-700">{t.nombre_usuario || 'Desconocido'} <span className="text-xs text-slate-400 font-normal">(Apto {t.inmueble})</span></td>
                    <td className="p-4 text-slate-600 font-bold">{t.categoria}</td>
                  </tr>
                );
              })}
              
              {!cargando && ticketsFiltrados.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-16 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <span className="text-5xl mb-4">🎉</span>
                      <h3 className="text-xl font-bold text-slate-700">¡Bandeja Limpia!</h3>
                      <p className="font-medium mt-2">No tienes casos escalados pendientes o tu búsqueda no dio resultados.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE GESTIÓN DEL STAFF */}
      {ticketSeleccionado && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="bg-indigo-950 p-8 flex justify-between items-start shrink-0">
              <div>
                <span className="text-indigo-400 font-mono text-xs font-bold tracking-widest uppercase flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                  {formatearCodigo(ticketSeleccionado.codigo_ticket)}
                </span>
                <h3 className="text-3xl font-black text-white mt-2 tracking-tight">Caso: {ticketSeleccionado.categoria}</h3>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                  Radicado por: {ticketSeleccionado.nombre_usuario} (Apto: {ticketSeleccionado.inmueble})
                </p>
              </div>
              <button onClick={() => setTicketSeleccionado(null)} className="w-10 h-10 rounded-full bg-white/10 hover:bg-red-500 text-slate-300 hover:text-white flex items-center justify-center font-bold transition-colors">✕</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 flex flex-col lg:flex-row gap-8 bg-slate-50/50">
              <div className="flex-1 space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-4 border-b border-slate-50 pb-2">Descripción del Residente</p>
                  <p className="text-slate-700 text-base whitespace-pre-wrap leading-relaxed font-medium">{ticketSeleccionado.descripcion}</p>
                  
                  {ticketSeleccionado.evidencia_url && (
                    <div className="mt-6 pt-4 border-t border-slate-50">
                      <a href={ticketSeleccionado.evidencia_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all border border-indigo-100">
                        📎 Ver Evidencia Original
                      </a>
                    </div>
                  )}
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-4 border-b border-slate-50 pb-2">Historial del Caso</p>
                  {(!ticketSeleccionado.historial || ticketSeleccionado.historial.length === 0) ? (
                    <p className="text-sm text-slate-400 italic text-center py-6">Sin interacciones previas.</p>
                  ) : (
                    <div className="space-y-4">
                      {ticketSeleccionado.historial.map((msg, i) => (
                        <div key={i} className={`p-5 rounded-2xl text-sm ${msg.autor === 'Residente' ? 'bg-slate-50 border border-slate-100 mr-8' : 'bg-indigo-50 border border-indigo-100 ml-8'}`}>
                          <p className="font-medium text-slate-700">{msg.mensaje}</p>
                          {msg.evidencia_url && (
                            <a href={msg.evidencia_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 mt-3 text-[10px] font-black text-blue-600 hover:text-blue-800 bg-white/60 px-4 py-2 rounded-lg transition-colors uppercase tracking-widest border border-blue-100">
                              📎 Ver Adjunto
                            </a>
                          )}
                          <p className="text-[9px] font-black text-slate-400 mt-3 uppercase">{msg.autor} • {new Date(msg.fecha).toLocaleString('es-CO')}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="lg:w-1/3 bg-white p-8 rounded-3xl border border-slate-100 shadow-xl h-fit space-y-5 sticky top-0">
                <h4 className="font-black text-slate-800 text-sm border-b border-slate-50 pb-4">Responder Caso</h4>
                
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Cambiar Estado</label>
                  <select value={gestionEstado} onChange={(e) => setGestionEstado(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-bold">
                    <option value="Escalado">Mantener Escalado (En Revisión)</option>
                    <option value="En proceso">Marcar En Proceso</option>
                    <option value="Resuelto">Marcar como Resuelto</option>
                  </select>
                </div>
                
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Respuesta Oficial</label>
                  <textarea value={gestionNotas} onChange={e => setGestionNotas(e.target.value)} rows="4" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-medium resize-none" placeholder="Tu respuesta será visible para el residente y el administrador..."></textarea>
                </div>
                
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Adjuntar Archivo de Soporte</label>
                  <input 
                    type="file" accept=".pdf, .png, .jpg, .jpeg" 
                    onChange={e => setEvidenciaStaff(e.target.files[0])} 
                    className="w-full text-[10px] text-slate-500 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:font-black file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100 cursor-pointer"
                  />
                </div>

                <button onClick={guardarRespuesta} disabled={cargando} className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg text-[10px] uppercase tracking-widest mt-4">
                  {cargando ? 'Enviando...' : 'Enviar Respuesta'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}