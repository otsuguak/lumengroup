import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import Swal from 'sweetalert2';

export default function PqrsParametrosAdmin() {
  const [cargando, setCargando] = useState(true);
  const [copropiedadId, setCopropiedadId] = useState(null);

  // Estados de listas (Base de datos)
  const [categorias, setCategorias] = useState([]);
  const [festivos, setFestivos] = useState([]);

  // Estados de formularios
  const [nuevaCategoria, setNuevaCategoria] = useState({ tipo: 'Queja', dependencia: '', dias_respuesta: 0 });
  const [nuevoFestivo, setNuevoFestivo] = useState({ fecha: '', descripcion: '' });

  useEffect(() => {
    cargarParametros();
  }, []);

  const cargarParametros = async () => {
    setCargando(true);
    try {
      const id = sessionStorage.getItem('copropiedad_id');
      if (!id) throw new Error("No hay copropiedad en sesión");
      setCopropiedadId(id);

      // Cargar Categorías
      const { data: catData } = await supabase.from('configuracion_pqrs').select('*').eq('copropiedad_id', id);
      setCategorias(catData || []);

      // Cargar Festivos
      const { data: festData } = await supabase.from('configuracion_festivos').select('*').eq('copropiedad_id', id).order('fecha', { ascending: true });
      setFestivos(festData || []);

    } catch (e) {
      console.error("Error al cargar parámetros:", e);
    } finally {
      setCargando(false);
    }
  };

  // --- GESTIÓN DE CATEGORÍAS (SLAs) ---
  const guardarCategoria = async () => {
    if (!nuevaCategoria.tipo || !nuevaCategoria.dependencia) {
      return Swal.fire('Faltan datos', 'El tipo y la dependencia son obligatorios.', 'warning');
    }
    try {
      const { error } = await supabase.from('configuracion_pqrs').insert([{
        copropiedad_id: copropiedadId,
        tipo: nuevaCategoria.tipo,
        dependencia: nuevaCategoria.dependencia,
        dias_respuesta: parseInt(nuevaCategoria.dias_respuesta, 10) || 0
      }]);
      if (error) throw error;
      Swal.fire('¡Guardado!', 'La nueva ruta de atención fue creada.', 'success');
      setNuevaCategoria({ tipo: 'Queja', dependencia: '', dias_respuesta: 0 });
      cargarParametros();
    } catch (e) {
      Swal.fire('Error', 'No se pudo guardar la categoría.', 'error');
    }
  };

  const borrarCategoria = async (id) => {
    const { isConfirmed } = await Swal.fire({ title: '¿Eliminar categoría?', text: "Ya no estará disponible para los residentes.", icon: 'warning', showCancelButton: true, confirmButtonText: 'Sí, eliminar' });
    if (isConfirmed) {
      await supabase.from('configuracion_pqrs').delete().eq('id', id);
      cargarParametros();
    }
  };

  // --- GESTIÓN DE FESTIVOS ---
  const guardarFestivo = async () => {
    if (!nuevoFestivo.fecha || !nuevoFestivo.descripcion) {
      return Swal.fire('Faltan datos', 'Selecciona la fecha y dale un nombre al festivo.', 'warning');
    }
    try {
      const { error } = await supabase.from('configuracion_festivos').insert([{
        copropiedad_id: copropiedadId,
        fecha: nuevoFestivo.fecha,
        descripcion: nuevoFestivo.descripcion
      }]);
      if (error) throw error;
      Swal.fire('¡Agregado!', 'El festivo fue registrado en el calendario.', 'success');
      setNuevoFestivo({ fecha: '', descripcion: '' });
      cargarParametros();
    } catch (e) {
      Swal.fire('Error', 'No se pudo guardar el día festivo.', 'error');
    }
  };

  const borrarFestivo = async (id) => {
    const { isConfirmed } = await Swal.fire({ title: '¿Eliminar festivo?', text: "El sistema lo contará como un día hábil normal.", icon: 'warning', showCancelButton: true, confirmButtonText: 'Sí, eliminar' });
    if (isConfirmed) {
      await supabase.from('configuracion_festivos').delete().eq('id', id);
      cargarParametros();
    }
  };

  if (cargando) return <div className="flex justify-center p-10"><div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-200 pb-8">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Parametrización <span className="text-indigo-600">PQRS</span></h2>
          <p className="text-slate-500 font-medium">Configura tiempos de respuesta (SLAs) y el calendario de días hábiles.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* ================================================= */}
        {/* MÓDULO 1: CATEGORÍAS Y TIEMPOS DE RESPUESTA (SLA) */}
        {/* ================================================= */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col h-[600px]">
          <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex flex-col gap-4">
            <h4 className="font-black text-xl text-slate-800 flex items-center gap-3"><span className="text-2xl">📋</span> Tipos de Solicitud</h4>
            
            <div className="grid grid-cols-3 gap-2">
              <input type="text" placeholder="Tipo (Ej: Queja)" value={nuevaCategoria.tipo} onChange={e => setNuevaCategoria({...nuevaCategoria, tipo: e.target.value})} className="p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-xs font-bold" />
              <input type="text" placeholder="Dependencia (Ej: Aseo)" value={nuevaCategoria.dependencia} onChange={e => setNuevaCategoria({...nuevaCategoria, dependencia: e.target.value})} className="p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-xs font-bold" />
              <div className="flex items-center gap-2">
                <input type="number" placeholder="Días SLA" value={nuevaCategoria.dias_respuesta} onChange={e => setNuevaCategoria({...nuevaCategoria, dias_respuesta: e.target.value})} className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-xs font-bold" min="0" />
                <button onClick={guardarCategoria} className="bg-indigo-600 text-white w-12 h-10 rounded-xl font-bold hover:bg-indigo-700">+</button>
              </div>
            </div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">* Si pones 0 días, el ticket no tendrá fecha de vencimiento.</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 bg-white">
            <div className="space-y-3">
              {categorias.length === 0 ? (
                <p className="text-center text-sm text-slate-400 mt-10">No hay categorías configuradas.</p>
              ) : (
                categorias.map(cat => (
                  <div key={cat.id} className="p-4 border border-slate-100 rounded-2xl flex justify-between items-center bg-slate-50/30 hover:bg-slate-50">
                    <div>
                      <p className="font-black text-slate-800 text-sm">{cat.tipo} <span className="text-indigo-500">→</span> {cat.dependencia}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">SLA: {cat.dias_respuesta === 0 ? 'Sin límite de tiempo' : `${cat.dias_respuesta} Días Hábiles`}</p>
                    </div>
                    <button onClick={() => borrarCategoria(cat.id)} className="text-red-400 hover:text-red-600 bg-red-50 p-2 rounded-lg">🗑️</button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ================================================= */}
        {/* MÓDULO 2: CALENDARIO DE FESTIVOS                  */}
        {/* ================================================= */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col h-[600px]">
          <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex flex-col gap-4">
            <h4 className="font-black text-xl text-slate-800 flex items-center gap-3"><span className="text-2xl">🌴</span> Días Festivos (No Hábiles)</h4>
            
            <div className="flex gap-2">
              <input type="date" value={nuevoFestivo.fecha} onChange={e => setNuevoFestivo({...nuevoFestivo, fecha: e.target.value})} className="w-1/3 p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-xs font-bold" />
              <input type="text" placeholder="Motivo (Ej: Año Nuevo)" value={nuevoFestivo.descripcion} onChange={e => setNuevoFestivo({...nuevoFestivo, descripcion: e.target.value})} className="flex-1 p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-xs font-bold" />
              <button onClick={guardarFestivo} className="bg-emerald-500 text-white w-12 h-10 rounded-xl font-bold hover:bg-emerald-600">+</button>
            </div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">* Estos días no sumarán al tiempo de respuesta del administrador.</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 bg-white">
            <div className="space-y-3">
              {festivos.length === 0 ? (
                <p className="text-center text-sm text-slate-400 mt-10">No hay festivos en el calendario.</p>
              ) : (
                festivos.map(fest => (
                  <div key={fest.id} className="p-4 border border-slate-100 rounded-2xl flex justify-between items-center bg-slate-50/30 hover:bg-slate-50">
                    <div>
                      <p className="font-black text-emerald-600 text-sm">{new Date(fest.fecha).toLocaleDateString('es-CO', {timeZone: 'UTC', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'})}</p>
                      <p className="text-[11px] font-bold text-slate-500 mt-1">{fest.descripcion}</p>
                    </div>
                    <button onClick={() => borrarFestivo(fest.id)} className="text-red-400 hover:text-red-600 bg-red-50 p-2 rounded-lg">🗑️</button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}