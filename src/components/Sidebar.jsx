import { LayoutDashboard, Building2, Users, Settings, LogOut } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation(); // Esto nos dice en qué página estamos

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  // Función para saber si un botón debe estar azul o gris
  const isActive = (path) => location.pathname === path;

  return (
    <aside className="w-64 bg-white h-screen border-r border-gray-200 flex flex-col sticky top-0 shadow-sm z-40">
      <div className="p-6 border-b border-gray-100 flex items-center gap-3">
        <div className="w-10 h-10 bg-lumenPrimary rounded-xl flex items-center justify-center text-white font-black text-xl shadow-md">
          L
        </div>
        <span className="text-xl font-black text-gray-800 tracking-tight">Lumen Portal</span>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        <p className="px-3 text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 mt-2">Principal</p>
        
        <Link 
          to="/dashboard" 
          className={`flex items-center gap-3 p-3 rounded-xl font-semibold transition-all ${isActive('/dashboard') ? 'bg-blue-50 text-lumenPrimary' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <LayoutDashboard size={20} /> Dashboard
        </Link>
        
        <Link 
          to="/gestion-clientes" 
          className={`flex items-center gap-3 p-3 rounded-xl font-semibold transition-all ${isActive('/gestion-clientes') ? 'bg-blue-50 text-lumenPrimary' : 'text-gray-500 hover:bg-gray-50'}`}
        >
           <Building2 size={20} /> Gestión Clientes
        </Link>
       
        <Link 
          to="/propuesta-comercial" 
          className={`flex items-center gap-3 p-3 rounded-xl font-semibold transition-all ${isActive('/propuesta-comercial') ? 'bg-blue-50 text-lumenPrimary' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <i className="fa-solid fa-file-invoice-dollar text-brand-accent"></i>
          <span>Propuesta Vecindaria</span>
        </Link>

        <div className="pt-4 mt-4 border-t border-gray-100">
          <Link 
            to="/configuracion" 
            className={`flex items-center gap-3 p-3 rounded-xl font-semibold transition-all ${isActive('/configuracion') ? 'bg-blue-50 text-lumenPrimary' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <Settings size={20} /> Configuración
          </Link>
        </div>
      </nav>


      <div className="p-4 border-t border-gray-100">
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 p-3 w-full text-red-500 hover:bg-red-50 rounded-xl transition-all font-bold"
        >
          <LogOut size={20} /> Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}