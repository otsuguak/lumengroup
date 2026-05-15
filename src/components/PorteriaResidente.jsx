import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export default function PorteriaResidente() {
  const [pestana, setPestana] = useState('mensajeria');
  const [miApto, setMiApto] = useState(''); // Se llena automático, ya no se digita
  const [registrosRecepcion, setRegistrosRecepcion] = useState([]);
  const [registrosParqueadero, setRegistrosParqueadero] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [itemSeleccionado, setItemSeleccionado] = useState(null);

  // =======================================================
  // CARGA AUTOMÁTICA DEL APARTAMENTO DEL USUARIO
  // =======================================================
  useEffect(() => {
    const cargarAptoAutomatico = async () => {
      setCargando(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: userData } = await supabase
            .from('usuarios')
            .select('inmueble, copropiedad_id')
            .eq('id', user.id)
            .single();

          if (userData && userData.inmueble) {
            setMiApto(userData.inmueble);
            await buscarRegistros(userData.inmueble, userData.copropiedad_id);
          }
        }
      } catch (error) {
        console.error("Error cargando perfil:", error);
      } finally {
        setCargando(false);
      }
    };

    cargarAptoAutomatico();
  }, []);

  // =======================================================
  // BÚSQUEDA DE REGISTROS
  // =======================================================
  const buscarRegistros = async (aptoABuscar = miApto, idCopropiedad = sessionStorage.getItem('copropiedad_id')) => {
    if (!aptoABuscar) return;
    setCargando(true);

    try {
      // 1. Traer Paquetes y Visitantes Peatonales
      const { data: recepcion } = await supabase
        .from('registro_recepcion')
        .select('*')
        .eq('copropiedad_id', idCopropiedad)
        .eq('inmueble', aptoABuscar)
        .order('fecha_ingreso', { ascending: false });

      setRegistrosRecepcion(recepcion || []);

      // 2. Traer Vehículos (De la nueva tabla parqueadero_visitantes)
      const { data: parqueadero } = await supabase
        .from('parqueadero_visitantes')
        .select('*')
        .eq('copropiedad_id', idCopropiedad)
        .eq('inmueble', aptoABuscar)
        .order('hora_entrada', { ascending: false });

      setRegistrosParqueadero(parqueadero || []);

    } catch (error) {
      console.error("Error buscando:", error);
    }
    setCargando(false);
  };

  const paquetes = registrosRecepcion.filter(r => r.tipo_registro === 'Paquete' || r.tipo_registro === 'Domicilio');
  const visitantesPeatonales = registrosRecepcion.filter(r => r.tipo_registro === 'Visitante');

  if (cargando && !miApto) {
    return <div className="p-20 text-center text-slate-500 font-bold text-xl animate-pulse">Cargando tu información...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto mt-6 animate-in fade-in">
      
      {/* ENCABEZADO PRIVADO (Reemplaza el buscador) */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-500 rounded-3xl p-8 mb-8 shadow-lg text-white flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black mb-1">Mis Visitas y Paquetes</h2>
          <p className="text-indigo-100 text-lg">
            Historial de portería para el inmueble: <span className="font-black bg-white/20 px-3 py-1 rounded-lg ml-2">{miApto}</span>
          </p>
        </div>
        <button onClick={() => buscarRegistros()} className="bg-white/20 hover:bg-white/30 px-6 py-3 rounded-xl font-bold transition flex items-center gap-2">
          {cargando ? '🔄 Actualizando...' : '🔄 Refrescar'}
        </button>
      </div>

      {/* PESTAÑAS GIGANTES */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <button 
          onClick={() => setPestana('mensajeria')} 
          className={`flex-1 py-5 px-6 rounded-2xl font-black text-xl transition-all shadow-sm border-2 ${pestana === 'mensajeria' ? 'bg-white border-indigo-600 text-indigo-600 shadow-md' : 'bg-slate-50 border-transparent text-slate-500 hover:bg-white hover:border-slate-300'}`}
        >
          📦 Mensajería y Domicilios
        </button>
        <button 
          onClick={() => setPestana('visitantes')} 
          className={`flex-1 py-5 px-6 rounded-2xl font-black text-xl transition-all shadow-sm border-2 ${pestana === 'visitantes' ? 'bg-white border-indigo-600 text-indigo-600 shadow-md' : 'bg-slate-50 border-transparent text-slate-500 hover:bg-white hover:border-slate-300'}`}
        >
          🚶‍♂️ Visitantes y Parqueadero
        </button>
      </div>

      {/* ============================================================== */}
      {/* CONTENIDO: MENSAJERÍA */}
      {/* ============================================================== */}
      {pestana === 'mensajeria' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paquetes.length === 0 && <p className="text-slate-400 italic col-span-full text-center py-10">No tienes paquetes recientes.</p>}
          
          {paquetes.map(paquete => (
            <div key={paquete.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition flex flex-col">
              <div className="h-40 bg-slate-100 relative">
                {paquete.foto_url ? (
                  <img src={paquete.foto_url} alt="Evidencia" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-300 text-5xl">📦</div>
                )}
                {paquete.estado === 'Entregado' && (
                  <span className="absolute top-3 right-3 bg-emerald-500 text-white text-xs px-2 py-1 rounded-md font-bold shadow-sm">Entregado</span>
                )}
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-slate-400">
                    {paquete.fecha_ingreso ? new Date(paquete.fecha_ingreso).toLocaleDateString() : 'Sin fecha'}
                  </span>
                </div>
                <h3 className="font-black text-slate-800 text-lg leading-tight">{paquete.nombre_visitante_o_empresa}</h3>
                <p className="text-xs text-slate-500 font-semibold mb-4 flex-1 mt-1">Guía: {paquete.cedula_o_guia || 'N/A'}</p>
                <button 
                  onClick={() => setItemSeleccionado({ tipo: 'paquete', data: paquete })}
                  className="w-full bg-slate-50 text-indigo-600 border border-indigo-100 font-bold py-2.5 rounded-xl hover:bg-indigo-50 transition-colors"
                >
                  Ver Detalles
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ============================================================== */}
      {/* CONTENIDO: VISITANTES (Peatonales + Vehículos) */}
      {/* ============================================================== */}
      {pestana === 'visitantes' && (
        <div className="space-y-8">
          
          {/* 🚗 VEHÍCULOS (PARQUEADERO) - TABLA LIMPIA Y CON PLACA DESTACADA */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">🚗 Vehículos Autorizados</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 text-xs uppercase tracking-wider">
                    <th className="py-4 px-6 font-bold border-b border-slate-100">Placa / Tipo</th>
                    <th className="py-4 px-6 font-bold border-b border-slate-100">Visitante</th>
                    <th className="py-4 px-6 font-bold border-b border-slate-100">Ingreso</th>
                    <th className="py-4 px-6 font-bold border-b border-slate-100">Salida</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-slate-600 divide-y divide-slate-100">
                  {registrosParqueadero.length === 0 && (
                    <tr><td colSpan="4" className="p-10 text-center italic text-slate-400">No hay vehículos registrados para tu apto.</td></tr>
                  )}
                  {registrosParqueadero.map(carro => (
                    <tr key={carro.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${carro.tipo_vehiculo === 'Carro' ? 'bg-blue-100' : 'bg-orange-100'}`}>
                            {carro.tipo_vehiculo === 'Carro' ? '🚙' : '🏍️'}
                          </div>
                          <div>
                            {/* AQUÍ ESTÁ LA PLACA SÚPER DESTACADA */}
                            <span className="font-black text-slate-800 text-lg block tracking-widest uppercase">{carro.placa}</span>
                            <span className="text-[10px] uppercase font-bold text-slate-400">{carro.tipo_vehiculo}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-bold text-slate-700">{carro.nombre_visitante || 'No registrado'}</span>
                      </td>
                      <td className="py-4 px-6 font-medium">
                        {new Date(carro.hora_entrada).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="py-4 px-6">
                        {carro.hora_salida ? (
                          <span className="text-slate-600 font-medium">
                            {new Date(carro.hora_salida).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        ) : (
                          <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-md text-xs font-black uppercase tracking-wider inline-flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> Adentro
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 🚶‍♂️ PEATONALES */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">🚶‍♂️ Visitas Peatonales</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 text-xs uppercase tracking-wider">
                    <th className="py-4 px-6 font-bold border-b border-slate-100">Nombre</th>
                    <th className="py-4 px-6 font-bold border-b border-slate-100">Cédula</th>
                    <th className="py-4 px-6 font-bold border-b border-slate-100">Fecha / Hora</th>
                    <th className="py-4 px-6 font-bold border-b border-slate-100 text-right">Evidencia</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-slate-600 divide-y divide-slate-100">
                  {visitantesPeatonales.length === 0 && (
                    <tr><td colSpan="4" className="p-10 text-center italic text-slate-400">No hay registros peatonales recientes.</td></tr>
                  )}
                  {visitantesPeatonales.map(v => (
                    <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-6 font-bold text-slate-800">{v.nombre_visitante_o_empresa}</td>
                      <td className="py-4 px-6 font-mono text-slate-500">{v.cedula_o_guia}</td>
                      <td className="py-4 px-6 font-medium">{v.fecha_ingreso ? new Date(v.fecha_ingreso).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'N/A'}</td>
                      <td className="py-4 px-6 text-right">
                        <button 
                          onClick={() => setItemSeleccionado({ tipo: 'peaton', data: v })} 
                          className="bg-indigo-50 text-indigo-600 font-bold px-4 py-2 rounded-lg hover:bg-indigo-100 transition-colors"
                        >
                          Ver Foto
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL UNIVERSAL (DETALLES Y FOTO) */}
      {/* ============================================================== */}
      {itemSeleccionado && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setItemSeleccionado(null)} 
              className="absolute top-4 right-4 bg-black/40 text-white w-8 h-8 rounded-full flex items-center justify-center z-10 hover:bg-red-500 transition"
            >
              ✕
            </button>
            <div className="h-56 bg-slate-100 relative">
              {itemSeleccionado.data.foto_url ? (
                <img src={itemSeleccionado.data.foto_url} alt="Evidencia" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-6xl bg-slate-800">📸</div>
              )}
            </div>
            <div className="p-6">
              <span className="bg-indigo-100 text-indigo-800 text-[10px] font-black uppercase px-2 py-1 rounded-md mb-3 inline-block">
                {itemSeleccionado.data.tipo_registro}
              </span>
              <h3 className="text-xl font-bold text-slate-800 mb-1 leading-tight">{itemSeleccionado.data.nombre_visitante_o_empresa}</h3>
              <p className="text-sm text-slate-500 mb-4 font-mono">ID / Guía: {itemSeleccionado.data.cedula_o_guia || 'N/D'}</p>
              
              <div className="bg-slate-50 p-4 rounded-xl mb-4 border border-slate-100">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Registro de Ingreso</p>
                <p className="text-sm font-medium text-slate-800">
                  {itemSeleccionado.data.fecha_ingreso ? new Date(itemSeleccionado.data.fecha_ingreso).toLocaleString() : 'N/A'}
                </p>
              </div>

              {itemSeleccionado.data.observaciones && (
                <div className="mb-2">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Observaciones</p>
                  <p className="text-sm text-slate-700 italic border-l-2 border-indigo-200 pl-3">"{itemSeleccionado.data.observaciones}"</p>
                </div>
              )}
              
              <button 
                onClick={() => setItemSeleccionado(null)} 
                className="mt-6 w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl hover:bg-slate-800 transition active:scale-95"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}