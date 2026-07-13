import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx'; // IMPORTANTE: Necesitas tener instalada esta librería (npm install xlsx)

export default function AdminParqueadero({ copropiedadId }) {
  const [pestanaActiva, setPestanaActiva] = useState('arqueo');
  
  // Estados de datos
  const [registros, setRegistros] = useState([]);
  const [vigilantesTurno, setVigilantesTurno] = useState([]);
  const [historialTurnos, setHistorialTurnos] = useState([]);
  const [cargando, setCargando] = useState(true);

  // Estados del filtro de arqueo
  const [filtroGuarda, setFiltroGuarda] = useState('');

  // Estados de formulario de tarifas
  const [minutosCarro, setMinutosCarro] = useState(120);
  const [valorCarro, setValorCarro] = useState(3000);
  const [modoCarro, setModoCarro] = useState('Hora'); 

  const [minutosMoto, setMinutosMoto] = useState(120);
  const [valorMoto, setValorMoto] = useState(1000);
  const [modoMoto, setModoMoto] = useState('Hora'); 

  const [aplicaIva, setAplicaIva] = useState(false);
  const [porcentajeIva, setPorcentajeIva] = useState(19);

  // 🔥 NUEVOS ESTADOS PARA HISTORIAL VISITANTES 🔥
  const [filtroFechaInicio, setFiltroFechaInicio] = useState('');
  const [filtroFechaFin, setFiltroFechaFin] = useState('');
  const [filtroInmuebleHistorial, setFiltroInmuebleHistorial] = useState('');

  useEffect(() => {
    cargarDatos();
  }, [copropiedadId]);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      // 1. Cargar Tarifas
      const { data: dataTarifas } = await supabase
        .from('tarifas_parqueadero')
        .select('*')
        .eq('copropiedad_id', copropiedadId);
      
      if (dataTarifas && dataTarifas.length > 0) {
        const tCarro = dataTarifas.find(t => t.tipo_vehiculo === 'Carro');
        const tMoto = dataTarifas.find(t => t.tipo_vehiculo === 'Moto');
        
        if (tCarro) { 
          setMinutosCarro(tCarro.minutos_gracia); 
          setValorCarro(tCarro.valor_hora); 
          setModoCarro(tCarro.modo_cobro || 'Hora');
        }
        if (tMoto) { 
          setMinutosMoto(tMoto.minutos_gracia); 
          setValorMoto(tMoto.valor_hora); 
          setModoMoto(tMoto.modo_cobro || 'Hora');
        }
        
        setAplicaIva(dataTarifas[0].aplica_iva || false);
        setPorcentajeIva(dataTarifas[0].porcentaje_iva || 19);
      }

      // 2. Cargar TODOS los turnos (Activos e Inactivos)
      const { data: dataTurnos } = await supabase
        .from('turnos_vigilancia')
        .select('*')
        .eq('copropiedad_id', copropiedadId)
        .order('hora_inicio', { ascending: false });
      setHistorialTurnos(dataTurnos || []);

      // 3. Cargar Arqueo (parqueadero_visitantes)
      const { data: dataRegistros } = await supabase
        .from('parqueadero_visitantes')
        .select('*')
        .eq('copropiedad_id', copropiedadId)
        .order('hora_entrada', { ascending: false });
      setRegistros(dataRegistros || []);

      // 4. Separar Vigilantes Activos para las Cards
      setVigilantesTurno(dataTurnos?.filter(t => t.estado === 'Activo') || []);

    } catch (error) {
      console.error("Error cargando datos:", error);
    }
    setCargando(false);
  };

  const guardarTarifas = async () => {
    await supabase.from('tarifas_parqueadero').delete().eq('copropiedad_id', copropiedadId);
    
    const { error } = await supabase.from('tarifas_parqueadero').insert([
      { 
        copropiedad_id: copropiedadId, 
        tipo_vehiculo: 'Carro', 
        minutos_gracia: minutosCarro, 
        valor_hora: valorCarro, 
        aplica_iva: aplicaIva, 
        porcentaje_iva: porcentajeIva,
        modo_cobro: modoCarro 
      },
      { 
        copropiedad_id: copropiedadId, 
        tipo_vehiculo: 'Moto', 
        minutos_gracia: minutosMoto, 
        valor_hora: valorMoto, 
        aplica_iva: aplicaIva, 
        porcentaje_iva: porcentajeIva,
        modo_cobro: modoMoto 
      }
    ]);

    if (error) {
      Swal.fire('Error', 'No se pudieron guardar las tarifas', 'error');
    } else {
      Swal.fire('¡Éxito!', 'Tarifas e impuestos actualizados', 'success');
      cargarDatos();
    }
  };

  const verDetalleTurno = (vig) => {
    const registrosGuarda = registros.filter(r => r.turno_salida_id === vig.id && r.estado === 'Pagado');
    const recaudadoGuarda = registrosGuarda.reduce((sum, r) => sum + Number(r.valor_total || 0), 0);
    const ivaGuarda = registrosGuarda.reduce((sum, r) => sum + Number(r.valor_iva || 0), 0);
    const netoGuarda = registrosGuarda.reduce((sum, r) => sum + Number(r.valor_neto || 0), 0);

    Swal.fire({
      title: `Caja: ${vig.nombre_guarda}`,
      html: `
        <div class="text-left text-lg mt-4">
          <p><b>Cédula:</b> ${vig.cedula}</p>
          <p><b>Puesto:</b> ${vig.puesto}</p>
          <p><b>Hora Inicio:</b> ${new Date(vig.hora_inicio).toLocaleString()}</p>
          <p><b>Hora Fin:</b> ${vig.hora_fin ? new Date(vig.hora_fin).toLocaleString() : '<span class="text-green-600 font-bold">Turno Activo 🟢</span>'}</p>
          <hr class="my-4"/>
          <p class="text-gray-500 text-sm mb-2 font-bold uppercase">Desglose de lo cobrado:</p>
          <div class="bg-gray-50 p-3 rounded-lg border border-gray-200 text-base mb-4">
            <div class="flex justify-between mb-1"><span>Subtotal:</span> <b>$${netoGuarda.toLocaleString()}</b></div>
            <div class="flex justify-between mb-1"><span>IVA:</span> <b>$${ivaGuarda.toLocaleString()}</b></div>
            <div class="flex justify-between border-t pt-1 mt-1 text-emerald-600"><span><b>TOTAL:</b></span> <b>$${recaudadoGuarda.toLocaleString()}</b></div>
          </div>
        </div>
      `,
      icon: 'info',
      confirmButtonText: 'Cerrar',
      confirmButtonColor: '#3b82f6'
    });
  };

  const borrarRegistroParqueadero = async (id) => {
    const { isConfirmed } = await Swal.fire({
      title: '¿Borrar ingreso?',
      text: "Esta acción no se puede deshacer. El dinero y el registro desaparecerán del arqueo.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#9ca3af',
      confirmButtonText: 'Sí, borrar',
      cancelButtonText: 'Cancelar'
    });

    if (isConfirmed) {
      const { error } = await supabase.from('parqueadero_visitantes').delete().eq('id', id);
      if (!error) {
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Borrado', showConfirmButton: false, timer: 1500 });
        cargarDatos();
      }
    }
  };

  const borrarTurnoHistorial = async (id) => {
    const { isConfirmed } = await Swal.fire({
      title: '¿Borrar historial del guarda?',
      text: "Si este guarda cobró parqueaderos, la base de datos podría bloquear el borrado por seguridad. ¿Intentar borrar?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#9ca3af',
      confirmButtonText: 'Sí, borrar',
      cancelButtonText: 'Cancelar'
    });

    if (isConfirmed) {
      const { error } = await supabase.from('turnos_vigilancia').delete().eq('id', id);
      if (!error) {
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Turno borrado', showConfirmButton: false, timer: 1500 });
        cargarDatos();
      } else {
        Swal.fire('Error', 'No se puede borrar. Supabase lo protege porque este turno tiene cobros de parqueadero amarrados.', 'error');
      }
    }
  };

  // --- LÓGICA DE CRUCE Y FILTRADO ---
  const registrosConGuarda = registros.map(reg => {
    const turnoCobro = historialTurnos.find(t => t.id === reg.turno_salida_id);
    return {
      ...reg,
      nombre_guarda: turnoCobro ? turnoCobro.nombre_guarda : 'Pendiente',
      cedula_guarda: turnoCobro ? turnoCobro.cedula : 'N/A'
    };
  });

  const guardasUnicos = Array.from(new Set(registrosConGuarda.filter(r => r.cedula_guarda !== 'N/A').map(r => r.cedula_guarda)))
    .map(cedula => registrosConGuarda.find(r => r.cedula_guarda === cedula));

  const registrosFiltradosArqueo = filtroGuarda 
    ? registrosConGuarda.filter(r => r.cedula_guarda === filtroGuarda)
    : registrosConGuarda;

  const registrosPagados = registrosFiltradosArqueo.filter(r => r.estado === 'Pagado');
  
  const totalRecaudado = registrosPagados.reduce((suma, r) => suma + Number(r.valor_total || 0), 0);
  const totalNeto = registrosPagados.reduce((suma, r) => suma + Number(r.valor_neto || 0), 0);
  const totalIva = registrosPagados.reduce((suma, r) => suma + Number(r.valor_iva || 0), 0);

  const turnosInactivos = historialTurnos.filter(t => t.estado !== 'Activo');

  // 🔥 LÓGICA PARA HISTORIAL DE VISITANTES 🔥
  const registrosHistorialFiltrados = registros.filter(r => {
    // Filtrar por Inmueble
    if (filtroInmuebleHistorial && !r.inmueble.toLowerCase().includes(filtroInmuebleHistorial.toLowerCase())) {
      return false;
    }
    
    // Filtrar por Fechas (usando hora_entrada como referencia)
    if (filtroFechaInicio || filtroFechaFin) {
      const fechaRegistro = new Date(r.hora_entrada);
      
      if (filtroFechaInicio) {
        const inicio = new Date(filtroFechaInicio);
        inicio.setHours(0, 0, 0, 0); // Ajustar al principio del día
        if (fechaRegistro < inicio) return false;
      }
      
      if (filtroFechaFin) {
        const fin = new Date(filtroFechaFin);
        fin.setHours(23, 59, 59, 999); // Ajustar al final del día
        if (fechaRegistro > fin) return false;
      }
    }
    
    return true;
  });

  const exportarHistorialExcel = () => {
    if (registrosHistorialFiltrados.length === 0) {
      return Swal.fire('Atención', 'No hay datos para exportar con los filtros actuales.', 'warning');
    }

    const datosFormateados = registrosHistorialFiltrados.map(r => ({
      'Inmueble': r.inmueble,
      'Placa': r.placa,
      'Tipo Vehículo': r.tipo_vehiculo,
      'Visitante': r.nombre_visitante || 'No registrado',
      'Cédula': r.cedula_visitante || 'No registrada',
      'Hora Entrada': r.hora_entrada ? new Date(r.hora_entrada).toLocaleString() : 'N/A',
      'Hora Salida': r.hora_salida ? new Date(r.hora_salida).toLocaleString() : 'Aún adentro',
      'Estado': r.estado,
      'Valor Cobrado': r.valor_total ? `$${r.valor_total.toLocaleString()}` : '$0'
    }));

    const worksheet = XLSX.utils.json_to_sheet(datosFormateados);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Historial_Visitantes");
    
    // Ajustar el ancho de las columnas
    const columnWidths = [
      { wch: 15 }, // Inmueble
      { wch: 15 }, // Placa
      { wch: 15 }, // Tipo Vehículo
      { wch: 25 }, // Visitante
      { wch: 15 }, // Cédula
      { wch: 20 }, // Hora Entrada
      { wch: 20 }, // Hora Salida
      { wch: 12 }, // Estado
      { wch: 15 }  // Valor Cobrado
    ];
    worksheet['!cols'] = columnWidths;

    XLSX.writeFile(workbook, `Historial_Parqueadero_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (cargando) return <div className="p-10 text-center text-gray-500 font-bold">Cargando módulo de control...</div>;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Control de Seguridad y Parqueaderos</h1>

      {/* Menú de Pestañas */}
      <div className="flex space-x-4 mb-8 border-b pb-2 overflow-x-auto">
        <button onClick={() => setPestanaActiva('arqueo')} className={`px-4 py-2 font-semibold rounded-t-lg whitespace-nowrap ${pestanaActiva === 'arqueo' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-200'}`}>Arqueo de Caja</button>
        <button onClick={() => setPestanaActiva('tarifas')} className={`px-4 py-2 font-semibold rounded-t-lg whitespace-nowrap ${pestanaActiva === 'tarifas' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-200'}`}>Tarifas e Impuestos</button>
        <button onClick={() => setPestanaActiva('vigilantes')} className={`px-4 py-2 font-semibold rounded-t-lg whitespace-nowrap ${pestanaActiva === 'vigilantes' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-200'}`}>Guardas y Turnos</button>
        {/* 🔥 NUEVA PESTAÑA 🔥 */}
        <button onClick={() => setPestanaActiva('historial_visitas')} className={`px-4 py-2 font-semibold rounded-t-lg whitespace-nowrap ${pestanaActiva === 'historial_visitas' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-200'}`}>Historial Visitantes</button>
      </div>

      {/* PESTAÑA: ARQUEO DE CAJA */}
      {pestanaActiva === 'arqueo' && (
        <div className="bg-white p-6 rounded-xl shadow-md">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <h2 className="text-xl font-bold text-gray-700">Historial de Ingresos y Pagos</h2>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto">
              <select 
                value={filtroGuarda} 
                onChange={(e) => setFiltroGuarda(e.target.value)}
                className="p-3 border border-gray-300 rounded-lg outline-none font-semibold text-gray-700 bg-gray-50 w-full sm:w-auto"
              >
                <option value="">Todos los Guardas</option>
                {guardasUnicos.map(g => (
                  <option key={g.cedula_guarda} value={g.cedula_guarda}>{g.nombre_guarda} ({g.cedula_guarda})</option>
                ))}
              </select>

              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl shadow-sm min-w-[280px] w-full sm:w-auto">
                <div className="flex justify-between text-sm text-emerald-800 mb-1">
                  <span>Subtotal (Neto):</span>
                  <span className="font-bold">${totalNeto.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm text-emerald-800 mb-2 border-b border-emerald-200 pb-2">
                  <span>IVA Recaudado:</span>
                  <span className="font-bold">${totalIva.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xl text-emerald-900 font-black">
                  <span>TOTAL CAJA:</span>
                  <span>${totalRecaudado.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-gray-100 z-10 shadow-sm">
                <tr className="text-gray-600 uppercase text-xs leading-normal">
                  <th className="py-3 px-4">Placa / Tipo</th>
                  <th className="py-3 px-4">Hora Ingreso</th>
                  <th className="py-3 px-4">Guarda Salida (Cobró)</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Valor</th>
                  <th className="py-3 px-4 text-center">🗑️</th>
                </tr>
              </thead>
              <tbody className="text-gray-600 text-sm">
                {registrosFiltradosArqueo.map((reg) => (
                  <tr key={reg.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <span className="font-bold text-lg">{reg.placa}</span><br/>
                      <span className="text-xs text-gray-500">{reg.tipo_vehiculo}</span>
                    </td>
                    <td className="py-3 px-4 text-xs">{new Date(reg.hora_entrada).toLocaleString()}</td>
                    
                    <td className="py-3 px-4">
                      {reg.estado === 'Pagado' ? (
                        <div>
                          <p className="font-bold text-gray-800">{reg.nombre_guarda}</p>
                          <p className="text-xs text-gray-500">CC: {reg.cedula_guarda}</p>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Aún adentro</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${reg.estado === 'Pagado' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                        {reg.estado}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-black text-emerald-600 text-right text-lg">
                      ${(reg.valor_total || 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button onClick={() => borrarRegistroParqueadero(reg.id)} className="text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100 p-2 rounded-full transition">
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
                {registrosFiltradosArqueo.length === 0 && (
                  <tr><td colSpan="6" className="text-center py-8 text-gray-500">No hay registros para mostrar.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PESTAÑA: TARIFAS */}
      {pestanaActiva === 'tarifas' && (
        <div className="bg-white p-6 rounded-xl shadow-md max-w-4xl">
          <h2 className="text-xl font-bold text-gray-700 mb-2">Parametrización de Cobros e Impuestos</h2>
          <p className="text-gray-500 mb-6 text-sm">Ajusta el tiempo de gracia, el modo de cobro y el IVA aplicable según el reglamento.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* CARROS */}
            <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
              <h3 className="font-black text-blue-800 mb-4 text-lg">🚙 Configuración Carros</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Minutos Gratis (Gracia)</label>
                  <input type="number" className="w-full p-3 border border-blue-200 rounded-xl outline-none" value={minutosCarro} onChange={(e) => setMinutosCarro(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Valor Hora Adicional</label>
                  <input type="number" className="w-full p-3 border border-blue-200 rounded-xl outline-none" value={valorCarro} onChange={(e) => setValorCarro(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Modo de Cobro</label>
                  <select className="w-full p-3 border border-blue-200 rounded-xl outline-none font-bold" value={modoCarro} onChange={(e) => setModoCarro(e.target.value)}>
                    <option value="Hora">Fijo por Hora Iniciada</option>
                    <option value="Fraccion">Proporcional (Fracción)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* MOTOS */}
            <div className="bg-orange-50 p-6 rounded-2xl border border-orange-100">
              <h3 className="font-black text-orange-800 mb-4 text-lg">🏍️ Configuración Motos</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Minutos Gratis (Gracia)</label>
                  <input type="number" className="w-full p-3 border border-orange-200 rounded-xl outline-none" value={minutosMoto} onChange={(e) => setMinutosMoto(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Valor Hora Adicional</label>
                  <input type="number" className="w-full p-3 border border-orange-200 rounded-xl outline-none" value={valorMoto} onChange={(e) => setValorMoto(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Modo de Cobro</label>
                  <select className="w-full p-3 border border-orange-200 rounded-xl outline-none font-bold" value={modoMoto} onChange={(e) => setModoMoto(e.target.value)}>
                    <option value="Hora">Fijo por Hora Iniciada</option>
                    <option value="Fraccion">Proporcional (Fracción)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-100 p-5 rounded-lg border border-gray-300">
            <h3 className="font-black text-gray-800 mb-4 text-lg flex items-center gap-2">🧾 Impuestos (IVA)</h3>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={aplicaIva} onChange={(e) => setAplicaIva(e.target.checked)} className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500" />
                <span className="font-bold text-gray-700">Cobrar IVA</span>
              </label>
              
              {aplicaIva && (
                <div className="flex items-center gap-2">
                  <label className="font-bold text-gray-700">Porcentaje:</label>
                  <input type="number" className="w-24 p-2 border rounded-md outline-none text-center font-bold" value={porcentajeIva} onChange={(e) => setPorcentajeIva(e.target.value)} />
                  <span className="font-bold text-gray-500">%</span>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-3">* El sistema redondeará automáticamente el valor total a los $50 pesos más cercanos.</p>
          </div>
          
          <button onClick={guardarTarifas} className="mt-8 w-full bg-blue-600 text-white font-black py-4 rounded-xl hover:bg-blue-700 transition shadow-lg hover:-translate-y-1">
            💾 Guardar Parámetros de Cobro
          </button>
        </div>
      )}

      {/* PESTAÑA: VIGILANTES */}
      {pestanaActiva === 'vigilantes' && (
        <div className="space-y-8">
          
          {/* SECCIÓN 1: ACTIVOS AHORA */}
          <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-blue-500">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex justify-between items-center">
              🟢 Guardas Activos en este momento
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {vigilantesTurno.length === 0 ? (
                <p className="text-gray-500 italic col-span-3">No hay vigilantes trabajando ahora mismo.</p>
              ) : (
                vigilantesTurno.map((vig) => (
                  <div key={vig.id} onClick={() => verDetalleTurno(vig)} className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded-r-lg shadow-sm hover:shadow-md hover:bg-blue-100 transition cursor-pointer">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="bg-blue-200 p-2 rounded-full text-xl">👮‍♂️</div>
                      <div>
                        <h3 className="font-black text-gray-800">{vig.nombre_guarda}</h3>
                        <p className="text-xs text-gray-500 font-bold">CC: {vig.cedula}</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700"><span className="font-bold">Puesto:</span> {vig.puesto}</p>
                    <p className="text-sm text-blue-700 font-bold mt-1">Inició: {new Date(vig.hora_inicio).toLocaleTimeString()}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* SECCIÓN 2: HISTORIAL Y LIMPIEZA */}
          <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-slate-500">
            <h2 className="text-xl font-bold text-gray-800 mb-4">📖 Historial de Turnos Cerrados</h2>
            
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-100 z-10 shadow-sm">
                  <tr className="text-gray-600 uppercase text-xs leading-normal">
                    <th className="py-3 px-4">Guarda</th>
                    <th className="py-3 px-4">Puesto</th>
                    <th className="py-3 px-4">Ingreso</th>
                    <th className="py-3 px-4">Salida</th>
                    <th className="py-3 px-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="text-gray-600 text-sm">
                  {turnosInactivos.map((turno) => (
                    <tr key={turno.id} className="border-b hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <span className="font-bold text-gray-800">{turno.nombre_guarda}</span><br/>
                        <span className="text-xs text-gray-500">CC: {turno.cedula}</span>
                      </td>
                      <td className="py-3 px-4 font-semibold">{turno.puesto}</td>
                      <td className="py-3 px-4 text-xs">{new Date(turno.hora_inicio).toLocaleString()}</td>
                      <td className="py-3 px-4 text-xs">{new Date(turno.hora_fin).toLocaleString()}</td>
                      <td className="py-3 px-4 flex justify-center gap-2">
                        <button onClick={() => verDetalleTurno(turno)} className="bg-blue-100 text-blue-600 px-3 py-1 rounded-md font-bold hover:bg-blue-200 transition text-xs">
                          Ver Caja
                        </button>
                        <button onClick={() => borrarTurnoHistorial(turno.id)} className="bg-red-50 text-red-500 px-2 py-1 rounded-md font-bold hover:bg-red-100 transition" title="Borrar Historial">
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                  {turnosInactivos.length === 0 && (
                    <tr><td colSpan="5" className="text-center py-8 text-gray-500">No hay turnos en el historial.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 🔥 PESTAÑA: HISTORIAL VISITANTES 🔥 */}
      {pestanaActiva === 'historial_visitas' && (
        <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-emerald-500">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Historial Detallado de Visitantes</h2>
              <p className="text-sm text-gray-500 mt-1">Filtra y exporta la información para cobros administrativos.</p>
            </div>
            
            <button 
              onClick={exportarHistorialExcel}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-6 rounded-xl shadow-sm transition-colors flex items-center gap-2"
            >
              <span>📊</span> Exportar a Excel
            </button>
          </div>
          
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
            <h3 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">Filtros de Búsqueda</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Inmueble</label>
                <input 
                  type="text" 
                  value={filtroInmuebleHistorial}
                  onChange={(e) => setFiltroInmuebleHistorial(e.target.value)}
                  placeholder="Ej: 101, Torre 2..."
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-emerald-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Fecha Ingreso (Desde)</label>
                <input 
                  type="date" 
                  value={filtroFechaInicio}
                  onChange={(e) => setFiltroFechaInicio(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-emerald-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Fecha Ingreso (Hasta)</label>
                <input 
                  type="date" 
                  value={filtroFechaFin}
                  onChange={(e) => setFiltroFechaFin(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-emerald-500 text-sm"
                />
              </div>
            </div>
            
            <div className="mt-4 flex justify-end">
              <button 
                onClick={() => { setFiltroInmuebleHistorial(''); setFiltroFechaInicio(''); setFiltroFechaFin(''); }}
                className="text-xs text-slate-500 hover:text-slate-700 underline font-semibold"
              >
                Limpiar Filtros
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-800 text-white z-10">
                <tr className="text-xs uppercase tracking-wider">
                  <th className="py-3 px-4 font-semibold">Inmueble</th>
                  <th className="py-3 px-4 font-semibold">Vehículo / Placa</th>
                  <th className="py-3 px-4 font-semibold">Visitante</th>
                  <th className="py-3 px-4 font-semibold">Ingreso</th>
                  <th className="py-3 px-4 font-semibold">Salida</th>
                  <th className="py-3 px-4 font-semibold text-center">Estado</th>
                  <th className="py-3 px-4 font-semibold text-right">Cobrado</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-100">
                {registrosHistorialFiltrados.length > 0 ? (
                  registrosHistorialFiltrados.map((reg) => (
                    <tr key={reg.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-700">{reg.inmueble}</td>
                      <td className="py-3 px-4">
                        <span className="font-black text-slate-800">{reg.placa}</span>
                        <span className="text-xs text-slate-400 block">{reg.tipo_vehiculo}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold">{reg.nombre_visitante || 'N/A'}</span>
                        <span className="text-xs text-slate-400 block">CC: {reg.cedula_visitante || 'N/A'}</span>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">
                        {new Date(reg.hora_entrada).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">
                        {reg.hora_salida ? new Date(reg.hora_salida).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : <span className="text-slate-400 italic">Adentro</span>}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${reg.estado === 'Pagado' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                          {reg.estado}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-600">
                        {reg.valor_total ? `$${reg.valor_total.toLocaleString()}` : '$0'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-slate-400">
                      No se encontraron registros con los filtros aplicados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <div className="mt-4 text-right text-xs text-slate-500 font-semibold">
            Total registros listados: {registrosHistorialFiltrados.length}
          </div>
        </div>
      )}
    </div>
  );
}