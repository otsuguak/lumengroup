import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabaseClient';

// Importación de Páginas
import Home from './pages/Home';
import Login from './pages/Login';
import Directorio from './pages/Directorio';
import Dashboard from './pages/Dashboard';
import Copropiedades from './pages/Copropiedades';
import ClientesSaaS from './pages/ClientesSaaS';
import GestionClientes from './pages/GestionClientes';
import Pitch from './pages/Pitch';

// 🛡️ EL GUARDIA DE SEGURIDAD (COMPONENTE NUEVO)
// Si no hay sesión, te patea de vuelta al login
const ProtectedRoute = ({ children }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Revisa si hay una sesión activa al cargar
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Escucha si el usuario cierra sesión para sacarlo inmediatamente
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-lumenPrimary font-bold">Cargando seguridad...</div>;
  
  if (!session) return <Navigate to="/login" replace />; // Bloqueo total

  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* RUTAS PÚBLICAS (Cualquiera puede verlas) */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/directorio" element={<Directorio />} />

        {/* 🔒 RUTAS PRIVADAS (Solo entras si el Guardia te deja) */}
        <Route path="/dashboard" element={ <ProtectedRoute><Dashboard /></ProtectedRoute> } />
        <Route path="/copropiedades" element={ <ProtectedRoute><Copropiedades /></ProtectedRoute> } />
        <Route path="/clientes" element={ <ProtectedRoute><ClientesSaaS /></ProtectedRoute> } />
        <Route path="/gestion-clientes" element={ <ProtectedRoute><GestionClientes /></ProtectedRoute> } />
        <Route path="/propuesta-comercial" element={<Pitch />} />
        {/* Aquí agregaremos la de Cliente SaaS más adelante */}
        {/* <Route path="/clientes" element={ <ProtectedRoute><ClientesSaaS /></ProtectedRoute> } /> */}
      </Routes>
    </Router>
  );
}

export default App;