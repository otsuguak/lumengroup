import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import Swal from 'sweetalert2';

export default function DocumentosAdmin() {
  const [documentos, setDocumentos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [subiendo, setSubiendo] = useState(false);

  // Estados del Formulario
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoria, setCategoria] = useState('Acta');
  const [archivo, setArchivo] = useState(null);

  useEffect(() => {
    cargarDocumentos();
  }, []);

  const cargarDocumentos = async () => {
    setCargando(true);
    try {
      const idConjunto = sessionStorage.getItem('copropiedad_id');
      
      const { data, error } = await supabase
        .from('documentos')
        .select('*')
        .eq('copropiedad_id', idConjunto)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocumentos(data || []);
    } catch (error) {
      console.error("Error al cargar documentos:", error);
      Swal.fire('Error', 'No se pudo sincronizar el repositorio de archivos.', 'error');
    } finally {
      setCargando(false);
    }
  };

  const guardarDocumento = async () => {
    if (!titulo || !categoria || !archivo) {
      return Swal.fire({
        icon: 'warning',
        title: 'Datos Incompletos',
        text: 'El título, la categoría y el archivo son obligatorios.',
        confirmButtonColor: '#2563eb'
      });
    }

    // Validación de tamaño (Max 10MB para evitar saturar el Storage)
    if (archivo.size > 10 * 1024 * 1024) {
      return Swal.fire('Archivo muy pesado', 'El documento no debe superar los 10MB.', 'warning');
    }

    setSubiendo(true);
    Swal.fire({ title: 'Subiendo al Repositorio...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
      const idConjunto = sessionStorage.getItem('copropiedad_id');
      
      // 1. Limpieza del nombre del archivo y subida al Storage
      const fileExt = archivo.name.split('.').pop();
      const nombreLimpio = titulo.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `doc_${idConjunto}_${nombreLimpio}_${Date.now()}.${fileExt}`;
      
      // Asumimos que tienes un bucket llamado 'documentos' en Supabase
      const { error: uploadError } = await supabase.storage
        .from('documentos')
        .upload(fileName, archivo);
        
      if (uploadError) throw uploadError;

      // 2. Obtener URL Pública
      const { data: { publicUrl } } = supabase.storage.from('documentos').getPublicUrl(fileName);

      // 3. Registro en la Base de Datos
      const { error: dbError } = await supabase.from('documentos').insert([{
        copropiedad_id: idConjunto,
        titulo,
        descripcion,
        categoria,
        archivo_url: publicUrl
      }]);

      if (dbError) throw dbError;

      Swal.fire('¡Publicado!', 'El documento ya está disponible para los residentes.', 'success');
      
      // Limpieza
      setTitulo(''); setDescripcion(''); setCategoria('Acta'); setArchivo(null);
      const fileInput = document.getElementById('archivo-doc-input');
      if (fileInput) fileInput.value = '';
      
      cargarDocumentos();

    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'Fallo la carga del documento en el servidor.', 'error');
    } finally {
      setSubiendo(false);
    }
  };

  const borrarDocumento = async (id, urlArchivo) => {
    const result = await Swal.fire({
      title: '¿Eliminar Documento?',
      text: "Se borrará de la base de datos y del servidor en la nube.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Sí, eliminar definitivamente'
    });

    if (result.isConfirmed) {
      try {
        // 1. Borrar registro de DB
        const { error } = await supabase.from('documentos').delete().eq('id', id);
        if (error) throw error;

        // 2. Borrar archivo físico del Storage para liberar espacio
        if (urlArchivo) {
          const fileName = urlArchivo.split('/').pop();
          await supabase.storage.from('documentos').remove([fileName]);
        }

        cargarDocumentos();
        Swal.fire('Eliminado', 'El documento fue removido con éxito.', 'success');
      } catch (error) {
        Swal.fire('Error', 'No se pudo completar la eliminación.', 'error');
      }
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 animate-in fade-in duration-700 pb-10">
      
      {/* FORMULARIO BENTO (Izquierda) */}
      <div className="xl:col-span-5 bg-white p-8 md:p-10 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 space-y-6 h-fit">
        <div>
          <h3 className="font-black text-2xl text-slate-800 tracking-tight">Cargar <span className="text-[#00A6FB]">Documento</span></h3>
          <p className="text-slate-500 text-sm font-medium">Sube manuales, reglamentos o actas oficiales.</p>
        </div>
        
        <div className="space-y-5">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Título del Archivo</label>
            <input 
              type="text" 
              value={titulo} 
              onChange={(e) => setTitulo(e.target.value)} 
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-bold text-slate-800" 
              placeholder="Ej: Acta de Asamblea 2026" 
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoría Oficial</label>
            <select 
              value={categoria} 
              onChange={(e) => setCategoria(e.target.value)} 
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-bold text-xs uppercase"
            >
              <option value="Acta">Acta de Asamblea / Consejo</option>
              <option value="Reglamento">Manual de Convivencia / Reglamento</option>
              <option value="Circular">Circular Informativa</option>
              <option value="Financiero">Reporte Financiero</option>
              <option value="Otro">Otro Documento</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descripción (Opcional)</label>
            <textarea 
              value={descripcion} 
              onChange={(e) => setDescripcion(e.target.value)} 
              rows="3" 
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-sm font-medium resize-none" 
              placeholder="Breve resumen del contenido del documento..."
            ></textarea>
          </div>

          <div className="p-6 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50 group hover:border-[#00A6FB] transition-colors relative overflow-hidden">
            <label className="text-xs font-black text-slate-400 group-hover:text-[#00A6FB] block mb-2 text-center cursor-pointer uppercase tracking-widest">
              {archivo ? 'Archivo Seleccionado ✅' : 'Seleccionar Archivo (PDF, DOCX)'}
            </label>
            <input 
              id="archivo-doc-input"
              type="file" 
              accept=".pdf,.doc,.docx,.xls,.xlsx" 
              onChange={(e) => setArchivo(e.target.files[0])} 
              className="w-full text-xs font-mono text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" 
            />
          </div>

          <button 
            onClick={guardarDocumento} 
            disabled={subiendo}
            className="w-full bg-slate-900 hover:bg-[#00A6FB] text-white font-black p-5 rounded-2xl transition-all shadow-xl shadow-blue-100 uppercase tracking-widest text-xs disabled:opacity-50 transform hover:-translate-y-1"
          >
            {subiendo ? 'Procesando Carga...' : 'Subir Documento'}
          </button>
        </div>
      </div>

      {/* HISTORIAL BENTO (Derecha) */}
      <div className="xl:col-span-7 bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 flex flex-col overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-black text-xl text-slate-800">Repositorio de <span className="text-[#00A6FB]">Archivos</span></h3>
          <span className="bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-200">{documentos.length} Archivos</span>
        </div>
        
        <div className="flex-1 overflow-x-auto p-4">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="text-slate-400 font-bold uppercase text-[9px] tracking-widest border-b border-slate-50">
                <th className="px-6 py-4">Detalle del Documento</th>
                <th className="px-6 py-4 text-center">Categoría</th>
                <th className="px-6 py-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {cargando ? (
                <tr><td colSpan="3" className="text-center py-20 text-slate-400 font-black uppercase text-xs">Conectando al Storage...</td></tr>
              ) : documentos.length === 0 ? (
                <tr><td colSpan="3" className="text-center py-20 text-slate-400 font-medium italic">No hay documentos en el repositorio.</td></tr>
              ) : (
                documentos.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center text-2xl shadow-inner shrink-0">
                          📄
                        </div>
                        <div>
                          <p className="font-black text-slate-800 text-base leading-none mb-1 truncate max-w-xs">{doc.titulo}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{new Date(doc.created_at).toLocaleDateString('es-CO')}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border bg-slate-50 text-slate-600 border-slate-200">
                        {doc.categoria}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center space-x-2">
                      <a 
                        href={doc.archivo_url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex w-10 h-10 rounded-xl bg-blue-50 text-blue-500 hover:bg-blue-500 hover:text-white transition-all shadow-sm items-center justify-center"
                        title="Descargar/Ver"
                      >
                        ⬇️
                      </a>
                      <button 
                        onClick={() => borrarDocumento(doc.id, doc.archivo_url)} 
                        className="w-10 h-10 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm inline-flex items-center justify-center"
                        title="Eliminar Documento"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}