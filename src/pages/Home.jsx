import { useState } from 'react';
import { Link } from 'react-router-dom';

// 🚀 ¡AQUÍ ESTABA EL DETALLE! Actualizamos la ruta para que busque en la carpeta 'lib'
import { supabase } from '../lib/supabaseClient'; 

export default function Home() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  // Estado para el modal legal (Push)
  const [legalModal, setLegalModal] = useState({ isOpen: false, title: '', content: '' });

  // Estado para el modal de la Imagen Promocional (La Solución)
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  // Estado para el formulario (Lead Capture)
  const [formData, setFormData] = useState({
    nombre: '',
    correo: '',
    copropiedad: '',
    telefono: '',
    tamano: ''
  });

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setIsSending(true);

    try {
      // 🚀 Hacemos el insert a la tabla leads_comerciales
      const { data, error } = await supabase
        .from('leads_comerciales')
        .insert([
          { 
            nombre_completo: formData.nombre, 
            correo: formData.correo, 
            nombre_copropiedad: formData.copropiedad,
            telefono: formData.telefono,
            tamano: formData.tamano
          }
        ]);

      if (error) throw error;

      // Simulación de éxito
      setTimeout(() => {
        alert('✨ ¡Excelente decisión! Hemos recibido tu solicitud. Nuestro equipo preparará tu simulador financiero y se pondrá en contacto contigo.');
        setFormData({ nombre: '', correo: '', copropiedad: '', telefono: '', tamano: '' });
        setIsSending(false);
      }, 1500);

    } catch (error) {
      console.error('Error guardando el lead:', error);
      alert('Hubo un error. Por favor intenta nuevamente.');
      setIsSending(false);
    }
  };

  // Textos Legales para el Modal
  const openLegalModal = (type) => {
    if (type === 'terminos') {
      setLegalModal({
        isOpen: true,
        title: 'Términos de Servicio',
        content: `
          CONTRATO Y TÉRMINOS DE SERVICIO - LUMENGROUP S.A.S.\n\n
          1. OBJETO: Prestación de servicios profesionales de soporte técnico, mantenimiento y gestión de infraestructura en la nube para la plataforma web y CRM de gestión de copropiedades.\n\n
          2. PROPIEDAD INTELECTUAL: El código fuente, la arquitectura de software, la estructura de la base de datos y el diseño de la interfaz son propiedad exclusiva de LUMENGROUP S.A.S. Se otorga al cliente una licencia de uso comercial, intransferible y no sublicenciable.\n\n
          3. PROTECCIÓN DE DATOS: LUMENGROUP S.A.S. actúa únicamente como encargado del tratamiento. El cliente es el único responsable legal del tratamiento de los datos personales (Ley 1581 de 2012).\n\n
          4. LIMITACIONES DE INFRAESTRUCTURA: Los planes incluyen cuotas establecidas de API, almacenamiento y envíos de correo. El uso excesivo generará cobros adicionales de acuerdo con los costos de los proveedores (Vercel, Supabase, etc.).
        `
      });
    } else if (type === 'privacidad') {
      setLegalModal({
        isOpen: true,
        title: 'Política de Privacidad y Habeas Data',
        content: 'En LumenGroup S.A.S. nos tomamos muy en serio la seguridad de la información. Toda la información, bases de datos de residentes, PQRS y registros alojados en el CRM se mantienen bajo estricta confidencialidad. Los datos son propiedad de cada copropiedad (El Cliente), quienes actúan como responsables de la información ante la ley de Habeas Data.'
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-gray-900 scroll-smooth">
      {/* --- NAVBAR --- */}
      <nav className="fixed w-full bg-white/95 backdrop-blur-md z-50 shadow-sm border-b border-gray-100 transition-all">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="Lumen Logo" className="h-10 w-auto" />
            <span className="text-2xl font-black text-blue-600 tracking-tight">LumenGroup</span>
          </Link>

          <div className="hidden md:flex items-center gap-8 font-semibold text-gray-600 text-sm uppercase tracking-wider">
            <button onClick={() => setIsImageModalOpen(true)} className="hover:text-blue-600 transition-colors uppercase">El Ecosistema</button>
            <a href="#modules" className="hover:text-blue-600 transition-colors">Beneficios</a>
            <a href="#plans" className="hover:text-blue-600 transition-colors">Inversión</a>
            <a href="#contact" className="hover:text-blue-600 transition-colors">Contacto</a>
            <Link to="/directorio" className="text-blue-600 hover:text-blue-800">Red Administradores</Link>
            <Link to="/login" className="bg-blue-600 text-white px-8 py-2.5 rounded-full hover:shadow-lg hover:bg-blue-700 transition-all">
              Portal Clientes
            </Link>
          </div>

          <button className="md:hidden text-2xl text-blue-600" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            <i className={`fas ${isMenuOpen ? 'fa-times' : 'fa-bars'}`}></i>
          </button>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <header className="pt-40 pb-24 bg-gradient-to-br from-blue-50 via-white to-blue-50 relative overflow-hidden">
        <div className="container mx-auto px-6 flex flex-col lg:flex-row items-center gap-16">
          <div className="lg:w-1/2 text-center lg:text-left z-10">
            <span className="text-blue-600 font-bold tracking-widest uppercase text-sm mb-4 block">Ecosistema PropTech 360</span>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold leading-tight text-gray-900 mb-6 tracking-tight">
              No administramos ladrillos, gestionamos <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-400">convivencia real.</span>
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed mb-10 max-w-2xl mx-auto lg:mx-0">
              Transforma la gestión operativa y de seguridad en una experiencia comunitaria fluida. Un ecosistema digital conectado que une a la Administración, Vigilancia y Residentes en un solo lugar.
            </p>
            <div className="flex flex-col sm:flex-row gap-5 justify-center lg:justify-start">
              <button onClick={() => setIsImageModalOpen(true)} className="bg-blue-600 text-white px-8 py-4 rounded-full font-bold shadow-xl hover:-translate-y-1 hover:bg-blue-700 transition-all text-center flex items-center justify-center gap-3">
                <i className="fas fa-eye text-xl"></i> Ver el Antes y Después
              </button>
              <a href="#contact" className="bg-white text-blue-600 border-2 border-blue-600 px-8 py-4 rounded-full font-bold hover:bg-blue-50 transition-all text-center flex items-center justify-center">
                Solicitar Cotización
              </a>
            </div>
          </div>
          
          {/* CONTENEDOR DEL VIDEO HECHO CON IA */}
          <div className="lg:w-1/2 w-full relative z-10" id="video-section">
            <div className="relative rounded-[2rem] overflow-hidden shadow-2xl border-[10px] border-white bg-white transform lg:-rotate-2 hover:rotate-0 transition-transform duration-500 group cursor-pointer" onClick={() => setIsImageModalOpen(true)}>
               {/* Overlay interactivo */}
               <div className="absolute inset-0 bg-blue-900/30 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 backdrop-blur-[2px]">
                <div className="bg-white text-blue-600 px-6 py-3 rounded-full font-bold shadow-2xl transform group-hover:scale-105 transition-transform flex items-center gap-2">
                  <i className="fas fa-chart-line text-xl"></i> Conoce la Solución
                </div>
              </div>
              <video autoPlay muted loop playsInline className="w-full h-full object-cover rounded-xl filter brightness-95">
                <source src="/video-ia.mp4" type="video/mp4" />
                Tu navegador no soporta el formato de video.
              </video>
            </div>
          </div>
        </div>
      </header>

      {/* --- MÓDULOS CON ÍCONOS MEJORADOS COPY --- */}
      <section id="modules" className="py-24 bg-white relative">
        <div className="container mx-auto px-6">
          <div className="text-center mb-20 max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6 tracking-tight">El Fin del Caos Tradicional</h2>
            <p className="text-xl text-gray-500">Soluciones tecnológicas diseñadas para eliminar las fugas de dinero, las minutas de papel y el estrés operativo.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {[
              { icon: 'fa-users-cog', title: 'Adiós al Silencio PQRS', desc: 'Elimina los chats de WhatsApp colapsados y cartas perdidas. Gestión centralizada con trazabilidad total y transparencia para el residente.' },
              { icon: 'fa-fingerprint', title: 'La Portería Digital', desc: 'Sustituye la minuta física ilegible. Control en tiempo real de visitantes, rondas de vigilancia y correspondencia segura.' },
              { icon: 'fa-car', title: 'Control de Parqueaderos', desc: 'Frena las fugas financieras. Control estricto de tarifas de parqueo de visitantes para evitar descuadres de caja.' },
              { icon: 'fa-envelope-open-text', title: 'Portal Comunidad Feliz', desc: 'Autogestión total. Un espacio donde cada residente tiene visibilidad de sus pagos, reservas de zonas comunes y novedades 24/7.' },
              { icon: 'fa-tv', title: 'Cartelera Inteligente', desc: 'Moderniza la comunicación visual. Cero papel, notificaciones al instante y pantallas de alto impacto en tu copropiedad.' },
              { icon: 'fa-project-diagram', title: 'Red de Administradores', desc: 'Destaca tu gestión. Directorio profesional para conectar con otros líderes y aumentar la visibilidad de tu trabajo.' }
            ].map((modulo, index) => (
              <div key={index} className="p-10 rounded-[2rem] bg-slate-50 border border-slate-100 hover:shadow-2xl hover:-translate-y-2 hover:bg-white transition-all duration-300 group">
                <div className="w-20 h-20 bg-white shadow-md text-blue-600 rounded-2xl flex items-center justify-center text-3xl mb-8 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <i className={`fas ${modulo.icon}`}></i>
                </div>
                <h3 className="text-2xl font-bold mb-4 text-gray-900">{modulo.title}</h3>
                <p className="text-gray-600 leading-relaxed">{modulo.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- PLANES --- */}
      <section id="plans" className="py-24 bg-slate-900 text-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-black mb-4 tracking-tight text-white">Software Low Cost, Alto Impacto</h2>
            <p className="text-xl text-blue-400 font-medium mb-6 max-w-3xl mx-auto">
              Estructuras financieras diseñadas a la medida para no afectar la economía de tu conjunto. Promedios corporativos desde solo $900 COP mensuales por inmueble.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-center">
            <div className="bg-slate-800 p-10 rounded-[2.5rem] border border-slate-700 hover:border-blue-500 transition-colors">
              <h3 className="text-3xl font-bold text-white mb-2">Start</h3>
              <p className="text-gray-400 text-sm mb-8 h-10">Ideal para conjuntos pequeños</p>
              <ul className="space-y-5 mb-10">
                {['CRM Básico (PQRS)', 'Hasta 99 inmuebles', 'Portal de Residentes', 'Hasta 1 modulo adicional'].map((item, i) => (
                  <li key={i} className="flex items-center gap-4 text-gray-300"><i className="fas fa-check text-blue-500"></i> {item}</li>
                ))}
              </ul>
              <a href="#contact" className="block text-center w-full py-4 rounded-full border-2 border-slate-600 text-white font-bold hover:bg-slate-700 transition-all">Cotizar Start</a>
            </div>

            <div className="bg-slate-800 p-10 rounded-[2.5rem] border border-slate-700 hover:border-blue-500 transition-colors md:-translate-y-4">
              <h3 className="text-3xl font-bold text-white mb-2">PRO</h3>
              <p className="text-gray-400 text-sm mb-8 h-10">Crecimiento y automatización</p>
              <ul className="space-y-5 mb-10">
                {['CRM Estándar', 'Hasta 300 Inmuebles', 'Módulo de Reservas', 'Notificaciones Masivas'].map((item, i) => (
                  <li key={i} className="flex items-center gap-4 text-gray-300"><i className="fas fa-check text-blue-500"></i> {item}</li>
                ))}
              </ul>
              <a href="#contact" className="block text-center w-full py-4 rounded-full border-2 border-slate-600 text-white font-bold hover:bg-slate-700 transition-all">Cotizar PRO</a>
            </div>

            <div className="bg-gradient-to-b from-blue-600 to-blue-800 p-10 rounded-[2.5rem] shadow-2xl transform md:-translate-y-8 relative border-4 border-yellow-400">
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 text-xs font-black px-6 py-2 rounded-full uppercase tracking-widest shadow-lg">El Ecosistema 360</div>
              <h3 className="text-3xl font-bold text-white mb-2 mt-4">Master</h3>
              <p className="text-blue-200 text-sm mb-8 h-10">Garantiza confianza ante el Consejo</p>
              <ul className="space-y-5 mb-10">
                {['Módulo de Seguridad Total', 'Control de Parqueaderos', 'Inmuebles Personalizados', 'Despliegue Express (48h)', 'Soporte Técnico Prioritario'].map((item, i) => (
                  <li key={i} className="flex items-center gap-4 text-white font-medium"><i className="fas fa-star text-yellow-400"></i> {item}</li>
                ))}
              </ul>
              <a href="#contact" className="block text-center w-full py-4 rounded-full bg-white text-blue-700 font-black hover:shadow-xl hover:bg-gray-50 transition-all text-lg">Cotizar Master</a>
            </div>
          </div>
        </div>
      </section>

      {/* --- FORMULARIO DE CONTACTO --- */}
      <section id="contact" className="py-24 bg-white">
        <div className="container mx-auto px-6 max-w-5xl">
          <div className="bg-blue-50 rounded-[3rem] p-10 md:p-16 flex flex-col md:flex-row gap-16 items-center border border-blue-100 shadow-xl">
            <div className="md:w-5/12">
              <h2 className="text-4xl font-black text-gray-900 mb-6">Prioriza tu Administración Hoy.</h2>
              <p className="text-gray-600 text-lg mb-8">Un gasto mínimo que ahorra horas de trabajo manual. Solicita tu simulador financiero a la medida y obtén tu base de datos y cargue masivo listos en 48 horas hábiles.</p>
              <div className="space-y-4">
                <div className="flex items-center gap-4 text-gray-700 font-bold"><i className="fas fa-envelope text-blue-600 text-xl"></i> info@LumenGroup.com.co</div>
                <div className="flex items-center gap-4 text-gray-700 font-bold"><i className="fas fa-phone text-blue-600 text-xl"></i> +57 312 359 51 91</div>
              </div>
            </div>

            <div className="md:w-7/12 w-full bg-white p-8 rounded-3xl shadow-lg border border-gray-100">
              <form onSubmit={handleContactSubmit} className="space-y-4">
                <input type="text" name="nombre" value={formData.nombre} onChange={handleInputChange} placeholder="Nombre del Administrador" required className="w-full p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600 outline-none bg-slate-50 font-medium" />
                <input type="email" name="correo" value={formData.correo} onChange={handleInputChange} placeholder="Correo corporativo" required className="w-full p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600 outline-none bg-slate-50 font-medium" />
                <input type="tel" name="telefono" value={formData.telefono} onChange={handleInputChange} placeholder="Teléfono / WhatsApp" required className="w-full p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600 outline-none bg-slate-50 font-medium" />
                <input type="text" name="copropiedad" value={formData.copropiedad} onChange={handleInputChange} placeholder="Nombre de la Copropiedad" required className="w-full p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600 outline-none bg-slate-50 font-medium" />
                
                <select name="tamano" value={formData.tamano} onChange={handleInputChange} required className="w-full p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600 outline-none bg-slate-50 font-medium text-gray-600">
                  <option value="" disabled>Cantidad de Inmuebles...</option>
                  <option value="Pequeña">Menos de 99 unidades</option>
                  <option value="Mediana">100 - 300 unidades</option>
                  <option value="Grande">Más de 301 unidades</option>
                </select>
                
                <button type="submit" disabled={isSending} className="w-full py-4 bg-blue-600 text-white rounded-xl font-black hover:bg-blue-700 transition-all shadow-lg text-lg mt-2 disabled:opacity-70">
                  {isSending ? 'Procesando solicitud...' : 'Solicitar Simulador Financiero'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* --- FOOTER Y LEGALES --- */}
      <footer className="bg-slate-900 text-slate-400 py-16 border-t border-slate-800">
        <div className="container mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12 text-center md:text-left">
          <div>
            <Link to="/" className="flex items-center gap-3 justify-center md:justify-start mb-6">
              <span className="text-3xl font-black text-white tracking-tight">LumenGroup</span>
            </Link>
            <p className="text-sm leading-relaxed max-w-sm mx-auto md:mx-0">
              Ecosistema PropTech Multi-Tenant. Transformando la gestión operativa y de seguridad en una experiencia comunitaria.
            </p>
          </div>
          <div>
            <h4 className="text-white font-bold mb-6 uppercase tracking-widest text-sm">Enlaces Rápidos</h4>
            <ul className="space-y-4 text-sm font-medium">
              <li><button onClick={() => setIsImageModalOpen(true)} className="hover:text-blue-500 transition-colors">Ver Solución</button></li>
              <li><a href="#plans" className="hover:text-blue-500 transition-colors">Ver Inversión</a></li>
              <li><Link to="/directorio" className="hover:text-blue-500 transition-colors">Red de Administradores</Link></li>
            </ul>
          </div>
          <div>
             <h4 className="text-white font-bold mb-6 uppercase tracking-widest text-sm">Legal & Soporte</h4>
            <ul className="space-y-4 text-sm font-medium">
              <li><button onClick={() => openLegalModal('privacidad')} className="hover:text-white transition-colors">Política de Privacidad</button></li>
              <li><button onClick={() => openLegalModal('terminos')} className="hover:text-white transition-colors">Términos de Servicio</button></li>
              <li><a href="#contact" className="hover:text-white transition-colors">Soporte Técnico</a></li>
            </ul>
          </div>
        </div>
        <div className="container mx-auto px-6 mt-16 pt-8 border-t border-slate-800 text-center text-sm font-medium text-slate-500">
          <p>Diseño y Desarrollo Tecnológico por LumenGroup S.A.S. &copy; {new Date().getFullYear()} V.1.0.0.4</p>
        </div>
      </footer>

      {/* --- MODAL DE LA IMAGEN PROMOCIONAL (SOLUCIÓN) --- */}
      {isImageModalOpen && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 md:p-10 backdrop-blur-md">
          <div className="w-full max-w-5xl relative animate-fade-in-up flex flex-col items-center">
            {/* Botón de cerrar */}
            <button 
              onClick={() => setIsImageModalOpen(false)}
              className="absolute -top-12 right-0 md:-right-12 text-white hover:text-red-500 bg-gray-800/50 hover:bg-white p-2 rounded-full w-10 h-10 flex items-center justify-center transition-all text-xl z-50"
            >
              <i className="fas fa-times"></i>
            </button>
            
            {/* Contenedor de la Imagen */}
            <div className="relative w-full rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(37,99,235,0.3)] bg-white max-h-[85vh] flex items-center justify-center p-2">
              <img 
                src="/promo.png" 
                alt="Infografía Antes y Después LumenGroup" 
                className="max-w-full max-h-[80vh] object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL LEGAL PUSH --- */}
      {legalModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl relative animate-fade-in-up">
            <button 
              onClick={() => setLegalModal({ ...legalModal, isOpen: false })}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 bg-gray-100 p-2 rounded-full w-10 h-10 flex items-center justify-center transition-colors"
            >
              ✕
            </button>
            <h3 className="text-2xl font-black text-gray-900 mb-6 border-b pb-4">{legalModal.title}</h3>
            <div className="text-gray-600 whitespace-pre-line leading-relaxed text-sm">
              {legalModal.content}
            </div>
            <div className="mt-8 pt-6 border-t text-right">
              <button 
                onClick={() => setLegalModal({ ...legalModal, isOpen: false })}
                className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}