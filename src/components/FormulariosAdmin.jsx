import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import Swal from 'sweetalert2';

export default function FormulariosAdmin() {
  const [cargando, setCargando] = useState(true);
  const [copropiedadId, setCopropiedadId] = useState(null);
  const [formularios, setFormularios] = useState([]);
  const [mostrarModalEncuesta, setMostrarModalEncuesta] = useState(false);
  const [nuevoForm, setNuevoForm] = useState({ titulo: '', descripcion: '', iframe_url: '' });

  useEffect(() => {
    inicializar();
  }, []);

  const inicializar = async () => {
    const idConjunto = sessionStorage.getItem('copropiedad_id');
    if (!idConjunto || idConjunto === 'null') {
      setCargando(false);
      return; 
    }
    setCopropiedadId(idConjunto);
    await cargarDatos(idConjunto);
  };

  const cargarDatos = async (id) => {
    setCargando(true);
    try {
      const { data: dataForms, error } = await supabase
        .from('formularios_externos')
        .select('*')
        .eq('copropiedad_id', id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setFormularios(dataForms || []);
    } catch (error) {
      console.error("Error cargando formularios:", error);
    } finally {
      setCargando(false);
    }
  };

  const guardarNuevoFormulario = async (e) => {
    e.preventDefault();
    if (!nuevoForm.titulo || !nuevoForm.iframe_url) return Swal.fire('Atención', 'El título y la URL son obligatorios.', 'warning');
    
    Swal.fire({ title: 'Vinculando y Notificando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    
    try {
      // 1. Guardamos el formulario en la base de datos
      const { error } = await supabase.from('formularios_externos').insert([{
        copropiedad_id: copropiedadId, 
        titulo: nuevoForm.titulo, 
        descripcion: nuevoForm.descripcion, 
        iframe_url: nuevoForm.iframe_url, 
        activo: true
      }]);
      if (error) throw error;

      // 🔥 2. MAGIA: DISPARAMOS LA NOTIFICACIÓN PUSH 🔥
      try {
        await supabase.functions.invoke('enviar_push', {
          body: {
            titulo: '📋 Nueva Encuesta Disponible',
            mensaje: `Participa ahora: ${nuevoForm.titulo}. ${nuevoForm.descripcion || ''}`,
            copropiedadId: copropiedadId
          }
        });
      } catch (pushError) {
        console.error("Error al enviar el Push del formulario:", pushError);
        // Nota: Si el push falla por algo, no bloqueamos al usuario, el formulario ya se guardó.
      }

      // 3. Finalizamos con éxito
      Swal.fire('¡Éxito!', 'Formulario publicado y notificado a los residentes.', 'success');
      setNuevoForm({ titulo: '', descripcion: '', iframe_url: '' });
      setMostrarModalEncuesta(false);
      cargarDatos(copropiedadId);
    } catch (error) {
      Swal.fire('Error', 'No se pudo guardar el formulario', 'error');
    }
  };

  const toggleEstadoForm = async (id, estadoActual) => {
    try {
      await supabase.from('formularios_externos').update({ activo: !estadoActual }).eq('id', id);
      setFormularios(formularios.map(f => f.id === id ? { ...f, activo: !estadoActual } : f));
    } catch (error) {
      Swal.fire('Error', 'No se pudo actualizar el estado', 'error');
    }
  };

  const eliminarFormulario = async (id) => {
    const result = await Swal.fire({ title: '¿Eliminar Formulario?', text: "Esta acción no se puede deshacer.", icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Sí, eliminar' });
    if (result.isConfirmed) {
      await supabase.from('formularios_externos').delete().eq('id', id);
      setFormularios(formularios.filter(f => f.id !== id));
    }
  };

  if (cargando) return <div className="flex justify-center py-20"><div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full"></div></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight mb-2">Encuestas de <span className="text-blue-600">Participación</span></h2>
          <p className="text-slate-500 text-sm font-medium">Administra los formularios externos para los residentes.</p>
        </div>
        <button onClick={() => setMostrarModalEncuesta(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg transform hover:-translate-y-1">
          + Vincular Formulario
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden min-h-[400px]">
        <div className="overflow-x-auto p-4">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="text-slate-400 font-bold uppercase text-[10px] tracking-widest border-b border-slate-50">
                <th className="px-6 py-4">Encuesta / Título</th>
                <th className="px-6 py-4 text-center">Estado de Visibilidad</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {formularios.length === 0 ? (
                <tr><td colSpan="3" className="text-center py-20 text-slate-400 font-medium italic">No hay formularios registrados.</td></tr>
              ) : (
                formularios.map((form) => (
                  <tr key={form.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center shadow-inner">📋</div>
                        <div>
                          <p className="font-black text-slate-800 text-base">{form.titulo}</p>
                          <p className="text-xs text-slate-500 font-medium truncate max-w-xs">{form.descripcion || 'Sin descripción adicional'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <button onClick={() => toggleEstadoForm(form.id, form.activo)} className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase border transition-all ${form.activo ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                        {form.activo ? '● Publicado' : '○ Oculto'}
                      </button>
                    </td>
                    <td className="px-6 py-5 text-right space-x-3">
                      <a href={form.iframe_url} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 text-slate-500 hover:bg-blue-500 hover:text-white transition-all shadow-sm">🔗</a>
                      <button onClick={() => eliminarFormulario(form.id)} className="w-10 h-10 rounded-xl bg-red-50 text-red-400 hover:bg-red-500 hover:text-white transition-all shadow-sm">🗑️</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {mostrarModalEncuesta && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-black text-slate-800">Vincular Nueva Encuesta</h3>
              <button onClick={() => setMostrarModalEncuesta(false)} className="w-10 h-10 rounded-full bg-white border border-slate-200 text-slate-400 hover:bg-red-500 hover:border-red-500 hover:text-white font-bold transition-colors">✕</button>
            </div>
            <form onSubmit={guardarNuevoFormulario} className="p-8 space-y-5">
              <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Título</label><input type="text" value={nuevoForm.titulo} onChange={e => setNuevoForm({...nuevoForm, titulo: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700" required /></div>
              <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Descripción</label><input type="text" value={nuevoForm.descripcion} onChange={e => setNuevoForm({...nuevoForm, descripcion: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">URL (Iframe)</label><input type="url" value={nuevoForm.iframe_url} onChange={e => setNuevoForm({...nuevoForm, iframe_url: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-blue-600 font-mono text-xs" required /></div>
              <button type="submit" className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl hover:bg-blue-600 transition-all uppercase tracking-widest text-xs transform hover:-translate-y-1">Publicar</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}