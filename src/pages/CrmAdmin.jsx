import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // Para el cierre de sesión seguro
import { supabase } from '../supabase';

/**
 * IMPORTACIÓN DE COMPONENTES DE GESTIÓN
 * Cada módulo representa una pieza clave de la operación LumenGroup
 */
import FormulariosAdmin from '../components/FormulariosAdmin';
import NoticiasAdmin from '../components/NoticiasAdmin';
import DashboardAdmin from '../components/DashboardAdmin';
import MercadoAdmin from '../components/MercadoAdmin';
import ReservasAdmin from '../components/ReservasAdmin';
import ConfiguracionAdmin from '../components/ConfiguracionAdmin';
import SalasVirtualesAdmin from '../components/SalasVirtualesAdmin';
import DocumentosAdmin from '../components/DocumentosAdmin';
import ComunicacionesAdmin from '../components/ComunicacionesAdmin';
import DisenoLoginAdmin from '../components/DisenoLoginAdmin';
import PqrsParametrosAdmin from '../components/PqrsParametrosAdmin';
import GestionConvivencia from '../components/GestionConvivencia';
import CanalesPagoAdmin from '../components/CanalesPagoAdmin';
import ZonasComunesAdmin from '../components/ZonasComunesAdmin';
import PreguntasFrecuentesAdmin from '../components/PreguntasFrecuentesAdmin';
import AdminParqueadero from '../components/AdminParqueadero';


