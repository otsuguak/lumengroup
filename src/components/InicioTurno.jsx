import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import Swal from 'sweetalert2';

export default function InicioTurno({ copropiedadId, onTurnoIniciado }) {
  const [nombreGuarda, setNombreGuarda] = useState('');
  const [cedula, setCedula] = useState('');
  const [puesto, setPuesto] = useState('Portería Principal');
  const [cargando, setCargando] = useState(false);
  
  // NUEVO: Estado para guardar los turnos que se quedaron abiertos
  const [turnosAbiertos, setTurnosAbiertos] = useState([]);
  const [cargandoTurnos, setCargandoTurnos] = useState(true);

  // Al cargar, busca si hay turnos huérfanos (que no han sido cerrados)
  useEffect(() => {
    if (copropiedadId) {
      buscarTurnosAbiertos();
    }
  }, [copropiedadId]);

  const buscarTurnosAbiertos = async () => {
    try {
      const { data } = await supabase
        .from('turnos_vigilancia')
        .select('*')
        .eq('copropiedad_id', copropiedadId)
        .ilike('estado', '%Activo%') // ilike ignora mayúsculas/minúsculas
        .order('hora_inicio', { ascending: false });

      setTurnosAbiertos(data || []);
    } catch (error) {
      console.error("Error buscando turnos:", error);
    } finally {
      setCargandoTurnos(false);
    }
  };

  const iniciarNuevoTurno = async (e) => {
    e.preventDefault();
    if (!nombreGuarda || !cedula) return Swal.fire('Error', 'Completa tus datos', 'error');

    setCargando(true);
    try {
      const { data, error } = await supabase
        .from('turnos_vigilancia')
        .insert([{
          copropiedad_id: copropiedadId,
          nombre_guarda: nombreGuarda.trim().toUpperCase(),
          cedula: cedula.trim(),
          puesto: puesto,
          estado: 'Activo'
        }])
        .select()
        .single();

      if (error) throw error;
      
      Swal.fire({ title: 'Turno Iniciado', icon: 'success', timer: 2000, showConfirmButton: false });
      onTurnoIniciado(data); // Le pasamos el turno al componente padre
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'No se pudo iniciar el turno', 'error');
    } finally {
      setCargando(false);
    }
  };

  const reanudarTurno = (turno) => {
    Swal.fire({
      title: '¡Turno Reanudado!',
      text: `Bienvenido de nuevo, ${turno.nombre_guarda}`,
      icon: 'success',
      timer: 2000,
      showConfirmButton: false
    });
    onTurnoIniciado(turno); // Mandamos directo al guardia adentro
  };

  if (cargandoTurnos) return <div className="p-10 text-center text-slate-500 font-bold animate-pulse">Buscando turnos previos...</div>;

  return (
    <div className="max-w-4xl mx-auto mt-10 p-6">
      
      {/* SECCIÓN 1: TURNOS QUE SE QUEDARON ABIERTOS (RECUPERACIÓN) */}
      {turnosAbiertos.length > 0 && (
        <div className="mb-10 bg-amber-50 border-2 border-amber-200 rounded-3xl p-8 shadow-sm">
          <h2 className="text-2xl font-black text-amber-800 mb-2">⚠️ Turnos Activos Encontrados</h2>
          <p className="text-amber-700 mb-6 font-medium">Parece que hay sesiones sin cerrar. Si eres tú, reanuda tu turno. Si es de un compañero que ya se fue, infórmale al administrador.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {turnosAbiertos.map((turno) => (
              <div key={turno.id} className="bg-white p-5 rounded-2xl shadow-sm border border-amber-100 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-slate-800">{turno.nombre_guarda}</h3>
                  <p className="text-xs text-slate-500 font-bold uppercase">{turno.puesto}</p>
                  <p className="text-xs text-indigo-500 font-bold mt-1">Inició: {new Date(turno.hora_inicio).toLocaleString()}</p>
                </div>
                <button 
                  onClick={() => reanudarTurno(turno)}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-black px-6 py-3 rounded-xl shadow-md transition-all active:scale-95"
                >
                  ▶️ Reanudar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECCIÓN 2: FORMULARIO PARA TURNOS NUEVOS */}
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 max-w-lg mx-auto">
        <div className="bg-indigo-900 p-8 text-center">
          <div className="text-6xl mb-4">👮‍♂️</div>
          <h2 className="text-2xl font-black text-white tracking-widest uppercase">Iniciar Nuevo Turno</h2>
          <p className="text-indigo-200 text-sm mt-2">Registra tu llegada al puesto de seguridad</p>
        </div>

        <form onSubmit={iniciarNuevoTurno} className="p-8 space-y-5">
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Nombre del Guarda</label>
            <input type="text" value={nombreGuarda} onChange={(e) => setNombreGuarda(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800 uppercase" placeholder="Ej: CARLOS PÉREZ" required />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Cédula</label>
            <input type="number" value={cedula} onChange={(e) => setCedula(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800" placeholder="Ej: 1010..." required />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Puesto Asignado</label>
            <select value={puesto} onChange={(e) => setPuesto(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800">
              <option value="Portería Principal">Portería Principal</option>
              <option value="Portería Vehicular">Portería Vehicular</option>
              <option value="Recorredor">Rondín / Recorredor</option>
              <option value="Centro de Control">Centro de Control (CCTV)</option>
            </select>
          </div>

          <button type="submit" disabled={cargando} className={`w-full py-4 rounded-xl text-white font-black text-lg uppercase tracking-wider shadow-xl transition-all ${cargando ? 'bg-slate-400' : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'}`}>
            {cargando ? 'Registrando...' : '✅ Comenzar Turno'}
          </button>
        </form>
      </div>

    </div>
  );
}