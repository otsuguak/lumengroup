import Sidebar from '../components/Sidebar';
import { Bell, Info } from 'lucide-react';

export default function Dashboard() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      
      <main className="flex-1 p-8">
        {/* Cabecera del Dashboard */}
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bienvenido de nuevo, Administrador</h1>
            <p className="text-gray-500">Aquí tienes el resumen de LumenGroup hoy.</p>
          </div>
          <button className="relative p-2 bg-white border rounded-full hover:bg-gray-50 shadow-sm">
            <Bell size={20} className="text-gray-600" />
            <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 border-2 border-white rounded-full"></span>
          </button>
        </header>

        {/* Banner de Novedades */}
        <section className="bg-lumenPrimary rounded-3xl p-8 text-white flex justify-between items-center mb-10 shadow-lg shadow-blue-100">
          <div>
            <h2 className="text-3xl font-bold mb-2">Panel de Control Lumen</h2>
            <p className="text-blue-100 max-w-md">Gestiona tus copropiedades, revisa los planes activos y certifica a los nuevos administradores desde un solo lugar.</p>
          </div>
          <div className="hidden lg:block">
             <Info size={120} className="opacity-20 rotate-12" />
          </div>
        </section>

        {/* Tarjetas de Información */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <p className="text-gray-500 text-sm font-semibold uppercase tracking-wider mb-1">Copropiedades Activas</p>
            <h3 className="text-4xl font-bold text-gray-900">24</h3>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <p className="text-gray-500 text-sm font-semibold uppercase tracking-wider mb-1">Clientes SaaS</p>
            <h3 className="text-4xl font-bold text-gray-900">12</h3>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <p className="text-gray-500 text-sm font-semibold uppercase tracking-wider mb-1">PQRs Pendientes</p>
            <h3 className="text-4xl font-bold text-gray-900">5</h3>
          </div>
        </div>
      </main>
    </div>
  );
}