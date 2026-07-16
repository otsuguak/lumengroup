import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import { supabase } from '../lib/supabaseClient';
import { Building2, Save, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function Copropiedades() {
  const [formData, setFormData] = useState({
    nombre: '',
    direccion: '',
    unidades: '',
    ciudad: ''
  });
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMensaje({ tipo: '', texto: '' });

    // Inserción en Supabase (Asegúrate de que tu tabla se llame 'copropiedades')
    const { error } = await supabase
      .from('copropiedades')
      .insert([
        { 
          nombre: formData.nombre, 
          direccion: formData.direccion, 
          unidades: parseInt(formData.unidades),
          ciudad: formData.ciudad
        }
      ]);

    if (error) {
      setMensaje({ tipo: 'error', texto: 'Hubo un error al guardar: ' + error.message });
    } else {
      setMensaje({ tipo: 'exito', texto: '¡Copropiedad registrada con éxito!' });
      setFormData({ nombre: '', direccion: '', unidades: '', ciudad: '' }); // Limpiar formulario
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-lumenGray">
      {/* El Sidebar se oculta en móviles muy pequeños por ahora, luego le haremos un menú hamburguesa */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      <main className="flex-1 p-4 md:p-8 w-full max-w-5xl mx-auto">
        <header className="mb-8 flex items-center gap-3">
          <div className="bg-lumenPrimary p-3 rounded-xl text-white shadow-md">
            <Building2 size={24} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-lumenDark">Gestión de Copropiedades</h1>
            <p className="text-gray-500 text-sm md:text-base">Registra y administra los conjuntos residenciales.</p>
          </div>
        </header>

        {/* Contenedor del Formulario Responsivo */}
        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-200">
          <h2 className="text-xl font-bold mb-6 text-lumenDark border-b pb-4">Registrar Nueva Copropiedad</h2>

          {mensaje.texto && (
            <div className={`p-4 mb-6 rounded-xl flex items-center gap-3 ${mensaje.tipo === 'error' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>
              {mensaje.tipo === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
              <span className="font-medium">{mensaje.texto}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Grid que en celular es 1 columna y en PC son 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre del Conjunto/Edificio</label>
                <input 
                  type="text" 
                  name="nombre"
                  required
                  value={formData.nombre}
                  onChange={handleChange}
                  className="w-full p-3 md:p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-lumenPrimary outline-none transition-all"
                  placeholder="Ej: Conjunto Residencial Los Pinos"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Ciudad</label>
                <input 
                  type="text" 
                  name="ciudad"
                  required
                  value={formData.ciudad}
                  onChange={handleChange}
                  className="w-full p-3 md:p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-lumenPrimary outline-none transition-all"
                  placeholder="Ej: Bogotá"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Dirección</label>
                <input 
                  type="text" 
                  name="direccion"
                  required
                  value={formData.direccion}
                  onChange={handleChange}
                  className="w-full p-3 md:p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-lumenPrimary outline-none transition-all"
                  placeholder="Ej: Cra 45 # 104 - 12"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Número de Unidades</label>
                <input 
                  type="number" 
                  name="unidades"
                  required
                  min="1"
                  value={formData.unidades}
                  onChange={handleChange}
                  className="w-full p-3 md:p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-lumenPrimary outline-none transition-all"
                  placeholder="Ej: 300"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 flex justify-end">
              <button 
                type="submit" 
                disabled={loading}
                className="w-full md:w-auto flex items-center justify-center gap-2 bg-lumenPrimary text-white px-8 py-4 rounded-xl font-bold hover:bg-blue-700 shadow-lg hover:shadow-blue-200 transition-all disabled:opacity-70"
              >
                <Save size={20} />
                {loading ? 'Guardando...' : 'Guardar Copropiedad'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}