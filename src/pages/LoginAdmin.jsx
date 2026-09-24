import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

export default function LoginAdmin() {
  const [nit, setNit] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 1. Buscamos la copropiedad usando el NIT para obtener sus datos relacionales
      const { data: copropiedad, error: dbError } = await supabase
        .from('copropiedades')
        .select('*, clientes_saas(correo_admin)')
        .eq('nit', nit)
        .single();

      if (dbError || !copropiedad) {
        throw new Error("No encontramos ningún conjunto registrado con este NIT.");
      }

      // 2. Extraemos el correo vinculado a ese conjunto (puedes ajustarlo si está en funcionarios_lumen)
      const correoUsuario = copropiedad.clientes_saas?.correo_admin; 

      if (!correoUsuario) {
        throw new Error("Este conjunto no tiene un correo de administrador configurado.");
      }

      // 3. Autenticamos con Supabase Auth usando el correo rescatado y la contraseña ingresada
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: correoUsuario,
        password: password,
      });

      if (authError) {
        throw new Error("Contraseña incorrecta o acceso denegado.");
      }

      // 4. Guardamos el ID de la copropiedad en sessionStorage para que el Dashboard sepa a quién cargar
      sessionStorage.setItem('admin_copropiedad_id', copropiedad.id);
      sessionStorage.setItem('admin_saas_id', copropiedad.cliente_saas_id);
      
      navigate('/dashboard-admin');

    } catch (err) {
      setError(err.message);
      await supabase.auth.signOut();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-[2rem] shadow-xl border border-gray-100">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-blue-600">Vecindaria</h2>
          <p className="text-gray-500 mt-2 font-medium">Acceso de Administradores</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {error && <p className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-bold border border-red-100">{error}</p>}
          
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">NIT del Conjunto</label>
            <input 
              type="text" 
              required 
              className="mt-1 w-full p-4 bg-slate-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none transition-all"
              value={nit}
              onChange={(e) => setNit(e.target.value)}
              placeholder="Ej: 900123456"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Contraseña</label>
            <input 
              type="password" 
              required 
              className="mt-1 w-full p-4 bg-slate-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all flex justify-center items-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" /> : 'Ingresar al Portal'}
          </button>
        </form>
      </div>
    </div>
  );
}