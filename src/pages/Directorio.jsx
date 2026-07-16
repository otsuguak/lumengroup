import { useState } from 'react';
import Navbar from '../components/Navbar';
import AdminCard from '../components/AdminCard';

export default function Directorio() {
  const [selectedAdmin, setSelectedAdmin] = useState(null);

  // Estos datos vendrán luego de tu tabla de Supabase
  const administradores = [
    {
      id: 'cesar',
      nombre: "César Augusto",
      rol: "Administrador Senior",
      experiencia: "12 Años",
      ubicacion: "Bogotá",
      biografia_corta: "Experto en recuperación de cartera y gestión de conflictos.",
      actual: "Administrador en Conjunto El Dorado (300 unidades).",
      wsp: "573112842245"
    },
    // Agrega más aquí...
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      {/* Hero del Directorio */}
      <header className="bg-lumenPrimary py-16 text-center text-white">
        <h1 className="text-4xl font-bold">Red de Administradores Certificados</h1>
        <p className="mt-2 text-blue-100">Profesionales avalados por la tecnología de LumenGroup</p>
      </header>

      {/* Grid de Tarjetas */}
      <main className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {administradores.map(admin => (
            <AdminCard 
              key={admin.id} 
              admin={admin} 
              onOpen={(data) => setSelectedAdmin(data)} 
            />
          ))}
        </div>
      </main>

      {/* Modal tipo LinkedIn */}
      {selectedAdmin && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-8 shadow-2xl relative animate-in fade-in zoom-in duration-300">
            <button 
              onClick={() => setSelectedAdmin(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl"
            >
              &times;
            </button>
            
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">{selectedAdmin.nombre}</h2>
              <span className="text-lumenPrimary font-bold uppercase text-sm">{selectedAdmin.rol}</span>
            </div>

            <div className="space-y-4">
              <section>
                <h4 className="text-lumenPrimary font-bold flex items-center gap-2">Situación Actual</h4>
                <p className="text-gray-600 text-sm leading-relaxed">{selectedAdmin.actual}</p>
              </section>
              <section>
                <h4 className="text-lumenPrimary font-bold flex items-center gap-2">WhatsApp Directo</h4>
                <a 
                  href={`https://wa.me/${selectedAdmin.wsp}`}
                  target="_blank" 
                  className="mt-2 flex items-center justify-center gap-2 bg-green-500 text-white py-3 rounded-xl font-bold hover:bg-green-600 transition-colors"
                >
                  Contactar por WhatsApp
                </a>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}