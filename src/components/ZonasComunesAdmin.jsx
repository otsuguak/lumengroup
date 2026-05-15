import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Loader2, Edit, Trash2, PlusCircle, BookOpen, Link as LinkIcon, AlertCircle } from 'lucide-react';
import Swal from 'sweetalert2';

export default function ZonasComunesAdmin() {
  const [zonas, setZonas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editId, setEditId] = useState(null);
  const [errorDB, setErrorDB] = useState(null); 
  
  const [formData, setFormData] = useState({
    nombre: '',
    aforo: '',
    icono: 'fa-tree-city',
    manual_url: ''
  });

  useEffect(() => {
    fetchZonas();
  }, []);

  const fetchZonas = async () => {
    setCargando(true);
    const copropiedadId = sessionStorage.getItem('copropiedad_id');
    try {
      const { data, error } = await supabase
        .from('zonas_comunes')
        .select('*')
        .eq('copropiedad_id', copropiedadId)
        .order('nombre', { ascending: true });
      if (error) throw error;
      setZonas(data || []);
    } catch (err) {
      setErrorDB(err.message);
    } finally {
      setCargando(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const copropiedadId = sessionStorage.getItem('copropiedad_id');

    const payload = {
      nombre: formData.nombre,
      aforo: formData.aforo,
      icono: formData.icono,
      manual_url: formData.manual_url,
      copropiedad_id: copropiedadId
    };

    try {
      if (editId) {
        await supabase.from('zonas_comunes').update(payload).eq('id', editId);
        Swal.fire('Actualizado', 'Datos actualizados con éxito.', 'success');
      } else {
        await supabase.from('zonas_comunes').insert([payload]);
        Swal.fire('Creado', 'Nueva zona habilitada.', 'success');
      }
      setFormData({ nombre: '', aforo: '', icono: 'fa-tree-city', manual_url: '' });
      setEditId(null);
      fetchZonas();
    } catch (error) {
      Swal.fire('Error', error.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (z) => {
    setFormData({ nombre: z.nombre, aforo: z.aforo || '', icono: z.icono || 'fa-tree-city', manual_url: z.manual_url || '' });
    setEditId(z.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    const { isConfirmed } = await Swal.fire({ title: '¿Eliminar?', text: 'Esto borrará la zona de reservas y el manual.', icon: 'warning', showCancelButton: true });
    if (isConfirmed) {
      await supabase.from('zonas_comunes').delete().eq('id', id);
      fetchZonas();
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-700">
      
      {/* FORMULARIO: LADO IZQUIERDO */}
      <div className="lg:col-span-5 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl h-fit space-y-6">
        <div>
          <h4 className="font-black text-2xl text-slate-800 tracking-tight">{editId ? 'Editar' : 'Nueva'} <span className="text-orange-600">Zona</span></h4>
          <p className="text-slate-500 text-sm font-medium">Configura el nombre, aforo e instrucciones.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre del Espacio</label>
            <input type="text" required value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-orange-500/10 font-bold" placeholder="Ej: Salón Social" />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Aforo Máximo</label>
            <input type="text" value={formData.aforo} onChange={e => setFormData({...formData, aforo: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-orange-500/10 font-bold" placeholder="Ej: 50 Personas" />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoría / Ícono</label>
            <select value={formData.icono} onChange={e => setFormData({...formData, icono: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-orange-500/10 font-bold">
                <option value="fa-tree-city">🌳 Zonas Verdes</option>
                <option value="fa-water-ladder">🏊 Piscina</option>
                <option value="fa-bath">🛁 Zonas humedas</option>
                <option value="fa-fire-burner">🍖 BBQ / Parrilla</option>
                <option value="fa-couch">🛋️ Salones Sociales</option>
                <option value="fa-dumbbell">🏋️ Gimnasio</option>
                <option value="fa-washer">🧺 Lavandería</option>
            </select> 
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">URL Manual de Convivencia (PDF)</label>
            <input type="url" value={formData.manual_url} onChange={e => setFormData({...formData, manual_url: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-orange-500/10 text-sm" placeholder="https://drive.google.com/..." />
          </div>

          <div className="flex gap-2 pt-4">
            {editId && <button type="button" onClick={() => {setEditId(null); setFormData({nombre:'', aforo:'', icono:'fa-tree-city', manual_url:''})}} className="flex-1 bg-white border border-slate-200 py-4 rounded-2xl font-bold text-slate-400">Cancelar</button>}
            <button type="submit" disabled={isSubmitting} className="flex-1 bg-slate-900 hover:bg-orange-600 text-white font-black py-4 rounded-2xl shadow-xl transition-all uppercase tracking-widest text-xs">
              {isSubmitting ? 'Guardando...' : (editId ? 'Actualizar' : 'Habilitar')}
            </button>
          </div>
        </form>
      </div>

      {/* LISTADO: LADO DERECHO */}
      <div className="lg:col-span-7 bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
        <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
          <h4 className="font-black text-xl text-slate-800">Inventario de Zonas</h4>
        </div>
        <div className="p-4 overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <tbody className="divide-y divide-slate-50">
              {zonas.map(z => (
                <tr key={z.id} className="hover:bg-slate-50">
                  <td className="px-6 py-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center text-xl shadow-inner"><i className={`fa-solid ${z.icono}`}></i></div>
                    <div>
                      <p className="font-black text-slate-800">{z.nombre}</p>
                      <p className="text-[10px] text-slate-400 uppercase font-black">Límite: {z.aforo || 'Libre'}</p>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    {z.manual_url ? <span className="text-[9px] font-black bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full uppercase">Con Manual</span> : <span className="text-[9px] font-black bg-slate-100 text-slate-400 px-2 py-1 rounded-full uppercase">Sin Manual</span>}
                  </td>
                  <td className="px-6 py-5 text-right space-x-2">
                    <button onClick={() => handleEdit(z)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Edit size={18}/></button>
                    <button onClick={() => handleDelete(z.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}