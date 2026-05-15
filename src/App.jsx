import { useEffect, useRef, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from './supabase'; // Asegúrate de que la ruta sea correcta si tu supabase.js está en /src
import Swal from 'sweetalert2';

import PortalComunitario from './pages/PortalComunitario';
import CrmAdmin from './pages/CrmAdmin';
import Login from './pages/Login'; 
import CrmUsuario from './pages/CrmUsuario';
import CRMVigilante from './pages/CrmVigilante'; 

// =======================================================
// 🛡️ COMPONENTE GUARDIÁN DE SEGURIDAD (CIERRE AUTOMÁTICO)
// =======================================================
function GuardianInactividad() {
  const navigate = useNavigate();
  const location = useLocation();
  const timerRef = useRef(null);
  const limiteTiempoRef = useRef(null); 

  const cerrarSesion = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase.auth.signOut();
      sessionStorage.clear();
      Swal.fire({
        icon: 'warning',
        title: 'Sesión Expirada ⏱️',
        text: 'Por seguridad del conjunto, hemos cerrado tu sesión por inactividad.',
        confirmButtonColor: '#3b82f6',
        confirmButtonText: 'Volver a ingresar'
      });
      navigate('/login');
    }
  }, [navigate]);

  const reiniciarTemporizador = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    
    // Si estamos en la página pública o en el login, no hacemos nada
    if (!limiteTiempoRef.current || location.pathname === '/login' || location.pathname === '/') {
      return;
    }

    // Volver a iniciar el conteo
    timerRef.current = setTimeout(() => {
      cerrarSesion();
    }, limiteTiempoRef.current);
  }, [location.pathname, cerrarSesion]);

  // Efecto 1: Saber qué Rol es el usuario cuando entra a sus paneles
  useEffect(() => {
    const verificarRolParaTimeout = async () => {
      if (location.pathname === '/login' || location.pathname === '/') {
        limiteTiempoRef.current = null;
        if (timerRef.current) clearTimeout(timerRef.current);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Averiguamos el rol para darle el tiempo justo
        const { data: perfil } = await supabase.from('usuarios').select('rol').eq('id', session.user.id).maybeSingle();
        const rolActual = perfil?.rol || session.user.user_metadata?.rol || 'usuario';
        
        // ⏳ 15 minutos para Staff (Admin/Vigilante) | 60 minutos para Residentes
        const minutosDeGracia = (rolActual === 'agente' || rolActual === 'vigilante') ? 15 : 60;
        limiteTiempoRef.current = minutosDeGracia * 60 * 1000; 
        
        reiniciarTemporizador();
      }
    };

    verificarRolParaTimeout();
  }, [location.pathname, reiniciarTemporizador]);

  // Efecto 2: Escuchar si el usuario mueve el mouse, hace clic o escribe
  useEffect(() => {
    let bloqueadorDeExceso = false; // Para no sobrecargar el navegador con cada milímetro que muevan el mouse

    const detectarActividad = () => {
      if (!bloqueadorDeExceso) {
        reiniciarTemporizador();
        bloqueadorDeExceso = true;
        // Solo vuelve a reiniciar el timer cada 2 segundos aunque muevan mucho el mouse
        setTimeout(() => { bloqueadorDeExceso = false; }, 2000); 
      }
    };

    // Eventos que significan que la persona sigue ahí
    const eventos = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    eventos.forEach(evento => window.addEventListener(evento, detectarActividad));

    return () => {
      eventos.forEach(evento => window.removeEventListener(evento, detectarActividad));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [reiniciarTemporizador]);

  return null; // Este componente es un escudo silencioso, no pinta nada visual.
}

// =======================================================
// 🚀 APLICACIÓN PRINCIPAL
// =======================================================
function App() {
  return (
    <Router>
      {/* Nuestro guardián debe estar dentro del Router para poder navegar al /login */}
      <GuardianInactividad /> 
      
      <Routes>
        <Route path="/" element={<PortalComunitario />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<CrmAdmin />} />
        <Route path="/panel-residente" element={<CrmUsuario />} />
        <Route path="/panel-vigilancia" element={<CRMVigilante />} />
      </Routes>
    </Router>
  );
}

export default App;