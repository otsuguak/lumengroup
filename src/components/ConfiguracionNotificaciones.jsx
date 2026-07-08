import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import Swal from 'sweetalert2';

export default function ConfiguracionNotificaciones({ copropiedadId }) {
  const [plantillas, setPlantillas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [editandoId, setEditandoId] = useState(null);

  // Estado del formulario
  const [form, setForm] = useState({
    tipo_evento: 'PAQUETE',
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
      tipo_evento: 'PAQUETE',
      nombre_remitente: '',
      asunto: '',
      mensaje_base: ''
    });
    setEditandoId(null);
  };

  const guardarPlantilla = async (e) => {
    e.preventDefault();
    if (!form.nombre_remitente || !form.asunto || !form.mensaje_base) {
      return Swal.fire('Atención', 'Por favor llena todos los campos', 'warning');
    }

    setCargando(true);
    const payload = {
      copropiedad_id: copropiedadId,
      tipo_evento: form.tipo_evento,
      nombre_remitente: form.nombre_remitente,
      asunto: form.asunto,
      mensaje_base: form.mensaje_base
    };

    if (editandoId) {
      // Actualizar
      const { error } = await supabase
        .from('plantillas_notificaciones')
        .update(payload)
        .eq('id', editandoId);

      if (error) Swal.fire('Error', 'No se pudo actualizar', 'error');
      else Swal.fire('¡Éxito!', 'Plantilla actualizada correctamente', 'success');
    } else {
      // Validar que no exista ya ese tipo de evento
      const existe = plantillas.find(p => p.tipo_evento === form.tipo_evento);
      if (existe) {
        setCargando(false);
        return Swal.fire('Atención', `Ya existe una plantilla para ${form.tipo_evento}. Edítala en su lugar.`, 'warning');
      }

      // Crear nueva
      const { error } = await supabase
        .from('plantillas_notificaciones')
        .insert([payload]);

      if (error) Swal.fire('Error', 'No se pudo guardar', 'error');
      else Swal.fire('¡Éxito!', 'Plantilla creada correctamente', 'success');
    }

    limpiarFormulario();
    cargarPlantillas();
  };

  const editarPlantilla = (plantilla) => {
    setForm({
      tipo_evento: plantilla.tipo_evento,
      nombre_remitente: plantilla.nombre_remitente,
      asunto: plantilla.asunto,
      mensaje_base: plantilla.mensaje_base
    });
    setEditandoId(plantilla.id);
  };

  const eliminarPlantilla = async (id) => {
    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: "Esta acción no se puede deshacer",
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
    const { error } = await supabase
      .from('plantillas_notificaciones')
      .update({ modulo_activo: !estadoActual })
      .eq('id', id);

    if (!error) cargarPlantillas();
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Correos y Comunicaciones</h2>
        <p className="text-gray-600">Configura cómo y qué se envía a los residentes desde LumenGroup.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* PARTE IZQUIERDA: FORMULARIO */}
        <div className="lg:col-span-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">
            {editandoId ? 'Editar Plantilla' : 'Nueva Plantilla'}
          </h3>
          <form onSubmit={guardarPlantilla} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Módulo / Tipo de Evento</label>
              <select 
                name="tipo_evento" 
                value={form.tipo_evento} 
                onChange={handleInputChange}
                disabled={editandoId !== null}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100"
              >
                <option value="PAQUETE">Recepción de Paquetes</option>
                <option value="VISITANTE">Ingreso de Visitantes</option>
                <option value="PQRS">Respuesta PQRS</option>
                <option value="MASIVO">Comunicado Masivo</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Remitente (De:)</label>
              <input 
                type="text" 
                name="nombre_remitente" 
                placeholder="Ej: Administración Bosques" 
                value={form.nombre_remitente} 
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Asunto del Correo</label>
              <input 
                type="text" 
                name="asunto" 
                placeholder="Ej: ¡Tienes un paquete en portería!" 
                value={form.asunto} 
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mensaje Base</label>
              <p className="text-xs text-blue-600 mb-2">Tip: Usa <b>{'{nombre}'}</b> para saludar al residente por su nombre.</p>
              <textarea 
                name="mensaje_base" 
                rows="4" 
                placeholder="Hola {nombre}, te informamos que..." 
                value={form.mensaje_base} 
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              ></textarea>
            </div>

            <div className="flex gap-2 pt-2">
              <button 
                type="submit" 
                disabled={cargando}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition-colors"
              >
                {cargando ? 'Guardando...' : (editandoId ? 'Actualizar' : 'Guardar')}
              </button>
              {editandoId && (
                <button 
                  type="button" 
                  onClick={limpiarFormulario}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        {/* PARTE DERECHA: LISTADO DE PLANTILLAS */}
        <div className="lg:col-span-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plantillas.length === 0 && !cargando && (
              <div className="col-span-full p-8 text-center bg-white rounded-xl border border-dashed border-gray-300">
                <p className="text-gray-500">Aún no has configurado ninguna plantilla de correos.</p>
              </div>
            )}

            {plantillas.map(plantilla => (
              <div key={plantilla.id} className={`bg-white rounded-xl shadow-sm border p-5 transition-all ${plantilla.modulo_activo ? 'border-l-4 border-l-emerald-500 border-t-transparent border-r-transparent border-b-transparent' : 'border-l-4 border-l-gray-300 border-t-transparent border-r-transparent border-b-transparent opacity-75'}`}>
                
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="inline-block px-2 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-md mb-2">
                      {plantilla.tipo_evento}
                    </span>
                    <h4 className="font-semibold text-gray-800 line-clamp-1">{plantilla.asunto}</h4>
                  </div>
                  
                  {/* Toggle Switch */}
                  <button 
                    onClick={() => toggleActivo(plantilla.id, plantilla.modulo_activo)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${plantilla.modulo_activo ? 'bg-emerald-500' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${plantilla.modulo_activo ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                <div className="text-sm text-gray-600 mb-4 line-clamp-2">
                  <b>De:</b> {plantilla.nombre_remitente} <br/>
                  {plantilla.mensaje_base}
                </div>

                <div className="flex gap-3 mt-auto pt-3 border-t border-gray-100">
                  <button 
                    onClick={() => editarPlantilla(plantilla)}
                    className="text-sm font-medium text-blue-600 hover:text-blue-800"
                  >
                    Editar
                  </button>
                  <button 
                    onClick={() => eliminarPlantilla(plantilla.id)}
                    className="text-sm font-medium text-red-600 hover:text-red-800"
                  >
                    Eliminar
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