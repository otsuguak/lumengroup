import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import Swal from 'sweetalert2';
import { generarCascaronHTML } from '../utils/plantillas'; // 🔥 IMPORTAMOS LA FÁBRICA DE DISEÑO

export default function ComunicacionesAdmin() {
  const [usuarios, setUsuarios] = useState([]);
  const [seleccionados, setSeleccionados] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);

  // Estados del correo
  const [asunto, setAsunto] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [archivo, setArchivo] = useState(null);

  // Límite de 10MB en bytes (Resend lo soporta perfectamente)
  const MAX_FILE_SIZE = 10 * 1024 * 1024; 

  useEffect(() => {
    cargarDirectorio();
  }, []);

  const cargarDirectorio = async () => {
    setCargando(true);
    try {
      const idConjunto = sessionStorage.getItem('copropiedad_id');
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nombre, email, inmueble, rol')
        .eq('copropiedad_id', idConjunto)
        .order('inmueble', { ascending: true });

      if (error) throw error;
      setUsuarios(data || []);
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'No se pudo cargar el directorio de residentes.', 'error');
    } finally {
      setCargando(false);
    }
  };

  // --- LÓGICA DE SELECCIÓN ---
  const toggleSeleccion = (email) => {
    if (seleccionados.includes(email)) {
      setSeleccionados(seleccionados.filter(e => e !== email));
    } else {
      setSeleccionados([...seleccionados, email]);
    }
  };

  const seleccionarTodos = () => {
    if (seleccionados.length === usuarios.length) {
      setSeleccionados([]); // Deseleccionar todos
    } else {
      setSeleccionados(usuarios.map(u => u.email)); // Seleccionar todos
    }
  };

  // --- LÓGICA DE ARCHIVO ---
  const manejarArchivo = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        Swal.fire('Archivo muy pesado', 'El límite máximo para adjuntos es de 10MB.', 'warning');
        e.target.value = ''; // Resetea el input
        setArchivo(null);
      } else {
        setArchivo(file);
      }
    }
  };

  // --- ENVÍO MASIVO VÍA RESEND (BCC) ---
  const enviarComunicado = async () => {
    if (seleccionados.length === 0) {
      return Swal.fire('Sin Destinatarios', 'Selecciona al menos un residente de la lista.', 'warning');
    }
    if (!asunto.trim() || !mensaje.trim()) {
      return Swal.fire('Campos Vacíos', 'El asunto y el mensaje son obligatorios.', 'warning');
    }

    setEnviando(true);
    Swal.fire({ 
      title: 'Conectando con Resend 🚀', 
      text: 'Preparando el envío seguro (Copia Oculta BCC)...', 
      allowOutsideClick: false, 
      didOpen: () => Swal.showLoading() 
    });

    try {
      let adjuntos = [];

      // Si hay un archivo, Resend necesita que lo enviemos en formato Base64
      if (archivo) {
        const base64Content = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(archivo);
          reader.onload = () => resolve(reader.result.split(',')[1]); // Quitamos el prefijo
          reader.onerror = error => reject(error);
        });

        adjuntos.push({
          filename: archivo.name,
          content: base64Content
        });
      }

      // 🔥 MAGIA: Envolvemos el texto simple del administrador en el diseño de correo maestro
      const htmlFinal = generarCascaronHTML(asunto, mensaje);

      // 🔌 AQUÍ LLAMAMOS A SUPABASE PARA QUE ÉL HABLE CON RESEND DE FORMA SEGURA
      const { data, error } = await supabase.functions.invoke('resend-correo', {
        body: {
          bcc: seleccionados, 
          asunto: asunto,
          mensaje: htmlFinal, // Pasamos el HTML hermoso al backend
          html: htmlFinal,    // Por si tu backend usa la variable html
          adjuntos: adjuntos
        }
      });

      if (error) throw error;

      Swal.fire('¡Enviado!', `El comunicado se envió a ${seleccionados.length} destinatarios protegiendo sus datos.`, 'success');
      
      // Limpieza
      setAsunto(''); setMensaje(''); setArchivo(null); setSeleccionados([]);
      const fileInput = document.getElementById('adjunto-input');
      if (fileInput) fileInput.value = '';

    } catch (error) {
      console.error("Error al enviar con Resend:", error);
      Swal.fire('Error', 'Hubo un problema de conexión al enviar los correos.', 'error');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 animate-in fade-in duration-700 pb-10">
      
      {/* DIRECTORIO DE RESIDENTES (Columna Izquierda) */}
      <div className="xl:col-span-5 bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 flex flex-col overflow-hidden h-[800px]">
        <div className="p-8 border-b border-slate-50 bg-slate-50/50 shrink-0">
          <h3 className="font-black text-xl text-slate-800 tracking-tight">Directorio <span className="text-purple-600">SaaS</span></h3>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Selección para Envío</p>
        </div>
        
        <div className="px-6 py-4 border-b border-slate-50 flex justify-between items-center bg-white shrink-0">
          <div onClick={seleccionarTodos} className="flex items-center gap-3 cursor-pointer group">
            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${seleccionados.length === usuarios.length && usuarios.length > 0 ? 'bg-purple-600 border-purple-600' : 'border-slate-300 group-hover:border-purple-400'}`}>
              {seleccionados.length === usuarios.length && usuarios.length > 0 && <span className="text-white text-xs">✓</span>}
            </div>
            <span className="text-xs font-bold text-slate-700 uppercase tracking-widest group-hover:text-purple-600 transition-colors">Seleccionar Todos</span>
          </div>

          <span className="text-[10px] font-black text-purple-600 bg-purple-50 px-3 py-1 rounded-lg border border-purple-100">
            {seleccionados.length} listos
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
          {cargando ? (
            <div className="text-center py-10 text-slate-400 font-black uppercase text-xs">Cargando base de datos...</div>
          ) : usuarios.length === 0 ? (
            <div className="text-center py-10 text-slate-400 font-medium italic">No hay usuarios registrados.</div>
          ) : (
            usuarios.map(u => (
              <div 
                key={u.id} 
                onClick={() => toggleSeleccion(u.email)}
                className={`flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all border ${seleccionados.includes(u.email) ? 'bg-purple-50 border-purple-200' : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'}`}
              >
                <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${seleccionados.includes(u.email) ? 'bg-purple-600 border-purple-600' : 'border-slate-300'}`}>
                  {seleccionados.includes(u.email) && <span className="text-white text-xs">✓</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-black text-slate-800 text-sm truncate">{u.nombre}</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest truncate">{u.inmueble} - {u.rol}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* REDACTOR DE CORREO (Columna Derecha) */}
      <div className="xl:col-span-7 bg-white p-8 md:p-10 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 flex flex-col h-[800px]">
        <div className="mb-8 shrink-0">
          <h3 className="font-black text-2xl text-slate-800 tracking-tight">Campaña de <span className="text-purple-600">Correo</span></h3>
          <p className="text-slate-500 text-sm font-medium">BCC Activado: Impulsado por Resend. Los usuarios no verán a los demás.</p>
        </div>
        
        <div className="flex-1 flex flex-col gap-6 overflow-y-auto no-scrollbar pr-2">
          <div className="space-y-1 shrink-0">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Asunto del Comunicado</label>
            <input 
              type="text" 
              value={asunto} 
              onChange={(e) => setAsunto(e.target.value)} 
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 font-black text-slate-800 text-lg" 
              placeholder="Ej: Estados Financieros y Convocatoria Asamblea" 
            />
          </div>

          <div className="space-y-1 flex-1 flex flex-col">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex justify-between">
              Cuerpo del Correo
              <span className="text-purple-500 lowercase normal-case tracking-normal font-medium">Se aplicará diseño HTML corporativo automáticamente</span>
            </label>
            <textarea 
              value={mensaje} 
              onChange={(e) => setMensaje(e.target.value)} 
              className="w-full p-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 text-sm font-medium resize-none leading-relaxed flex-1" 
              placeholder="Estimado residente, adjunto encontrará el estado financiero..."
            ></textarea>
          </div>

          <div className="p-6 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50 group hover:border-purple-400 transition-colors shrink-0">
            <div className="flex justify-between items-center mb-3">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Documento Adjunto</label>
              <span className="text-[9px] font-black text-slate-400 bg-white px-2 py-1 rounded-md border border-slate-200 shadow-sm">Límite: 10MB</span>
            </div>
            <input 
              id="adjunto-input"
              type="file" 
              onChange={manejarArchivo} 
              className="w-full text-xs font-mono text-slate-500 file:mr-4 file:py-2.5 file:px-5 file:rounded-xl file:border-0 file:text-xs file:font-black file:uppercase file:tracking-widest file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200 cursor-pointer" 
            />
          </div>
        </div>

        <div className="pt-6 mt-6 border-t border-slate-100 shrink-0">
          <button 
            onClick={enviarComunicado} 
            disabled={enviando}
            className="w-full bg-slate-900 hover:bg-purple-600 text-white font-black p-5 rounded-[1.5rem] transition-all shadow-xl shadow-purple-900/20 uppercase tracking-widest text-xs disabled:opacity-50 transform hover:-translate-y-1 flex items-center justify-center gap-3"
          >
            {enviando ? 'Emitiendo Comunicado...' : 'Enviar Correo Seguro (BCC)'} 🚀
          </button>
        </div>
      </div>

    </div>
  );
}