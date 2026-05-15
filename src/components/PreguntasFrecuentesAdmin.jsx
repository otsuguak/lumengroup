import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Loader2, Edit, Trash2, PlusCircle, HelpCircle, MessageSquare } from 'lucide-react';
import Swal from 'sweetalert2';

export default function PreguntasFrecuentesAdmin() {
  const [preguntas, setPreguntas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editId, setEditId] = useState(null);
  
  const [formData, setFormData] = useState({
    pregunta: '',
    respuesta: '',
    categoria: 'General'
  });

  const copropiedadId = sessionStorage.getItem('copropiedad_id');

  useEffect(() => {
    if (copropiedadId) fetchPreguntas();
  }, [copropiedadId]);

  const fetchPreguntas = async () => {
    setCargando(true);
    const { data, error } = await supabase
      .from('preguntas_frecuentes')
      .select('*')
      .eq('copropiedad_id', copropiedadId)
      .order('created_at', { ascending: false });

    if (!error && data) setPreguntas(data);
    setCargando(false);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = { ...formData, copropiedad_id: copropiedadId };

    try {
      if (editId) {
        const { error } = await supabase.from('preguntas_frecuentes').update(payload).eq('id', editId);
        if (error) throw error;
        Swal.fire('Actualizado', 'Pregunta actualizada con éxito.', 'success');
      } else {
        const { error } = await supabase.from('preguntas_frecuentes').insert([payload]);
        if (error) throw error;
        Swal.fire('Creado', 'Nueva pregunta añadida al portal.', 'success');
      }
      
      setFormData({ pregunta: '', respuesta: '', categoria: 'General' });
      setEditId(null);
      fetchPreguntas();
    } catch (error) {
      Swal.fire('Error', error.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (item) => {
    setFormData({ pregunta: item.pregunta, respuesta: item.respuesta, categoria: item.categoria || 'General' });
    setEditId(item.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Seguro que deseas eliminar esta pregunta?')) {
      await supabase.from('preguntas_frecuentes').delete().eq('id', id);
      fetchPreguntas();
    }
  };

  return (
    <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
      <div className="mb-8 border-b border-slate-100 pb-6">
        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
          <HelpCircle className="text-blue-500" /> Centro de Ayuda (FAQ)
        </h2>
        <p className="text-slate-500 mt-2 font-medium">Gestiona las preguntas frecuentes para que los residentes encuentren respuestas rápido.</p>
      </div>

      {/* FORMULARIO */}
      <form onSubmit={handleSubmit} className="bg-slate-50 p-8 rounded-2xl mb-10 border border-slate-100 shadow-inner">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="md:col-span-2">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Pregunta (Ej: ¿A qué hora es el trasteo?)</label>
            <input type="text" name="pregunta" required value={formData.pregunta} onChange={handleChange} className="w-full p-4 bg-white rounded-xl border border-slate-200 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-bold text-slate-700" />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Categoría</label>
            <select name="categoria" value={formData.categoria} onChange={handleChange} className="w-full p-4 bg-white rounded-xl border border-slate-200 outline-none focus:border-blue-500 text-sm font-bold text-slate-700">
              <option value="General">General</option>
              <option value="Pagos y Cartera">Pagos y Cartera</option>
              <option value="Zonas Comunes">Zonas Comunes</option>
              <option value="Trasteos y Entregas">Trasteos y Entregas</option>
              <option value="Convivencia">Convivencia</option>
            </select>
          </div>
          <div className="md:col-span-3">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Respuesta Detallada</label>
            <textarea name="respuesta" required value={formData.respuesta} onChange={handleChange} rows="4" className="w-full p-4 bg-white rounded-xl border border-slate-200 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm text-slate-600 resize-none" placeholder="Escribe la solución detallada aquí..."></textarea>
          </div>
        </div>
        <div className="flex justify-end gap-4 border-t border-slate-200 pt-6">
          {editId && (
            <button type="button" onClick={() => {setEditId(null); setFormData({pregunta:'', respuesta:'', categoria:'General'})}} className="px-8 py-4 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors">Cancelar</button>
          )}
          <button type="submit" disabled={isSubmitting} className="px-10 py-4 bg-blue-600 text-white font-black rounded-xl shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all flex items-center gap-2">
            {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <><PlusCircle size={20} /> {editId ? 'Actualizar Pregunta' : 'Publicar Pregunta'}</>}
          </button>
        </div>
      </form>

      {/* TABLA DE PREGUNTAS */}
      <div className="overflow-x-auto rounded-xl border border-slate-100">
        <table className="w-full text-left whitespace-nowrap">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Pregunta</th>
              <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoría</th>
              <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {cargando ? (
              <tr><td colSpan="3" className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-blue-500" /></td></tr>
            ) : preguntas.length === 0 ? (
              <tr><td colSpan="3" className="p-10 text-center text-slate-500 font-medium">No hay preguntas publicadas.</td></tr>
            ) : (
              preguntas.map(item => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-5">
                    <p className="font-bold text-slate-800 text-sm whitespace-normal max-w-md">{item.pregunta}</p>
                    <p className="text-xs text-slate-400 truncate max-w-md mt-1">{item.respuesta}</p>
                  </td>
                  <td className="p-5">
                    <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full uppercase tracking-widest">{item.categoria}</span>
                  </td>
                  <td className="p-5 flex justify-end gap-2">
                    <button onClick={() => handleEdit(item)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors" title="Editar"><Edit size={18} /></button>
                    <button onClick={() => handleDelete(item.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors" title="Eliminar"><Trash2 size={18} /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}