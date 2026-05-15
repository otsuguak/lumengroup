import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import Swal from 'sweetalert2';

export default function GestionConvivencia() {
  const [cargando, setCargando] = useState(true);
  const [copropiedadId, setCopropiedadId] = useState(null);

  // ESTADOS PARA LLAMADOS DE ATENCIÓN
  const [llamados, setLlamados] = useState([]);
  const [listaUsuarios, setListaUsuarios] = useState([]);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [buscadorResidente, setBuscadorResidente] = useState('');
  const [nuevoLlamado, setNuevoLlamado] = useState({ usuario_id: '', motivo: '' });
  const [evidenciaPdf, setEvidenciaPdf] = useState(null);

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
      const { data: usuarios } = await supabase.from('usuarios').select('id, nombre, inmueble, email');
      setListaUsuarios(usuarios || []);

      const { data: dataLlamados } = await supabase.from('llamados_atencion').select('*').eq('copropiedad_id', id).order('created_at', { ascending: false });
      setLlamados(dataLlamados || []);
    } catch (error) {
      console.error("Error cargando convivencia:", error);
    } finally {
      setCargando(false);
    }
  };

  // FILTRO INTELIGENTE
  const residentesFiltrados = listaUsuarios.filter(u => {
    const termino = buscadorResidente.toLowerCase();
    const nombre = (u.nombre || '').toLowerCase();
    const inmueble = (u.inmueble || '').toLowerCase();
    return nombre.includes(termino) || inmueble.includes(termino);
  });

  const enviarLlamado = async (e) => {
    e.preventDefault();
    if (!nuevoLlamado.usuario_id || !nuevoLlamado.motivo) {
      return Swal.fire('Faltan Datos', 'Selecciona un residente y escribe el motivo.', 'warning');
    }

    Swal.fire({ title: 'Generando llamado...', text: evidenciaPdf ? 'Subiendo documento oficial...' : '', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
      const residenteSeleccionado = listaUsuarios.find(u => u.id === nuevoLlamado.usuario_id);
      let urlDocumento = null;

      if (evidenciaPdf) {
        const ext = evidenciaPdf.name.split('.').pop();
        const ruta = `${copropiedadId}/llamado_${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('evidencias').upload(ruta, evidenciaPdf);
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage.from('evidencias').getPublicUrl(ruta);
        urlDocumento = publicUrl;
      }

      const { error } = await supabase.from('llamados_atencion').insert([{
        copropiedad_id: copropiedadId,
        usuario_id: residenteSeleccionado.id,
        inmueble: residenteSeleccionado.inmueble || 'N/A',
        motivo: nuevoLlamado.motivo,
        documento_url: urlDocumento
      }]);

      if (error) throw error;

      Swal.fire('¡Enviado!', `El llamado de atención ha sido enviado al apartamento ${residenteSeleccionado.inmueble}.`, 'success');
      
      setNuevoLlamado({ usuario_id: '', motivo: '' });
      setBuscadorResidente('');
      setEvidenciaPdf(null);
      setMostrarModal(false);
      cargarDatos(copropiedadId);

    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'Hubo un problema al generar el llamado.', 'error');
    }
  };

  const eliminarLlamado = async (id) => {
    const confirm = await Swal.fire({ title: '¿Borrar registro?', text: 'El residente ya no verá este llamado.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Sí, borrar' });
    if (confirm.isConfirmed) {
      try {
        await supabase.from('llamados_atencion').delete().eq('id', id);
        setLlamados(llamados.filter(ll => ll.id !== id));
        Swal.fire('Borrado', 'El registro fue eliminado.', 'success');
      } catch (error) {
        Swal.fire('Error', 'No se pudo eliminar.', 'error');
      }
    }
  };

  if (cargando) return <div className="flex justify-center p-20"><div className="animate-spin w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full"></div></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      
      <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight mb-2">Gestión de <span className="text-red-500">Convivencia</span></h2>
          <p className="text-slate-500 font-medium">Administra y notifica los llamados de atención a los residentes.</p>
        </div>
        <button onClick={() => setMostrarModal(true)} className="bg-slate-900 hover:bg-red-500 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg transform hover:-translate-y-1 flex items-center gap-2">
          <span>+</span> Generar Novedad
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden flex flex-col min-h-[500px]">
        <div className="p-6 overflow-x-auto bg-slate-50/30">
          <table className="w-full text-left whitespace-nowrap">
            <thead>
              <tr className="text-slate-400 font-black uppercase text-[10px] tracking-widest border-b border-slate-100">
                <th className="px-6 py-5">Fecha</th>
                <th className="px-6 py-5">Residente / Inmueble</th>
                <th className="px-6 py-5">Motivo / Descripción</th>
                <th className="px-6 py-5 text-right">Documento Oficial</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {llamados.length === 0 ? (
                <tr><td colSpan="4" className="text-center py-20 text-slate-400 font-bold italic">El conjunto está en paz. No hay llamados de atención.</td></tr>
              ) : (
                llamados.map(llamado => {
                  const userRef = listaUsuarios.find(u => u.id === llamado.usuario_id);
                  const nombreUsr = userRef ? userRef.nombre : 'Usuario Borrado';

                  return (
                    <tr key={llamado.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-5">
                        <p className="font-bold text-slate-600 text-sm">{new Date(llamado.created_at).toLocaleDateString('es-CO')}</p>
                      </td>
                      <td className="px-6 py-5">
                        <p className="font-black text-slate-800 text-sm">{nombreUsr}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Apto: {llamado.inmueble}</p>
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-sm text-slate-600 font-medium truncate max-w-sm">{llamado.motivo}</p>
                      </td>
                      <td className="px-6 py-5 text-right space-x-2">
                        {llamado.documento_url ? (
                          <a href={llamado.documento_url} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase hover:bg-indigo-500 hover:text-white transition-colors">
                            📄 Ver PDF
                          </a>
                        ) : (
                          <span className="inline-flex items-center justify-center px-4 py-2 bg-transparent text-slate-300 rounded-xl text-[10px] font-bold uppercase border border-dashed border-slate-200">
                            Sin Doc
                          </span>
                        )}
                        <button onClick={() => eliminarLlamado(llamado.id)} className="inline-flex items-center justify-center w-8 h-8 bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-colors">
                          🗑️
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: CREAR NUEVO LLAMADO */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100">
            <div className="p-8 border-b border-red-50 bg-red-50/50 flex justify-between items-center">
              <h3 className="text-xl font-black text-red-600 flex items-center gap-2"><span className="text-2xl">🚨</span> Generar Novedad</h3>
              <button onClick={() => setMostrarModal(false)} className="w-10 h-10 rounded-full bg-white border border-red-100 text-red-400 hover:bg-red-500 hover:text-white font-bold transition-colors">✕</button>
            </div>
            
            <form onSubmit={enviarLlamado} className="p-8 space-y-6">
              <div className="space-y-3 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1 flex justify-between">
                    <span>1. Buscar por Apto o Nombre</span>
                    <span className="text-indigo-400 font-bold">{residentesFiltrados.length} Resultados</span>
                  </label>
                  <input type="text" placeholder="Ej: 504 o Juan..." value={buscadorResidente} onChange={e => setBuscadorResidente(e.target.value)} className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500 text-sm font-medium" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">2. Seleccionar Residente</label>
                  <select value={nuevoLlamado.usuario_id} onChange={e => setNuevoLlamado({...nuevoLlamado, usuario_id: e.target.value})} className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500 font-bold text-slate-700 cursor-pointer">
                    <option value="">Seleccione el destinatario...</option>
                    {residentesFiltrados.map(u => <option key={u.id} value={u.id}>Apto {u.inmueble || 'S/N'} - {u.nombre}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Motivo del Llamado de Atención</label>
                <textarea value={nuevoLlamado.motivo} onChange={e => setNuevoLlamado({...nuevoLlamado, motivo: e.target.value})} rows="3" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-red-500 text-sm font-medium resize-none placeholder-slate-400" placeholder="Ej: Ruido excesivo después de las 10 PM..."></textarea>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1 flex justify-between"><span>Soporte Oficial (PDF/Foto)</span><span className="text-slate-300">Max 10MB</span></label>
                <input type="file" accept=".pdf, .png, .jpg, .jpeg" onChange={e => { const file = e.target.files[0]; if (file && file.size > 10485760) { Swal.fire('Muy pesado', 'Max 10MB', 'warning'); e.target.value = ''; } else { setEvidenciaPdf(file); } }} className="w-full text-[10px] text-slate-500 file:mr-4 file:py-3 file:px-5 file:rounded-xl file:border-0 file:font-black file:bg-red-50 file:text-red-600 hover:file:bg-red-100 cursor-pointer bg-slate-50 border border-slate-200" />
              </div>
              <button type="submit" className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl hover:bg-red-600 transition-all shadow-xl shadow-slate-200 uppercase tracking-widest text-xs transform hover:-translate-y-1">Emitir y Notificar</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}