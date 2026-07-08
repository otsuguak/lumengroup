import { useEffect, useRef, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from './supabase'; 
import Swal from 'sweetalert2';
import OneSignal from 'react-onesignal'; // 🔥 1. IMPORTAMOS ONESIGNAL AQUÍ

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
    
    if (!limiteTiempoRef.current || location.pathname === '/login' || location.pathname === '/') {
      return;
    }

    timerRef.current = setTimeout(() => {
      cerrarSesion();
    }, limiteTiempoRef.current);
  }, [location.pathname, cerrarSesion]);

  useEffect(() => {
    const verificarRolParaTimeout = async () => {
      if (location.pathname === '/login' || location.pathname === '/') {
        limiteTiempoRef.current = null;
        if (timerRef.current) clearTimeout(timerRef.current);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: perfil } = await supabase.from('usuarios').select('rol').eq('id', session.user.id).maybeSingle();
        const rolActual = perfil?.rol || session.user.user_metadata?.rol || 'usuario';
        
        const minutosDeGracia = (rolActual === 'agente' || rolActual === 'vigilante') ? 15 : 60;
        limiteTiempoRef.current = minutosDeGracia * 60 * 1000; 
        
        reiniciarTemporizador();
      }
    };

    verificarRolParaTimeout();
  }, [location.pathname, reiniciarTemporizador]);

  useEffect(() => {
    let bloqueadorDeExceso = false; 

    const detectarActividad = () => {
      if (!bloqueadorDeExceso) {
        reiniciarTemporizador();
        bloqueadorDeExceso = true;
        setTimeout(() => { bloqueadorDeExceso = false; }, 2000); 
      }
    };

    const eventos = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    eventos.forEach(evento => window.addEventListener(evento, detectarActividad));

    return () => {
      eventos.forEach(evento => window.removeEventListener(evento, detectarActividad));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [reiniciarTemporizador]);

  return null; 
}

// =======================================================
// 🚀 APLICACIÓN PRINCIPAL
// =======================================================
function App() {

  // 🔥 2. EL MOTOR DE NOTIFICACIONES MULTI-TENANT
  useEffect(() => {
    const iniciarNotificaciones = async () => {
      try {
        const dominioActual = window.location.hostname;
        
        // Vamos a Supabase y preguntamos: "¿Cuál es el código OneSignal para este dominio?"
        const { data: cliente } = await supabase
          .from('clientes_saas')
          .select('onesignal_app_id')
          .eq('dominio', dominioActual)
          .maybeSingle();

        // Si el conjunto tiene un código guardado, ¡prendemos las notificaciones!
        if (cliente && cliente.onesignal_app_id) {
          await OneSignal.init({
            appId: cliente.onesignal_app_id,
            allowLocalhostAsSecureOrigin: true, // Esto deja que funcione en tu PC de pruebas
          });
          
          // Le mostramos la ventanita al usuario pidiendo permiso
          OneSignal.Slidedown.promptPush();
        }
      } catch (error) {
        console.error("Error iniciando OneSignal:", error);
      }
    };

    iniciarNotificaciones();
  }, []);

  return (
    <Router>
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