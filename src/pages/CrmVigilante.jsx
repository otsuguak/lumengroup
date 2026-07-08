import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import InicioTurno from '../components/InicioTurno';
import ModuloParqueadero from '../components/ModuloParqueadero';
import ModuloRecepcion from '../components/ModuloRecepcion';
import Swal from 'sweetalert2';

// =========================================================
// 1. MÓDULO DE RECIBOS PÚBLICOS
// =========================================================
function ModuloRecibos({ turno }) {
  const [recibos, setRecibos] = useState({ Agua: false, Luz: false, Gas: false });
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarEstadoRecibos();
  }, [turno]);

  const cargarEstadoRecibos = async () => {
    const { data } = await supabase
      .from('notificaciones_recibos')
      .select('*')
      .eq('copropiedad_id', turno.copropiedad_id);

    if (data) {
      const estadoActual = { Agua: false, Luz: false, Gas: false };
      data.forEach(item => {
        estadoActual[item.tipo_recibo] = item.hay_recibos;
      });
      setRecibos(estadoActual);
    }
    setCargando(false);
  };

  const toggleRecibo = async (tipo, estadoActual) => {
    const nuevoEstado = !estadoActual;
    setRecibos(prev => ({ ...prev, [tipo]: nuevoEstado }));

    const { error } = await supabase
      .from('notificaciones_recibos')
      .upsert({
        copropiedad_id: turno.copropiedad_id,
        tipo_recibo: tipo,
        hay_recibos: nuevoEstado,
        fecha_actualizacion: new Date().toISOString()
      }, { onConflict: 'copropiedad_id, tipo_recibo' });

    if (error) {
      Swal.fire('Error', 'No se pudo actualizar el estado', 'error');
      setRecibos(prev => ({ ...prev, [tipo]: estadoActual }));
    } else {
      Swal.fire({
        toast: true, position: 'top-end', icon: 'success',
        title: nuevoEstado ? `Aviso de ${tipo} Activado` : `Aviso de ${tipo} Desactivado`,
        showConfirmButton: false, timer: 2000
      });
    }
  };

  if (cargando) return <div className="text-center py-10">Cargando módulos...</div>;

  const cards = [
    { tipo: 'Agua', icon: '💧', color: 'blue' },
    { tipo: 'Luz', icon: '⚡', color: 'amber' },
    { tipo: 'Gas', icon: '🔥', color: 'red' },
  ];

  return (
    <div className="max-w-4xl mx-auto mt-6 bg-white p-8 md:p-12 rounded-[2.5rem] shadow-xl">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Anuncio de Recibos Públicos</h2>
        <p className="text-slate-500 mt-2">Enciende el interruptor cuando llegue el cartero para avisar a todos los residentes.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map(card => {
          const activo = recibos[card.tipo];
          return (
            <div 
              key={card.tipo} 
              className={`p-6 rounded-3xl border-2 transition-all duration-300 flex flex-col items-center cursor-pointer ${activo ? `border-${card.color}-500 bg-${card.color}-50 shadow-lg shadow-${card.color}-500/20 scale-105` : 'border-slate-100 bg-slate-50 hover:bg-slate-100'}`}
              onClick={() => toggleRecibo(card.tipo, activo)}
            >
              <div className={`text-6xl mb-4 transition-transform ${activo ? 'animate-bounce' : 'grayscale opacity-50'}`}>
                {card.icon}
              </div>
              <h3 className={`text-2xl font-black mb-4 ${activo ? `text-${card.color}-700` : 'text-slate-400'}`}>
                {card.tipo}
              </h3>
              
              <div className={`w-16 h-8 rounded-full p-1 transition-colors duration-300 ${activo ? `bg-${card.color}-500` : 'bg-slate-300'}`}>
                <div className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform duration-300 ${activo ? 'translate-x-8' : 'translate-x-0'}`}></div>
              </div>
              <p className={`text-xs mt-3 font-bold uppercase tracking-widest ${activo ? `text-${card.color}-600` : 'text-slate-400'}`}>
                {activo ? 'Aviso Activo' : 'Apagado'}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  );
}

// =========================================================
// 🔥 2. NUEVO MÓDULO: CONSULTA DE VEHÍCULOS Y RESIDENTES 🔥
// =========================================================
function ModuloConsultaVehiculos({ turno }) {
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState([]);
  const [buscado, setBuscado] = useState(false);
  const [cargando, setCargando] = useState(false);

  const buscarVehiculo = async (e) => {
    e.preventDefault();
    if (!busqueda.trim()) return Swal.fire('Atención', 'Escribe una placa o un inmueble para buscar.', 'warning');
    
    setCargando(true);
    setBuscado(true);
    
    // Buscamos en la base de datos (por placa O por inmueble)
    const { data, error } = await supabase
      .from('parqueaderos_asignados')
      .select('*')
      .eq('copropiedad_id', turno.copropiedad_id)
      .or(`placa.ilike.%${busqueda.trim()}%,inmueble.ilike.%${busqueda.trim()}%`);

    if (error) {
      Swal.fire('Error', 'Hubo un problema al buscar en la base de datos.', 'error');
    } else {
      setResultados(data || []);
    }
    setCargando(false);
  };

  const limpiarBusqueda = () => {
    setBusqueda('');
    setResultados([]);
    setBuscado(false);
  };

  return (
    <div className="max-w-4xl mx-auto mt-6 bg-white p-8 md:p-12 rounded-[2.5rem] shadow-xl">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Buscar Vehículo</h2>
        <p className="text-slate-500 mt-2">Encuentra a quién pertenece un vehículo o revisa el parqueadero de un apartamento.</p>
      </div>

      <form onSubmit={buscarVehiculo} className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-2xl">🔍</span>
          <input 
            type="text" 
            placeholder="Escribe la placa (Ej: ABC-123) o el Apto (Ej: 2101)..." 
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-200 focus:border-indigo-500 outline-none text-lg font-bold text-slate-700 transition-colors uppercase"
          />
        </div>
        <button type="submit" disabled={cargando} className="bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest px-8 py-4 rounded-2xl shadow-lg transition-transform active:scale-95 disabled:opacity-50">
          {cargando ? 'Buscando...' : 'Buscar'}
        </button>
        {buscado && (
          <button type="button" onClick={limpiarBusqueda} className="bg-slate-100 hover:bg-slate-200 text-slate-500 font-black px-6 py-4 rounded-2xl transition-transform active:scale-95">
            ✖
          </button>
        )}
      </form>

      {/* Resultados de la Búsqueda */}
      {buscado && !cargando && resultados.length === 0 && (
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 p-10 rounded-3xl text-center">
          <span className="text-5xl block mb-4">📭</span>
          <h3 className="text-xl font-bold text-slate-700">No se encontraron resultados</h3>
          <p className="text-slate-500">El vehículo o inmueble "{busqueda}" no está registrado en el sistema.</p>
        </div>
      )}

      {resultados.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in zoom-in duration-300">
          {resultados.map((res) => (
            <div key={res.id} className="bg-slate-50 border border-slate-200 p-6 rounded-3xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1 rounded-bl-xl">
                {res.tipo_vehiculo}
              </div>
              
              <div className="flex items-center gap-4 mb-4 mt-2">
                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-3xl border border-slate-100">
                  {res.tipo_parqueadero === 'Moto' ? '🏍️' : '🚘'}
                </div>
                <div>
                  <h4 className="text-3xl font-black text-slate-800 tracking-tighter uppercase">{res.placa}</h4>
                  <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest">Placa Registrada</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-100 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Propietario:</span>
                  <span className="text-sm font-black text-slate-700">{res.nombre_residente || 'No registrado'}</span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-50 pt-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Inmueble:</span>
                  <span className="text-sm font-black bg-slate-100 px-2 py-1 rounded-md text-slate-700">{res.inmueble}</span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-50 pt-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Puesto Asignado:</span>
                  <span className="text-sm font-black bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md">{res.numero_parqueadero}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =========================================================
// 3. CÓDIGO PRINCIPAL DEL VIGILANTE
// =========================================================
export default function CRMVigilante() {
  const navigate = useNavigate();
  const [usuarioActual, setUsuarioActual] = useState(null);
  const [cargandoApp, setCargandoApp] = useState(true);
  const [turnoActivo, setTurnoActivo] = useState(null);
  const [vista, setVista] = useState('menu'); // 'menu', 'parqueadero', 'recepcion', 'recibos', 'consulta'

  useEffect(() => {
    validarSesion();
  }, []);

  const validarSesion = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate('/login'); return; }

    const { data: perfil } = await supabase.from('usuarios').select('*').eq('id', session.user.id).maybeSingle();
    const datosUsuario = perfil ? perfil : session.user.user_metadata;
    setUsuarioActual(datosUsuario);
    
    const idConjunto = datosUsuario?.copropiedad_id || sessionStorage.getItem('copropiedad_id');

    if (idConjunto) {
      const { data: turnoAbierto } = await supabase
        .from('turnos_vigilancia')
        .select('*')
        .eq('copropiedad_id', idConjunto)
        .eq('estado', 'Activo')
        .order('hora_inicio', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (turnoAbierto) {
        setTurnoActivo(turnoAbierto);
        Swal.fire({ title: 'Turno Recuperado', text: `Se recuperó la sesión activa de ${turnoAbierto.nombre_guarda}.`, icon: 'info', toast: true, position: 'top-end', timer: 4000, showConfirmButton: false });
      }
    }
    setCargandoApp(false);
  };

  const cerrarSesionTotal = async () => {
    const { isConfirmed } = await Swal.fire({ 
      title: '¿Cerrar Sesión?', 
      text: "Saldrás del sistema.", 
      icon: 'question', 
      showCancelButton: true, 
      confirmButtonColor: '#ef4444', 
      confirmButtonText: 'Sí, salir 🚪', 
      cancelButtonText: 'Cancelar' 
    });
    if (isConfirmed) { 

      // 🔥 AQUÍ VA EL CANDADO DE SEGURIDAD
      window.OneSignalDeferred.push(function(OneSignal) {
      OneSignal.logout();
    });

      await supabase.auth.signOut(); 
      sessionStorage.clear(); 
      localStorage.clear(); 
      navigate('/login'); 
    }
  };

  const finalizarTurno = async () => {
    const { isConfirmed } = await Swal.fire({ title: '¿Finalizar Turno?', text: "Se realizará el cierre de caja y registro.", icon: 'warning', showCancelButton: true, confirmButtonColor: '#f59e0b', confirmButtonText: 'Sí, finalizar turno', cancelButtonText: 'Continuar trabajando' });
    if (isConfirmed) {
      const { error } = await supabase.from('turnos_vigilancia').update({ hora_fin: new Date().toISOString(), estado: 'Cerrado' }).eq('id', turnoActivo.id);
      if (!error) { setTurnoActivo(null); setVista('menu'); Swal.fire('Turno Cerrado', 'Turno finalizado exitosamente. ¡Buen descanso!', 'success'); }
    }
  };

  if (cargandoApp) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <h2 className="text-xl font-black text-indigo-900 tracking-widest uppercase text-xs">Cargando Seguridad...</h2>
      </div>
    );
  }

  if (!turnoActivo) {
    const idConjuntoSeguro = usuarioActual?.copropiedad_id || sessionStorage.getItem('copropiedad_id');
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col">
        <div className="p-4 flex justify-end">
             <button onClick={cerrarSesionTotal} className="text-slate-500 font-bold hover:text-red-500 transition-colors">🚪 Cerrar Sesión</button>
        </div>
        <InicioTurno copropiedadId={idConjuntoSeguro} onTurnoIniciado={(turno) => setTurnoActivo(turno)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-indigo-900 text-white p-4 shadow-2xl flex justify-between items-center border-b-4 border-indigo-500">
        <div className="flex items-center gap-4">
          <div className="bg-white/10 p-2 rounded-lg">🛡️</div>
          <div>
            <h2 className="font-black text-lg leading-none uppercase tracking-tighter">{turnoActivo.nombre_guarda}</h2>
            <p className="text-[10px] text-indigo-300 font-bold uppercase mt-1">Puesto: {turnoActivo.puesto} | {usuarioActual?.nombre || 'Vigilante'}</p>
          </div>
        </div>
        <div className="flex gap-3">
            <button onClick={finalizarTurno} className="bg-amber-500 hover:bg-amber-600 px-4 py-2 rounded-xl text-xs font-black transition-all shadow-lg active:scale-95">CERRAR TURNO</button>
            <button onClick={cerrarSesionTotal} className="bg-red-500 hover:bg-red-600 p-2.5 rounded-xl transition-all shadow-lg active:scale-95" title="Salir del Sistema">🚪</button>
        </div>
      </nav>

      <main className="p-6 max-w-7xl mx-auto">
        {vista === 'menu' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-10">
            
            <button onClick={() => setVista('parqueadero')} className="bg-white p-8 rounded-3xl shadow-xl border-b-8 border-transparent hover:border-indigo-500 transition-all flex flex-col items-center group active:scale-95">
              <div className="text-5xl mb-6 bg-slate-50 w-20 h-20 flex items-center justify-center rounded-full group-hover:bg-indigo-50 transition-colors">🚗</div>
              <span className="text-xl font-black text-slate-800 uppercase tracking-tighter">Visitantes</span>
              <p className="text-slate-400 text-xs text-center mt-3 font-medium">Control de ingresos y cobros.</p>
            </button>

            <button onClick={() => setVista('recepcion')} className="bg-white p-8 rounded-3xl shadow-xl border-b-8 border-transparent hover:border-indigo-500 transition-all flex flex-col items-center group active:scale-95">
              <div className="text-5xl mb-6 bg-slate-50 w-20 h-20 flex items-center justify-center rounded-full group-hover:bg-indigo-50 transition-colors">📦</div>
              <span className="text-xl font-black text-slate-800 uppercase tracking-tighter">Recepción</span>
              <p className="text-slate-400 text-xs text-center mt-3 font-medium">Registro de paquetes y peatones.</p>
            </button>

            {/* 🔥 NUEVO BOTÓN: CONSULTA DE VEHÍCULOS 🔥 */}
            <button onClick={() => setVista('consulta')} className="bg-white p-8 rounded-3xl shadow-xl border-b-8 border-transparent hover:border-indigo-500 transition-all flex flex-col items-center group active:scale-95">
              <div className="text-5xl mb-6 bg-slate-50 w-20 h-20 flex items-center justify-center rounded-full group-hover:bg-indigo-50 transition-colors">🔍</div>
              <span className="text-xl font-black text-slate-800 uppercase tracking-tighter text-center">Consulta Parqueadero</span>
              <p className="text-slate-400 text-xs text-center mt-3 font-medium">Buscar placas y asignaciones.</p>
            </button>

            <button onClick={() => setVista('recibos')} className="bg-white p-8 rounded-3xl shadow-xl border-b-8 border-transparent hover:border-indigo-500 transition-all flex flex-col items-center group active:scale-95">
              <div className="text-5xl mb-6 bg-slate-50 w-20 h-20 flex items-center justify-center rounded-full group-hover:bg-indigo-50 transition-colors">🧾</div>
              <span className="text-xl font-black text-slate-800 uppercase tracking-tighter">Recibos</span>
              <p className="text-slate-400 text-xs text-center mt-3 font-medium">Avisar llegada de Agua, Luz, etc.</p>
            </button>

          </div>
        )}

        {vista !== 'menu' && (
          <button onClick={() => setVista('menu')} className="mb-6 bg-white px-6 py-2 rounded-full text-indigo-600 font-black text-xs shadow-sm hover:shadow-md transition-all flex items-center gap-2 border border-slate-200">
            ← VOLVER AL MENÚ
          </button>
        )}

        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {vista === 'parqueadero' && <ModuloParqueadero turno={turnoActivo} />}
            {vista === 'recepcion' && <ModuloRecepcion turno={turnoActivo} />}
            {vista === 'recibos' && <ModuloRecibos turno={turnoActivo} />}
            {vista === 'consulta' && <ModuloConsultaVehiculos turno={turnoActivo} />}
        </div>
      </main>
    </div>
  );
}