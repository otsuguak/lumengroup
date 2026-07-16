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
      .eq('email', email) // Coincide con tu tabla
      .single();

    if (dbError || !funcionario) {
      setError("No tienes permisos de acceso en la tabla de funcionarios.");
      await supabase.auth.signOut();
    } else {
      console.log("✅ Acceso concedido para:", funcionario.nombre);
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-lumenPrimary">LumenGroup</h2>
          <p className="text-gray-500 mt-2">Portal Administrativo</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {error && <p className="bg-red-50 text-red-500 p-3 rounded-lg text-sm border border-red-100">{error}</p>}
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Correo Electrónico</label>
            <input 
              type="email" 
              required 
              className="mt-1 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lumenPrimary outline-none transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)} // CORRECCIÓN AQUÍ
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Contraseña</label>
            <input 
              type="password" 
              required 
              className="mt-1 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lumenPrimary outline-none transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button 
            type="submit"
            className="w-full py-3 bg-lumenPrimary text-white rounded-lg font-bold hover:bg-blue-700 shadow-lg transition-all"
          >
            Ingresar al Sistema
          </button>
        </form>
      </div>
    </div>
  );
}