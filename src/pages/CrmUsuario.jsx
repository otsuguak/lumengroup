import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

import ReservasResidente from '../components/ReservasResidente';
import PqrsResidente from '../components/PqrsResidente';
import DashboardResidente from '../components/DashboardResidente';
import PorteriaResidente from '../components/PorteriaResidente'; 
import LlamadosResidente from '../components/LlamadosResidente';
import PqrsStaff from '../components/PqrsStaff';

export default function CrmUsuario() {
  const navigate = useNavigate(); 
  const [menuActivo, setMenuActivo] = useState('inicio'); 
  const [sidebarAbierta, setSidebarAbierta] = useState(false);
  
  const [usuario, setUsuario] = useState(null);
  const [datosDb, setDatosDb] = useState(null); 
  const [permisos, setPermisos] = useState(null);
  const [cargando, setCargando] = useState(true);

  // 🔥 ESTADO DE SEGURIDAD PARA SABER SI ES STAFF
  const [isStaff, setIsStaff] = useState(false);

  useEffect(() => {
    validarSesionYPermisos();
  }, []);

  const validarSesionYPermisos = async () => {
    try {
      const { data: { session }, error: errorAuth } = await supabase.auth.getSession();
      
      if (errorAuth || !session) {
        navigate('/login');
        return;
      }

      setUsuario(session.user);
      
      let idCopropiedad = session.user.user_metadata?.copropiedad_id || sessionStorage.getItem('copropiedad_id');
      
      if (!idCopropiedad) {
        await supabase.auth.signOut();
        navigate('/login');
        return;
      }
      
      sessionStorage.setItem('copropiedad_id', idCopropiedad);

      // Traer datos del usuario (inmueble y nombre)
      const { data: userData } = await supabase
        .from('usuarios')
        .select('inmueble, nombre') 
        .eq('id', session.user.id)
        .single();
      
      setDatosDb(userData);

      // 🔥 MAGIA: VERIFICAR SI ES STAFF CON COMPARACIÓN BLINDADA 🔥
      const { data: configData } = await supabase
        .from('configuracion')
        .select('codigo_staff')
        .eq('copropiedad_id', idCopropiedad)
        .maybeSingle();

      const inmuebleUsuario = String(userData?.inmueble || '').trim().toLowerCase();
      const codigoMaestro = String(configData?.codigo_staff || '').trim().toLowerCase();
      const esColaborador = (codigoMaestro !== '' && inmuebleUsuario === codigoMaestro);
      
      setIsStaff(esColaborador);

      // Si es Staff, forzamos que arranque en 'pqrs'
      if (esColaborador) {
        setMenuActivo('pqrs');
      }

      // Traer permisos del conjunto
      const { data: clienteSaaS } = await supabase
        .from('clientes_saas')
        .select('*')
        .eq('copropiedad_id', idCopropiedad)
        .maybeSingle();

      if (clienteSaaS) {
        setPermisos({
          reservas: clienteSaaS.mod_reservas || clienteSaaS.mod_zonas,
          formularios: clienteSaaS.mod_formularios,
          llamados: clienteSaaS.mod_convivencia 
        });
      } else {
        setPermisos({ reservas: false, formularios: false, llamados: false });
      }

    } catch (error) {
      console.error("Error cargando perfil de usuario:", error);
    } finally {
      setCargando(false);
    }
  };

  const cambiarMenu = (menu) => {
    setMenuActivo(menu);
    setSidebarAbierta(false); 
  };

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    sessionStorage.removeItem('copropiedad_id');
    navigate('/login');
  };

  if (cargando) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-50 text-indigo-900">
        <div className="w-14 h-14 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-6"></div>
        <p className="font-black uppercase tracking-[0.3em] text-xs animate-pulse">Cargando Mi Portal...</p>
      </div>
    );
  }

  if (!permisos) return null;

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      
      {sidebarAbierta && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-20 md:hidden transition-opacity" 
          onClick={() => setSidebarAbierta(false)}
        ></div>
      )}

      {/* SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-30 w-72 bg-white text-slate-800 flex flex-col shadow-[10px_0_30px_rgba(0,0,0,0.05)] transition-transform duration-300 ease-in-out md:relative md:translate-x-0 border-r border-slate-100 ${sidebarAbierta ? 'translate-x-0' : '-translate-x-full'}`}>
        
        <div className="p-8 flex justify-between items-center bg-white">
          <div>
            <h2 className="text-2xl font-black tracking-tighter text-slate-800 uppercase">
              {isStaff ? 'Portal' : 'Mi'} <span className="text-indigo-600 font-light italic">{isStaff ? 'Staff' : 'Portal'}</span>
            </h2>
            <p className="text-[9px] text-slate-400 mt-2 font-bold tracking-[0.2em] uppercase">
              {isStaff ? 'Panel de Colaborador' : 'Panel Residente'}
            </p>
          </div>
          <button 
            className="md:hidden text-slate-400 hover:text-red-500 text-3xl" 
            onClick={() => setSidebarAbierta(false)}
          >
            &times;
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto no-scrollbar">
          <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Navegación</p>
          
          {/* 🔥 ESCONDEMOS EL INICIO SI ES STAFF 🔥 */}
          {!isStaff && (
            <button onClick={() => cambiarMenu('inicio')} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 ${menuActivo === 'inicio' ? 'bg-indigo-50 text-indigo-700 font-black' : 'text-slate-500 font-bold hover:bg-slate-50'}`}>
              <span className="text-xl">🏠</span>
              <span className="text-sm tracking-tight">Inicio</span>
            </button>
          )}

          {/* PQRS (Bandeja de Casos para el Staff) */}
          <button onClick={() => cambiarMenu('pqrs')} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 ${menuActivo === 'pqrs' ? 'bg-indigo-50 text-indigo-700 font-black' : 'text-slate-500 font-bold hover:bg-slate-50'}`}>
            <span className="text-xl">📋</span>
            <span className="text-sm tracking-tight">{isStaff ? 'Bandeja de Casos' : 'Mis Solicitudes'}</span>
          </button>

          {/* 🔥 SECCIÓN EXCLUSIVA RESIDENTES (OCULTA PARA STAFF) 🔥 */}
          {!isStaff && (
            <>
              <button onClick={() => cambiarMenu('porteria')} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 ${menuActivo === 'porteria' ? 'bg-indigo-50 text-indigo-700 font-black' : 'text-slate-500 font-bold hover:bg-slate-50'}`}>
                <span className="text-xl">🛎️</span>
                <span className="text-sm tracking-tight">Portería y Visitas</span>
              </button>

              {permisos.llamados && (
                <button onClick={() => cambiarMenu('llamados')} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 ${menuActivo === 'llamados' ? 'bg-red-50 text-red-600 font-black' : 'text-slate-500 font-bold hover:bg-slate-50'}`}>
                  <span className="text-xl">🚨</span>
                  <span className="text-sm tracking-tight">Convivencia</span>
                </button>
              )}
                        
              {permisos.reservas && (
                <button onClick={() => cambiarMenu('reservas')} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 ${menuActivo === 'reservas' ? 'bg-indigo-50 text-indigo-700 font-black' : 'text-slate-500 font-bold hover:bg-slate-50'}`}>
                  <span className="text-xl">📅</span>
                  <span className="text-sm tracking-tight">Mis Reservas</span>
                </button>
              )}
            </>
          )}

          <div className="mt-8 pt-8 border-t border-slate-100">
              <button 
                  onClick={cerrarSesion}
                  className="w-full flex items-center gap-4 px-4 py-3 text-red-500 hover:bg-red-50 transition-all duration-300 rounded-2xl font-bold"
              >
                  <span className="text-xl">🚪</span>
                  <span className="text-sm tracking-tight">Cerrar Sesión</span>
              </button>
          </div>
        </nav>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        {/* Header Superior */}
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/50 px-8 py-4 flex justify-between items-center z-10 sticky top-0">
          <div className="flex items-center gap-4">
            <button 
                className="md:hidden text-slate-600 hover:text-indigo-600 text-3xl p-1" 
                onClick={() => setSidebarAbierta(true)}
            >
                ☰
            </button>
            <div className="hidden sm:block">
                <h1 className="text-xl font-black text-slate-800 tracking-tight leading-none">
                  {menuActivo === 'inicio' && 'Resumen General'}
                  {menuActivo === 'porteria' && 'Bitácora de Portería'}
                  {menuActivo === 'reservas' && 'Agendamiento de Zonas'}
                  {menuActivo === 'pqrs' && (isStaff ? 'Bandeja Operativa' : 'Atención al Residente')}
                  {menuActivo === 'llamados' && 'Novedades de Convivencia'}
                </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-3 bg-white p-1.5 pr-5 rounded-full border border-slate-200 shadow-sm">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-black shadow-inner ${isStaff ? 'bg-slate-800' : 'bg-indigo-600'}`}>
              {datosDb?.nombre ? datosDb.nombre.charAt(0) : '👤'}
            </div>
            <div className="hidden md:block text-right">
              <p className={`text-[10px] font-black uppercase tracking-widest leading-none mb-1 ${isStaff ? 'text-slate-800' : 'text-indigo-600'}`}>
                {isStaff ? 'STAFF / ASESOR' : `Apto ${datosDb?.inmueble || 'N/A'}`}
              </p>
              <p className="text-xs font-bold text-slate-600 truncate max-w-[120px] leading-none">
                {datosDb?.nombre || usuario?.email?.split('@')[0]}
              </p>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 animate-in fade-in duration-500 bg-slate-50">
          {/* Si es Staff y está en Inicio, no renderizamos Dashboard */}
          {menuActivo === 'inicio' && !isStaff && <DashboardResidente />}
          
          {/* Aquí inyectamos el componente correcto de PQRS */}
          {menuActivo === 'pqrs' && (isStaff ? <PqrsStaff /> : <PqrsResidente />)}
          
          {/* Protección extra para el Staff */}
          {!isStaff && (
            <>
              {menuActivo === 'porteria' && <PorteriaResidente />}
              {menuActivo === 'reservas' && <ReservasResidente />}
              {menuActivo === 'llamados' && <LlamadosResidente />}
            </>
          )}
        </div>
      </main>
    </div>
  );
}