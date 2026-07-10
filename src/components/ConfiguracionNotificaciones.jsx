import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import Swal from 'sweetalert2';

// 🚀 DICCIONARIO MAESTRO DE EVENTOS Y VARIABLES
const MODULOS_CONFIG = {
  'PARQUEADERO': { 
    label: '🚗 Asignación de Parqueadero', 
    vars: '{nombre}, {inmueble}, {puesto}, {placa}, {vehiculo}' 
  },
  'CONVIVENCIA': { 
    label: '⚠️ Llamados de Atención (Convivencia)', 
    vars: '{nombre}, {inmueble}, {motivo}' 
  },
  'RESERVAS': { 
    label: '🎟️ Gestión de Reservas', 
    vars: '{nombre}, {inmueble}, {zona}, {fecha}, {hora}, {estado}' 
  },
  'VISITANTES': { 
    label: '🚶‍♂️ Visitantes y Recepción', 
    vars: '{nombre}, {inmueble}, {nombre_visitante}, {hora}' 
  },
  'PAQUETERIA': { 
    label: '📦 Recepción de Paquetería', 
    vars: '{nombre}, {inmueble}, {transportadora}, {fecha}' 
  },
  'PQRS': { 
    label: '🛠️ Respuestas a PQRS', 
    vars: '{nombre}, {inmueble}, {numero_ticket}, {estado}' 
  },
  'MASIVO': { 
    label: '📢 Comunicados Masivos / Recibos', 
    vars: '{nombre}, {inmueble}, {mes_facturacion}' 
  }
};

