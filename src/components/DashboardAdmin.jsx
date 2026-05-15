import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabase';
import Swal from 'sweetalert2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import * as XLSX from 'xlsx';

ChartJS.register(ArcElement, Tooltip, Legend);

const formatearCodigo = (codigo) => {
  if (!codigo) return 'S/N';
  return `TKT-${String(codigo).padStart(5, '0')}`;
};

// ✅ IMPORTANTE: Recibimos { permisos } del componente padre
export default function DashboardAdmin({ permisos }) {
  const [usuarioActual, setUsuarioActual] = useState(null);
  const [ticketsGlobales, setTicketsGlobales] = useState([]);
  const [cargando, setCargando] = useState(true);

  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroUsuario, setFiltroUsuario] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroInmueble, setFiltroInmueble] = useState('');

  const [ticketSeleccionado, setTicketSeleccionado] = useState(null);
  const [gestionEstado, setGestionEstado] = useState('');
  const [gestionNotas, setGestionNotas] = useState('');
  const [gestionAsignado, setGestionAsignado] = useState('');
  const [listaStaff, setListaStaff] = useState([]);
  const [evidenciaAdmin, setEvidenciaAdmin] = useState(null);

  useEffect(() => {
    inicializarDashboard();
  }, []);

  const inicializarDashboard = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: userData } = await supabase.from('usuarios').select('*').eq('id', session.user.id).single();
      setUsuarioActual(userData);
      cargarDatosRealtime(userData);
    } catch (error) {
      console.error("Error iniciando dashboard:", error);
    }
  };

  const cargarDatosRealtime = async (user) => {
    setCargando(true);
    try {
      let query = supabase.from('tickets').select('*').order('created_at', { ascending: false });
      if (user.rol !== 'agente') {
        query = query.or(`usuario_id.eq.${user.id},asignado_a.eq.${user.id}`);
      }
      
      const { data: tickets, error } = await query;
      if (error) throw error;
      setTicketsGlobales(tickets || []);

      const casosNuevos = (tickets || []).filter(t => t.estado === 'Abierto').length;
      if (casosNuevos > 0) {
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'info',
          title: `${casosNuevos} Nuevo(s) Caso(s)`,
          text: 'Tienes tickets pendientes por revisar.',
          showConfirmButton: false,
          timer: 5000,
          timerProgressBar: true,
          background: '#0f172a',
          color: '#ffffff',
          iconColor: '#3b82f6'
        });
      }

      supabase.removeAllChannels();

      const canalTickets = supabase.channel('tickets-cambios');
      canalTickets.on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'tickets' }, 
        async () => {
          const { data: newTickets } = await query;
          setTicketsGlobales(newTickets || []);
        }
      ).subscribe();
    } catch (error) {
      console.error("Error cargando tickets:", error);
    } finally {
      setCargando(false);
    }
  };

  const ticketsFiltrados = useMemo(() => {
    return ticketsGlobales.filter(t => {
      const coincideEstado = filtroEstado === '' || t.estado.toLowerCase() === filtroEstado.toLowerCase();
      const coincideUsuario = filtroUsuario === '' || (t.nombre_usuario || '').toLowerCase().includes(filtroUsuario.toLowerCase());
      const coincideTipo = filtroTipo === '' || (t.categoria || '').toLowerCase() === filtroTipo.toLowerCase();
      const coincideInmueble = filtroInmueble === '' || (t.inmueble || '').toLowerCase().includes(filtroInmueble.toLowerCase());
      return coincideEstado && coincideUsuario && coincideTipo && coincideInmueble;
    });
  }, [ticketsGlobales, filtroEstado, filtroUsuario, filtroTipo, filtroInmueble]);

  const stats = useMemo(() => {
    let abiertos = 0; let proceso = 0; let cerrados = 0;
    ticketsGlobales.forEach(t => {
      if (t.estado === 'Abierto') abiertos++;
      else if (t.estado === 'En proceso' || t.estado === 'En Proceso' || t.estado === 'Escalado') proceso++;
      else if (t.estado === 'Cerrado' || t.estado === 'Resuelto') cerrados++;
    });
    return { abiertos, proceso, cerrados, total: ticketsGlobales.length };
  }, [ticketsGlobales]);

  const dataGrafica = {
    labels: ['Abierto', 'En Proceso', 'Cerrado'],
    datasets: [{
      data: [stats.abiertos, stats.proceso, stats.cerrados],
      backgroundColor: ['#ef4444', '#f59e0b', '#22c55e'],
      borderWidth: 0,
      hoverOffset: 10
    }]
  };

  const exportarExcel = () => {
    if (ticketsGlobales.length === 0) return Swal.fire('Sin datos', 'No hay casos para exportar.', 'warning');
    const datosParaExcel = ticketsGlobales.map(t => ({
      'ID Caso': formatearCodigo(t.codigo_ticket),
      'Fecha Radicado': new Date(t.created_at).toLocaleDateString(),
      'Estado': t.estado,
      'Usuario': `${t.nombre_usuario} (Apto ${t.inmueble})`,
      'Categoría': t.categoria,
      'Dependencia': t.dependencia,
      'Descripción': t.descripcion,
      'Link Evidencia': t.evidencia_url ? t.evidencia_url : 'Sin adjunto'
    }));
    const hoja = XLSX.utils.json_to_sheet(datosParaExcel);
    hoja['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 35 }, { wch: 15 }, { wch: 20 }, { wch: 50 }, { wch: 30 }];
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Reporte_PQRs");
    XLSX.writeFile(libro, `Reporte_CRM_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const abrirDetalle = (ticket) => {
    setTicketSeleccionado(ticket);
    setGestionEstado(ticket.estado === 'Abierto' ? 'En proceso' : ticket.estado);
    setGestionNotas('');
    setEvidenciaAdmin(null);
    setGestionAsignado(ticket.asignado_a || '');
  };

  const evaluarEstadoEscalamiento = async (nuevoEstado) => {
    setGestionEstado(nuevoEstado);
    if (nuevoEstado === 'Escalado') {
      const { data: conf } = await supabase.from('configuracion').select('codigo_staff').eq('id', 1).single();
      const palabraClave = conf?.codigo_staff || 'STAFF';
      const { data: usuarios } = await supabase
        .from('usuarios')
        .select('id, nombre, email, rol, inmueble')
        .eq('inmueble', palabraClave)
        .neq('id', usuarioActual.id);
      setListaStaff(usuarios || []);
    }
  };

  const guardarGestionPQR = async () => {
    if (gestionEstado === 'Escalado' && !gestionAsignado) {
      return Swal.fire('Atención', 'Selecciona a un usuario para escalar el caso.', 'warning');
    }
    
    setCargando(true);
    Swal.fire({ title: 'Actualizando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    
    try {
      let urlEvidenciaAdmin = null;
      if (evidenciaAdmin) {
        const ext = evidenciaAdmin.name.split('.').pop();
        const ruta = `${ticketSeleccionado.copropiedad_id}/admin_${ticketSeleccionado.id}_${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('evidencias').upload(ruta, evidenciaAdmin);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('evidencias').getPublicUrl(ruta);
        urlEvidenciaAdmin = publicUrl;
      }

      let historialActualizado = Array.isArray(ticketSeleccionado.historial) ? [...ticketSeleccionado.historial] : [];
      if (gestionNotas.trim() !== '' || urlEvidenciaAdmin) {
        historialActualizado.push({ 
          fecha: new Date().toISOString(), 
          autor: usuarioActual.nombre, 
          mensaje: gestionNotas.trim() || 'Archivo adjunto enviado',
          evidencia_url: urlEvidenciaAdmin
        });
      }

      let updateData = {
        estado: gestionEstado,
        historial: historialActualizado
      };
      
      if (gestionEstado === 'Escalado') updateData.asignado_a = gestionAsignado;
      
      const { error } = await supabase.from('tickets').update(updateData).eq('id', ticketSeleccionado.id);
      if (error) throw error;
      
      Swal.fire('Gestión Guardada', 'El caso ha sido actualizado exitosamente.', 'success');
      setTicketSeleccionado(null);
    } catch (e) {
      console.error(e);
      Swal.fire('Error', 'No se pudo actualizar el caso', 'error');
    } finally {
      setCargando(false);
    }
  };

  if (!usuarioActual) return <div className="p-8 text-center text-slate-500">Cargando perfil...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Centro de <span className="text-blue-600">Mando</span></h2>
          <p className="text-slate-500 font-medium">Panel de control y gestión operativa PQRS.</p>
        </div>
        
        {/* ✅ BOTÓN PROTEGIDO POR ROL Y POR PLAN (permisos.exportar) */}
        {usuarioActual?.rol === 'agente' && permisos?.exportar && (
          <button onClick={exportarExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-2xl flex items-center shadow-lg shadow-emerald-200 transition-all transform hover:-translate-y-1">
            <span className="mr-2">📊</span> Exportar Reporte Excel
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform"><span className="text-7xl">📁</span></div>
          <div className="relative z-10">
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Total Casos</p>
            <h3 className="text-4xl font-black text-slate-800">{stats.total}</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform"><span className="text-7xl">⏳</span></div>
          <div className="relative z-10">
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Pendientes</p>
            <h3 className="text-4xl font-black text-orange-500">{stats.abiertos + stats.proceso}</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform"><span className="text-7xl">✅</span></div>
          <div className="relative z-10">
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Resueltos</p>
            <h3 className="text-4xl font-black text-emerald-500">{stats.cerrados}</h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
          <div className="p-6 bg-slate-50/50 border-b border-slate-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <input type="text" placeholder="Buscar residente..." value={filtroUsuario} onChange={e => setFiltroUsuario(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500" />
            <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Cualquier Estado</option><option value="abierto">Abierto</option><option value="en proceso">En Proceso</option><option value="escalado">Escalado</option><option value="resuelto">Resuelto</option>
            </select>
            <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Categoría...</option><option value="Petición">Petición</option><option value="Queja">Queja</option><option value="Reclamo">Reclamo</option>
            </select>
            <input type="text" placeholder="Inmueble (Ej: Apto 504)..." value={filtroInmueble} onChange={e => setFiltroInmueble(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="overflow-x-auto p-2">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="text-slate-400 font-bold uppercase text-[9px] tracking-widest border-b border-slate-50">
                <tr><th className="p-4">Ticket ID</th><th className="p-4">Estado</th><th className="p-4">Fecha</th><th className="p-4">Usuario e Inmueble</th><th className="p-4">Tipo</th><th className="p-4">Dependencia</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {cargando && ticketsFiltrados.length === 0 ? (
                  <tr><td colSpan="6" className="text-center py-10 text-slate-400">Sincronizando...</td></tr>
                ) : ticketsFiltrados.map((t) => {
                  let badge = 'bg-slate-100 text-slate-800';
                  if (t.estado === 'Abierto') badge = 'bg-red-50 text-red-600 border border-red-100';
                  if (t.estado === 'En proceso' || t.estado === 'En Proceso') badge = 'bg-orange-50 text-orange-600 border border-orange-100';
                  if (t.estado === 'Escalado') badge = 'bg-orange-100 text-orange-700 border border-orange-200';
                  if (t.estado === 'Resuelto' || t.estado === 'Cerrado') badge = 'bg-emerald-50 text-emerald-600 border border-emerald-100';
                  
                  return (
                    <tr key={t.id} onClick={() => abrirDetalle(t)} className="hover:bg-slate-50 transition-colors cursor-pointer group">
                      <td className="p-4 font-mono font-bold text-blue-600">{formatearCodigo(t.codigo_ticket)}</td>
                      <td className="p-4"><span className={`px-2 py-1 rounded-lg font-bold ${badge}`}>{t.estado}</span></td>
                      <td className="p-4 text-slate-500">{new Date(t.created_at).toLocaleDateString()}</td>
                      <td className="p-4">
                        <p className="font-bold text-slate-700">{t.nombre_usuario || 'Desconocido'}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{t.inmueble || 'Sin Inmueble'}</p>
                      </td>
                      <td className="p-4 text-slate-600 font-bold">{t.categoria}</td>
                      <td className="p-4 text-slate-500 font-medium italic">{t.dependencia || 'N/A'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-4 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 flex flex-col justify-center relative overflow-hidden">
          <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-8 border-l-4 border-blue-500 pl-3">Distribución</h4>
          <div className="w-full aspect-square relative">
            <Doughnut data={dataGrafica} options={{ cutout: '80%', plugins: { legend: { display: false } } }} />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-4xl font-black text-slate-800">{stats.total}</span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Total</span>
            </div>
          </div>
        </div>
      </div>

      {ticketSeleccionado && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="bg-[#0f172a] p-8 flex justify-between items-start shrink-0 border-b border-slate-800">
              <div>
                <span className="text-blue-400 font-mono text-xs font-bold tracking-widest uppercase flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                  {formatearCodigo(ticketSeleccionado.codigo_ticket)}
                </span>
                <h3 className="text-3xl font-black text-white mt-2 tracking-tight">Radicado por {ticketSeleccionado.nombre_usuario}</h3>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-2">
                  <span>📍 Apto: {ticketSeleccionado.inmueble || 'S/N'}</span>
                  <span className="text-slate-600">•</span>
                  <span>✉️ {ticketSeleccionado.email || 'Sin correo'}</span>
                </p>
              </div>
              <button onClick={() => setTicketSeleccionado(null)} className="w-10 h-10 rounded-full bg-white/10 hover:bg-red-500 text-slate-300 hover:text-white flex items-center justify-center font-bold transition-colors">✕</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 flex flex-col lg:flex-row gap-8 bg-slate-50/50">
              <div className="flex-1 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm"><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Estado Actual</p><p className="font-black text-slate-800 text-lg">{ticketSeleccionado.estado}</p></div>
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm"><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Categoría</p><p className="font-black text-slate-800 text-lg">{ticketSeleccionado.categoria}</p></div>
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm"><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Dependencia</p><p className="font-black text-indigo-600 text-lg">{ticketSeleccionado.dependencia || 'N/A'}</p></div>
                </div>
                
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-4 border-b border-slate-50 pb-2">Descripción del Caso</p>
                  <p className="text-slate-700 text-base whitespace-pre-wrap leading-relaxed font-medium">{ticketSeleccionado.descripcion}</p>
                  
                  {ticketSeleccionado.evidencia_url && (
                    <div className="mt-6 pt-4 border-t border-slate-50">
                      <a href={ticketSeleccionado.evidencia_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all border border-indigo-100">
                        📎 Ver Evidencia del Residente
                      </a>
                    </div>
                  )}
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-4 border-b border-slate-50 pb-2">Historial de Comunicación</p>
                  {(!ticketSeleccionado.historial || ticketSeleccionado.historial.length === 0) ? (
                    <p className="text-sm text-slate-400 italic text-center py-6">No hay respuestas previas.</p>
                  ) : (
                    <div className="space-y-4">
                      {ticketSeleccionado.historial.map((msg, i) => (
                        <div key={i} className={`p-5 rounded-2xl text-sm ${msg.autor === 'Residente' ? 'bg-indigo-50 border border-indigo-100 ml-8' : 'bg-slate-50 border border-slate-100 mr-8'}`}>
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

              {(usuarioActual.rol === 'agente' || ticketSeleccionado.asignado_a === usuarioActual.id) && (
                <div className="lg:w-1/3 bg-white p-8 rounded-3xl border border-slate-100 shadow-xl h-fit space-y-5 sticky top-0">
                  <h4 className="font-black text-slate-800 text-sm border-b border-slate-50 pb-4">Gestión de Resolución</h4>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Nuevo Estado</label>
                    <select value={gestionEstado} onChange={(e) => evaluarEstadoEscalamiento(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-xs outline-none focus:ring-2 focus:ring-blue-500 font-bold">
                      <option value="Abierto">Abierto</option>
                      <option value="En proceso">En proceso</option>
                      {permisos?.escalar && (
                      <option value="Escalado">Escalar a STAFF</option>
                      )}
                      <option value="Resuelto">Resuelto</option>
                      <option value="Cerrado">Cerrado</option>
                    </select>
                  </div>
                  {gestionEstado === 'Escalado' && (
                    <div className="animate-in fade-in slide-in-from-top-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Asignar Personal</label>
                      <select value={gestionAsignado} onChange={e => setGestionAsignado(e.target.value)} className="w-full bg-orange-50 border border-orange-200 rounded-xl px-5 py-4 text-xs outline-none focus:ring-2 focus:ring-orange-500 font-bold text-orange-900">
                        <option value="">Seleccione...</option>
                        {listaStaff.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Respuesta (Chat)</label>
                    <textarea value={gestionNotas} onChange={e => setGestionNotas(e.target.value)} rows="3" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium resize-none" placeholder="Escribe aquí tu respuesta..."></textarea>
                  </div>
                  
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 flex justify-between">
                      <span>Adjuntar Evidencia</span><span className="text-slate-300">Max 10MB</span>
                    </label>
                    <input 
                      type="file" accept=".pdf, .png, .jpg, .jpeg" 
                      onChange={e => {
                        const file = e.target.files[0];
                        if(file && file.size > 10485760) {
                          Swal.fire('Muy pesado', 'El archivo supera los 10MB.', 'warning');
                          e.target.value = '';
                          setEvidenciaAdmin(null);
                        } else {
                          setEvidenciaAdmin(file);
                        }
                      }} 
                      className="w-full text-[10px] text-slate-500 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:font-black file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 cursor-pointer"
                    />
                  </div>

                  <button onClick={guardarGestionPQR} disabled={cargando} className="w-full bg-[#0f172a] text-white font-black py-5 rounded-2xl hover:bg-blue-600 transition-all shadow-lg text-[10px] uppercase tracking-widest mt-4">Enviar Respuesta</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}