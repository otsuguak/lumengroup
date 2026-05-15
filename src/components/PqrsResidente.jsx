import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import Swal from 'sweetalert2';

const calcularFechaVencimiento = (diasPlazo, festivosDB) => {
  if (diasPlazo === 0) return null;
  let fecha = new Date();
  let diasContados = 0;
  while (diasContados < diasPlazo) {
    fecha.setDate(fecha.getDate() + 1);
    const diaSemana = fecha.getDay();
    const fechaString = fecha.toISOString().split('T')[0];
    if (diaSemana !== 0 && diaSemana !== 6 && !festivosDB.includes(fechaString)) {
      diasContados++;
    }
  }
  return fecha.toISOString().split('T')[0];
};

const formatearCodigo = (codigo) => {
  if (!codigo) return 'S/N';
  return `TKT-${String(codigo).padStart(5, '0')}`;
};

export default function PqrsResidente() {
  const [cargando, setCargando] = useState(true);
  const [misPqrs, setMisPqrs] = useState([]);
  const [copropiedadId, setCopropiedadId] = useState(null);
  const [usuarioInfo, setUsuarioInfo] = useState({ id: '', email: '', nombre: '', inmueble: '' });
  const [categoriasAdmin, setCategoriasAdmin] = useState([]);
  const [listaFestivos, setListaFestivos] = useState([]);
  const [pqr, setPqr] = useState({ categoria: '', dependencia: '', asunto: '', descripcion: '', dias_sla: 0 });
  const [evidencia, setEvidencia] = useState(null);
  const [ticketSeleccionado, setTicketSeleccionado] = useState(null);

  useEffect(() => {
    inicializarDatos();
  }, []);

  const inicializarDatos = async () => {
    setCargando(true);
    try {
      const currentId = sessionStorage.getItem('copropiedad_id');
      if (!currentId) throw new Error("ID de copropiedad no encontrado");
      setCopropiedadId(currentId);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUsuarioInfo({ 
          id: user.id,
          email: user.email, 
          nombre: user.user_metadata?.nombre || 'Residente',
          inmueble: user.user_metadata?.inmueble || 'Sin Inmueble Asignado'
        });
        await cargarTodo(currentId, user.email);
      }
    } catch (e) {
      console.error("Error inicializando:", e);
    } finally {
      setCargando(false);
    }
  };

  const cargarTodo = async (idCopropiedad, emailUsuario) => {
    try {
      const { data: cats } = await supabase.from('configuracion_pqrs').select('*').eq('copropiedad_id', idCopropiedad);
      setCategoriasAdmin(cats || []);

      const { data: fests } = await supabase.from('configuracion_festivos').select('fecha').eq('copropiedad_id', idCopropiedad);
      if (fests) setListaFestivos(fests.map(f => f.fecha));

      const { data: historial, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('copropiedad_id', idCopropiedad)
        .eq('email', emailUsuario);

      if (error) throw error;
      const historialOrdenado = (historial || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setMisPqrs(historialOrdenado);
    } catch (err) {
      console.error("Error al cargar tickets:", err);
    }
  };

  const manejarArchivo = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10485760) {
      Swal.fire('Archivo muy pesado', 'La evidencia no puede superar los 10MB.', 'warning');
      e.target.value = ''; 
      setEvidencia(null);
      return;
    }
    setEvidencia(file);
  };

  const enviarPqr = async () => {
    if (!pqr.categoria || !pqr.dependencia || !pqr.asunto || !pqr.descripcion) {
      return Swal.fire('Faltan datos', 'Completa la clasificación y los campos obligatorios.', 'warning');
    }

    Swal.fire({ title: 'Radicando...', text: evidencia ? 'Subiendo evidencia...' : '', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
      const fechaVence = calcularFechaVencimiento(pqr.dias_sla, listaFestivos);

      const { data: nuevo, error: errIns } = await supabase.from('tickets').insert([{
        copropiedad_id: copropiedadId,
        usuario_id: usuarioInfo.id,
        nombre_usuario: usuarioInfo.nombre,
        usuario: usuarioInfo.nombre,
        email: usuarioInfo.email,
        inmueble: usuarioInfo.inmueble,
        categoria: pqr.categoria,
        dependencia: pqr.dependencia,
        asunto: pqr.asunto,
        descripcion: pqr.descripcion,
        estado: 'Abierto',
        historial: [],
        fecha_vencimiento: fechaVence
      }]).select('id, codigo_ticket').single();

      if (errIns) throw errIns;

      if (evidencia) {
        const ext = evidencia.name.split('.').pop();
        const ruta = `${copropiedadId}/ticket_${nuevo.id}.${ext}`;
        await supabase.storage.from('evidencias').upload(ruta, evidencia);
        const { data: { publicUrl } } = supabase.storage.from('evidencias').getPublicUrl(ruta);
        await supabase.from('tickets').update({ evidencia_url: publicUrl }).eq('id', nuevo.id);
      }

      await Swal.fire({
        icon: 'success',
        title: '¡Radicado Exitoso!',
        text: `Tu número de seguimiento es: ${formatearCodigo(nuevo.codigo_ticket)}`,
        confirmButtonColor: '#4f46e5'
      });
      
      setPqr({ categoria: '', dependencia: '', asunto: '', descripcion: '', dias_sla: 0 });
      setEvidencia(null);
      if(document.getElementById('fileEvidencia')) document.getElementById('fileEvidencia').value = '';
      
      await cargarTodo(copropiedadId, usuarioInfo.email);
    } catch (e) {
      console.error(e);
      Swal.fire('Error', 'No pudimos guardar la solicitud.', 'error');
    }
  };

  const abrirModalDetalle = (ticket) => setTicketSeleccionado(ticket);
  const cerrarModal = () => setTicketSeleccionado(null);

  if (cargando) return <div className="flex justify-center p-10"><div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div></div>;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700 relative">
      
      {ticketSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="bg-indigo-600 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter shadow-sm">
                    {ticketSeleccionado.categoria || 'SOLICITUD'}
                  </span>
                  <h3 className="text-2xl font-black text-slate-800">
                    {formatearCodigo(ticketSeleccionado.codigo_ticket)}
                  </h3>
                </div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                  Dirigido a: {ticketSeleccionado.dependencia || 'Administración'}
                </p>
              </div>
              <button onClick={cerrarModal} className="w-10 h-10 rounded-full bg-slate-200 hover:bg-red-100 hover:text-red-500 flex items-center justify-center text-slate-500 font-bold transition-colors">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              <div className="space-y-4">
                <div className="flex flex-wrap gap-4 items-center justify-between">
                  <h4 className="text-xl font-black text-slate-800 leading-tight flex-1">{ticketSeleccionado.asunto}</h4>
                  <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border ${
                    ticketSeleccionado.estado === 'Abierto' ? 'bg-orange-50 text-orange-600 border-orange-200' : 
                    ticketSeleccionado.estado === 'En proceso' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                    'bg-emerald-50 text-emerald-600 border-emerald-200'
                  }`}>
                    {ticketSeleccionado.estado}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Radicado el</p>
                    <p className="text-sm font-bold text-slate-700">{new Date(ticketSeleccionado.created_at).toLocaleDateString('es-CO')}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Vencimiento SLA</p>
                    <p className={`text-sm font-bold ${!ticketSeleccionado.fecha_vencimiento ? 'text-slate-500' : new Date(ticketSeleccionado.fecha_vencimiento) < new Date() ? 'text-red-500' : 'text-slate-700'}`}>
                      {ticketSeleccionado.fecha_vencimiento ? new Date(ticketSeleccionado.fecha_vencimiento).toLocaleDateString('es-CO') : 'Sin Vencimiento'}
                    </p>
                  </div>
                  {ticketSeleccionado.evidencia_url && (
                    <div className="col-span-2 md:col-span-1">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Evidencia Original</p>
                      <a href={ticketSeleccionado.evidencia_url} target="_blank" rel="noreferrer" className="inline-flex text-[10px] font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-widest transition-colors">
                        📎 Abrir Evidencia
                      </a>
                    </div>
                  )}
                </div>

                <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex justify-between">
                    <span>Descripción del caso</span>
                    <span className="text-indigo-400 font-bold">Reportado desde: {usuarioInfo.inmueble}</span>
                  </p>
                  <p className="text-sm text-slate-600 font-medium leading-relaxed whitespace-pre-wrap">{ticketSeleccionado.descripcion}</p>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-200">
                <h5 className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <span>💬</span> Hilo de Seguimiento
                </h5>
                
                {(!ticketSeleccionado.historial || ticketSeleccionado.historial.length === 0) ? (
                  <div className="text-center p-6 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-xs font-medium text-slate-400 italic">La administración aún no ha respondido a este ticket.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {ticketSeleccionado.historial.map((msg, idx) => (
                      <div key={idx} className={`flex flex-col max-w-[85%] ${msg.autor === 'Residente' ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                        <div className={`p-4 rounded-2xl shadow-sm ${msg.autor === 'Residente' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-100 text-slate-700 border border-slate-200 rounded-tl-none'}`}>
                          <p className="text-sm font-medium whitespace-pre-wrap">{msg.mensaje}</p>
                          
                          {/* SI LA ADMINISTRACIÓN ENVIÓ UN ADJUNTO, EL RESIDENTE LO VE AQUÍ */}
                          {msg.evidencia_url && (
                            <a href={msg.evidencia_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 mt-3 text-[10px] font-black text-indigo-600 hover:text-indigo-800 bg-white/60 px-3 py-1.5 rounded-lg transition-colors uppercase tracking-widest border border-indigo-100">
                              📎 Ver Documento Adjunto
                            </a>
                          )}
                        </div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 px-1">
                          {msg.autor || 'Administrador'} • {new Date(msg.fecha).toLocaleString('es-CO', {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-200 pb-8">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Atención al <span className="text-indigo-600">Residente</span></h2>
          <p className="text-slate-500 font-medium">Radica tus peticiones, quejas o reclamos oficialmente.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        <div className="lg:col-span-5 bg-white p-8 md:p-10 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 h-fit">
          <h4 className="font-black text-slate-800 text-xl mb-8 flex items-center">
            <span className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mr-4 shadow-inner">📝</span>
            Radicar Solicitud
          </h4>
          
          <div className="space-y-6">
            {(() => {
              const categoriasUnicas = [...new Set(categoriasAdmin.map(c => c.tipo))];
              const dependenciasDisponibles = categoriasAdmin.filter(c => c.tipo === pqr.categoria);

              return (
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Clasificación de Solicitud</label>
                    <select value={pqr.categoria} onChange={e => setPqr({...pqr, categoria: e.target.value, dependencia: '', dias_sla: 0})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm font-bold text-slate-700 cursor-pointer">
                      <option value="">Seleccione la categoría...</option>
                      {categoriasUnicas.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>

                  {pqr.categoria && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Área o Dependencia Responsable</label>
                      <select value={pqr.dependencia} onChange={e => {
                          const cat = dependenciasDisponibles.find(c => c.dependencia === e.target.value);
                          setPqr({...pqr, dependencia: e.target.value, dias_sla: cat ? cat.dias_respuesta : 0});
                        }} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm font-bold text-slate-700 cursor-pointer">
                        <option value="">Seleccione a dónde dirigirlo...</option>
                        {dependenciasDisponibles.map(cat => (
                          <option key={cat.id} value={cat.dependencia}>
                            {cat.dependencia} (SLA: {cat.dias_respuesta === 0 ? 'Sin límite' : `${cat.dias_respuesta} días hábiles`})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              );
            })()}

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Asunto Corto</label>
              <input type="text" value={pqr.asunto} onChange={e => setPqr({...pqr, asunto: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm font-bold text-slate-700" placeholder="Ej: Ruido en el apartamento 402" maxLength={50} />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Descripción Detallada</label>
              <textarea value={pqr.descripcion} onChange={e => setPqr({...pqr, descripcion: e.target.value})} rows="4" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm font-medium text-slate-600 resize-none leading-relaxed" placeholder="Explica tu situación con el mayor detalle posible..."></textarea>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1 flex justify-between">
                <span>Evidencia (Opcional)</span>
                <span className="text-slate-300">Max 10MB</span>
              </label>
              <input id="fileEvidencia" type="file" accept=".pdf, .png, .jpg, .jpeg" onChange={manejarArchivo} className="w-full p-2 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all text-sm file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100 cursor-pointer text-slate-500" />
            </div>

            <div className="pt-4">
              <button onClick={enviarPqr} className="w-full bg-slate-900 hover:bg-indigo-600 text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-slate-200 uppercase tracking-widest text-xs transform hover:-translate-y-1">
                Crear Ticket
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col h-full min-h-[500px]">
          <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
            <h4 className="font-black text-xl text-slate-800">Mis Tickets Radicados</h4>
            <span className="bg-indigo-100 text-indigo-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">{misPqrs.length} Registros</span>
          </div>
          
          <div className="flex-1 p-6 overflow-y-auto no-scrollbar space-y-4 bg-slate-50/30">
            {misPqrs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 opacity-50">
                <span className="text-5xl mb-4">📂</span>
                <p className="font-medium italic">Aún no has radicado ninguna solicitud.</p>
              </div>
            ) : (
              misPqrs.map(ticket => {
                let dotColor = 'bg-orange-500 shadow-orange-200';
                if (ticket.estado === 'En proceso') dotColor = 'bg-blue-500 shadow-blue-200';
                if (ticket.estado === 'Resuelto' || ticket.estado === 'Cerrado') dotColor = 'bg-emerald-500 shadow-emerald-200';

                return (
                  <div key={ticket.id} onClick={() => abrirModalDetalle(ticket)} className="p-6 rounded-[2rem] border border-slate-100 bg-white shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all cursor-pointer group flex items-center gap-5 transform hover:-translate-y-1">
                    
                    <div className={`${dotColor} w-2 h-14 rounded-full flex-shrink-0 shadow-md`}></div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-md">
                            {ticket.categoria || 'SOLICITUD'}
                          </span>
                          <span className="text-xs font-black text-slate-800 tracking-tight">
                            {formatearCodigo(ticket.codigo_ticket)}
                          </span>
                        </div>
                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
                          {new Date(ticket.created_at).toLocaleDateString('es-CO', {day:'2-digit', month:'short'})}
                        </span>
                      </div>
                      <h5 className="font-black text-slate-700 text-sm truncate mb-1 group-hover:text-indigo-600 transition-colors">{ticket.asunto}</h5>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate italic">
                        Área: {ticket.dependencia || 'Administración'}
                      </p>
                    </div>

                    <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner flex-shrink-0">
                      <span className="text-lg font-light">→</span>
                    </div>

                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}