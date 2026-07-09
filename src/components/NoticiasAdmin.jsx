import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { enviarNotificacionInteligente } from '../utils/notificaciones'; // 🔥 1. Importamos nuestra función central
import Swal from 'sweetalert2';

export default function NoticiasAdmin() {
  const [noticias, setNoticias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [subiendo, setSubiendo] = useState(false);

  // Estados para el formulario
  const [tipo, setTipo] = useState('Informativo');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [titulo, setTitulo] = useState('');
  const [resumen, setResumen] = useState('');
  const [contenido, setContenido] = useState('');
  const [archivoFoto, setArchivoFoto] = useState(null);

  useEffect(() => {
    cargarNoticias();
  }, []);

  const cargarNoticias = async () => {
    setCargando(true);
    try {
      const idConjunto = sessionStorage.getItem('copropiedad_id');
      
      const { data, error } = await supabase
        .from('noticias')
        .select('*')
        .eq('copropiedad_id', idConjunto)
        .order('fecha', { ascending: false });

      if (error) throw error;
      setNoticias(data || []);
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'No se pudieron cargar las noticias', 'error');
    } finally {
      setCargando(false);
    }
  };

  const guardarNoticia = async () => {
    if (!titulo || !resumen || !contenido || !fecha) {
      return Swal.fire({
        icon: 'warning',
        title: 'Campos Incompletos',
        text: 'Por favor, llena los campos obligatorios para informar a la comunidad.',
        confirmButtonColor: '#2563eb'
      });
    }

    setSubiendo(true);
    Swal.fire({ title: 'Publicando Comunicado...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
      let imageUrl = null;
      const idConjunto = sessionStorage.getItem('copropiedad_id');

      // 1. Subida de imagen al Storage
      if (archivoFoto) {
        const fileExt = archivoFoto.name.split('.').pop();
        const fileName = `noticia_${idConjunto}_${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('noticias')
          .upload(fileName, archivoFoto);
          
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('noticias').getPublicUrl(fileName);
        imageUrl = publicUrl;
      }

      // 2. Registro en Base de Datos
      const { error: dbError } = await supabase.from('noticias').insert([{
        copropiedad_id: idConjunto, 
        tipo, 
        fecha, 
        titulo, 
        resumen, 
        contenido, 
        imagen_url: imageUrl
      }]);

      if (dbError) throw dbError;

      // 🔥 3. NUEVO: LÓGICA DE NOTIFICACIONES PUSH 🔥
      // Lo envolvemos en un try/catch para que si falla el push, no arroje error en la publicación de la noticia.
      try {
        await enviarNotificacionInteligente({
          tipoEvento: 'nueva_noticia', // Este nombre debe coincidir con el que tengas en la base de datos de plantillas
          copropiedadId: idConjunto,
          userId: null, // Dejamos en null para que le llegue a TODO el conjunto
          emailsDestino: [], 
          datosDinamicos: { titulo_noticia: titulo, resumen_noticia: resumen }, // Pasamos variables por si la plantilla las usa
          enviarMail: false, // Apagado para noticias
          enviarPush: true   // Encendido para enviar alerta al celular
        });
      } catch (pushError) {
        console.error("Notificación Push falló pero la noticia se guardó:", pushError);
      }
      // 🔥 FIN LÓGICA NOTIFICACIONES 🔥

      Swal.fire('¡Éxito!', 'La noticia ha sido publicada en la cartelera digital.', 'success');
      
      // Limpieza de formulario
      setTitulo(''); setResumen(''); setContenido(''); setArchivoFoto(null);
      const fileInput = document.getElementById('foto-noticia-input');
      if (fileInput) fileInput.value = '';
      
      cargarNoticias();

    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'No se pudo publicar la noticia en el servidor.', 'error');
    } finally {
      setSubiendo(false);
    }
  };

  const borrarNoticia = async (id, imageUrl) => {
    const result = await Swal.fire({
      title: '¿Eliminar Comunicado?',
      text: "Se quitará de la cartelera pública de forma inmediata.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Sí, borrar ahora'
    });

    if (result.isConfirmed) {
      try {
        const { error } = await supabase.from('noticias').delete().eq('id', id);
        if (error) throw error;

        if (imageUrl) {
          const fileName = imageUrl.split('/').pop();
          await supabase.storage.from('noticias').remove([fileName]);
        }

        cargarNoticias();
        Swal.fire('Borrada', 'La noticia fue eliminada correctamente.', 'success');
      } catch (error) {
        Swal.fire('Error', 'No se pudo procesar la eliminación.', 'error');
      }
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-700 pb-10">
      
      {/* FORMULARIO BENTO (Izquierda) */}
      <div className="lg:col-span-5 bg-white p-8 md:p-10 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 space-y-6 h-fit">
        <div>
          <h3 className="font-black text-2xl text-slate-800 tracking-tight">Redactar <span className="text-blue-600">Comunicado</span></h3>
          <p className="text-slate-500 text-sm font-medium">Informa a los residentes sobre novedades importantes.</p>
        </div>
        
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Etiqueta</label>
              <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-bold text-xs uppercase">
                <option value="Informativo">Informativo 📘</option>
                <option value="Urgente">Urgente 🚨</option>
                <option value="Alerta">Alerta ⚠️</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha de Publicación</label>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-bold text-sm" style={{colorScheme:'light'}}/>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Título del Aviso</label>
            <input 
              type="text" 
              value={titulo} 
              onChange={(e) => setTitulo(e.target.value)} 
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-bold text-slate-800" 
              placeholder="Ej: Mantenimiento Preventivo" 
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Resumen (Cartelera)</label>
            <textarea 
              value={resumen} 
              onChange={(e) => setResumen(e.target.value)} 
              rows="2" 
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-sm font-medium resize-none" 
              placeholder="Una frase corta para la vista previa..."
            ></textarea>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contenido Detallado</label>
            <textarea 
              value={contenido} 
              onChange={(e) => setContenido(e.target.value)} 
              rows="5" 
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-sm font-medium resize-none leading-relaxed" 
              placeholder="Explica detalladamente la noticia..."
            ></textarea>
          </div>

          <div className="p-6 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50 group hover:border-blue-400 transition-colors">
            <label className="text-xs font-black text-slate-400 group-hover:text-blue-600 block mb-2 text-center cursor-pointer uppercase tracking-widest">Añadir Fotografía</label>
            <input 
              id="foto-noticia-input"
              type="file" 
              accept="image/*" 
              onChange={(e) => setArchivoFoto(e.target.files[0])} 
              className="w-full text-xs font-mono text-slate-400" 
            />
          </div>

          <button 
            onClick={guardarNoticia} 
            disabled={subiendo}
            className="w-full bg-slate-900 hover:bg-blue-600 text-white font-black p-5 rounded-2xl transition-all shadow-xl shadow-blue-100 uppercase tracking-widest text-xs disabled:opacity-50 transform hover:-translate-y-1"
          >
            {subiendo ? 'Subiendo...' : 'Publicar Comunicado'}
          </button>
        </div>
      </div>

      {/* HISTORIAL BENTO (Derecha) */}
      <div className="lg:col-span-7 bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 flex flex-col overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-black text-xl text-slate-800">Historial de <span className="text-blue-600">Comunicados</span></h3>
          <span className="bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-200">{noticias.length} Publicaciones</span>
        </div>
        
        <div className="flex-1 overflow-x-auto p-4">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="text-slate-400 font-bold uppercase text-[9px] tracking-widest border-b border-slate-50">
                <th className="px-6 py-4">Información del Comunicado</th>
                <th className="px-6 py-4 text-center">Tipo</th>
                <th className="px-6 py-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {cargando ? (
                <tr><td colSpan="3" className="text-center py-20 text-slate-400 font-black uppercase text-xs">Sincronizando con Servidor...</td></tr>
              ) : noticias.length === 0 ? (
                <tr><td colSpan="3" className="text-center py-20 text-slate-400 font-medium italic">No se han emitido comunicados oficiales.</td></tr>
              ) : (
                noticias.map((noti) => {
                   let badge = 'bg-blue-50 text-blue-600 border-blue-100';
                   if (noti.tipo === 'Urgente') badge = 'bg-red-50 text-red-600 border-red-100';
                   if (noti.tipo === 'Alerta') badge = 'bg-orange-50 text-orange-600 border-orange-100';
                   
                   return (
                    <tr key={noti.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-sm border border-slate-100 bg-slate-100 shrink-0">
                            {noti.imagen_url ? (
                              <img src={noti.imagen_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xl">📰</div>
                            )}
                          </div>
                          <div>
                            <p className="font-black text-slate-800 text-base leading-none mb-1">{noti.titulo}</p>
                            <p className="text-xs text-slate-400 font-bold">{new Date(noti.fecha).toLocaleDateString('es-CO', { day:'2-digit', month:'long', year:'numeric' })}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${badge}`}>{noti.tipo}</span>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <button 
                          onClick={() => borrarNoticia(noti.id, noti.imagen_url)} 
                          className="w-10 h-10 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm flex items-center justify-center mx-auto"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                   )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}