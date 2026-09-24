import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);

    // 1. Intentamos autenticar con el sistema de Supabase
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError("Credenciales incorrectas o usuario no registrado en Auth.");
      return;
    }

    // 2. Verificamos que el usuario exista en tu tabla de "funcionarios_lumen"
    const { data: funcionario, error: dbError } = await supabase
      .from('funcionarios_lumen')
      .select('*')
      .eq('email', email)
      .single();

    if (dbError || !funcionario) {
      setError("No tienes permisos de acceso en la tabla de funcionarios.");
      await supabase.auth.signOut();
      return;
    }

    console.log("✅ Acceso concedido en tabla funcionarios para:", funcionario.nombre);

    // 🚀 EL ENRUTADOR INTELIGENTE (BLINDADO CONTRA ERRORES DE DATO)
    if (funcionario.nit) {
      // Limpiamos espacios basura que puedan romper la igualdad
      const nitLimpio = String(funcionario.nit).trim();
      console.log(`🔍 Buscando copropiedad con NIT exacto: "${nitLimpio}"`);

      // Usamos maybeSingle() para que no colapse si hay NITs duplicados en tus pruebas
      const { data: copropiedad, error: coproError } = await supabase
        .from('copropiedades')
        .select('id, cliente_saas_id')
        .eq('nit', nitLimpio)
        .maybeSingle(); 

      console.log("📦 Resultado del cruce con copropiedades:", copropiedad);
      if (coproError) console.log("⚠️ Error interno de Supabase al buscar:", coproError);

      if (copropiedad) {
        console.log("🏢 ¡MATCH EXACTO! Redirigiendo a Dashboard Admin...");
        sessionStorage.setItem('admin_nit', nitLimpio);
        sessionStorage.setItem('admin_copropiedad_id', copropiedad.id);
        sessionStorage.setItem('admin_saas_id', copropiedad.cliente_saas_id);
        
        navigate('/dashboard-admin');
        return; 
      } else {
        console.log("❌ FALLO: El NIT está en funcionarios, pero NO se encontró ninguna copropiedad con ese NIT exacto.");
      }
    }

    // 3. Flujo Tradicional
    console.log("👤 Funcionario estándar. Redirigiendo a Dashboard normal...");
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-blue-600">LumenGroup</h2>
          <p className="text-gray-500 mt-2">Portal de Acceso</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {error && <p className="bg-red-50 text-red-500 p-3 rounded-lg text-sm border border-red-100 font-medium">{error}</p>}
          
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Correo Electrónico</label>
            <input 
              type="email" 
              required 
              className="mt-1 w-full p-4 border border-gray-200 bg-slate-50 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Contraseña</label>
            <input 
              type="password" 
              required 
              className="mt-1 w-full p-4 border border-gray-200 bg-slate-50 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button 
            type="submit"
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-black hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all"
          >
            Ingresar al Sistema
          </button>
        </form>
      </div>
    </div>
  );
}