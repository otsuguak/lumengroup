import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import Swal from 'sweetalert2';

export default function ReservasResidente() {
  const [cargando, setCargando] = useState(true);
  const [zonas, setZonas] = useState([]);
  const [misReservas, setMisReservas] = useState([]);
  const [copropiedadId, setCopropiedadId] = useState(null);
  const [usuarioEmail, setUsuarioEmail] = useState('');
  
  const [reserva, setReserva] = useState({ zona: '', fecha: '', hora: '', apto: '' });

  useEffect(() => {
    cargarDatosResidente();
  }, []);

  const cargarDatosResidente = async () => {
    setCargando(true);
    try {
      const currentCopropiedadId = sessionStorage.getItem('copropiedad_id');
      if (!currentCopropiedadId) throw new Error("No hay copropiedad en sesión");
      setCopropiedadId(currentCopropiedadId);

      // Obtenemos el usuario autenticado
      const { data: { user } } = await supabase.auth.getUser();
      const email = user?.email || '';
      setUsuarioEmail(email);

      // 1. Cargar las zonas disponibles
      const { data: zonasData } = await supabase
        .from('zonas_comunes')
        .select('*')
        .eq('copropiedad_id', currentCopropiedadId);
      
      setZonas(zonasData || []);

      // 2. Cargar el historial de reservas DE ESTE RESIDENTE
      if (email) {
        const { data: historial } = await supabase
          .from('reservas')
          .select('*')
          .eq('copropiedad_id', currentCopropiedadId)
          .eq('email', email)
          .order('fecha', { ascending: false });
        
        setMisReservas(historial || []);
      }
      
    } catch (e) {
      console.error("Error al cargar datos:", e);
    } finally {
      setCargando(false);
    }
  };

  const enviarReserva = async () => {
    if (!reserva.zona || !reserva.fecha || !reserva.hora || !reserva.apto) {
      return Swal.fire({ icon: 'warning', title: 'Faltan datos', text: 'Por favor completa todos los campos.' });
    }

    const hoyLocal = new Date();
    hoyLocal.setMinutes(hoyLocal.getMinutes() - hoyLocal.getTimezoneOffset());
    const fechaHoyStr = hoyLocal.toISOString().split('T')[0];

    if (reserva.fecha < fechaHoyStr) {
      return Swal.fire({ icon: 'error', title: 'Fecha inválida', text: 'No puedes reservar en fechas pasadas.' });
    }

    Swal.fire({ title: 'Verificando disponibilidad...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
      const zonaSeleccionada = zonas.find(z => z.nombre === reserva.zona);
      const numeroAforo = zonaSeleccionada?.aforo ? parseInt(zonaSeleccionada.aforo.replace(/\D/g, ''), 10) : 1;
      const limiteCapacidad = isNaN(numeroAforo) ? 1 : numeroAforo;

      let queryBusqueda = supabase
        .from('reservas')
        .select('id')
        .eq('copropiedad_id', copropiedadId)
        .eq('zona', reserva.zona)
        .eq('fecha', reserva.fecha)
        .in('estado', ['Aprobada', 'Pendiente']);

      if (limiteCapacidad > 1) {
        queryBusqueda = queryBusqueda.eq('hora', reserva.hora);
      }

      const { data: reservasExistentes, error: errorBusqueda } = await queryBusqueda;

      if (errorBusqueda) throw errorBusqueda;

      if (reservasExistentes && reservasExistentes.length >= limiteCapacidad) {
        if (limiteCapacidad === 1) {
          return Swal.fire({ icon: 'error', title: 'Día No Disponible', text: `La zona "${reserva.zona}" es de uso exclusivo y ya está reservada todo el día ${reserva.fecha}.` });
        } else {
          if (reserva.hora >= "06:00" && reserva.hora <= "12:00") {
            return Swal.fire({ icon: 'error', title: '¡Ya no hay aforo!', text: `Lo sentimos, la zona "${reserva.zona}" alcanzó su límite para el turno de la mañana.` });
          } else {
            return Swal.fire({ icon: 'error', title: 'Cupo Lleno', text: `La zona "${reserva.zona}" no tiene cupos disponibles a las ${reserva.hora}. Intenta en otro horario.` });
          }
        }
      }

      const { error } = await supabase.from('reservas').insert([{
        copropiedad_id: copropiedadId,
        zona: reserva.zona,
        fecha: reserva.fecha,
        hora: reserva.hora,
        apto: reserva.apto,
        email: usuarioEmail, // Usamos el email de la sesión directamente
        estado: 'Pendiente'
      }]);

      if (error) throw error;

      Swal.fire({ icon: 'success', title: 'Solicitud Enviada', text: 'Tu solicitud ha sido enviada a la administración.' });
      
      // Limpiamos el formulario y recargamos el historial
      setReserva({ zona: '', fecha: '', hora: '', apto: '' });
      cargarDatosResidente();
      
    } catch (e) {
      console.error(e);
      Swal.fire({ icon: 'error', title: 'Error', text: 'Hubo un problema al procesar tu reserva.' });
    }
  };

  if (cargando) return <div className="flex justify-center p-10"><div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div></div>;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      
      {/* HEADER DE SECCIÓN */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-200 pb-8">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Mis <span className="text-indigo-600">Reservas</span></h2>
          <p className="text-slate-500 font-medium">Programa tus eventos y revisa el estado de tus solicitudes.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* ========================================================= */}
        {/* COLUMNA IZQUIERDA: FORMULARIO DE RESERVA (5 COLUMNAS)     */}
        {/* ========================================================= */}
        <div className="lg:col-span-5 bg-white p-8 md:p-10 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 h-fit">
          <h4 className="font-black text-slate-800 text-xl mb-8 flex items-center">
            <span className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mr-4 shadow-inner">📅</span>
            Agendar Espacio
          </h4>
          
          <div className="space-y-6">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Zona a Reservar</label>
              <select value={reserva.zona} onChange={e => setReserva({...reserva, zona: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm font-bold text-slate-700 cursor-pointer">
                <option value="">Seleccione un espacio...</option>
                {zonas.map(z => <option key={z.id} value={z.nombre}>{z.nombre} (Aforo: {z.aforo || 'Exclusivo'})</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Fecha</label>
                <input type="date" value={reserva.fecha} onChange={e => setReserva({...reserva, fecha: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm font-bold text-slate-700" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Hora</label>
                <input type="time" value={reserva.hora} onChange={e => setReserva({...reserva, hora: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm font-bold text-slate-700" />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Apto / Torre</label>
              <input type="text" value={reserva.apto} onChange={e => setReserva({...reserva, apto: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm font-bold text-slate-700" placeholder="Ej: Torre 1 - 201" />
            </div>

            <div className="pt-4">
              <button onClick={enviarReserva} className="w-full bg-slate-900 hover:bg-indigo-600 text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-slate-200 uppercase tracking-widest text-xs transform hover:-translate-y-1">
                Enviar Solicitud
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* COLUMNA DERECHA: HISTORIAL DE SOLICITUDES (7 COLUMNAS)    */}
        {/* ========================================================= */}
        <div className="lg:col-span-7 bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col h-full">
          <div className="p-8 border-b border-slate-50 bg-slate-50/50">
            <h4 className="font-black text-xl text-slate-800">Mi Historial</h4>
          </div>
          
          <div className="flex-1 p-6 overflow-y-auto no-scrollbar space-y-4">
            {misReservas.length === 0 ? (
              <div className="text-center py-10 text-slate-400 font-medium italic">
                Aún no has realizado ninguna solicitud de reserva.
              </div>
            ) : (
              misReservas.map(res => {
                // Asignación de colores por estado
                let colorBorde = 'border-yellow-500';
                let colorBadge = 'bg-yellow-50 text-yellow-600 border-yellow-200';
                let icono = '⏳';

                if (res.estado === 'Aprobada') {
                  colorBorde = 'border-emerald-500';
                  colorBadge = 'bg-emerald-50 text-emerald-600 border-emerald-200';
                  icono = '✅';
                }
                if (res.estado === 'Rechazada') {
                  colorBorde = 'border-red-500';
                  colorBadge = 'bg-red-50 text-red-600 border-red-200';
                  icono = '❌';
                }

                return (
                  <div key={res.id} className={`p-5 rounded-2xl border border-slate-100 bg-white shadow-sm border-l-4 ${colorBorde} flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:shadow-md`}>
                    
                    {/* Info principal de la tarjeta */}
                    <div>
                      <p className="font-black text-slate-800 text-lg flex items-center gap-2">
                        {res.zona}
                      </p>
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                        📅 {new Date(res.fecha).toLocaleDateString('es-CO')} | ⏰ {res.hora}
                      </p>
                      
                      {/* Si está rechazada, mostramos el motivo del administrador */}
                      {res.estado === 'Rechazada' && res.motivo && (
                        <p className="mt-3 text-sm text-red-600 bg-red-50 p-3 rounded-xl border border-red-100 font-medium">
                          <span className="font-bold block mb-1 uppercase tracking-widest text-[9px]">Motivo del rechazo:</span>
                          {res.motivo}
                        </p>
                      )}
                    </div>

                    {/* Estado o Badge */}
                    <div className="flex shrink-0">
                      <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border flex items-center gap-2 ${colorBadge}`}>
                        {icono} {res.estado}
                      </span>
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