export default function ConfiguracionNotificaciones({ copropiedadId }) {
  const [plantillas, setPlantillas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [editandoId, setEditandoId] = useState(null);
  const [tabActivo, setTabActivo] = useState('email'); 

  const [form, setForm] = useState({
    tipo_evento: 'PARQUEADERO', 
    nombre_remitente: '',
    asunto: '',
    mensaje_base: ''
  });

  useEffect(() => {
    if (copropiedadId) cargarPlantillas();
  }, [copropiedadId]);

  const cargarPlantillas = async () => {
    setCargando(true);
    const { data, error } = await supabase
      .from('plantillas_notificaciones')
      .select('*')
      .eq('copropiedad_id', copropiedadId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      Swal.fire('Error', 'No se pudieron cargar las plantillas', 'error');
    } else {
      setPlantillas(data || []);
    }
    setCargando(false);
  };

  const handleInputChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const limpiarFormulario = () => {
    setForm({
      tipo_evento: 'PARQUEADERO',
      nombre_remitente: '',
      asunto: '',
      mensaje_base: ''
    });
    setEditandoId(null);
  };

  const cambiarTab = (nuevoTab) => {
    setTabActivo(nuevoTab);
    limpiarFormulario();
  };

  const guardarPlantilla = async (e) => {
    e.preventDefault();
    
    if ((tabActivo === 'email' && !form.nombre_remitente) || !form.asunto || !form.mensaje_base) {
      return Swal.fire('Atención', 'Por favor llena todos los campos obligatorios', 'warning');
    }

    setCargando(true);
    const payload = {
      copropiedad_id: copropiedadId,
      tipo_evento: form.tipo_evento,
      canal: tabActivo, 
      nombre_remitente: tabActivo === 'email' ? form.nombre_remitente : null,
      asunto: form.asunto,
      mensaje_base: form.mensaje_base
    };

    if (editandoId) {
      const { error } = await supabase.from('plantillas_notificaciones').update(payload).eq('id', editandoId);
      if (error) Swal.fire('Error', 'No se pudo actualizar', 'error');
      else Swal.fire('¡Éxito!', 'Plantilla actualizada correctamente', 'success');
    } else {
      const existe = plantillas.find(p => p.tipo_evento === form.tipo_evento && p.canal === tabActivo);
      if (existe) {
        setCargando(false);
        return Swal.fire('Atención', `Ya existe una plantilla de ${tabActivo} para este evento. Edítala en la lista.`, 'warning');
      }

      const { error } = await supabase.from('plantillas_notificaciones').insert([payload]);
      if (error) Swal.fire('Error', 'No se pudo guardar', 'error');
      else Swal.fire('¡Éxito!', 'Plantilla creada correctamente', 'success');
    }

    limpiarFormulario();
    cargarPlantillas();
  };

  const editarPlantilla = (plantilla) => {
    setForm({
      tipo_evento: plantilla.tipo_evento,
      nombre_remitente: plantilla.nombre_remitente || '',
      asunto: plantilla.asunto,
      mensaje_base: plantilla.mensaje_base
    });
    setEditandoId(plantilla.id);
    if (plantilla.canal !== tabActivo) setTabActivo(plantilla.canal); 
  };

  const eliminarPlantilla = async (id) => {
    const result = await Swal.fire({
      title: '¿Eliminar plantilla?',
      text: "El sistema usará el texto por defecto si la eliminas.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar'
    });

    if (result.isConfirmed) {
      const { error } = await supabase.from('plantillas_notificaciones').delete().eq('id', id);
      if (error) Swal.fire('Error', 'No se pudo eliminar', 'error');
      else cargarPlantillas();
    }
  };

  const toggleActivo = async (id, estadoActual) => {
    const { error } = await supabase.from('plantillas_notificaciones').update({ modulo_activo: !estadoActual }).eq('id', id);
    if (!error) cargarPlantillas();
  };

  const plantillasFiltradas = plantillas.filter(p => p.canal === tabActivo);
  const varsDisponibles = MODULOS_CONFIG[form.tipo_evento]?.vars || '';

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mb-8 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Centro de <span className="text-blue-600">Comunicaciones</span></h2>
          <p className="text-slate-500 text-sm font-medium mt-1">Personaliza el texto de los mensajes automáticos para tu copropiedad.</p>
        </div>
      </div>

      <div className="flex space-x-2 bg-slate-200/50 p-1.5 rounded-xl w-fit mb-6 border border-slate-200">
        <button onClick={() => cambiarTab('email')} className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-black uppercase tracking-widest transition-all ${tabActivo === 'email' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          📧 Correos
        </button>
        <button onClick={() => cambiarTab('push')} className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-black uppercase tracking-widest transition-all ${tabActivo === 'push' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          📱 App (Push)
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* PARTE IZQUIERDA: FORMULARIO */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl shadow-xl shadow-slate-200/40 border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-blue-500"></div>
          
          <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center justify-between">
            {editandoId ? '✏️ Editando Plantilla' : '✨ Nueva Plantilla'} 
            <span className={`text-[10px] px-3 py-1 rounded-full uppercase tracking-widest ${tabActivo === 'email' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
              {tabActivo}
            </span>
          </h3>
          
          <form onSubmit={guardarPlantilla} className="space-y-5">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Módulo Operativo</label>
              <select name="tipo_evento" value={form.tipo_evento} onChange={handleInputChange} disabled={editandoId !== null} className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-60 cursor-pointer">
                {Object.entries(MODULOS_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>
            </div>

            {tabActivo === 'email' && (
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Remitente (Aparece en Bandeja)</label>
                <input type="text" name="nombre_remitente" placeholder="Ej: Administración Torres del Bosque" value={form.nombre_remitente} onChange={handleInputChange} className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium" />
              </div>
            )}

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                {tabActivo === 'email' ? 'Asunto del Correo' : 'Título de la Notificación'}
              </label>
              <input type="text" name="asunto" placeholder={tabActivo === 'email' ? "Ej: 🚗 Asignación de Parqueadero" : "Ej: ¡Nuevo Parqueadero!"} value={form.asunto} onChange={handleInputChange} className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800" />
            </div>

            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
              <label className="text-[10px] font-black text-blue-800 uppercase tracking-widest mb-2 block">
                Cuerpo del Mensaje Personalizado
              </label>
              
              <div className="mb-3">
                <p className="text-[10px] text-blue-600 font-medium leading-relaxed">
                  Copia y pega estas variables en tu texto. El sistema las reemplazará automáticamente:
                </p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {varsDisponibles.split(', ').map((v, i) => (
                    <span key={i} className="bg-white border border-blue-200 text-blue-700 text-[10px] font-mono px-2 py-0.5 rounded cursor-help" title="Copia esto en tu texto">{v}</span>
                  ))}
                </div>
              </div>

              <textarea 
                name="mensaje_base" 
                rows={tabActivo === 'email' ? "6" : "3"} 
                placeholder={`Hola {nombre}, te confirmamos que al inmueble {inmueble} se le asignó...`} 
                value={form.mensaje_base} 
                onChange={handleInputChange}
                className="w-full border border-blue-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none font-medium text-slate-700 shadow-inner"
              ></textarea>
              {tabActivo === 'email' && <p className="text-[10px] text-blue-500 mt-2 italic">Nota: Este texto se insertará automáticamente dentro de nuestra plantilla con diseño oficial.</p>}
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={cargando} className="flex-1 bg-slate-900 hover:bg-blue-600 text-white font-black text-xs uppercase tracking-widest py-4 rounded-xl transition-all shadow-lg transform hover:-translate-y-1">
                {cargando ? 'Guardando...' : (editandoId ? 'Actualizar Plantilla' : 'Guardar Plantilla')}
              </button>
              {editandoId && (
                <button type="button" onClick={limpiarFormulario} className="px-6 py-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-black text-xs uppercase tracking-widest rounded-xl transition-all">
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        {/* PARTE DERECHA: LISTADO */}
        <div className="lg:col-span-7">
          <div className="grid grid-cols-1 gap-4">
            {plantillasFiltradas.length === 0 && !cargando && (
              <div className="p-10 text-center bg-white rounded-2xl border-2 border-dashed border-slate-200">
                <span className="text-4xl mb-3 block">📝</span>
                <p className="text-slate-500 font-medium">Aún no has personalizado plantillas de <b>{tabActivo === 'email' ? 'Correos' : 'Push'}</b>.<br/>Se enviarán los textos por defecto del sistema.</p>
              </div>
            )}

            {plantillasFiltradas.map(plantilla => (
              <div key={plantilla.id} className={`bg-white rounded-2xl shadow-sm border p-6 flex flex-col transition-all ${plantilla.modulo_activo ? 'border-l-4 border-l-blue-500' : 'border-l-4 border-l-slate-300 opacity-60'}`}>
                
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="inline-block px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-lg mb-2">
                      {MODULOS_CONFIG[plantilla.tipo_evento]?.label || plantilla.tipo_evento}
                    </span>
                    <h4 className="font-black text-slate-800 text-lg">{plantilla.asunto}</h4>
                  </div>
                  
                  <button onClick={() => toggleActivo(plantilla.id, plantilla.modulo_activo)} className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors shrink-0 ${plantilla.modulo_activo ? 'bg-blue-500' : 'bg-slate-300'}`} title={plantilla.modulo_activo ? "Desactivar envío" : "Activar envío"}>
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-sm ${plantilla.modulo_activo ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                <div className="text-sm text-slate-600 mb-5 bg-slate-50 p-4 rounded-xl border border-slate-100 flex-1 relative">
                  {tabActivo === 'email' && (
                    <div className="absolute -top-3 left-4 bg-white px-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest border border-slate-100 rounded">
                      De: {plantilla.nombre_remitente}
                    </div>
                  )}
                  <p className="font-medium whitespace-pre-wrap mt-1">{plantilla.mensaje_base}</p>
                </div>

                <div className="flex gap-2 mt-auto pt-4 border-t border-slate-100">
                  <button onClick={() => editarPlantilla(plantilla)} className="flex-1 py-2 text-xs font-black uppercase tracking-widest text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                    ✏️ Editar
                  </button>
                  <button onClick={() => eliminarPlantilla(plantilla.id)} className="flex-1 py-2 text-xs font-black uppercase tracking-widest text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                    🗑️ Eliminar
                  </button>
                </div>

              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}