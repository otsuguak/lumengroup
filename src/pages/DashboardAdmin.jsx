import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, Power, UserCheck, KeyRound, LogOut, 
  MapPin, Phone, Calendar, ShieldCheck 
} from 'lucide-react';

export default function DashboardAdmin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [menuActivo, setMenuActivo] = useState('registro');
  
  // Datos cruzados de las dos tablas
  const [copropiedad, setCopropiedad] = useState(null);
  const [saas, setSaas] = useState(null);

  useEffect(() => {
    cargarDatosAdmin();
  }, []);

  const cargarDatosAdmin = async () => {
    setLoading(true);
    const coproId = sessionStorage.getItem('admin_copropiedad_id');
    const saasId = sessionStorage.getItem('admin_saas_id');

    if (!coproId || !saasId) {
      navigate('/login-admin');
      return;
    }

    // Traemos datos de la Copropiedad
    const { data: dataCopro } = await supabase
      .from('copropiedades')
      .select('*')
      .eq('id', coproId)
      .single();

    // Traemos datos del SaaS
    const { data: dataSaas } = await supabase
      .from('clientes_saas')
      .select('*')
      .eq('id', saasId)
      .single();

    setCopropiedad(dataCopro);
    setSaas(dataSaas);
    setLoading(false);
  };

  // Función para prender y apagar la opción de registro
  const toggleRegistro = async () => {
    const nuevoEstado = !saas.mod_registro;
    
    // Actualizamos en la base de datos (clientes_saas)
    const { error } = await supabase
      .from('clientes_saas')
      .update({ mod_registro: nuevoEstado })
      .eq('id', saas.id);

    if (!error) {
      // Actualizamos la vista inmediatamente
      setSaas({ ...saas, mod_registro: nuevoEstado });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    sessionStorage.clear();
    navigate('/login-admin');
  };

  if (loading || !copropiedad || !saas) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><p>Cargando portal...</p></div>;
  }

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      
      {/* ================= BARRA LATERAL (SIDEBAR) ================= */}
      <aside className="w-72 bg-white border-r border-gray-200 flex flex-col sticky top-0 h-screen">
        <div className="p-8 border-b border-gray-100">
          <h2 className="text-2xl font-black text-blue-600">Vecindaria</h2>
          <p className="text-xs text-gray-400 font-bold tracking-widest uppercase mt-1">Admin Panel</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => setMenuActivo('registro')}
            className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${menuActivo === 'registro' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-slate-50'}`}
          >
            <Power size={20} /> Control de App
          </button>
          <button 
            onClick={() => setMenuActivo('usuarios')}
            className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${menuActivo === 'usuarios' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-slate-50'}`}
          >
            <UserCheck size={20} /> Desbloquear Usuarios
          </button>
          <button 
            onClick={() => setMenuActivo('claves')}
            className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${menuActivo === 'claves' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-slate-50'}`}
          >
            <KeyRound size={20} /> Contraseñas
          </button>
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 p-4 text-red-500 hover:bg-red-50 rounded-2xl font-bold transition-all">
            <LogOut size={20} /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* ================= PANEL CENTRAL ================= */}
      <main className="flex-1 p-8 md:p-12 overflow-y-auto">
        
        {/* Encabezado y Bienvenida */}
        <header className="mb-10">
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">
            Hola, {copropiedad.representante} 👋
          </h1>
          <p className="text-gray-500 mt-2 font-medium text-lg">
            Administra la configuración de la app para <span className="text-blue-600 font-bold">{copropiedad.nombre}</span>.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Columna Izquierda: Información del Conjunto */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-slate-900 text-white p-8 rounded-[2rem] shadow-2xl">
              <h2 className="text-lg font-bold mb-6 border-b border-white/10 pb-4 flex items-center gap-2">
                <Building2 className="text-blue-400" /> Ficha Técnica
              </h2>
              <div className="space-y-5">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Conjunto</p>
                  <p className="font-bold text-lg">{copropiedad.nombre}</p>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin size={18} className="text-gray-400" />
                  <span className="text-sm font-medium">{copropiedad.direccion}, {copropiedad.ciudad}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone size={18} className="text-gray-400" />
                  <span className="text-sm font-medium">{copropiedad.telefono_contacto}</span>
                </div>
                <div className="pt-4 border-t border-white/10 flex items-center gap-3">
                  <Calendar size={18} className="text-blue-400" />
                  <span className="text-xs font-medium text-blue-200">
                    Contrato firmado el: {new Date(copropiedad.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Controles Dinámicos */}
          <div className="lg:col-span-2">
            
            {menuActivo === 'registro' && (
              <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
                <h2 className="text-xl font-black text-gray-900 mb-2">Control de Registro (App)</h2>
                <p className="text-gray-500 mb-8 text-sm">Prende o apaga el formulario de registro para nuevos residentes de tu conjunto.</p>
                
                <div className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-gray-100">
                  <div className="flex items-center gap-4">
                    <div className={`p-4 rounded-xl ${saas.mod_registro ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
                      <ShieldCheck size={28} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg">Mostrar Registro en App</h3>
                      <p className="text-sm text-gray-500 font-medium">Estado actual: {saas.mod_registro ? 'Prendido (Visible)' : 'Apagado (Oculto)'}</p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={toggleRegistro}
                    className={`relative w-20 h-10 rounded-full transition-colors duration-300 ${saas.mod_registro ? 'bg-green-500' : 'bg-gray-300'}`}
                  >
                    <div className={`absolute top-1 left-1 w-8 h-8 bg-white rounded-full transition-transform duration-300 shadow-md ${saas.mod_registro ? 'translate-x-10' : 'translate-x-0'}`}></div>
                  </button>
                </div>
              </div>
            )}

            {menuActivo === 'usuarios' && (
              <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 flex items-center justify-center min-h-[300px]">
                <p className="text-gray-400 font-bold">Módulo de Desbloqueo de Usuarios en construcción 🚧</p>
              </div>
            )}

            {menuActivo === 'claves' && (
              <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 flex items-center justify-center min-h-[300px]">
                <p className="text-gray-400 font-bold">Módulo de Gestión de Contraseñas en construcción 🚧</p>
              </div>
            )}

          </div>
        </div>

      </main>
    </div>
  );
}