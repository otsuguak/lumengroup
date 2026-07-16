import { Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav className="flex justify-between items-center p-6 bg-white shadow-md sticky top-0 z-50">
      <div className="flex items-center gap-2">
        <img src="/logo.png" alt="Lumen Logo" className="w-10" />
        <span className="text-xl font-bold text-lumenPrimary">LumenGroup</span>
      </div>
      <ul className="hidden md:flex gap-6 font-medium text-gray-600">
        <li><a href="#solution" className="hover:text-lumenPrimary">Solución</a></li>
        <li><Link to="/directorio" className="hover:text-lumenPrimary text-blue-600 font-bold">Red Administradores</Link></li>
        <li><Link to="/login" className="bg-lumenPrimary text-white px-4 py-2 rounded-lg">Iniciar Sesión</Link></li>
      </ul>
    </nav>
  );
}