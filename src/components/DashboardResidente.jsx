import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export default function DashboardResidente() {
  const [cargando, setCargando] = useState(true);
  const [usuarioInfo, setUsuarioInfo] = useState({ nombre: '', email: '', inmueble: '', id: '' });
  
  // 🔥 NUEVO: ESTADO PARA SABER SI ES STAFF/COLABORADOR
  const [isStaff, setIsStaff] = useState(false);
  
  // ESTADOS DE PERMISOS SAAS
  const [permisos, setPermisos] = useState({
    pqrs: true, 
    reservas: true,
    llamados: true,
    pagos: true,
    recepcion: true 
  });
  
  // Contadores y Datos
  const [stats, setStats] = useState({ pqrs: 0, reservas: 0, llamados: 0, paquetes: 0 });
  const [enlacesPago, setEnlacesPago] = useState([]);
  const [alertasRecibos, setAlertasRecibos] = useState([]);
  const [misParqueaderos, setMisParqueaderos] = useState([]);

  useEffect(() => {
    cargarDashboard();
  }, []);

  const cargarDashboard = async () => {
    setCargando(true);
    try {
      const copropiedadId = sessionStorage.getItem('copropiedad_id');
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user || !copropiedadId) return;

      // 1. Buscamos por EMAIL en lugar de ID
      const { data: userData } = await supabase
        .from('usuarios')
        .select('inmueble, nombre') // 🔥 CORREGIDO
        .eq('email', user.email)
        .maybeSingle();

      const inmuebleReal = userData?.inmueble || user.user_metadata?.inmueble || 'Sin Inmueble';
      const nombreReal = userData?.nombre || user.user_metadata?.nombre || 'Residente'; // 🔥 CORREGIDO

      setUsuarioInfo({
        id: user.id,
        email: user.email,
        nombre: nombreReal,
        inmueble: inmuebleReal
      });

      // 🔥 MAGIA: BUSCAMOS EL CÓDIGO STAFF EN CONFIGURACIÓN 🔥
      const { data: configData } = await supabase
        .from('configuracion')
        .select('codigo_staff')
        .eq('copropiedad_id', copropiedadId)
        .maybeSingle();

      // Verificamos si el inmueble del usuario coincide con la llave maestra del staff
      const esColaborador = configData?.codigo_staff && inmuebleReal === configData.codigo_staff;
      setIsStaff(esColaborador);

      // CARGAMOS LOS PERMISOS DEL CONJUNTO
      const { data: configSaas } = await supabase
        .from('clientes_saas')
        .select('*')
        .eq('copropiedad_id', copropiedadId)
        .maybeSingle();

      if (configSaas) {
        setPermisos({
          pqrs: true, 
          reservas: configSaas.mod_reservas,
          llamados: configSaas.mod_convivencia, 
          pagos: configSaas.mod_pagos,
          recepcion: true 
        });
      }

      // CARGAMOS LOS AVISOS DE RECIBOS ACTIVOS
      const { data: recibosActivos } = await supabase
        .from('notificaciones_recibos')
        .select('*')
        .eq('copropiedad_id', copropiedadId)
        .eq('hay_recibos', true);
        
      setAlertasRecibos(recibosActivos || []);

      // CONSULTAS SIMULTÁNEAS
      const promesasDatos = [];

      // 🔥 Si es Staff, contamos TODOS los tickets abiertos del conjunto. Si es residente, solo los suyos.
      if (esColaborador) {
        promesasDatos.push(supabase.from('tickets').select('id', { count: 'exact' }).eq('copropiedad_id', copropiedadId).neq('estado', 'Resuelto'));
      } else {
        promesasDatos.push(supabase.from('tickets').select('id', { count: 'exact' }).eq('copropiedad_id', copropiedadId).eq('email', user.email));
      }

      if (configSaas?.mod_convivencia !== false && !esColaborador) {
        promesasDatos.push(supabase.from('llamados_atencion').select('id', { count: 'exact' }).eq('copropiedad_id', copropiedadId).eq('usuario_id', user.id));
      } else {
        promesasDatos.push(Promise.resolve({ count: 0 }));
      }

      if (configSaas?.mod_pagos !== false && !esColaborador) {
        promesasDatos.push(supabase.from('configuracion_pagos').select('*').eq('copropiedad_id', copropiedadId));
      } else {
        promesasDatos.push(Promise.resolve({ data: [] }));
      }

      if (!esColaborador) {
        promesasDatos.push(
          supabase.from('registro_recepcion')
            .select('id', { count: 'exact' })
            .eq('copropiedad_id', copropiedadId)
            .eq('inmueble', inmuebleReal)
            .in('tipo_registro', ['Paquete', 'Domicilio'])
            .neq('estado', 'Entregado')
        );
        promesasDatos.push(
          supabase.from('parqueaderos_asignados')
            .select('*')
            .eq('copropiedad_id', copropiedadId)
            .eq('inmueble', inmuebleReal)
        );
      } else {
        promesasDatos.push(Promise.resolve({ count: 0 }));
        promesasDatos.push(Promise.resolve({ data: [] }));
      }

      const [resPqrs, resLlamados, resPagos, resPaquetes, resParqueaderos] = await Promise.all(promesasDatos);

      let totalReservas = 0;
      if (configSaas?.mod_reservas !== false && !esColaborador) {
        try {
          const { count } = await supabase.from('reservas').select('id', { count: 'exact' }).eq('copropiedad_id', copropiedadId).eq('usuario_id', user.id);
          totalReservas = count || 0;
        } catch (e) { /* Ignorar si no hay tabla reservas aún */ }
      }

      setStats({
        pqrs: resPqrs.count || 0,
        reservas: totalReservas,
        llamados: resLlamados.count || 0,
        paquetes: resPaquetes.count || 0
      });

      setEnlacesPago(resPagos.data || []);
      setMisParqueaderos(resParqueaderos.data || []); 

    } catch (error) {
      console.error("Error cargando dashboard:", error);
    } finally {
      setCargando(false);
    }
  };

  if (cargando) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="animate-spin w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // =========================================================
  // 🔥 VISTA EXCLUSIVA PARA EL STAFF / COLABORADOR 🔥
  // =========================================================
  if (isStaff) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in zoom-in duration-500 mt-10">
        <div className="bg-slate-900 p-10 md:p-14 rounded-[3rem] shadow-2xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
          {/* Luces de fondo estilo neón */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full blur-[100px] opacity-20 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500 rounded-full blur-[100px] opacity-20 pointer-events-none"></div>
          
          <div className="relative z-10 text-center md:text-left">
            <div className="inline-block bg-indigo-500/20 text-indigo-300 font-black tracking-widest uppercase text-[10px] px-4 py-1.5 rounded-full mb-4 border border-indigo-500/30">
              Modo Colaborador Activo 🛡️
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-2">
              Hola, {usuarioInfo.nombre.split(' ')[0]}
            </h2>
            <p className="text-slate-400 font-medium text-lg">
              Panel exclusivo para respuesta a PQRS y Casos.
            </p>
          </div>

          <div className="relative z-10 bg-white/5 border border-white/10 p-6 rounded-3xl text-center w-full md:w-auto backdrop-blur-md">
            <div className="text-5xl font-black text-white mb-1">{stats.pqrs}</div>
            <div className="text-xs font-bold uppercase tracking-widest text-slate-400">Casos Activos</div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center shadow-sm">
          <div className="text-6xl mb-4">💬</div>
          <h3 className="text-2xl font-black text-slate-800">Bandeja de Resolución</h3>
          <p className="text-slate-500 mt-2 mb-6">Por favor, dirígete al menú lateral y selecciona <strong>"Atención al Residente" (PQRS)</strong> para gestionar y responder los tickets que el administrador ha escalado para ti.</p>
        </div>
      </div>
    );
  }

  // =========================================================
  // VISTA NORMAL PARA RESIDENTES (Se mantiene intacta)
  // =========================================================
  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-700">
      
      {/* 1. HEADER SÚPER LIMPIO Y MODERNO */}
      <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-60 -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
        
        <div className="relative z-10 text-center md:text-left">
          <p className="text-indigo-600 font-black tracking-[0.2em] uppercase text-xs mb-2">Mi Portal Inmobiliario</p>
          <h2 className="text-4xl font-black text-slate-800 tracking-tight mb-2">
            ¡Hola, {usuarioInfo.nombre.split(' ')[0]}! 👋
          </h2>
          <p className="text-slate-500 font-medium text-lg">
            Apto / Casa: <span className="font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded-lg ml-1">{usuarioInfo.inmueble}</span>
          </p>
        </div>

        <div className="hidden lg:flex gap-4 relative z-10">
          <div className="text-right">
            <p className="text-slate-400 text-xs font-bold uppercase">Estado Actual</p>
            <p className="text-emerald-600 font-black">Al día con tus servicios</p>
          </div>
        </div>
      </div>

      {/* 2. DISEÑO BENTO BOX */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

        {/* 🧾 TARJETA GIGANTE: RECIBOS PÚBLICOS */}
        <div className={`col-span-1 md:col-span-12 p-8 md:p-10 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between transition-all duration-500 border ${alertasRecibos.length > 0 ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-xl shadow-blue-500/30 border-transparent animate-pulse-slow' : 'bg-white border-slate-100'}`}>
          <div className="flex items-center gap-6 mb-4 md:mb-0">
            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center text-4xl shadow-inner ${alertasRecibos.length > 0 ? 'bg-white/20 backdrop-blur-md' : 'bg-slate-50 text-slate-300 grayscale'}`}>
              🧾
            </div>
            <div>
              <h3 className={`text-2xl font-black tracking-tighter ${alertasRecibos.length > 0 ? 'text-white' : 'text-slate-400'}`}>
                Centro de Correspondencia
              </h3>
              <p className={`text-sm font-bold uppercase tracking-widest mt-1 ${alertasRecibos.length > 0 ? 'text-blue-100' : 'text-slate-300'}`}>
                Estado de Recibos Físicos
              </p>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            {alertasRecibos.length === 0 && (
              <span className="text-slate-400 font-medium text-sm italic">No hay facturas pendientes en portería.</span>
            )}
            
            {alertasRecibos.map(recibo => (
              <div key={recibo.id} className="bg-white text-indigo-700 font-black px-6 py-3 rounded-2xl shadow-lg flex items-center gap-2 transform hover:scale-105 transition-transform cursor-default">
                <span className="animate-ping w-2 h-2 rounded-full bg-red-500"></span>
                ¡Llegó {recibo.tipo_recibo}!
              </div>
            ))}
          </div>
        </div>

        {/* 📦 TARJETA GIGANTE: PAQUETES */}
        {permisos.recepcion && (
          <div className={`col-span-1 md:col-span-8 p-8 md:p-10 rounded-[2.5rem] flex items-center justify-between transition-all duration-300 border shadow-sm ${stats.paquetes > 0 ? 'bg-gradient-to-r from-amber-400 to-orange-500 border-transparent text-white shadow-orange-500/20' : 'bg-white border-slate-100 text-slate-800'}`}>
            <div>
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-6 shadow-sm ${stats.paquetes > 0 ? 'bg-white/20 backdrop-blur-md text-white' : 'bg-slate-50 text-slate-400'}`}>
                📦
              </div>
              <h3 className={`text-5xl md:text-7xl font-black mb-2 tracking-tighter ${stats.paquetes > 0 ? 'text-white' : 'text-slate-800'}`}>
                {stats.paquetes}
              </h3>
              <p className={`text-sm md:text-base font-bold uppercase tracking-widest ${stats.paquetes > 0 ? 'text-orange-50' : 'text-slate-400'}`}>
                {stats.paquetes === 1 ? 'Paquete en Portería' : 'Paquetes en Portería'}
              </p>
              {stats.paquetes > 0 && (
                <p className="mt-3 text-sm font-medium bg-black/10 inline-block px-4 py-2 rounded-xl backdrop-blur-sm">
                  ¡Tienes entregas sin reclamar!
                </p>
              )}
            </div>
            
            <div className={`hidden sm:block text-[8rem] md:text-[10rem] opacity-20 transform rotate-12 transition-transform duration-500 hover:scale-110 ${stats.paquetes > 0 ? 'text-white' : 'text-slate-300'}`}>
              🚚
            </div>
          </div>
        )}

        {/* 🚨 TARJETA COMPACTA: CONVIVENCIA */}
        {permisos.llamados && (
          <div className={`col-span-1 md:col-span-4 p-8 md:p-10 rounded-[2.5rem] flex flex-col justify-between transition-all duration-300 border shadow-sm group ${stats.llamados > 0 ? 'bg-red-50 border-red-100' : 'bg-white border-slate-100'}`}>
            <div>
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-6 shadow-sm ${stats.llamados > 0 ? 'bg-red-500 text-white' : 'bg-slate-50 text-slate-400'}`}>
                ⚠️
              </div>
              <h3 className={`text-5xl md:text-6xl font-black tracking-tighter mb-2 ${stats.llamados > 0 ? 'text-red-500' : 'text-slate-800'}`}>
                {stats.llamados}
              </h3>
              <p className={`text-xs font-bold uppercase tracking-widest ${stats.llamados > 0 ? 'text-red-800' : 'text-slate-400'}`}>
                Llamados / Novedades
              </p>
            </div>
          </div>
        )}

        {/* 💬 TARJETA CUADRADA: PQRS */}
        {permisos.pqrs && (
          <div className="col-span-1 md:col-span-4 p-8 md:p-10 bg-white rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-lg transition-shadow group">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform">
              💬
            </div>
            <h3 className="text-5xl font-black text-slate-800 tracking-tighter mb-2">{stats.pqrs}</h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tickets PQR</p>
          </div>
        )}

        {/* 📅 TARJETA CUADRADA: RESERVAS */}
        {permisos.reservas && (
          <div className="col-span-1 md:col-span-4 p-8 md:p-10 bg-white rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-lg transition-shadow group">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform">
              🗓️
            </div>
            <h3 className="text-5xl font-black text-slate-800 tracking-tighter mb-2">{stats.reservas}</h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Reservas Activas</p>
          </div>
        )}

        {/* 💳 TARJETA ALARGADA: PAGOS */}
        {permisos.pagos && (
          <div className="col-span-1 md:col-span-4 p-8 md:p-10 bg-slate-900 rounded-[2.5rem] shadow-xl shadow-slate-900/20 text-white flex flex-col justify-between">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-3xl mb-6">
                💳
              </div>
              <h3 className="text-2xl font-black tracking-tight mb-1">Pagos en Línea</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tus Obligaciones</p>
            </div>
            
            <div className="mt-8 space-y-3">
              {enlacesPago.length > 0 ? (
                enlacesPago.slice(0, 2).map(pago => (
                  <a key={pago.id} href={pago.url_pago} target="_blank" rel="noreferrer" className="flex items-center justify-between p-4 rounded-2xl bg-blue-600 hover:bg-blue-500 transition-colors group">
                    <span className="font-bold text-sm truncate pr-2">{pago.titulo}</span>
                    <span className="font-black group-hover:translate-x-1 transition-transform">→</span>
                  </a>
                ))
              ) : (
                <div className="p-4 text-center text-slate-500 text-xs font-bold bg-white/5 rounded-2xl border border-white/10">
                  Sin enlaces configurados
                </div>
              )}
            </div>
          </div>
        )}

        {/* 🔥 TARJETA VIP: MI PARQUEADERO */}
        {misParqueaderos.length > 0 && (
          <div className="col-span-1 md:col-span-4 p-8 md:p-10 bg-teal-950 rounded-[2.5rem] shadow-xl shadow-teal-900/20 text-white flex flex-col justify-between overflow-hidden relative group">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-teal-500/20 blur-3xl rounded-full group-hover:bg-teal-400/30 transition-colors duration-500 pointer-events-none"></div>

            <div className="relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-3xl mb-6 border border-white/10 backdrop-blur-sm group-hover:scale-110 transition-transform">
                {misParqueaderos[0].tipo_parqueadero === 'Moto' ? '🏍️' : '🚘'}
              </div>
              <h3 className="text-4xl md:text-5xl font-black tracking-tighter mb-1 text-teal-300">
                {misParqueaderos[0].numero_parqueadero}
              </h3>
              <p className="text-[10px] font-black text-teal-500 uppercase tracking-widest">
                Parqueadero Asignado
              </p>
            </div>
            
            <div className="mt-8 space-y-2 relative z-10">
              {misParqueaderos.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                  <span className="font-medium text-xs text-teal-100/70">{p.tipo_vehiculo}</span>
                  <span className="font-black font-mono text-sm tracking-[0.2em] bg-teal-400/20 text-teal-300 px-3 py-1 rounded-lg">
                    {p.placa}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      <style>{`
        .animate-pulse-slow {
          animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  );
}