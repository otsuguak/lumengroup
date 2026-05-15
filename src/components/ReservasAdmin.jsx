import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import Swal from 'sweetalert2';
import emailjs from '@emailjs/browser';

export default function ReservasAdmin() {
  const [reservas, setReservas] = useState([]);
  const [cargando, setCargando] = useState(true);

  // Estados para el Calendario Interactivo
  const [mesFiltro, setMesFiltro] = useState(new Date());
  const [fechaSeleccionada, setFechaSeleccionada] = useState(null);

  useEffect(() => {
    emailjs.init("hWOGPxekMX4ceP4AZ"); 
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setCargando(true);
    const copropiedadId = sessionStorage.getItem('copropiedad_id');
    
    if (!copropiedadId || copropiedadId === 'null') {
      console.warn("Sesión no detectada en Reservas.");
      setCargando(false);
      return;
    }

    try {
      const { data } = await supabase
        .from('reservas')
        .select('*')
        .eq('copropiedad_id', copropiedadId)
        .order('fecha', { ascending: false });
      setReservas(data || []);
    } catch (e) {
      console.error("Error cargando datos de reservas:", e);
    } finally {
      setCargando(false);
    }
  };

  const gestionarReserva = async (id, nuevoEstado, email, zona) => {
    let motivo = "";
    
    if (nuevoEstado === 'Rechazada') {
      const { value: text, isConfirmed } = await Swal.fire({
        title: 'Rechazar Reserva',
        input: 'text',
        inputLabel: `Indica el motivo del rechazo para la ${zona}:`,
        inputPlaceholder: 'Ej: Mantenimiento imprevisto, falta de pago...',
        showCancelButton: true,
        confirmButtonText: 'Confirmar Rechazo',
        confirmButtonColor: '#ef4444',
        cancelButtonText: 'Volver'
      });
      if (!isConfirmed) return;
      motivo = text || "No cumple con las políticas de reserva de la copropiedad.";
    } else {
      const { isConfirmed } = await Swal.fire({ 
        title: '¿Aprobar Reserva?', 
        text: `Se enviará un correo de confirmación a ${email}`,
        icon: 'question', 
        showCancelButton: true, 
        confirmButtonText: 'Sí, Aprobar',
        confirmButtonColor: '#10b981'
      });
      if (!isConfirmed) return;
      motivo = "¡Tu reserva ha sido confirmada con éxito! Te esperamos en el horario solicitado.";
    }

    Swal.fire({ title: 'Procesando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
      await supabase.from('reservas').update({ 
        estado: nuevoEstado,
        motivo: motivo 
      }).eq('id', id);
      
      await emailjs.send('service_yy0gcdm', 'template_0kwz3ij', {
        to_email: email, 
        zona_reservada: zona, 
        estado_reserva: nuevoEstado, 
        mensaje_adicional: motivo
      });
      
      Swal.fire('Gestión Exitosa', 'El residente ha sido notificado vía email.', 'success');
      cargarDatos();
    } catch (e) {
      console.error(e);
      Swal.fire('Atención', 'Se actualizó la base de datos pero el correo no pudo enviarse.', 'warning');
      cargarDatos();
    }
  };

  const borrarReserva = async (id) => {
    const { isConfirmed } = await Swal.fire({ 
      title: '¿Eliminar Registro?', 
      text: "Esta acción borrará el historial de esta solicitud.",
      icon: 'warning', 
      showCancelButton: true, 
      confirmButtonText: 'Sí, borrar',
      confirmButtonColor: '#ef4444'
    });
    if (isConfirmed) {
      await supabase.from('reservas').delete().eq('id', id);
      cargarDatos();
    }
  };

  // --- FUNCIONES DEL CALENDARIO ---
  const mesAnterior = () => setMesFiltro(new Date(mesFiltro.getFullYear(), mesFiltro.getMonth() - 1, 1));
  const mesSiguiente = () => setMesFiltro(new Date(mesFiltro.getFullYear(), mesFiltro.getMonth() + 1, 1));
  
  const renderizarDiasCalendario = () => {
    const year = mesFiltro.getFullYear();
    const month = mesFiltro.getMonth();
    const diasEnMes = new Date(year, month + 1, 0).getDate();
    const primerDia = new Date(year, month, 1).getDay();

    const dias = [];
    for (let i = 0; i < primerDia; i++) {
      dias.push(<div key={`blank-${i}`} className="p-2"></div>);
    }

    for (let d = 1; d <= diasEnMes; d++) {
      const fechaStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const resDelDia = reservas.filter(r => r.fecha === fechaStr);
      const tienePendientes = resDelDia.some(r => r.estado === 'Pendiente');
      const tieneAprobadas = resDelDia.some(r => r.estado === 'Aprobada');
      
      let colorPunto = '';
      if (tienePendientes) colorPunto = 'bg-orange-500';
      else if (tieneAprobadas) colorPunto = 'bg-emerald-500';
      else if (resDelDia.length > 0) colorPunto = 'bg-slate-400';

      const seleccionado = fechaSeleccionada === fechaStr;

      dias.push(
        <div 
          key={d} 
          onClick={() => setFechaSeleccionada(fechaStr === fechaSeleccionada ? null : fechaStr)}
          className={`flex flex-col items-center justify-center p-2 rounded-xl cursor-pointer transition-all ${
            seleccionado 
              ? 'bg-indigo-600 text-white shadow-lg scale-105' 
              : 'hover:bg-slate-100 text-slate-700'
          }`}
        >
          <span className={`text-sm ${seleccionado ? 'font-black' : 'font-bold'}`}>{d}</span>
          <div className="h-1.5 w-1.5 mt-1 rounded-full">
            {colorPunto && <div className={`w-full h-full rounded-full ${colorPunto}`}></div>}
          </div>
        </div>
      );
    }
    return dias;
  };

  const reservasMostrar = fechaSeleccionada 
    ? reservas.filter(r => r.fecha === fechaSeleccionada)
    : reservas;

  const tituloMes = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(mesFiltro);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-10">
      
      <div className="bg-white p-2 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 flex items-center justify-center">
        <div className="py-4 font-black text-xs uppercase tracking-widest text-slate-800">
          <span>📅</span> Panel de Solicitudes de Reserva
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LADO IZQUIERDO: CALENDARIO */}
        <div className="lg:col-span-5 bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 p-8 h-fit">
          <h4 className="font-black text-xl text-slate-800 mb-6 flex items-center justify-between">
            <span>Calendario <span className="text-indigo-600">Interactivo</span></span>
          </h4>
          
          <div className="flex items-center justify-between bg-slate-50 p-2 rounded-2xl mb-6">
            <button onClick={mesAnterior} className="w-10 h-10 rounded-xl hover:bg-white hover:shadow flex items-center justify-center text-slate-500 font-bold transition-all">←</button>
            <span className="font-black text-sm uppercase tracking-widest text-slate-700">{tituloMes}</span>
            <button onClick={mesSiguiente} className="w-10 h-10 rounded-xl hover:bg-white hover:shadow flex items-center justify-center text-slate-500 font-bold transition-all">→</button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'].map(dia => (
              <div key={dia} className="text-[10px] font-black text-slate-400 uppercase tracking-widest py-2">{dia}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {renderizarDiasCalendario()}
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 flex justify-center gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-orange-500"></span> Pendientes</div>
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Aprobadas</div>
          </div>
        </div>

        {/* LADO DERECHO: LISTA DE RESERVAS */}
        <div className="lg:col-span-7 bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden flex flex-col">
          <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
            <h4 className="font-black text-xl text-slate-800">
              {fechaSeleccionada ? `Detalle: ${fechaSeleccionada}` : 'Todas las Solicitudes'}
            </h4>
            {fechaSeleccionada && (
              <button onClick={() => setFechaSeleccionada(null)} className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full hover:bg-indigo-100 transition-colors uppercase tracking-widest">
                Ver Todas
              </button>
            )}
          </div>
          
          <div className="overflow-x-auto p-4">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="text-slate-400 font-bold uppercase text-[9px] tracking-widest border-b border-slate-50">
                  <th className="px-6 py-4">Fecha</th>
                  <th className="px-6 py-4">Espacio / Residente</th>
                  <th className="px-6 py-4 text-center">Estado</th>
                  <th className="px-6 py-4 text-right">Gestión</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {cargando ? (
                  <tr><td colSpan="4" className="text-center py-20 text-slate-400 font-black uppercase text-xs">Sincronizando Agenda...</td></tr>
                ) : reservasMostrar.length === 0 ? (
                  <tr><td colSpan="4" className="text-center py-20 text-slate-400 font-medium italic">No hay solicitudes para mostrar en esta vista.</td></tr>
                ) : reservasMostrar.map(res => {
                  let badge = 'bg-yellow-50 text-yellow-600 border-yellow-100';
                  if (res.estado === 'Aprobada') badge = 'bg-emerald-50 text-emerald-600 border-emerald-100';
                  if (res.estado === 'Rechazada') badge = 'bg-red-50 text-red-600 border-red-100';

                  return (
                    <tr key={res.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-5">
                        <p className="font-bold text-slate-700">
                          {new Date(res.fecha).toLocaleDateString('es-CO', { day:'2-digit', month:'short', year:'numeric' })}
                        </p>
                        <p className="text-[11px] font-black text-indigo-500 uppercase tracking-widest mt-1 flex items-center gap-1">
                          <span>⏰</span> {res.hora || 'Sin hora'}
                        </p>
                      </td>
                      <td className="px-6 py-5">
                        <p className="font-black text-slate-800 text-base">{res.zona}</p>
                        <p className="text-[11px] text-slate-500 font-bold uppercase tracking-tight">{res.apto}</p>
                        <p className="text-[10px] text-slate-400">{res.email}</p>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${badge}`}>
                          {res.estado}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right space-x-2">
                        {res.estado === 'Pendiente' ? (
                          <>
                            <button onClick={() => gestionarReserva(res.id, 'Aprobada', res.email, res.zona)} className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase hover:bg-emerald-600 transition-all shadow-md">Aprobar</button>
                            <button onClick={() => gestionarReserva(res.id, 'Rechazada', res.email, res.zona)} className="px-4 py-2 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase hover:bg-red-600 transition-all shadow-md">Rechazar</button>
                          </>
                        ) : (
                          <button onClick={() => borrarReserva(res.id)} className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all flex items-center justify-center ml-auto">🗑️</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
}