import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabase';

export default function PortalComunitario() {
  const [cargando, setCargando] = useState(true);
  const [config, setConfig] = useState(null);
  const [copropiedadId, setCopropiedadId] = useState(null);
  const [permisos, setPermisos] = useState({});
  
  // Estados de datos
  const [noticias, setNoticias] = useState([]);
  const [zonas, setZonas] = useState([]);
  const [documentos, setDocumentos] = useState([]);
  const [formularios, setFormularios] = useState([]);
  const [inmueblesFull, setInmueblesFull] = useState([]); 
  const [filtroInmuebles, setFiltroInmuebles] = useState(''); 
  const [manualZonaSeleccionada, setManualZonaSeleccionada] = useState(null);
  
  // Modales y Estados de Interacción
  const [noticiaSeleccionada, setNoticiaSeleccionada] = useState(null);
  const [inmuebleSeleccionado, setInmuebleSeleccionado] = useState(null);
  const [documentoSeleccionado, setDocumentoSeleccionado] = useState(null);
  const [fotoIndex, setFotoIndex] = useState(0); 
  
  const [modalCatalogoAbierto, setModalCatalogoAbierto] = useState(false);

  // 🚨 NUEVOS ESTADOS PARA FAQ INTELIGENTE
  const [faq, setFaq] = useState([]);
  const [busquedaFaq, setBusquedaFaq] = useState('');
  const [faqAbierta, setFaqAbierta] = useState(null); 
  const [categoriaActiva, setCategoriaActiva] = useState('Todas');
  

  useEffect(() => {
    inicializarPortal();
  }, []);

  const inicializarPortal = async () => {
    setCargando(true);
    try {
      const dominioActual = window.location.hostname;
      
      const { data: cliente, error: errorCliente } = await supabase
        .from('clientes_saas')
        .select('*')
        .eq('dominio', dominioActual)
        .maybeSingle();

      if (errorCliente && errorCliente.code !== 'PGRST116') throw errorCliente;

      if (cliente) {
        setCopropiedadId(cliente.copropiedad_id);
        const misPermisos = {
          zonas: cliente.mod_zonas,
          reservas: cliente.mod_reservas,
          mercado: cliente.mod_mercado,
          documentos: cliente.mod_documentos !== false,
          formularios: cliente.mod_formularios !== false,
          fqr: cliente.mod_fqr 
        };
        setPermisos(misPermisos);

        // Cargar Preguntas Frecuentes
        const { data: faqs } = await supabase
          .from('preguntas_frecuentes')
          .select('*')
          .eq('copropiedad_id', cliente.copropiedad_id);
        setFaq(faqs || []);

        const { data: conf } = await supabase.from('configuracion').select('*').eq('copropiedad_id', cliente.copropiedad_id).maybeSingle(); 
        setConfig(conf || {});

        const { data: notis } = await supabase.from('noticias').select('*').eq('copropiedad_id', cliente.copropiedad_id).order('fecha', { ascending: false }).limit(6);
        setNoticias(notis || []);

        if (misPermisos.reservas || misPermisos.zonas) {
          const { data: zs } = await supabase.from('zonas_comunes').select('*').eq('copropiedad_id', cliente.copropiedad_id);
          setZonas(zs || []);
        }

        if (misPermisos.documentos) {
          const { data: docs } = await supabase.from('documentos').select('*').eq('copropiedad_id', cliente.copropiedad_id).order('created_at', { ascending: false });
          setDocumentos(docs || []);
        }

        if (misPermisos.formularios) {
          const { data: forms } = await supabase.from('formularios_externos').select('*').eq('copropiedad_id', cliente.copropiedad_id).eq('activo', true);
          setFormularios(forms || []);
        }

        if (misPermisos.mercado) {
          const { data: inms } = await supabase.from('inmuebles').select('*').eq('copropiedad_id', cliente.copropiedad_id);
          setInmueblesFull(inms || []);
        }
      }
    } catch (e) { 
      console.error("Error en inicialización:", e); 
    } finally { 
      setCargando(false); 
    }
  };

  const inmueblesFiltrados = inmueblesFull.filter(i => 
    i.titulo.toLowerCase().includes(filtroInmuebles.toLowerCase()) ||
    i.tipo_oferta.toLowerCase().includes(filtroInmuebles.toLowerCase()) ||
    i.descripcion.toLowerCase().includes(filtroInmuebles.toLowerCase()) ||
    (i.precio && i.precio.toString().includes(filtroInmuebles))
  );

  // 🚨 LÓGICA INTELIGENTE PARA FAQ
  const categoriasFaq = useMemo(() => {
    const cats = faq.map(f => f.categoria || 'General');
    return ['Todas', ...new Set(cats)];
  }, [faq]);

  const faqFiltrado = useMemo(() => {
    return faq.filter(f => {
      const pasaBusqueda = f.pregunta.toLowerCase().includes(busquedaFaq.toLowerCase()) || f.respuesta.toLowerCase().includes(busquedaFaq.toLowerCase());
      const pasaCategoria = categoriaActiva === 'Todas' || f.categoria === categoriaActiva;
      return pasaBusqueda && pasaCategoria;
    });
  }, [faq, busquedaFaq, categoriaActiva]);


  const abrirModalInmueble = (inm) => {
    setInmuebleSeleccionado(inm);
    setFotoIndex(0);
  };

  const nextFoto = () => {
    if (inmuebleSeleccionado?.imagenes) {
      setFotoIndex((prev) => (prev + 1) % inmuebleSeleccionado.imagenes.length);
    }
  };

  const prevFoto = () => {
    if (inmuebleSeleccionado?.imagenes) {
      setFotoIndex((prev) => (prev === 0 ? inmuebleSeleccionado.imagenes.length - 1 : prev - 1));
    }
  };

  if (cargando) return <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-indigo-900"><div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>Cargando portal...</div>;

  if (!copropiedadId && !cargando) {
      return (
          <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-800 p-8 text-center">
              <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-4xl mb-6">🏢</div>
              <h1 className="text-3xl font-bold mb-4">Portal no configurado</h1>
              <p className="text-slate-500 max-w-md">El dominio actual ({window.location.hostname}) no está asociado a ninguna copropiedad.</p>
              <Link to="/login" className="mt-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded transition-all">Ir al Login</Link>
          </div>
      );
  }

  return (
    <div className="bg-slate-50 text-slate-800 min-h-screen font-sans selection:bg-orange-500 selection:text-white">
      
      {/* NAVBAR */}
      <nav className="absolute top-0 left-0 w-full z-50 px-6 py-6 border-b border-white/10">
        <div className="container mx-auto flex justify-between items-center">
          <div className="text-2xl font-black text-white tracking-tight drop-shadow-md">
            {config?.portal_nombre ? (
              <span>{config.portal_nombre}</span>
            ) : (
              <>Lumen<span style={{ color: config?.portal_color_secundario || '#f97316' }}>Group</span></>
            )}
          </div>
          <Link to="/login" className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold py-2.5 px-6 rounded backdrop-blur-sm transition-all border border-white/20 uppercase tracking-widest">
            Login
          </Link>
        </div>
      </nav>

      {/* HERO SECTION UX STYLE */}
      <header 
        className="relative w-full min-h-[600px] flex items-center overflow-hidden"
        style={{ backgroundColor: config?.portal_color_principal || '#312e81' }} 
      >
        <img 
          src={config?.portal_hero_imagen || "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070"} 
          className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-overlay" 
          alt="Hero Background" 
        />
        
        <div className="container mx-auto px-6 relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12 pt-24 pb-12">
          {/* Lado Izquierdo: Textos y CTA */}
          <div className="lg:w-1/2 text-white text-center lg:text-left">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 leading-tight uppercase">
              {config?.titulo_hero || "ENCUENTRA TU HOGAR IDEAL"}
            </h1>
            <p className="text-lg md:text-xl mb-10 opacity-90 max-w-lg mx-auto lg:mx-0 font-light">
              {config?.desc_hero || 'Gestión inteligente y transparente para copropiedades modernas. Conectando residentes y oportunidades.'}
            </p>
            <button 
              onClick={() => setModalCatalogoAbierto(true)} 
              className="text-white font-bold py-4 px-10 rounded text-sm uppercase tracking-widest transition-colors shadow-lg hover:brightness-110"
              style={{ backgroundColor: config?.portal_color_secundario || '#f97316' }}
            >
              {config?.portal_boton_texto || 'Ver Catálogo'}
            </button>
          </div>

          {/* Lado Derecho: Caja de Contacto Flotante */}
          <div className="lg:w-1/3 w-full max-w-sm">
            <div className="bg-black/30 backdrop-blur-xl border border-white/10 p-8 rounded-lg text-white shadow-2xl">
              <h3 className="font-bold text-xl mb-5 border-b border-white/20 pb-4">Directorio de Emergencia</h3>
              
              <div className="space-y-4 mb-8">
                
                {/* 🏢 Administración */}
                <div>
                  <p className="text-sm font-bold flex items-center gap-2 mb-1">
                    <span style={{ color: config?.portal_color_secundario || '#f97316' }}>🏢</span> Administración
                  </p>
                  <p className="text-sm flex items-center gap-3 opacity-80 pl-6">📞 {config?.tel_admin || '+57 (000) 000-0000'}</p>
                  {config?.correo_contacto && (
                    <p className="text-[11px] flex items-center gap-3 opacity-80 pl-6 mt-1 tracking-wider">✉️ {config.correo_contacto}</p>
                  )}
                </div>

                {/* 🛡️ Portería (Se oculta si el admin no lo ha llenado) */}
                {config?.tel_porteria && (
                  <div className="pt-3 border-t border-white/10">
                    <p className="text-sm font-bold flex items-center gap-2 mb-1">
                      <span style={{ color: config?.portal_color_secundario || '#f97316' }}>🛡️</span> Portería 24/7
                    </p>
                    <p className="text-sm flex items-center gap-3 opacity-80 pl-6">📞 {config.tel_porteria}</p>
                  </div>
                )}

                {/* 🚔 Cuadrante de Policía (Se oculta si el admin no lo ha llenado) */}
                {config?.tel_policia && (
                  <div className="pt-3 border-t border-white/10">
                    <p className="text-sm font-bold flex items-center gap-2 mb-1">
                      <span style={{ color: config?.portal_color_secundario || '#f97316' }}>🚔</span> Cuadrante Policía
                    </p>
                    <p className="text-sm flex items-center gap-3 opacity-80 pl-6">📞 {config.tel_policia}</p>
                  </div>
                )}

              </div>

              <Link to="/login" className="block text-center w-full bg-white text-slate-900 hover:bg-slate-100 font-bold py-3.5 rounded text-xs uppercase tracking-widest transition-colors shadow-lg">
                Portal de Residentes
              </Link>
            </div>
          </div>
          
        </div>
      </header>

      {/* SECCIÓN: CARTELERA */}
      <section className="py-24 bg-slate-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">Cartelera Digital</h2>
            <p className="text-slate-500 max-w-2xl mx-auto">Mantente informado sobre los últimos acontecimientos, mantenimientos y avisos de tu comunidad.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {noticias.length === 0 ? <p className="text-slate-500 col-span-full text-center">No hay avisos recientes.</p> : noticias.map((noti) => {
              let borderColor = 'border-indigo-600'; let iconBg = 'bg-indigo-100 text-indigo-600';
              if (noti.tipo === 'Urgente') { borderColor = 'border-red-500'; iconBg = 'bg-red-100 text-red-500'; }
              if (noti.tipo === 'Alerta') { borderColor = 'border-orange-500'; iconBg = 'bg-orange-100 text-orange-500'; }

              return (
                <div key={noti.id} onClick={() => setNoticiaSeleccionada(noti)} className={`bg-white rounded shadow-md hover:shadow-xl border-t-4 ${borderColor} p-8 flex flex-col items-center text-center cursor-pointer transition-all hover:-translate-y-1`}>
                  <div className={`w-16 h-16 rounded-full ${iconBg} flex items-center justify-center text-2xl mb-6`}>
                    {noti.tipo === 'Urgente' ? '🚨' : noti.tipo === 'Alerta' ? '⚠️' : '📢'}
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">{noti.fecha ? new Date(noti.fecha).toLocaleDateString() : 'Aviso'}</span>
                  <h3 className="text-lg font-bold text-slate-800 mb-4 leading-snug">{noti.titulo}</h3>
                  <p className="text-sm text-slate-500 line-clamp-3 mb-6">{noti.resumen}</p>
                  <button className="mt-auto bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded text-xs font-bold uppercase tracking-widest transition-colors">Leer Más</button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

 

      {/* SECCIÓN: INMUEBLES RECIENTES */}
      {permisos.mercado && (
        <section className="py-24 bg-white">
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">Inmuebles Destacados</h2>
              <p className="text-slate-500 max-w-2xl mx-auto mb-8">Explora las mejores oportunidades de vivienda y comercio dentro de nuestra copropiedad.</p>
              
              <div className="max-w-xl mx-auto flex">
                <input type="text" placeholder="Buscar por torre, precio o tipo..." value={filtroInmuebles} onChange={(e) => setFiltroInmuebles(e.target.value)} className="flex-1 bg-slate-100 border border-slate-200 rounded-l px-6 py-3 outline-none focus:border-indigo-500 text-sm" />
                <button onClick={() => setModalCatalogoAbierto(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-r text-xs font-bold uppercase tracking-widest transition-colors">Buscar</button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {inmueblesFull.filter(i => i.destacado).slice(0, 4).map(inm => (
                <InmuebleCardUX key={inm.id} inm={inm} onClick={() => abrirModalInmueble(inm)} />
              ))}
            </div>
            
            <div className="mt-16 text-center">
               <button onClick={() => setModalCatalogoAbierto(true)} className="text-indigo-600 hover:text-indigo-800 font-bold uppercase tracking-widest text-sm underline underline-offset-4">Ver Todos Los Inmuebles</button>
            </div>
          </div>
        </section>
      )}

      {/* ==========================================
          SECCIÓN: ZONAS Y DOCUMENTOS
      ========================================== */}
      <section className="py-24 bg-slate-50 border-t border-slate-200">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16">
            
            {/* COLUMNA 1: MANUALES DE ZONAS */}
            {permisos.zonas && (
              <div>
                <h2 className="text-2xl font-bold text-slate-800 mb-8 border-l-4 border-orange-500 pl-4">Manuales de Zonas Comunes</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {zonas.length === 0 ? <p className="text-slate-500 text-sm col-span-full">No hay zonas configuradas.</p> : zonas.map(z => (
                    <button 
                      key={z.id} 
                      onClick={() => z.manual_url ? setManualZonaSeleccionada(z) : null}
                      className={`p-6 rounded-xl shadow-sm border text-center transition-all flex flex-col items-center justify-center gap-3 ${z.manual_url ? 'bg-white border-slate-100 hover:border-orange-500 hover:shadow-md cursor-pointer group' : 'bg-slate-50 border-slate-100 opacity-60 cursor-not-allowed'}`}
                    >
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${z.manual_url ? 'bg-orange-50 text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-colors' : 'bg-slate-200 grayscale'}`}>
                        🏞️
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-700 text-sm">{z.nombre}</h4>
                        {z.manual_url ? <span className="text-[9px] font-black uppercase text-orange-500 tracking-widest mt-1">Ver Manual</span> : <span className="text-[9px] font-bold uppercase text-slate-400 mt-1">Sin Manual</span>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* COLUMNA 2: DOCUMENTOS OFICIALES */}
            {permisos.documentos && (
              <div>
                <h2 className="text-2xl font-bold text-slate-800 mb-8 border-l-4 border-indigo-600 pl-4">Documentos Oficiales</h2>
                <div className="space-y-4">
                  {documentos.length === 0 ? <p className="text-slate-500 text-sm">No hay documentos publicados.</p> : documentos.slice(0, 5).map(doc => (
                    <div key={doc.id} onClick={() => setDocumentoSeleccionado(doc)} className="bg-white p-5 rounded shadow-sm border border-slate-100 flex items-center justify-between cursor-pointer hover:shadow-md hover:border-indigo-300 transition-all group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded flex items-center justify-center text-lg">📄</div>
                        <div>
                          <p className="font-bold text-slate-700 text-sm group-hover:text-indigo-600 transition-colors">{doc.titulo}</p>
                          <p className="text-[10px] text-slate-400 uppercase tracking-widest">{doc.categoria}</p>
                        </div>
                      </div>
                      <button className="text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity text-xl">👁️</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </section>

      {/* ==========================================
          SECCIÓN: ENCUESTAS Y FORMULARIOS (MEJORADA)
      ========================================== */}
      {permisos.formularios && formularios.length > 0 && (
        <section className="py-24 bg-slate-50 border-t border-slate-200">
          <div className="container mx-auto px-6 max-w-6xl">
            <div className="text-center mb-16">
              <span className="text-indigo-600 font-black tracking-widest text-[10px] uppercase bg-indigo-50 px-4 py-2 rounded-full mb-4 inline-block">Participación</span>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">Encuestas y Formularios</h2>
              <p className="text-slate-500 max-w-2xl mx-auto">Participa en las decisiones de tu conjunto o diligencia los formatos requeridos por la administración.</p>
            </div>
            
            <div className={`grid grid-cols-1 ${formularios.length > 1 ? 'lg:grid-cols-2' : 'max-w-3xl mx-auto'} gap-10`}>
              {formularios.map(form => {
                // 🛠️ AQUÍ ESTÁ EL ARREGLO: Buscamos específicamente 'iframe_url'
                let urlCruda = form.iframe_url || '';
                let urlFinal = urlCruda.trim();
                
                if (urlFinal) {
                  // Le ponemos https:// si el admin lo olvidó
                  if (!/^https?:\/\//i.test(urlFinal)) {
                    urlFinal = 'https://' + urlFinal;
                  }
                  // Si es de Google Forms, forzamos el modo "embebido" para evitar bloqueos
                  if (urlFinal.includes('docs.google.com/forms')) {
                    urlFinal = urlFinal.replace('/edit', '/viewform');
                    if (!urlFinal.includes('embedded=true')) {
                      urlFinal += (urlFinal.includes('?') ? '&' : '?') + 'embedded=true';
                    }
                  }
                }

                return (
                  <div key={form.id} className="bg-white p-6 sm:p-8 rounded-[2.5rem] shadow-xl border border-slate-200 flex flex-col min-h-[600px]">
                    <div className="mb-6 text-center">
                      <h3 className="text-xl font-black text-slate-800">{form.titulo}</h3>
                      {form.descripcion && <p className="text-xs text-slate-500 mt-2">{form.descripcion}</p>}
                    </div>
                    
                    {/* Contenedor del Iframe */}
                    <div className="flex-1 bg-slate-100 rounded-3xl overflow-hidden relative shadow-inner">
                      {urlFinal ? (
                        <iframe 
                          src={urlFinal} 
                          className="absolute inset-0 w-full h-full border-none" 
                          title={form.titulo}
                        ></iframe>
                      ) : (
                        <div className="flex items-center justify-center h-full text-slate-400 text-xs italic">
                          URL del formulario no configurada en la base de datos.
                        </div>
                      )}
                    </div>
                    
                    {/* Botón de respaldo usando urlFinal */}
                    {urlFinal && (
                      <a 
                        href={urlFinal} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="mt-6 w-full py-4 bg-indigo-50 text-indigo-600 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center hover:bg-indigo-100 transition-all flex justify-center items-center gap-2"
                      >
                        Abrir en nueva pestaña <span className="text-sm">↗️</span>
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}
 
   
      {/* ==========================================
          SECCIÓN: CENTRO DE AYUDA INTELIGENTE (FAQ REDISEÑADO)
      ========================================== */}
      {permisos.fqr && (
      <section className="py-24 bg-white border-t border-slate-100">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center mb-16">
            <span className="text-indigo-600 font-black tracking-widest text-[10px] uppercase bg-indigo-50 px-4 py-2 rounded-full mb-4 inline-block">Soporte y Respuestas</span>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">Centro de Ayuda 24/7</h2>
            <p className="text-slate-500 max-w-2xl mx-auto">Encuentra respuestas rápidas a tus inquietudes sin tener que llamar a la administración.</p>
          </div>

          {faq.length === 0 ? (
            <div className="text-center p-10 bg-slate-50 rounded-2xl border border-slate-200 border-dashed max-w-2xl mx-auto">
              <p className="text-slate-500 font-medium">Aún no hay preguntas frecuentes publicadas por la administración.</p>
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row gap-10 items-start">
              
              {/* COLUMNA IZQUIERDA: Menú de Categorías Elegante */}
              <div className="w-full lg:w-1/3 bg-slate-50 p-6 rounded-3xl border border-slate-100 sticky top-24">
                <h3 className="font-black text-slate-800 mb-6 uppercase tracking-widest text-xs flex items-center gap-2">
                  <span className="text-indigo-600">📂</span> Categorías de Ayuda
                </h3>
                <div className="space-y-2 flex flex-col">
                  {categoriasFaq.map(cat => (
                    <button
                      key={cat}
                      onClick={() => { setCategoriaActiva(cat); setFaqAbierta(null); }}
                      className={`text-left px-5 py-4 rounded-2xl text-sm font-bold transition-all ${categoriaActiva === cat ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-600 hover:bg-white hover:shadow-sm'}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* COLUMNA DERECHA: Buscador + Contenedor de Preguntas con Scroll Interno */}
              <div className="w-full lg:w-2/3">
                
                {/* Buscador Inteligente Superior */}
                <div className="relative mb-6 shadow-sm">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-xl">🔍</span>
                  <input 
                    type="text" 
                    placeholder="¿Qué estás buscando hoy?" 
                    value={busquedaFaq}
                    onChange={(e) => setBusquedaFaq(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-slate-700 font-bold rounded-2xl pl-14 pr-6 py-5 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition-all"
                  />
                </div>

                {/* CONTENEDOR CON LÍMITE DE ALTURA Y SCROLL INTERNO */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-2 sm:p-6 max-h-[600px] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full">
                  <div className="space-y-3 pr-2">
                    {faqFiltrado.length === 0 ? (
                      <div className="text-center p-10">
                        <span className="text-4xl mb-4 block">👻</span>
                        <p className="text-slate-500 font-bold">No encontramos resultados para esta búsqueda o categoría.</p>
                      </div>
                    ) : (
                      faqFiltrado.map((item) => {
                        const isOpen = faqAbierta === item.id;
                        return (
                          <div key={item.id} className={`border border-slate-100 rounded-2xl overflow-hidden transition-all duration-300 ${isOpen ? 'shadow-md border-indigo-200 bg-white' : 'bg-slate-50 hover:border-indigo-300'}`}>
                            <button 
                              onClick={() => setFaqAbierta(isOpen ? null : item.id)}
                              className="w-full text-left p-5 flex justify-between items-center transition-colors"
                            >
                              <span className={`font-bold text-sm sm:text-base pr-4 leading-tight ${isOpen ? 'text-indigo-700' : 'text-slate-700'}`}>
                                {item.pregunta}
                              </span>
                              <span className={`transform transition-transform duration-300 flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full border ${isOpen ? 'rotate-180 bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-400 border-slate-200 shadow-sm'}`}>
                                ▼
                              </span>
                            </button>
                            
                            <div className={`transition-all duration-500 ease-in-out ${isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                              <div className="px-5 pb-5 pt-2 border-t border-slate-100/50">
                                <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                                  {item.respuesta}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
                {/* Fin Contenedor de Scroll */}

              </div>
            </div>
          )}
        </div>
      </section>
      )}
      {/* ==========================================
          MODALES UX LIGHT THEME
          ========================================== */}
      
      {/* 🏙️ Modal: Catálogo Inmuebles */}
      {modalCatalogoAbierto && (
        <div className="fixed inset-0 bg-slate-900/60 z-[100] flex flex-col p-4 md:p-10 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-slate-50 w-full h-full max-w-7xl mx-auto rounded-xl shadow-2xl flex flex-col overflow-hidden">
            <div className="bg-white px-8 py-6 border-b border-slate-200 flex justify-between items-center shrink-0">
              <h2 className="text-2xl font-bold text-slate-800">Catálogo de Inmuebles</h2>
              <button onClick={() => setModalCatalogoAbierto(false)} className="text-slate-400 hover:text-red-500 text-3xl leading-none">×</button>
            </div>
            <div className="bg-white px-8 py-4 border-b border-slate-100 shrink-0">
              <input 
                type="text" 
                placeholder="Filtrar por palabra clave..." 
                className="w-full bg-slate-100 border border-slate-200 rounded px-6 py-3 outline-none focus:border-indigo-500 text-sm"
                value={filtroInmuebles}
                onChange={(e) => setFiltroInmuebles(e.target.value)}
              />
            </div>
            <div className="flex-1 overflow-y-auto p-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {inmueblesFiltrados.length === 0 ? <p className="col-span-full text-center text-slate-500 py-10">No hay resultados.</p> : inmueblesFiltrados.map(inm => (
                  <InmuebleCardUX key={inm.id} inm={inm} onClick={() => abrirModalInmueble(inm)} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🏠 Modal: Detalle Inmueble con CARRUSEL */}
      {inmuebleSeleccionado && (
        <div className="fixed inset-0 bg-slate-900/80 z-[130] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-xl w-full max-w-5xl max-h-[90vh] flex flex-col md:flex-row overflow-hidden shadow-2xl relative">
            <button onClick={() => setInmuebleSeleccionado(null)} className="absolute top-4 right-4 bg-white hover:bg-slate-100 text-slate-800 w-10 h-10 rounded-full flex items-center justify-center z-20 shadow-md border border-slate-200">✕</button>
            
            <div className="md:w-1/2 bg-slate-100 relative flex items-center justify-center h-80 md:h-auto overflow-hidden group">
              <img 
                src={(inmuebleSeleccionado.imagenes && inmuebleSeleccionado.imagenes.length > 0) ? inmuebleSeleccionado.imagenes[fotoIndex] : 'https://via.placeholder.com/800'} 
                className="w-full h-full object-cover" 
                alt={`Inmueble foto ${fotoIndex + 1}`} 
              />
              {inmuebleSeleccionado.imagenes && inmuebleSeleccionado.imagenes.length > 1 && (
                <>
                  <button onClick={prevFoto} className="absolute left-4 w-10 h-10 rounded-full bg-white/80 text-slate-800 hover:bg-white flex items-center justify-center shadow z-10 transition-colors">←</button>
                  <button onClick={nextFoto} className="absolute right-4 w-10 h-10 rounded-full bg-white/80 text-slate-800 hover:bg-white flex items-center justify-center shadow z-10 transition-colors">→</button>
                  <div className="absolute bottom-4 left-0 w-full flex justify-center gap-2 z-10">
                    {inmuebleSeleccionado.imagenes.map((_, i) => (
                      <div key={i} className={`h-2 rounded-full transition-all ${i === fotoIndex ? 'bg-orange-500 w-6' : 'bg-white/70 w-2 hover:bg-white cursor-pointer'}`} onClick={() => setFotoIndex(i)}></div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="md:w-1/2 p-8 md:p-10 flex flex-col overflow-y-auto no-scrollbar bg-white">
              <span className="bg-orange-500 text-white text-[10px] font-bold px-3 py-1 uppercase tracking-widest rounded w-max mb-4">{inmuebleSeleccionado.tipo_oferta}</span>
              <h2 className="text-3xl font-bold text-slate-800 mb-2">{inmuebleSeleccionado.titulo}</h2>
              <p className="text-3xl font-black text-indigo-600 mb-8">{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(inmuebleSeleccionado.precio)}</p>
              <div className="grid grid-cols-4 gap-4 mb-8 border-y border-slate-100 py-6 text-center">
                <div><span className="block font-bold text-lg text-slate-800">{inmuebleSeleccionado.habitaciones}</span><span className="text-[10px] text-slate-500 uppercase">Hab.</span></div>
                <div><span className="block font-bold text-lg text-slate-800">{inmuebleSeleccionado.banos}</span><span className="text-[10px] text-slate-500 uppercase">Baños</span></div>
                <div><span className="block font-bold text-lg text-slate-800">{inmuebleSeleccionado.area}</span><span className="text-[10px] text-slate-500 uppercase">Mts²</span></div>
                <div><span className="block font-bold text-lg text-slate-800">{inmuebleSeleccionado.parqueadero}</span><span className="text-[10px] text-slate-500 uppercase">Parq.</span></div>
              </div>
              <div className="flex-1 mb-8">
                <h4 className="text-slate-800 font-bold mb-2">Descripción</h4>
                <p className="text-slate-600 text-sm leading-relaxed">{inmuebleSeleccionado.descripcion}</p>
              </div>
              <a href={`https://wa.me/57${inmuebleSeleccionado.contacto_tel}?text=${encodeURIComponent('Hola, me interesa: ' + inmuebleSeleccionado.titulo)}`} target="_blank" rel="noreferrer" className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded text-center text-sm uppercase tracking-widest transition-colors flex items-center justify-center gap-2">
                <span>📱</span> Contactar Asesor
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 📄 Modal: Visor PDF */}
      {documentoSeleccionado && (
        <div className="fixed inset-0 bg-slate-900/80 z-[140] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden shadow-2xl relative">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-white">
              <div>
                <span className="text-indigo-600 text-[10px] font-bold uppercase tracking-widest">{documentoSeleccionado.categoria}</span>
                <h3 className="text-xl font-bold text-slate-800">{documentoSeleccionado.titulo}</h3>
              </div>
              <button onClick={() => setDocumentoSeleccionado(null)} className="text-slate-400 hover:text-red-500 text-3xl leading-none">×</button>
            </div>
            <div className="flex-1 bg-slate-100 relative">
              <iframe src={documentoSeleccionado.archivo_url} className="absolute top-0 left-0 w-full h-full border-none" title="Visor Documento"></iframe>
            </div>
            <div className="p-6 bg-white border-t border-slate-100 text-center sm:text-right">
              <a href={documentoSeleccionado.archivo_url} target="_blank" rel="noreferrer" className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded text-sm uppercase tracking-widest transition-colors">
                Descargar Archivo
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 📖 Modal: Iframe Manual de Zona */}
      {manualZonaSeleccionada && (
        <div className="fixed inset-0 bg-slate-900/80 z-[150] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden shadow-2xl relative">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-white shrink-0">
              <div>
                <span className="text-orange-500 text-[10px] font-black uppercase tracking-widest">Manual de Conducta y Uso</span>
                <h3 className="text-xl font-bold text-slate-800">{manualZonaSeleccionada.nombre}</h3>
              </div>
              <button onClick={() => setManualZonaSeleccionada(null)} className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-500 flex items-center justify-center text-xl transition-colors">✕</button>
            </div>
            <div className="flex-1 bg-slate-100 relative w-full h-full">
              <iframe 
                src={manualZonaSeleccionada.manual_url} 
                className="absolute inset-0 w-full h-full border-none" 
                title={`Manual ${manualZonaSeleccionada.nombre}`}
              ></iframe>
            </div>
          </div>
        </div>
      )}

      {/* 📢 Modal: Detalle Noticia */}
      {noticiaSeleccionada && (
        <div className="fixed inset-0 bg-slate-900/80 z-[110] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl relative">
            <button onClick={() => setNoticiaSeleccionada(null)} className="absolute top-4 right-4 bg-white/80 hover:bg-white text-slate-800 w-10 h-10 rounded-full flex items-center justify-center z-10 shadow transition-colors">✕</button>
            {noticiaSeleccionada.imagen_url && (
              <div className="h-48 bg-slate-200">
                <img src={noticiaSeleccionada.imagen_url} className="w-full h-full object-cover" alt="Noticia" />
              </div>
            )}
            <div className="p-8 md:p-10 overflow-y-auto">
              <span className="bg-indigo-100 text-indigo-600 text-[10px] font-bold px-3 py-1 uppercase tracking-widest rounded mb-4 inline-block">{noticiaSeleccionada.tipo}</span>
              <h2 className="text-3xl font-bold text-slate-800 mb-6">{noticiaSeleccionada.titulo}</h2>
              <div className="text-slate-600 space-y-4 text-base leading-relaxed whitespace-pre-wrap">{noticiaSeleccionada.contenido}</div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function InmuebleCardUX({ inm, onClick }) {
  const precioFormat = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(inm.precio);
  const foto = (inm.imagenes && inm.imagenes.length > 0) ? inm.imagenes[0] : 'https://via.placeholder.com/500';
  const esArriendo = inm.tipo_oferta?.toLowerCase().includes('arriend');
  const colorEtiqueta = esArriendo ? 'bg-blue-600 shadow-blue-600/40' : 'bg-emerald-600 shadow-emerald-600/40';

  return (
    <div onClick={onClick} className="bg-white rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 cursor-pointer flex flex-col overflow-hidden border border-slate-300 group relative">
      <div className="absolute top-4 left-4 z-10">
          <span className={`${colorEtiqueta} text-white text-[11px] font-black px-4 py-2 uppercase tracking-widest rounded-full shadow-lg whitespace-nowrap`}>
            {inm.tipo_oferta}
          </span>
      </div>
      <div className="relative h-56 overflow-hidden bg-slate-200 border-b border-slate-200">
        <img src={foto} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt={inm.titulo} />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-slate-900/40 to-transparent"></div>
      </div>
      <div className="pt-6 pb-6 px-6 flex flex-col flex-1 bg-white">
        <h3 className="text-slate-500 text-xs font-black mb-1 truncate uppercase tracking-widest">{inm.titulo}</h3>
        <p className="text-3xl font-black text-slate-900 mb-6 tracking-tight">{precioFormat}</p>
        <div className="mt-auto grid grid-cols-3 gap-3">
          <div className="bg-slate-100 border-2 border-slate-200 rounded-xl py-3 shadow-sm flex flex-col items-center justify-center group-hover:border-indigo-400 group-hover:bg-indigo-50 transition-all">
            <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Área</span>
            <span className="text-sm font-black text-slate-900">{inm.area} <span className="text-[10px] font-bold text-slate-600">Mts²</span></span>
          </div>
          <div className="bg-slate-100 border-2 border-slate-200 rounded-xl py-3 shadow-sm flex flex-col items-center justify-center group-hover:border-indigo-400 group-hover:bg-indigo-50 transition-all">
            <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Habs</span>
            <span className="text-sm font-black text-slate-900">{inm.habitaciones}</span>
          </div>
          <div className="bg-slate-100 border-2 border-slate-200 rounded-xl py-3 shadow-sm flex flex-col items-center justify-center group-hover:border-indigo-400 group-hover:bg-indigo-50 transition-all">
            <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Baños</span>
            <span className="text-sm font-black text-slate-900">{inm.banos}</span>
          </div>
        </div>
      </div>
    </div>
  );
}