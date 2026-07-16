import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { supabase } from '../lib/supabaseClient';
import { 
  Users, UserPlus, Database, CheckCircle2, AlertCircle, 
  Loader2, Power, Eye, EyeOff, Mail, Phone, Calendar, 
  Settings2, ToggleRight
} from 'lucide-react';

export default function ClientesSaaS() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [showPassword, setShowPassword] = useState({});
  
  // 🎯 MAPEADO COMPLETO: Datos básicos + Módulos de activación (mod_)
  const [formData, setFormData] = useState({
    estado: true,
    plan: 'PRO',
    meses: '',
    valor_pagado: '',
    copropiedad: '',
    usuarios: '',
    link: '',
    db_name: '',
    usuario: '',
    contrasena: '',
    correo_admin: '',
    celular_admin: '',
    fecha_inicio: '',
    fecha_vencimiento: '',
    // Módulos que "prenden" la otra app
    mod_zonas: false,
    mod_pqrs: false,
    mod_comunicados: false,
    mod_reservas: false,
    mod_visitantes: false,
    mod_vehiculos: false,
    mod_mascotas: false,
    mod_documentos: false,
    mod_votaciones: false,
    mod_asambleas: false,
    mod_cartelera: false,
    mod_encuestas: false
  });

  useEffect(() => {
    fetchClientes();
  }, []);

  const fetchClientes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('cliente_sas')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) setClientes(data);
    setLoading(false);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMensaje({ tipo: '', texto: '' });

    const payload = {
      ...formData,
      valor_pagado: formData.valor_pagado ? parseInt(formData.valor_pagado) : 0,
      meses: formData.meses ? parseInt(formData.meses) : 0
    };

    const { error } = await supabase
      .from('cliente_sas')
      .insert([payload]);

    if (error) {
      setMensaje({ tipo: 'error', texto: 'Error al guardar: ' + error.message });
    } else {
      setMensaje({ tipo: 'exito', texto: '¡App enlazada y módulos configurados!' });
      // Resetear con valores por defecto
      setFormData({
        estado: true, plan: 'PRO', meses: '', valor_pagado: '', copropiedad: '', 
        usuarios: '', link: '', db_name: '', usuario: '', contrasena: '',
        correo_admin: '', celular_admin: '', fecha_inicio: '', fecha_vencimiento: '',
        mod_zonas: false, mod_pqrs: false, mod_comunicados: false, mod_reservas: false,
        mod_visitantes: false, mod_vehiculos: false, mod_mascotas: false, mod_documentos: false,
        mod_votaciones: false, mod_asambleas: false, mod_cartelera: false, mod_encuestas: false
      });
      fetchClientes();
    }
    setIsSubmitting(false);
  };

  const toggleEstado = async (id, estadoActual) => {
    const { error } = await supabase.from('cliente_sas').update({ estado: !estadoActual }).eq('id', id);
    if (!error) fetchClientes();
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50">
      <Sidebar />

      <main className="flex-1 p-6 md:p-10 w-full max-w-[1800px] mx-auto">
        <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-lumenPrimary p-3 rounded-2xl text-white shadow-lg shadow-blue-200">
              <Settings2 size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">Panel de Control Maestro</h1>
              <p className="text-gray-500 font-medium">Gestión de Clientes y Activación de Módulos App.</p>
            </div>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          {/* --- COLUMNA IZQUIERDA: DATOS Y CONEXIÓN --- */}
          <div className="xl:col-span-4 space-y-8">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2 tracking-tight">
                <UserPlus size={20} className="text-lumenPrimary" /> Registro General
              </h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-2xl border border-blue-100">
                  <span className="text-xs font-black text-lumenPrimary uppercase tracking-widest">Activar Aplicación</span>
                  <input type="checkbox" name="estado" checked={formData.estado} onChange={handleChange} className="w-6 h-6 accent-lumenPrimary cursor-pointer" />
                </div>

                <input type="text" name="copropiedad" required value={formData.copropiedad} onChange={handleChange} className="w-full p-4 bg-slate-50 border border-gray-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-lumenPrimary outline-none" placeholder="Nombre de la Copropiedad" />
                
                <div className="grid grid-cols-2 gap-4">
                  <input type="email" name="correo_admin" required value={formData.correo_admin} onChange={handleChange} className="w-full p-4 bg-slate-50 border border-gray-100 rounded-2xl text-xs font-medium outline-none" placeholder="Email Admin" />
                  <input type="text" name="celular_admin" required value={formData.celular_admin} onChange={handleChange} className="w-full p-4 bg-slate-50 border border-gray-100 rounded-2xl text-xs font-medium outline-none" placeholder="Celular" />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <select name="plan" value={formData.plan} onChange={handleChange} className="w-full p-4 bg-white border border-gray-100 rounded-2xl text-xs font-black text-gray-700">
                    <option value="START">START</option>
                    <option value="PRO">PRO</option>
                    <option value="MASTER">MASTER</option>
                  </select>
                  <input type="text" name="meses" required value={formData.meses} onChange={handleChange} className="w-full p-4 bg-slate-50 border border-gray-100 rounded-2xl text-xs font-medium" placeholder="Meses" />
                  <input type="number" name="valor_pagado" required value={formData.valor_pagado} onChange={handleChange} className="w-full p-4 bg-slate-50 border border-gray-100 rounded-2xl text-xs font-medium" placeholder="Valor $" />
                </div>
              </div>
            </div>

            <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-xl text-white">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Database size={20} className="text-blue-400" /> Parámetros Técnicos
              </h2>
              <div className="space-y-4">
                <input type="url" name="link" required value={formData.link} onChange={handleChange} className="w-full p-4 bg-white/10 border border-white/10 rounded-2xl text-sm font-medium outline-none text-blue-200 placeholder:text-gray-500" placeholder="URL de la Aplicación" />
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" name="db_name" required value={formData.db_name} onChange={handleChange} className="w-full p-4 bg-white/10 border border-white/10 rounded-2xl text-sm font-medium outline-none placeholder:text-gray-500" placeholder="Nombre DB" />
                  <input type="text" name="usuarios" required value={formData.usuarios} onChange={handleChange} className="w-full p-4 bg-white/10 border border-white/10 rounded-2xl text-sm font-medium outline-none placeholder:text-gray-500" placeholder="Cupos Usr." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" name="usuario" required value={formData.usuario} onChange={handleChange} className="w-full p-4 bg-white/10 border border-white/10 rounded-2xl text-sm font-medium outline-none placeholder:text-gray-500" placeholder="Usuario DB" />
                  <input type="text" name="contrasena" required value={formData.contrasena} onChange={handleChange} className="w-full p-4 bg-white/10 border border-white/10 rounded-2xl text-sm font-medium outline-none placeholder:text-gray-500" placeholder="Pass DB" />
                </div>
              </div>
            </div>
          </div>

          {/* --- COLUMNA CENTRAL: ACTIVACIÓN DE MÓDULOS (mod_) --- */}
          <div className="xl:col-span-8 space-y-8">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3 tracking-tight">
                  <ToggleRight size={28} className="text-lumenPrimary" /> Configuración de Módulos
                </h2>
                <span className="text-xs font-black text-gray-400 uppercase bg-slate-50 px-4 py-2 rounded-full">Interruptores de Función</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { name: 'mod_zonas', label: 'Zonas Comunes' },
                  { name: 'mod_reservas', label: 'Reservas' },
                  { name: 'mod_mercado', label: 'Mercado Inmobiliario' },
                  { name: 'mod_exportar', label: 'Exportar Excel' },
                  { name: 'mod_documentos', label: 'Documentos' },
                  { name: 'mod_pqrs', label: 'PQRS / Tickets' },
                  { name: 'mod_comunicados', label: 'Comunicados' },
                  { name: 'mod_visitantes', label: 'Visitantes' },
                  { name: 'mod_vehiculos', label: 'Vehículos' },
                  { name: 'mod_mascotas', label: 'Mascotas' },
                  { name: 'mod_votaciones', label: 'Votaciones' },
                  { name: 'mod_asambleas', label: 'Asambleas' },
                  { name: 'mod_cartelera', label: 'Cartelera' },
                  { name: 'mod_encuestas', label: 'Encuestas' }
                ].map((mod) => (
                  <label key={mod.name} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-gray-100 hover:border-lumenPrimary transition-all cursor-pointer group">
                    <span className="text-sm font-bold text-gray-700 group-hover:text-lumenPrimary">{mod.label}</span>
                    <input 
                      type="checkbox" 
                      name={mod.name} 
                      checked={formData[mod.name]} 
                      onChange={handleChange}
                      className="w-5 h-5 rounded-md accent-lumenPrimary"
                    />
                  </label>
                ))}
              </div>

              <div className="mt-10 pt-8 border-t border-gray-50 flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Verificación</span>
                  <p className="text-xs text-gray-500 font-medium">Los módulos marcados se habilitarán de inmediato en la App del residente.</p>
                </div>
                <button type="submit" disabled={isSubmitting} className="px-10 py-4 bg-lumenPrimary text-white rounded-2xl font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2">
                  {isSubmitting ? <Loader2 className="animate-spin" /> : 'Guardar y Prender Opciones'}
                </button>
              </div>
            </div>

            {/* TABLA DE CLIENTES ACTUALES */}
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 bg-slate-50/50 border-b border-gray-50 flex justify-between items-center">
                <h3 className="font-bold text-gray-800">Apps Enlazadas Actualmente</h3>
                <button onClick={fetchClientes} className="text-lumenPrimary hover:rotate-180 transition-transform duration-500">
                   <Loader2 size={20} />
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr>
                      <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                      <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Copropiedad</th>
                      <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Plan / Vence</th>
                      <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Módulos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {clientes.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/50">
                        <td className="p-4">
                          <button onClick={() => toggleEstado(c.id, c.estado)} className={`p-2 rounded-full ${c.estado ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
                            <Power size={18} />
                          </button>
                        </td>
                        <td className="p-4">
                          <p className="font-bold text-gray-800 text-sm">{c.copropiedad}</p>
                          <p className="text-[10px] text-gray-400 font-medium">{c.correo_admin}</p>
                        </td>
                        <td className="p-4">
                          <span className="text-xs font-black text-gray-700">{c.plan}</span>
                          <p className="text-[10px] text-red-400 font-bold">{c.fecha_vencimiento}</p>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-1 flex-wrap">
                            {c.mod_zonas && <span className="text-[8px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-black uppercase">Zonas</span>}
                            {c.mod_pqrs && <span className="text-[8px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-black uppercase">PQRS</span>}
                            {c.mod_reservas && <span className="text-[8px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-black uppercase">Res</span>}
                            {/* ... más tags si quieres ... */}
                            <span className="text-[8px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded font-black uppercase">...</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}