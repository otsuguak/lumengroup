import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '../supabase';
import Webcam from 'react-webcam';
import Swal from 'sweetalert2';

export default function ModuloRecepcion({ turno }) {
  const [pestana, setPestana] = useState('registro'); 

  // Estados del Formulario
  const [inmueble, setInmueble] = useState('');
  const [tipoRegistro, setTipoRegistro] = useState('Paquete');
  const [nombre, setNombre] = useState('');
  const [cedula, setCedula] = useState('');
  const [observaciones, setObservaciones] = useState('');
  
  // Estados de la Cámara (Ingreso)
  const [fotoRecortada, setFotoRecortada] = useState(null);
  const [fotoExistente, setFotoExistente] = useState(null); 
  const [modoCamara, setModoCamara] = useState("environment"); 
  const [cargando, setCargando] = useState(false);
  
  // Estados para Paquetes
  const [paquetesPendientes, setPaquetesPendientes] = useState([]);
  const [paquetesEntregados, setPaquetesEntregados] = useState([]);

  // 🔥 NUEVO: Estado para abrir la tarjeta de "Ver detalle" 🔥
  const [paqueteDetalle, setPaqueteDetalle] = useState(null);

  // Estados para el Modal de Entrega Fotográfica
  const [paqueteAEntregar, setPaqueteAEntregar] = useState(null);
  const [fotoEntrega, setFotoEntrega] = useState(null);
  const [modoCamaraEntrega, setModoCamaraEntrega] = useState("environment");
  const [cargandoEntrega, setCargandoEntrega] = useState(false);

  const webcamRef = useRef(null);
  const webcamEntregaRef = useRef(null);

  const idConjunto = turno?.copropiedad_id || sessionStorage.getItem('copropiedad_id');

  useEffect(() => {
    if (pestana === 'entregas') cargarPaquetesPendientes();
    if (pestana === 'historial') cargarPaquetesEntregados();
  }, [pestana]);

  const buscarVisitante = async () => {
    if (tipoRegistro !== 'Visitante' || !cedula || cedula.length < 5) return;
    try {
      const { data } = await supabase
        .from('registro_recepcion')
        .select('nombre_visitante_o_empresa, foto_url')
        .eq('tipo_registro', 'Visitante')
        .eq('cedula_o_guia', cedula)
        .order('fecha_ingreso', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setNombre(data.nombre_visitante_o_empresa);
        setFotoExistente(data.foto_url); 
        setFotoRecortada(null); 
        Swal.fire({
          title: 'Visitante Frecuente',
          text: `Se encontró a ${data.nombre_visitante_o_empresa}.`,
          icon: 'info',
          toast: true,
          position: 'top-end',
          timer: 3000,
          showConfirmButton: false
        });
      } else {
        setFotoExistente(null);
      }
    } catch (error) {
      setFotoExistente(null);
    }
  };

  const capturarFoto = useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();
    setFotoRecortada(imageSrc);
    setFotoExistente(null); 
  }, [webcamRef]);

  const registrarIngreso = async (e) => {
    e.preventDefault();
    if (!inmueble || !nombre || (!fotoRecortada && !fotoExistente)) {
      return Swal.fire('Atención', 'Faltan datos o la evidencia fotográfica.', 'warning');
    }
    setCargando(true);
    try {
      let finalFotoUrl = fotoExistente; 
      if (fotoRecortada) {
        const res = await fetch(fotoRecortada);
        const blob = await res.blob();
        const fileName = `recepcion/${idConjunto}/${Date.now()}.jpg`; 
        const { error: uploadError } = await supabase.storage.from('evidencias').upload(fileName, blob, { contentType: 'image/jpeg' });
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('evidencias').getPublicUrl(fileName);
        finalFotoUrl = publicUrl;
      }

      const { error: dbError } = await supabase.from('registro_recepcion').insert([{
          copropiedad_id: idConjunto, 
          turno_id: turno?.id,
          inmueble: inmueble.trim(),
          tipo_registro: tipoRegistro,
          nombre_visitante_o_empresa: nombre.trim().toUpperCase(),
          cedula_o_guia: cedula.trim(),
          observaciones: observaciones.trim(),
          foto_url: finalFotoUrl,
          estado: (tipoRegistro === 'Paquete' || tipoRegistro === 'Domicilio') ? 'En Porteria' : 'Ingresó',
          fecha_ingreso: new Date().toISOString()
        }]);

      if (dbError) throw dbError;
      
      Swal.fire({ title: '¡Registrado!', text: `Se registró correctamente.`, icon: 'success', timer: 2000 });
      
      // 🔥 AQUÍ DISPARAMOS LA NOTIFICACIÓN 🔥
      // Primero buscamos al dueño del inmueble y luego disparamos
      const icono = tipoRegistro === 'Visitante' ? '🚶‍♂️' : '📦';
      enviarNotificacion(inmueble, "Nueva Notificación", `${icono} Tienes un nuevo ${tipoRegistro} en portería.`);  
      
      // ==========================================
      // 🚀 AVISO AL CORREO DEL RESIDENTE VÍA RESEND
      // ==========================================
      supabase.from('usuarios')
        .select('email')
        .eq('copropiedad_id', idConjunto)
        .ilike('inmueble', inmueble.trim())
        .then(({ data: residentes }) => {
          if (residentes && residentes.length > 0) {
            const correos = residentes.map(r => r.email);
            const icono = tipoRegistro === 'Visitante' ? '🚶‍♂️' : tipoRegistro === 'Paquete' ? '📦' : '🍔';
            const asunto = `${icono} Novedad en Portería: Nuevo ${tipoRegistro}`;
            const htmlMensaje = `
              <div style="font-family: Arial, sans-serif; padding: 20px; max-w: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 10px;">
                <h2 style="color: #4f46e5; text-align: center;">Notificación de Portería ${icono}</h2>
                <p>Hola, te informamos que acaba de registrarse un nuevo ingreso dirigido a tu inmueble (<b>${inmueble.trim()}</b>).</p>
                <table style="width: 100%; border-collapse: collapse; margin-top: 20px; background-color: #f8fafc;">
                  <tr>
                    <td style="padding: 10px; border: 1px solid #e2e8f0;"><b>Tipo:</b></td>
                    <td style="padding: 10px; border: 1px solid #e2e8f0;">${tipoRegistro}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px; border: 1px solid #e2e8f0;"><b>Nombre / Empresa:</b></td>
                    <td style="padding: 10px; border: 1px solid #e2e8f0;">${nombre.trim().toUpperCase()}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px; border: 1px solid #e2e8f0;"><b>Observaciones del Guarda:</b></td>
                    <td style="padding: 10px; border: 1px solid #e2e8f0;">${observaciones.trim() || 'Sin novedades'}</td>
                  </tr>
                </table>
                <p style="text-align: center; margin-top: 30px; font-size: 12px; color: #94a3b8;">
                  Este es un mensaje automático de tu sistema de seguridad LumenGroup.
                </p>
              </div>
            `;
            supabase.functions.invoke('resend-correo', {
              body: { bcc: correos, asunto: asunto, mensaje: htmlMensaje }
            });
          }
        });
      // ==========================================

      setInmueble(''); setNombre(''); setCedula(''); setObservaciones('');
      setFotoRecortada(null); setFotoExistente(null);
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'Hubo un problema al guardar.', 'error');
    } finally {
      setCargando(false);
    }
  };

  const cargarPaquetesPendientes = async () => {
    if (!idConjunto) return;
    const { data } = await supabase
      .from('registro_recepcion')
      .select('*')
      .eq('copropiedad_id', idConjunto) 
      .in('tipo_registro', ['Paquete', 'Domicilio'])
      .neq('estado', 'Entregado') 
      .order('fecha_ingreso', { ascending: false });
    setPaquetesPendientes(data || []);
  };

  const cargarPaquetesEntregados = async () => {
    if (!idConjunto) return;
    const { data } = await supabase
      .from('registro_recepcion')
      .select('*')
      .eq('copropiedad_id', idConjunto) 
      .in('tipo_registro', ['Paquete', 'Domicilio'])
      .eq('estado', 'Entregado')
      .order('fecha_entrega', { ascending: false })
      .limit(30);
    setPaquetesEntregados(data || []);
  };

  const capturarFotoEntrega = useCallback(() => {
    const imageSrc = webcamEntregaRef.current.getScreenshot();
    setFotoEntrega(imageSrc);
  }, [webcamEntregaRef]);

  const confirmarEntrega = async () => {
    if (!fotoEntrega) return Swal.fire('Atención', 'Debes tomar la foto a la persona que recibe.', 'warning');
    setCargandoEntrega(true);

    try {
      const res = await fetch(fotoEntrega);
      const blob = await res.blob();
      const fileName = `entregas/${idConjunto}/entrega_${paqueteAEntregar.id}_${Date.now()}.jpg`; 

      const { error: uploadError } = await supabase.storage.from('evidencias').upload(fileName, blob, { contentType: 'image/jpeg' });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('evidencias').getPublicUrl(fileName);

      const { error: dbError } = await supabase.from('registro_recepcion')
        .update({ 
          estado: 'Entregado',
          fecha_entrega: new Date().toISOString(),
          foto_entrega: publicUrl 
        })
        .eq('id', paqueteAEntregar.id);

      if (dbError) throw dbError;

      Swal.fire('¡Entregado!', 'El paquete fue entregado con evidencia fotográfica.', 'success');
      
      setPaqueteAEntregar(null);
      setFotoEntrega(null);
      cargarPaquetesPendientes(); 

    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'Hubo un problema al procesar la entrega.', 'error');
    } finally {
      setCargandoEntrega(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto mt-6">
      
      {/* MENÚ DE PESTAÑAS */}
      <div className="flex gap-2 mb-4 bg-white p-2 rounded-2xl shadow-sm w-max overflow-x-auto">
        <button onClick={() => setPestana('registro')} className={`px-6 py-3 font-bold rounded-xl transition whitespace-nowrap ${pestana === 'registro' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>📝 Nuevo Registro</button>
        <button onClick={() => setPestana('entregas')} className={`px-6 py-3 font-bold rounded-xl transition whitespace-nowrap ${pestana === 'entregas' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>📦 Pendientes</button>
        <button onClick={() => setPestana('historial')} className={`px-6 py-3 font-bold rounded-xl transition whitespace-nowrap ${pestana === 'historial' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>✅ Historial Entregados</button>
      </div>

      {/* PESTAÑA 1: REGISTRO */}
      {pestana === 'registro' && (
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row animate-in fade-in">
          <div className="w-full md:w-1/2 bg-slate-900 p-6 flex flex-col items-center justify-center relative">
            <h3 className="text-white font-bold mb-4">📸 Evidencia Fotográfica</h3>
            <div className="w-full max-w-sm aspect-video bg-black rounded-lg overflow-hidden border-4 border-slate-700 relative shadow-2xl">
              {fotoExistente ? (
                <img src={fotoExistente} alt="Guardada" className="w-full h-full object-cover opacity-80" />
              ) : !fotoRecortada ? (
                <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" videoConstraints={{ facingMode: modoCamara }} className="w-full h-full object-cover" />
              ) : (
                <img src={fotoRecortada} alt="Captura" className="w-full h-full object-cover" />
              )}
            </div>
            <div className="mt-6 flex flex-wrap gap-4 justify-center">
              {!fotoRecortada && !fotoExistente ? (
                <>
                  <button type="button" onClick={capturarFoto} className="bg-indigo-500 text-white font-bold py-3 px-8 rounded-full shadow-lg">Capturar Foto</button>
                  <button type="button" onClick={() => setModoCamara(modoCamara === "environment" ? "user" : "environment")} className="bg-slate-700 text-white font-bold p-3 rounded-full shadow-lg">🔄</button>
                </>
              ) : (
                <button type="button" onClick={() => { setFotoRecortada(null); setFotoExistente(null); }} className="bg-red-500 text-white font-bold py-3 px-8 rounded-full shadow-lg">🔄 Tomar foto nueva</button>
              )}
            </div>
          </div>

          <div className="w-full md:w-1/2 p-8 lg:p-12">
            <h2 className="text-2xl font-black text-gray-800 mb-6">Registro de Portería</h2>
            <form onSubmit={registrarIngreso} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Tipo</label>
                  <select value={tipoRegistro} onChange={(e) => { setTipoRegistro(e.target.value); setFotoExistente(null); }} className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold text-gray-700">
                    <option value="Paquete">📦 Paquete</option>
                    <option value="Visitante">🚶‍♂️ Visitante Peatonal</option>
                    <option value="Domicilio">🍔 Domicilio (Rappi)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Apto / Casa</label>
                  <input type="text" value={inmueble} onChange={(e) => setInmueble(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl font-bold text-center" placeholder="Ej: 11008" required />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1"><span>{tipoRegistro === 'Visitante' ? 'Cédula (Con Autocompletado)' : 'N° Guía (Opcional)'}</span></label>
                  <input type="text" value={cedula} onChange={(e) => setCedula(e.target.value)} onBlur={buscarVisitante} className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 ${tipoRegistro === 'Visitante' ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300'}`} placeholder={tipoRegistro === 'Visitante' ? 'Digita cédula y sal del cuadro...' : 'Ej: GUIA-987...'} required={tipoRegistro === 'Visitante'} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">{tipoRegistro === 'Paquete' ? 'Empresa / Remitente' : 'Nombre Completo'}</label>
                  <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl uppercase text-sm" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Observaciones</label>
                <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl text-sm" rows="2"></textarea>
              </div>
              <button type="submit" disabled={cargando || (!fotoRecortada && !fotoExistente)} className={`w-full py-4 rounded-xl text-white font-black text-lg shadow-xl transition-all ${(cargando || (!fotoRecortada && !fotoExistente)) ? 'bg-gray-400' : 'bg-green-500 hover:bg-green-600'}`}>
                {cargando ? 'Guardando...' : '✅ Guardar Registro'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 🔥 PESTAÑA 2: ENTREGAS PENDIENTES (AHORA EN TABLA) 🔥 */}
      {pestana === 'entregas' && (
        <div className="bg-white p-6 rounded-2xl shadow-xl animate-in fade-in">
          <div className="flex justify-between items-center mb-6 border-b pb-4">
             <h2 className="text-xl font-black text-slate-800">📦 Pendientes en Portería</h2>
             <button onClick={cargarPaquetesPendientes} className="text-indigo-600 font-bold hover:underline">🔄 Refrescar</button>
          </div>
          
          <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
            <table className="w-full text-left bg-white text-sm">
              <thead className="bg-slate-800 text-white">
                <tr>
                  <th className="p-4 font-bold">Inmueble</th>
                  <th className="p-4 font-bold">Tipo</th>
                  <th className="p-4 font-bold">Destinatario / Remitente</th>
                  <th className="p-4 font-bold">Fecha de Ingreso</th>
                  <th className="p-4 font-bold text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y border-slate-100">
                {paquetesPendientes.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-10 text-center">
                      <div className="text-slate-400 font-bold italic text-lg">No hay paquetes pendientes. ¡Portería al día! ✨</div>
                    </td>
                  </tr>
                ) : (
                  paquetesPendientes.map(paquete => (
                    <tr key={paquete.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-black text-indigo-700 text-lg">Apto {paquete.inmueble}</td>
                      <td className="p-4">
                        <span className="bg-slate-200 text-slate-700 px-3 py-1 rounded-lg text-xs font-bold">{paquete.tipo_registro}</span>
                      </td>
                      <td className="p-4">
                        <span className="block font-bold text-slate-800">{paquete.nombre_visitante_o_empresa}</span>
                        <span className="text-xs text-slate-500 block">Guía: {paquete.cedula_o_guia || 'N/A'}</span>
                      </td>
                      <td className="p-4 text-xs text-slate-600 font-medium">
                        {paquete.fecha_ingreso ? new Date(paquete.fecha_ingreso).toLocaleString() : 'Sin fecha'}
                      </td>
                      <td className="p-4 text-center">
                        <button 
                          onClick={() => setPaqueteDetalle(paquete)} 
                          className="bg-indigo-100 text-indigo-700 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-200 transition-colors shadow-sm w-full md:w-auto"
                        >
                          👁️ Ver Detalle
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 🔥 PESTAÑA 3: HISTORIAL DE ENTREGAS (AHORA EN TABLA) 🔥 */}
      {pestana === 'historial' && (
        <div className="bg-white p-6 rounded-2xl shadow-xl animate-in fade-in">
          <div className="flex justify-between items-center mb-6 border-b pb-4">
             <h2 className="text-xl font-black text-slate-800">✅ Historial de Entregados</h2>
             <button onClick={cargarPaquetesEntregados} className="text-indigo-600 font-bold hover:underline">🔄 Refrescar</button>
          </div>
          
          <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
            <table className="w-full text-left bg-white text-sm">
              <thead className="bg-slate-800 text-white">
                <tr>
                  <th className="p-4 font-bold">Inmueble</th>
                  <th className="p-4 font-bold">Tipo</th>
                  <th className="p-4 font-bold">Destinatario / Remitente</th>
                  <th className="p-4 font-bold">Fecha de Entrega</th>
                  <th className="p-4 font-bold text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y border-slate-100">
                {paquetesEntregados.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-10 text-center">
                      <div className="text-slate-400 font-bold italic text-lg">Aún no hay registro de entregas.</div>
                    </td>
                  </tr>
                ) : (
                  paquetesEntregados.map(paquete => (
                    <tr key={paquete.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-black text-indigo-700 text-lg">Apto {paquete.inmueble}</td>
                      <td className="p-4">
                        <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-lg text-xs font-bold">{paquete.tipo_registro}</span>
                      </td>
                      <td className="p-4">
                        <span className="block font-bold text-slate-800">{paquete.nombre_visitante_o_empresa}</span>
                        <span className="text-xs text-slate-500 block">Guía: {paquete.cedula_o_guia || 'N/A'}</span>
                      </td>
                      <td className="p-4 text-xs text-slate-600 font-medium">
                        {paquete.fecha_entrega ? new Date(paquete.fecha_entrega).toLocaleString() : 'N/A'}
                      </td>
                      <td className="p-4 text-center">
                        <button 
                          onClick={() => setPaqueteDetalle(paquete)} 
                          className="bg-indigo-100 text-indigo-700 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-200 transition-colors shadow-sm w-full md:w-auto"
                        >
                          👁️ Ver Fotos
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 🔥 NUEVO MODAL: "VER DETALLE" (Para Pendientes e Historial) 🔥 */}
      {/* ============================================================== */}
      {paqueteDetalle && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 relative flex flex-col">
            
            {/* Botón de cerrar Modal */}
            <button 
              onClick={() => setPaqueteDetalle(null)} 
              className="absolute top-3 right-3 bg-black/50 text-white w-8 h-8 flex items-center justify-center rounded-full z-10 hover:bg-black/80 transition-colors font-black"
            >
              X
            </button>
            
            {/* SI ESTÁ PENDIENTE (Muestra 1 foto y el botón verde de entregar) */}
            {paqueteDetalle.estado !== 'Entregado' ? (
              <>
                <div className="h-56 bg-slate-100 relative">
                  {paqueteDetalle.foto_url ? (
                    <img src={paqueteDetalle.foto_url} alt="Paquete" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl">📦</div>
                  )}
                </div>
                <div className="p-6 flex flex-col">
                  <div className="flex justify-between items-start mb-3">
                    <span className="bg-amber-100 text-amber-800 text-xs font-black uppercase px-3 py-1 rounded-lg">Apto {paqueteDetalle.inmueble}</span>
                    <span className="text-xs text-slate-400 font-bold">{paqueteDetalle.fecha_ingreso ? new Date(paqueteDetalle.fecha_ingreso).toLocaleDateString() : 'Sin fecha'}</span>
                  </div>
                  <h3 className="font-black text-slate-800 text-2xl">{paqueteDetalle.nombre_visitante_o_empresa}</h3>
                  <p className="text-sm text-slate-500 mb-3">Guía: <span className="font-bold text-slate-700">{paqueteDetalle.cedula_o_guia || 'N/A'}</span></p>
                  
                  {paqueteDetalle.observaciones && (
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 mb-4">
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Observaciones</p>
                      <p className="text-sm text-slate-700">{paqueteDetalle.observaciones}</p>
                    </div>
                  )}
                  
                  {/* Este botón abre el modal de la cámara y cierra el modal de detalle */}
                  <button 
                    onClick={() => { setPaqueteAEntregar(paqueteDetalle); setPaqueteDetalle(null); }} 
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black text-lg py-4 mt-2 rounded-xl transition shadow-lg"
                  >
                    📸 Tomar Foto y Entregar
                  </button>
                </div>
              </>
            ) : (
              // SI ESTÁ ENTREGADO (Muestra las 2 fotos comparativas)
              <>
                <div className="h-48 flex relative bg-slate-200">
                  <div className="w-1/2 h-full border-r border-slate-300 relative">
                    {paqueteDetalle.foto_url ? <img src={paqueteDetalle.foto_url} alt="Llegada" className="w-full h-full object-cover grayscale" /> : <span className="flex h-full items-center justify-center text-xs text-slate-400">Sin foto</span>}
                    <span className="absolute bottom-2 left-2 bg-black/70 text-white text-xs font-bold px-2 py-1 rounded">Llegada</span>
                  </div>
                  <div className="w-1/2 h-full relative">
                    {paqueteDetalle.foto_entrega ? <img src={paqueteDetalle.foto_entrega} alt="Entrega" className="w-full h-full object-cover" /> : <span className="flex h-full items-center justify-center text-xs text-slate-400">Sin foto</span>}
                    <span className="absolute bottom-2 left-2 bg-emerald-500/90 text-white text-xs font-bold px-2 py-1 rounded">Quien Recibió</span>
                  </div>
                </div>
                <div className="p-6 flex flex-col">
                  <div className="flex justify-between items-start mb-3">
                    <span className="bg-indigo-100 text-indigo-800 text-xs font-black uppercase px-3 py-1 rounded-lg">Apto {paqueteDetalle.inmueble}</span>
                    <span className="text-xs text-emerald-600 font-bold">Entregado: {paqueteDetalle.fecha_entrega ? new Date(paqueteDetalle.fecha_entrega).toLocaleDateString() : 'N/A'}</span>
                  </div>
                  <h3 className="font-black text-slate-800 text-2xl">{paqueteDetalle.nombre_visitante_o_empresa}</h3>
                  <p className="text-sm text-slate-500 mb-3">Guía: <span className="font-bold text-slate-700">{paqueteDetalle.cedula_o_guia || 'N/A'}</span></p>
                  
                  {paqueteDetalle.observaciones && (
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Observaciones</p>
                      <p className="text-sm text-slate-700">{paqueteDetalle.observaciones}</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 🔥 MODAL DE CÁMARA PARA CONFIRMAR LA ENTREGA 🔥              */}
      {/* ============================================================== */}
      {paqueteAEntregar && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-6 bg-emerald-500 text-white text-center">
              <h2 className="text-2xl font-black">Entrega Apto {paqueteAEntregar.inmueble}</h2>
              <p className="text-emerald-100 text-sm">Evidencia de quién recibe el paquete</p>
            </div>
            <div className="p-6 flex flex-col items-center">
              <div className="w-full aspect-video bg-black rounded-xl overflow-hidden border-4 border-slate-200 relative mb-4">
                {!fotoEntrega ? (
                  <Webcam audio={false} ref={webcamEntregaRef} screenshotFormat="image/jpeg" videoConstraints={{ facingMode: modoCamaraEntrega }} className="w-full h-full object-cover" />
                ) : (
                  <img src={fotoEntrega} alt="Evidencia Entrega" className="w-full h-full object-cover" />
                )}
              </div>
              <div className="flex gap-3 w-full mb-6">
                {!fotoEntrega ? (
                  <>
                    <button onClick={capturarFotoEntrega} className="flex-1 bg-slate-800 text-white font-bold py-3 rounded-xl hover:bg-slate-700">📸 Tomar Foto</button>
                    <button onClick={() => setModoCamaraEntrega(modoCamaraEntrega === "environment" ? "user" : "environment")} className="bg-slate-200 text-slate-700 font-bold px-4 rounded-xl hover:bg-slate-300">🔄</button>
                  </>
                ) : (
                  <button onClick={() => setFotoEntrega(null)} className="flex-1 bg-amber-500 text-white font-bold py-3 rounded-xl hover:bg-amber-600">Volver a tomar</button>
                )}
              </div>
              <div className="flex gap-3 w-full border-t border-slate-100 pt-6">
                <button 
                  onClick={() => { setPaqueteAEntregar(null); setFotoEntrega(null); }} 
                  disabled={cargandoEntrega}
                  className="flex-1 text-slate-500 font-bold py-3 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmarEntrega}
                  disabled={cargandoEntrega || !fotoEntrega}
                  className={`flex-1 font-bold py-3 rounded-xl transition shadow-lg ${(!fotoEntrega || cargandoEntrega) ? 'bg-slate-300 text-slate-500' : 'bg-emerald-500 hover:bg-emerald-600 text-white'}`}
                >
                  {cargandoEntrega ? 'Guardando...' : '✅ Entregar Paquete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}