export default function CrmAdmin() {
  // ==========================================
  // ESTADOS DE NAVEGACIÓN Y CONTROL
  // ==========================================
  const navigate = useNavigate(); 
  const [menuActivo, setMenuActivo] = useState('dashboard');
  const [sidebarAbierta, setSidebarAbierta] = useState(false);
  
  // ==========================================
  // ESTADOS DE PERMISOS Y SEGURIDAD SAAS
  // ==========================================
  const [permisos, setPermisos] = useState(null);
  const [cargandoPermisos, setCargandoPermisos] = useState(true);

  /**
   * Efecto inicial para validar la sesión y cargar privilegios
   */
  useEffect(() => {
    cargarPermisosSaaS();
  }, []);

  /**
   * Carga dinámica de módulos basada en la tabla clientes_saas de Supabase
   * Esto garantiza que cada conjunto vea solo lo que tiene contratado.
   */
  const cargarPermisosSaaS = async () => {
    try {
      let idCopropiedad = sessionStorage.getItem('copropiedad_id');
      
      // PARACAÍDAS: Si no hay ID en sessionStorage, lo buscamos directo en la base de datos
      if (!idCopropiedad || idCopropiedad === 'null') {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user?.user_metadata?.copropiedad_id) {
          // Lo encontramos! Lo guardamos y seguimos adelante
          idCopropiedad = session.user.user_metadata.copropiedad_id;
          sessionStorage.setItem('copropiedad_id', idCopropiedad);
        } else {
          // Si definitivamente no hay ID, lo mandamos al login de forma controlada
          console.error("Acceso no autorizado: Sin ID de copropiedad");
          navigate('/login');
          return;
        }
      }

      // FIX 406: Usamos maybeSingle() para evitar errores si la DB está vacía
      const { data, error } = await supabase
        .from('clientes_saas')
        .select('*')
        .eq('copropiedad_id', idCopropiedad)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error; // Ignoramos si no encuentra filas

      if (data) {
        // === AQUÍ SE CONECTAN TUS 13 INTERRUPTORES MAESTROS A LA BASE DE DATOS ===
        setPermisos({
          dashboard: true, // El dashboard siempre debe estar visible
          formularios: data.mod_formularios,       // 1. Encuestas
          noticias: data.mod_noticias,             // 2. Cartelera Digital
          reservas: data.mod_reservas,             // 3. Gestión de reservas
          mercado: data.mod_mercado,               // 4. Mercado inmueble
          salas: data.mod_salas,                   // 5. Sala de juntas VIP
          convivencia: data.mod_convivencia,       // 6. Convivencia
          pagos: data.mod_pagos,                   // 7. Canales de pago
          documentos: data.mod_documentos,         // 8. Repositorio legal
          comunicaciones: data.mod_comunicaciones, // 9. Correos masivos
          tiempos_pqr: data.mod_tiempos_pqr,       // 10. Tiempos PQR
          zonas: data.mod_zonas,                  // 11. Zonas Comunes  
          fqr: data.mod_fqr,                      // 12. Centro de Ayuda (FAQ Rediseñado)
          exportar: data.mod_exportar,           // 13. Exportar datos (futuro módulo de análisis avanzado)  
          escalar: data.mod_escalar             // 14. Escalar a soporte humano (futuro botón de emergencia para casos críticos)
        });
      } else {
        // Si el conjunto aún no está configurado en clientes_saas, damos acceso básico preventivo
        setPermisos({ dashboard: true, noticias: true, formularios: true });
      }
    } catch (error) {
      console.error("Error crítico en la carga de permisos Core:", error);
      setPermisos({ dashboard: true, noticias: true }); 
    } finally {
      setCargandoPermisos(false);
    }
  };

  /**
   * Manejador de cambio de menú con cierre automático de sidebar en móvil
   */
  const cambiarMenu = (menu) => {
    setMenuActivo(menu);
    setSidebarAbierta(false);
  };

  /**
   * Lógica de Logout: Limpia Supabase y la sesión del navegador
   */
  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    sessionStorage.removeItem('copropiedad_id');
    navigate('/login');
  };

  // ==========================================
  // RENDERIZADO DE INTERFAZ
  // ==========================================

  // Pantalla de carga tipo Splash Screen profesional
  if (cargandoPermisos) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-900 text-white">
        <div className="w-14 h-14 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6"></div>
        <p className="font-black uppercase tracking-[0.3em] text-xs animate-pulse">Iniciando Ecosistema Core</p>
      </div>
    );
  }

  // Prevenir renderizado si los permisos fallan catastróficamente
  if (!permisos) return null;

  return (
    <div className="flex h-screen bg-slate-200 font-sans overflow-hidden">
      
      {/* Overlay de seguridad para la sidebar en dispositivos móviles */}
      {sidebarAbierta && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-20 md:hidden transition-opacity" 
          onClick={() => setSidebarAbierta(false)}
        ></div>
      )}

      {/* ==========================================
          SIDEBAR: MENÚ DE ADMINISTRACIÓN
          ========================================== */}
      <aside className={`fixed inset-y-0 left-0 z-30 w-72 bg-[#0f172a] text-white flex flex-col shadow-2xl transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${sidebarAbierta ? 'translate-x-0' : '-translate-x-full'}`}>
        
        {/* Cabecera del Sidebar */}
        <div className="p-8 border-b border-slate-800/50 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-black tracking-tighter text-white uppercase">
              CRM <span className="text-[#00A6FB] font-light italic">Master</span>
            </h2>
            <p className="text-[9px] text-slate-500 mt-2 font-bold tracking-[0.2em] uppercase">LumenGroup SaaS 2026</p>
          </div>
          <button 
            className="md:hidden text-slate-400 hover:text-white text-3xl" 
            onClick={() => setSidebarAbierta(false)}
          >
            &times;
          </button>
        </div>

        {/* Navegación Principal */}
        <nav className="flex-1 p-5 space-y-3 overflow-y-auto no-scrollbar">
          <p className="px-4 text-[10px] font-black text-slate-600 uppercase tracking-widest mb-4 mt-4">Módulos Operativos</p>
          
          {/* Dashboard siempre presente */}
          <button 
            onClick={() => cambiarMenu('dashboard')} 
            className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 ${menuActivo === 'dashboard' ? 'bg-[#00A6FB] text-white shadow-xl shadow-blue-500/20' : 'text-slate-400 hover:bg-slate-800/50'}`}
          >
            <span className="text-xl">📊</span>
            <span className="font-bold text-sm tracking-tight">Dashboard General</span>
          </button>
          
          {/* Módulos condicionales según permisos de Supabase */}
          {permisos.formularios && (
            <button 
              onClick={() => cambiarMenu('formularios')} 
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 ${menuActivo === 'formularios' ? 'bg-[#00A6FB] text-white shadow-xl shadow-blue-500/20' : 'text-slate-400 hover:bg-slate-800/50'}`}
            >
              <span className="text-xl">📋</span>
              <span className="font-bold text-sm tracking-tight">Encuestas</span>
            </button>
          )}

          {permisos.noticias && (
            <button 
              onClick={() => cambiarMenu('noticias')} 
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 ${menuActivo === 'noticias' ? 'bg-[#00A6FB] text-white shadow-xl shadow-blue-500/20' : 'text-slate-400 hover:bg-slate-800/50'}`}
            >
              <span className="text-xl">📢</span>
              <span className="font-bold text-sm tracking-tight">Cartelera Digital</span>
            </button>
          )}
          
          {permisos.reservas && (
            <button 
              onClick={() => cambiarMenu('reservas')} 
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 ${menuActivo === 'reservas' ? 'bg-[#00A6FB] text-white shadow-xl shadow-blue-500/20' : 'text-slate-400 hover:bg-slate-800/50'}`}
            >
              <span className="text-xl">🗓️</span>
              <span className="font-bold text-sm tracking-tight">Gestión Reservas</span>
            </button>
          )}

          {permisos.zonas && (
            <button 
              onClick={() => cambiarMenu('zonas')} 
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 ${menuActivo === 'zonas' ? 'bg-[#00A6FB] text-white shadow-xl shadow-blue-500/20' : 'text-slate-400 hover:bg-slate-800/50'}`}
            >
            <span className="text-xl">🏞️</span>
            <span className="font-bold text-sm tracking-tight">Manual de Zonas</span>
          </button>
          )}

          {permisos.mercado && (
            <button 
              onClick={() => cambiarMenu('mercado')} 
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 ${menuActivo === 'mercado' ? 'bg-[#00A6FB] text-white shadow-xl shadow-blue-500/20' : 'text-slate-400 hover:bg-slate-800/50'}`}
            >
              <span className="text-xl">🏠</span>
              <span className="font-bold text-sm tracking-tight">Mercado Inmueble</span>
            </button>
          )}
          
          {permisos.salas && (
            <button 
              onClick={() => cambiarMenu('salas')} 
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 ${menuActivo === 'salas' ? 'bg-[#4F46E5] text-white shadow-xl shadow-indigo-500/20' : 'text-slate-400 hover:bg-slate-800/50'}`}
            >
              <span className="text-xl">🌐</span>
              <span className="font-bold text-sm tracking-tight">Sala de Juntas VIP</span>
            </button>
          )}

          {permisos.convivencia && (
            <button 
              onClick={() => cambiarMenu('convivencia')} 
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 ${menuActivo === 'convivencia' ? 'bg-[#00A6FB] text-white shadow-xl shadow-blue-500/20' : 'text-slate-400 hover:bg-slate-800/50'}`}
            >
              <span className="text-xl">⚠️</span>
              <span className="font-bold text-sm tracking-tight">Convivencia</span>
            </button>
          )}

          {permisos.pagos && (
            <button 
              onClick={() => cambiarMenu('pagos')} 
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 mt-2 ${menuActivo === 'pagos' ? 'bg-[#00A6FB] text-white shadow-xl shadow-blue-500/20' : 'text-slate-400 hover:bg-slate-800/50'}`}
            >
              <span className="text-xl">💳</span>
              <span className="font-bold text-sm tracking-tight">Canales de Pago</span>
            </button>
          )}
          {permisos.fqr && (
          <button 
            onClick={() => cambiarMenu('faq')} 
            className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 mt-2 ${menuActivo === 'faq' ? 'bg-[#00A6FB] text-white shadow-xl shadow-blue-500/20' : 'text-slate-400 hover:bg-slate-800/50'}`}
          >
            <span className="text-xl">💡</span>
            <span className="font-bold text-sm tracking-tight">Centro de Ayuda (FAQ)</span>
          </button>
          )}
          {/* ==========================================
              SECCIÓN: DOCUMENTOS Y COMUNICACIÓN
              ========================================== */}
          <div className="pt-4 mt-4 border-t border-slate-800/50">
            <p className="px-4 text-[10px] font-black text-slate-600 uppercase tracking-widest mb-4">Documentos y Avisos</p>

            {permisos.documentos && (
              <button 
                onClick={() => cambiarMenu('documentos')} 
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 mb-2 ${menuActivo === 'documentos' ? 'bg-[#00A6FB] text-white shadow-xl shadow-blue-500/20' : 'text-slate-400 hover:bg-slate-800/50'}`}
              >
                <span className="text-xl">📁</span>
                <span className="font-bold text-sm tracking-tight">Repositorio Legal</span>
              </button>
            )}

            {permisos.comunicaciones && (
              <button 
                onClick={() => cambiarMenu('comunicaciones')} 
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 ${menuActivo === 'comunicaciones' ? 'bg-[#9333EA] text-white shadow-xl shadow-purple-500/20' : 'text-slate-400 hover:bg-slate-800/50'}`}
              >
                <span className="text-xl">✉️</span>
                <span className="font-bold text-sm tracking-tight">Correos Masivos (BCC)</span>
              </button>
            )}
          </div>
          
            {/* Pegas el botón que copiaste y solo le cambias lo que está en mayúsculas: */}
          <button 
            onClick={() => cambiarMenu('control')} /* <-- 1. CAMBIAS ESTO A 'control' */
            className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 ${menuActivo === 'control' /* <-- 2. CAMBIAS ESTO A 'control' */ ? 'bg-[#6366f1] text-white shadow-xl shadow-indigo-500/20' : 'text-slate-400 hover:bg-slate-800/50'}`}
            >
            {/* A veces es bueno ponerle un ancho fijo al ícono para que no empuje el texto */}
            <span className="text-xl w-6 text-center">🛡️</span> {/* <-- 3. CAMBIAS EL ÍCONO */}
            <span className="font-bold text-sm tracking-tight">Control Operativo</span> {/* <-- 4. CAMBIAS EL TEXTO */}
          </button>

          {/* Separador de configuración */}
          <div className="pt-6 mt-6 border-t border-slate-800/50">
            <p className="px-4 text-[10px] font-black text-slate-600 uppercase tracking-widest mb-4">Administración Core</p>
            
            {/* Estos son CORE, siempre prendidos para administrar el tenant */}
            <button 
              onClick={() => cambiarMenu('portada')} 
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 ${menuActivo === 'portada' ? 'bg-[#6366f1] text-white shadow-xl shadow-indigo-500/20' : 'text-slate-400 hover:bg-slate-800/50'}`}
            >
              <span className="text-xl">⚙️</span>
              <span className="font-bold text-sm tracking-tight">Ajustes del Portal</span>
            </button>

            <button onClick={() => cambiarMenu('disenoLogin')} 
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 mt-2 ${menuActivo === 'disenoLogin' ? 'bg-[#00A6FB] text-white shadow-xl shadow-blue-500/20' : 'text-slate-400 hover:bg-slate-800/50'}`}>
              <span className="text-xl">🎨</span>
              <span className="font-bold text-sm tracking-tight">Diseño Login SaaS</span>
            </button>  

            {/* Parametria de dias PQR */}
            {permisos.tiempos_pqr && (
              <button onClick={() => cambiarMenu('PqrsParametrosAdmin')} 
               className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 mt-2 ${menuActivo === 'PqrsParametrosAdmin' ? 'bg-[#00A6FB] text-white shadow-xl shadow-blue-500/20' : 'text-slate-400 hover:bg-slate-800/50'}`}>
               <span className="text-xl">⏱️</span>
               <span className="font-bold text-sm tracking-tight">Tiempos PQR</span>
              </button>  
            )}

         

            {/* BOTÓN CERRAR SESIÓN INTEGRADO */}
            <div className="mt-8 pt-8 border-t border-slate-800">
                <button 
                    onClick={cerrarSesion}
                    className="w-full flex items-center gap-4 px-6 py-4 text-red-400 hover:bg-red-500/10 hover:text-red-500 transition-all duration-300 rounded-2xl group"
                >
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <span className="text-xl">🚪</span>
                    </div>
                    <span className="font-black uppercase tracking-widest text-[11px]">Finalizar Sesión</span>
                </button>
            </div>
          </div>
        </nav>
      </aside>

      {/* ==========================================
          ÁREA DE CONTENIDO PRINCIPAL
          ========================================== */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        {/* Header Superior Dinámico */}
        <header className="bg-white border-b border-slate-200 px-8 py-5 flex justify-between items-center z-10 shadow-sm shrink-0">
          <div className="flex items-center gap-5">
            <button 
                className="md:hidden text-slate-600 hover:text-[#00A6FB] text-3xl p-1" 
                onClick={() => setSidebarAbierta(true)}
            >
                ☰
            </button>
            <div>
                <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none">Centro de Mando</h1>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 hidden sm:block">Panel de control unificado</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="hidden lg:flex flex-col items-end">
                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 uppercase tracking-widest">Servidor Activo</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-slate-100 border-2 border-slate-200 flex items-center justify-center text-xl shadow-inner transform rotate-3">👤</div>
          </div>
        </header>

        {/* Renderizado Dinámico de Vistas */}
        <div className="flex-1 overflow-y-auto p-4 md:p-10 bg-slate-200 animate-in fade-in duration-500 shadow-inner">
          
          {/* LÓGICA DE RUTAS INTERNAS (CORREGIDA Y BLINDADA) */}
          {menuActivo === 'dashboard' && <DashboardAdmin permisos={permisos} />}
          
          {permisos.formularios && menuActivo === 'formularios' && <FormulariosAdmin />}
          {permisos.noticias && menuActivo === 'noticias' && <NoticiasAdmin />}
          {permisos.documentos && menuActivo === 'documentos' && <DocumentosAdmin />}
          {permisos.mercado && menuActivo === 'mercado' && <MercadoAdmin />}
          {permisos.reservas && menuActivo === 'reservas' && <ReservasAdmin />} 
          {permisos.salas && menuActivo === 'salas' && <SalasVirtualesAdmin />}
          {permisos.comunicaciones && menuActivo === 'comunicaciones' && <ComunicacionesAdmin />}
          {permisos.convivencia && menuActivo === 'convivencia' && <GestionConvivencia />}
          {permisos.pagos && menuActivo === 'pagos' && <CanalesPagoAdmin />}
          {permisos.tiempos_pqr && menuActivo === 'PqrsParametrosAdmin' && <PqrsParametrosAdmin />}
          {permisos.zonas && menuActivo === 'zonas' && <ZonasComunesAdmin />}
          {menuActivo === 'faq' && <PreguntasFrecuentesAdmin />}
          {permisos.fqr && menuActivo === 'fqr' && <FqrAdmin />}
          {menuActivo === 'portada' && <ConfiguracionAdmin permisos={permisos} />}
          
          {/* Módulos Core siempre activos si son seleccionados */}
          {menuActivo === 'disenoLogin' && <DisenoLoginAdmin />}
          {menuActivo === 'control' && <AdminParqueadero copropiedadId={sessionStorage.getItem('copropiedad_id')} />}
          

        </div>
      </main>
    </div>
  );
}

                    