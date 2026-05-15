import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import Swal from 'sweetalert2';

// ✅ RECIBIMOS LOS PERMISOS DEL PAPÁ (CrmAdmin)
export default function ConfiguracionAdmin({ permisos }) {
  const [cargando, setCargando] = useState(true);
  const [config, setConfig] = useState({
    titulo_hero: '',
    desc_hero: '',
    tel_admin: '',
    tel_porteria: '',
    tel_policia: '',
    codigo_staff: 'STAFF',
    portal_hero_imagen: '',
    portal_boton_texto: '',
    portal_color_principal: '#312e81',
    portal_color_secundario: '#f97316',
    portal_nombre: '',
    correo_contacto: '',
    titulo_cartelera: '',
    desc_cartelera: '',
    titulo_inmuebles: '',
    desc_inmuebles: '',
    desc_zonas: '',
    desc_documentos: ''
  });

  const [copropiedadId, setCopropiedadId] = useState(null);
  const [imagenFondo, setImagenFondo] = useState(null); 
  const [imagenABorrar, setImagenABorrar] = useState(null);

  useEffect(() => {
    cargarConfiguracion();
  }, []);

  const cargarConfiguracion = async () => {
    try {
      const currentCopropiedadId = sessionStorage.getItem('copropiedad_id');
      if (!currentCopropiedadId) throw new Error("No hay copropiedad_id en sesión");
      
      setCopropiedadId(currentCopropiedadId);

      // Buscamos ÚNICAMENTE la configuración visual (Los permisos ya llegaron por props)
      const { data, error } = await supabase
        .from('configuracion')
        .select('*')
        .eq('copropiedad_id', currentCopropiedadId)
        .maybeSingle(); 
      
      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setConfig({
          titulo_hero: data.titulo_hero || '',
          desc_hero: data.desc_hero || '',
          tel_admin: data.tel_admin || '',
          tel_porteria: data.tel_porteria || '',
          tel_policia: data.tel_policia || '',
          codigo_staff: data.codigo_staff || 'STAFF',
          portal_hero_imagen: data.portal_hero_imagen || '',
          portal_boton_texto: data.portal_boton_texto || 'Ver Catálogo',
          portal_color_principal: data.portal_color_principal || '#312e81',
          portal_color_secundario: data.portal_color_secundario || '#f97316',
          portal_nombre: data.portal_nombre || '',
          correo_contacto: data.correo_contacto || '',
          titulo_cartelera: data.titulo_cartelera || '',
          desc_cartelera: data.desc_cartelera || '',
          titulo_inmuebles: data.titulo_inmuebles || '',
          desc_inmuebles: data.desc_inmuebles || '',
          desc_zonas: data.desc_zonas || '',
          desc_documentos: data.desc_documentos || ''
        });
      }
    } catch (e) {
      console.error("Error cargando configuración:", e);
    } finally {
      setCargando(false);
    }
  };

  const guardarConfiguracion = async () => {
    if (!config.titulo_hero) {
      return Swal.fire({ icon: 'warning', title: 'Atención', text: 'El título principal es obligatorio.', confirmButtonColor: '#2563eb' });
    }
    if (!copropiedadId) {
      return Swal.fire('Error', 'No se ha detectado el ID del conjunto.', 'error');
    }

    setCargando(true);
    try {
      let urlFinalImagen = config.portal_hero_imagen;
      const extraerRuta = (url) => url ? url.split('/portales/')[1] : null;

      if (imagenABorrar) {
        const rutaVieja = extraerRuta(imagenABorrar);
        if (rutaVieja) await supabase.storage.from('portales').remove([rutaVieja]);
      }

      if (imagenFondo) {
        if (config.portal_hero_imagen && !imagenABorrar) {
          const rutaActual = extraerRuta(config.portal_hero_imagen);
          if (rutaActual) await supabase.storage.from('portales').remove([rutaActual]);
        }

        const fileExt = imagenFondo.name.split('.').pop();
        const fileName = `hero_${copropiedadId}_${Date.now()}.${fileExt}`;
        const filePath = `${copropiedadId}/${fileName}`; 

        const { error: uploadError } = await supabase.storage.from('portales').upload(filePath, imagenFondo);
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('portales').getPublicUrl(filePath);
        urlFinalImagen = publicUrl;
      }

      const payload = {
        copropiedad_id: copropiedadId,
        ...config,
        portal_hero_imagen: urlFinalImagen 
      };

      const { error } = await supabase.from('configuracion').upsert(payload, { onConflict: 'copropiedad_id' });
      if (error) throw error;

      setImagenFondo(null);
      setImagenABorrar(null);
      setConfig({ ...config, portal_hero_imagen: urlFinalImagen });

      Swal.fire({ icon: 'success', title: '¡Guardado!', text: 'La configuración ha sido actualizada exitosamente.', timer: 2000, showConfirmButton: false });
    } catch (e) {
      console.error("Error en Upsert/Upload:", e);
      Swal.fire('Error', 'Hubo un problema al procesar los archivos o guardar.', 'error');
    } finally {
      setCargando(false);
    }
  };

  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-slate-400">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-black uppercase tracking-widest text-xs">Sincronizando Ajustes...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-700 pb-20">
      
      {/* HEADER DE SECCIÓN */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-200 pb-8">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Personalización <span className="text-blue-600">Global</span></h2>
          <p className="text-slate-500 font-medium">Configura la identidad visual y el directorio de emergencia del portal.</p>
        </div>
        <button 
          onClick={guardarConfiguracion}
          className="bg-slate-900 hover:bg-blue-600 text-white font-black py-4 px-10 rounded-2xl transition-all shadow-xl shadow-slate-200 uppercase tracking-widest text-xs transform hover:-translate-y-1"
        >
          Guardar Cambios
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* COLUMNA IZQUIERDA */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* BENTO 1: IDENTIDAD DEL PORTAL */}
          <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50">
            <h4 className="font-black text-slate-800 text-xl mb-8 flex items-center">
              <span className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mr-4 shadow-inner">1</span>
              Identidad del Portal
            </h4>
            
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Nombre del Conjunto (Barra Superior)</label>
                <input 
                  type="text" 
                  value={config.portal_nombre} 
                  onChange={e => setConfig({...config, portal_nombre: e.target.value})} 
                  className="w-full p-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-black text-slate-800 text-lg"
                  placeholder="Ej: Torres de San Juan"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Título Principal (Hero)</label>
                <input 
                  type="text" 
                  value={config.titulo_hero} 
                  onChange={e => setConfig({...config, titulo_hero: e.target.value})} 
                  className="w-full p-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-slate-800 text-lg"
                  placeholder="Ej: Encuentra tu hogar ideal"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Frase Descriptiva / Eslogan</label>
                <textarea 
                  value={config.desc_hero} 
                  onChange={e => setConfig({...config, desc_hero: e.target.value})} 
                  rows="3" 
                  className="w-full p-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-slate-600 resize-none leading-relaxed"
                  placeholder="Escribe un mensaje de bienvenida para los residentes..."
                ></textarea>
              </div>

              {/* APARIENCIA DEL PORTAL */}
              <div className="pt-6 border-t border-slate-100 space-y-6">
                <h5 className="font-bold text-slate-700 text-sm">Apariencia del Portal</h5>
                
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Imagen de Fondo (Hero)</label>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={e => {
                      if(e.target.files && e.target.files[0]) {
                        setImagenFondo(e.target.files[0]);
                      }
                    }} 
                    className="w-full p-2 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 transition-all text-sm file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer text-slate-500"
                  />
                  {(imagenFondo || config.portal_hero_imagen) && (
                    <div className="mt-4 relative h-40 w-full rounded-2xl overflow-hidden border-2 border-slate-200 group shadow-inner">
                      <img 
                        src={imagenFondo ? URL.createObjectURL(imagenFondo) : config.portal_hero_imagen} 
                        alt="Preview Hero" 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                      />
                      <button 
                        onClick={() => {
                          if (config.portal_hero_imagen) setImagenABorrar(config.portal_hero_imagen); 
                          setImagenFondo(null);
                          setConfig({ ...config, portal_hero_imagen: '' });
                        }}
                        className="absolute top-3 right-3 bg-red-500/90 hover:bg-red-600 text-white w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all shadow-lg transform hover:scale-110"
                        title="Eliminar imagen"
                      >✕</button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Texto del Botón</label>
                     <input type="text" value={config.portal_boton_texto} onChange={e => setConfig({...config, portal_boton_texto: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-slate-700 text-sm" placeholder="Ej: Ver Catálogo" />
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Color Fondo</label>
                      <input type="color" value={config.portal_color_principal} onChange={e => setConfig({...config, portal_color_principal: e.target.value})} className="w-full h-12 p-1 bg-white border border-slate-200 rounded-xl cursor-pointer" />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Color Botón</label>
                      <input type="color" value={config.portal_color_secundario} onChange={e => setConfig({...config, portal_color_secundario: e.target.value})} className="w-full h-12 p-1 bg-white border border-slate-200 rounded-xl cursor-pointer" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div> 
          
          {/* BENTO 2: TEXTOS DE LAS SECCIONES PÚBLICAS */}
          <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50">
            <h4 className="font-black text-slate-800 text-xl mb-8 flex items-center">
              <span className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mr-4 shadow-inner">T</span>
              Textos de Secciones
            </h4>
            
            <div className="space-y-6">
              {/* LA CARTELERA SIEMPRE SE MUESTRA */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Título Cartelera</label>
                   <input type="text" value={config.titulo_cartelera} onChange={e => setConfig({...config, titulo_cartelera: e.target.value})} className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm" placeholder="Cartelera Digital" />
                </div>
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Subtítulo Cartelera</label>
                   <input type="text" value={config.desc_cartelera} onChange={e => setConfig({...config, desc_cartelera: e.target.value})} className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm" placeholder="Mantente informado..." />
                </div>
              </div>

              {/* SÓLO SE MUESTRA SI TIENE EL MÓDULO DE INMUEBLES PRENDIDO */}
              {permisos?.mercado && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div>
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Título Inmuebles</label>
                     <input type="text" value={config.titulo_inmuebles} onChange={e => setConfig({...config, titulo_inmuebles: e.target.value})} className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm" placeholder="Inmuebles Destacados" />
                  </div>
                  <div>
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Subtítulo Inmuebles</label>
                     <input type="text" value={config.desc_inmuebles} onChange={e => setConfig({...config, desc_inmuebles: e.target.value})} className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm" placeholder="Explora oportunidades..." />
                  </div>
                </div>
              )}

              {/* SÓLO SE MUESTRA SI TIENE RESERVAS/ZONAS O DOCUMENTOS PRENDIDOS */}
              {(permisos?.reservas || permisos?.zonas || permisos?.documentos) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  {(permisos?.reservas || permisos?.zonas) && (
                    <div>
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Regla Básica: Zonas Comunes</label>
                       <input type="text" value={config.desc_zonas} onChange={e => setConfig({...config, desc_zonas: e.target.value})} className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm" placeholder="Ej: Recuerda dejar el espacio limpio." />
                    </div>
                  )}
                  {permisos?.documentos && (
                    <div>
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Regla Básica: Documentos</label>
                       <input type="text" value={config.desc_documentos} onChange={e => setConfig({...config, desc_documentos: e.target.value})} className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm" placeholder="Ej: Manual de convivencia." />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* BENTO 3: REGLA DE ESCALAMIENTO (DOBLE CANDADO) */}
          {permisos?.escalar && (
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-8 md:p-10 rounded-[2.5rem] shadow-xl shadow-orange-200/50 text-white relative overflow-hidden group">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000"></div>
              <h4 className="font-black text-xl mb-4 flex items-center relative z-10">
                <span className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center mr-4 backdrop-blur-md">3</span>
                Regla de STAFF
              </h4>
              <p className="text-orange-100 text-sm mb-8 leading-relaxed font-medium relative z-10">
                Define la palabra clave para identificar al personal administrativo en el sistema de tickets.
              </p>
              <div className="relative z-10">
                <label className="text-[10px] font-black text-orange-200 uppercase tracking-widest mb-2 block ml-1">Identificador de Inmueble</label>
                <input type="text" value={config.codigo_staff} onChange={e => setConfig({...config, codigo_staff: e.target.value.toUpperCase()})} className="w-full p-5 bg-white/10 border border-white/20 rounded-2xl outline-none focus:bg-white/20 transition-all font-black text-white text-center tracking-widest placeholder-white/30 uppercase" placeholder="Ej: ADMIN o CONSEJO" />
              </div>
            </div>
          )}        
        </div>
        
        {/* COLUMNA DERECHA: DIRECTORIO */}
        <div className="lg:col-span-5">
          <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 h-full">
            <h4 className="font-black text-slate-800 text-xl mb-8 flex items-center">
              <span className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mr-4 shadow-inner">4</span>
              Líneas de Atención
            </h4>
            <div className="space-y-8">
              <div className="p-6 bg-emerald-50/50 rounded-3xl border border-emerald-100/50">
                <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-3 block">WhatsApp Administración</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-emerald-400">+57</span>
                  <input type="number" value={config.tel_admin} onChange={e => setConfig({...config, tel_admin: e.target.value})} className="w-full pl-14 p-4 bg-white border border-emerald-100 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-bold text-slate-800" placeholder="300 000 0000" />
                </div>
              </div>
              <div className="p-6 bg-blue-50/50 rounded-3xl border border-blue-100/50">
                <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3 block">Correo Electrónico Oficial</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300">✉️</span>
                  <input type="email" value={config.correo_contacto} onChange={e => setConfig({...config, correo_contacto: e.target.value})} className="w-full pl-12 p-4 bg-white border border-blue-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-bold text-slate-800" placeholder="administracion@conjunto.com" />
                </div>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Teléfono Portería</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">📞</span>
                    <input type="number" value={config.tel_porteria} onChange={e => setConfig({...config, tel_porteria: e.target.value})} className="w-full pl-12 p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-bold text-slate-800" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Cuadrante Policía</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">🚔</span>
                    <input type="number" value={config.tel_policia} onChange={e => setConfig({...config, tel_policia: e.target.value})} className="w-full pl-12 p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-bold text-slate-800" />
                  </div>
                </div>
              </div>
              <div className="pt-6 border-t border-slate-50">
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-xl shadow-sm">💡</div>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                    Estos números aparecerán en el directorio público del portal para acceso rápido de los residentes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}