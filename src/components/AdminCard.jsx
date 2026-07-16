import { Star, MapPin, Briefcase } from 'lucide-react';

export default function AdminCard({ admin, onOpen }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-all group">
      {/* Banner decorativo */}
      <div className="h-24 bg-gradient-to-r from-blue-50 to-indigo-100 group-hover:from-blue-100 group-hover:to-indigo-200 transition-colors" />
      
      {/* Foto y Nombre */}
      <div className="px-6 pb-6 text-center">
        <img 
          src={admin.foto || "https://i.pravatar.cc/150"} 
          alt={admin.nombre}
          className="w-24 h-24 rounded-full border-4 border-white mx-auto -mt-12 object-cover shadow-sm"
        />
        <h3 className="mt-3 text-lg font-bold text-gray-900">{admin.nombre}</h3>
        <p className="text-lumenPrimary font-semibold text-xs uppercase tracking-wider">{admin.rol}</p>
        
        {/* Estrellas/Rating */}
        <div className="flex justify-center my-2 text-yellow-400">
          {[...Array(5)].map((_, i) => (
            <Star key={i} size={14} fill={i < (admin.rating || 5) ? "currentColor" : "none"} />
          ))}
        </div>

        <p className="text-gray-600 text-sm line-clamp-2 mb-4">{admin.biografia_corta}</p>
        
        <div className="flex justify-around py-3 border-t border-gray-50 bg-gray-50/50 rounded-lg">
          <div className="text-center">
            <span className="block text-sm font-bold text-gray-800">{admin.experiencia}</span>
            <span className="text-[10px] text-gray-500 uppercase">Experiencia</span>
          </div>
          <div className="text-center">
            <span className="block text-sm font-bold text-gray-800">{admin.ubicacion}</span>
            <span className="text-[10px] text-gray-500 uppercase">Ubicación</span>
          </div>
        </div>

        <button 
          onClick={() => onOpen(admin)}
          className="mt-4 w-full py-2 bg-white border border-lumenPrimary text-lumenPrimary font-bold rounded-lg hover:bg-lumenPrimary hover:text-white transition-all"
        >
          Ver Perfil Completo
        </button>
      </div>
    </div>
  );
}