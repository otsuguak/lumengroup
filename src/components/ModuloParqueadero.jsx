import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import Swal from 'sweetalert2';
import { generarCascaronHTML } from '../utils/plantillas'; // 🔥 IMPORTAMOS LA FÁBRICA

export default function ModuloParqueadero({ turno }) {
  // Pestañas de la vista del guarda
  const [pestanaActiva, setPestanaActiva] = useState('adentro');

  // ESTADO PARA EL OJITO (Mostrar/Ocultar dinero)
  const [mostrarValores, setMostrarValores] = useState(false);

  // Estados del Formulario de Ingreso
  const [placa, setPlaca] = useState('');
  const [tipoVehiculo, setTipoVehiculo] = useState('Carro');
  const [inmueble, setInmueble] = useState('');
  const [nombre, setNombre] = useState('');
  const [cedula, setCedula] = useState('');

  // Estados de la Base de Datos
  const [vehiculos, setVehiculos] = useState([]);
  const [historialCobros, setHistorialCobros] = useState([]);
  const [totalRecaudado, setTotalRecaudado] = useState(0);
  const [configTarifa, setConfigTarifa] = useState([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    cargarDatosPrincipales();
  }, [turno]);

  const cargarDatosPrincipales = async () => {
    // 1. Cargar Tarifas
    const { data: config } = await supabase
      .from('tarifas_parqueadero')
      .select('*')
      .eq('copropiedad_id', turno.copropiedad_id);
    if (config) setConfigTarifa(config);

    // 2. Cargar vehículos ADENTRO
    const { data: carrosDentro } = await supabase
      .from('parqueadero_visitantes')
      .select('*')
      .eq('copropiedad_id', turno.copropiedad_id)
      .eq('estado', 'Dentro')
      .order('hora_entrada', { ascending: false });
    if (carrosDentro) setVehiculos(carrosDentro);

    // 3. Cargar HISTORIAL DEL TURNO ACTUAL
    const { data: historial } = await supabase
      .from('parqueadero_visitantes')
      .select('*')
      .eq('turno_salida_id', turno.id) 
      .eq('estado', 'Pagado')
      .order('hora_salida', { ascending: false });

    if (historial) {
      setHistorialCobros(historial);
      const suma = historial.reduce((acc, item) => acc + Number(item.valor_total || 0), 0);
      setTotalRecaudado(suma);
    }
  };

  const registrarIngreso = async (e) => {
    e.preventDefault();
    if (!placa || !inmueble) return Swal.fire('Atención', 'Placa e inmueble son obligatorios', 'warning');
    
    setCargando(true);
    const { error } = await supabase
      .from('parqueadero_visitantes')
      .insert([{
        copropiedad_id: turno.copropiedad_id,
        placa: placa.toUpperCase(),
        tipo_vehiculo: tipoVehiculo,
        estado: 'Dentro',
        turno_ingreso_id: turno.id,
        inmueble: inmueble,
        nombre_visitante: nombre,
        cedula_visitante: cedula
      }]);

    setCargando(false);

    if (error) {
      Swal.fire('Error', 'No se pudo registrar el ingreso', 'error');
    } else {
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Ingreso registrado', showConfirmButton: false, timer: 2000 });
      setPlaca(''); setInmueble(''); setNombre(''); setCedula('');
      cargarDatosPrincipales();
    }
  };

  const procesarSalida = async (vehiculo) => {
    const horaEntrada = new Date(vehiculo.hora_entrada);
    const horaSalida = new Date();
    const diffMinutos = Math.floor((horaSalida - horaEntrada) / 60000);

    let totalPagar = 0;
    let netoCobrado = 0;
    let ivaCalculado = 0; 

    let tarifaAplicar = configTarifa?.find(t => t.tipo_vehiculo === vehiculo.tipo_vehiculo);

    if (tarifaAplicar && diffMinutos > (tarifaAplicar.minutos_gracia || 0)) {
      const minutosExcedidos = diffMinutos - tarifaAplicar.minutos_gracia;
      const valorHora = tarifaAplicar.valor_hora;
      
      if (tarifaAplicar.modo_cobro === 'Fraccion') {
        netoCobrado = (valorHora / 60) * minutosExcedidos;
      } else {
        const horasACobrar = Math.ceil(minutosExcedidos / 60) || 1;
        netoCobrado = horasACobrar * valorHora;
      }

      if (tarifaAplicar.aplica_iva) {
        const porcentajeIva = tarifaAplicar.porcentaje_iva || 19;
        ivaCalculado = netoCobrado * (porcentajeIva / 100);
      }

      let subtotalFinal = netoCobrado + ivaCalculado;
      totalPagar = Math.ceil(subtotalFinal / 50) * 50; 
    }

    const { value: formValues, isConfirmed } = await Swal.fire({
      title: `🚘 Salida: ${vehiculo.placa}`,
      html: `
        <div class="text-left mt-4 text-lg">
          <p><b>Inmueble Destino:</b> ${vehiculo.inmueble}</p>
          <p><b>Tiempo Total:</b> ${diffMinutos} min</p>
          <p><b>Gracia Aplicada:</b> -${tarifaAplicar?.minutos_gracia || 0} min</p>
          <p class="text-sm text-slate-500 italic mb-2">Modo de cobro: <span class="font-semibold text-slate-700">${tarifaAplicar?.modo_cobro === 'Fraccion' ? 'Por fracción' : 'Hora completa'}</span></p>
          <hr class="my-2"/>
          <p><b>Subtotal:</b> $${netoCobrado.toLocaleString()}</p>
          <p><b>IVA (${tarifaAplicar?.porcentaje_iva || 19}%):</b> $${ivaCalculado.toLocaleString()}</p>
          <h3 class="text-3xl text-red-600 font-black mt-4 mb-4">A COBRAR: $${totalPagar.toLocaleString()}</h3>
          
          <div class="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <label class="block text-sm font-bold text-gray-700 mb-2">¿Enviar factura de cobro?</label>
            <input id="swal-correo-factura" type="email" class="w-full p-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder="Opcional: correo@cliente.com">
          </div>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#ef4444',
      confirmButtonText: '✅ Recibir Dinero y Abrir',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        return {
          correoFactura: document.getElementById('swal-correo-factura').value
        }
      }
    });

    if (isConfirmed) {
      const correoDestino = formValues.correoFactura;

      const { error } = await supabase
        .from('parqueadero_visitantes')
        .update({
          estado: 'Pagado',
          hora_salida: horaSalida.toISOString(),
          valor_neto: netoCobrado,
          valor_iva: ivaCalculado,
          valor_total: totalPagar,
          turno_salida_id: turno.id, 
          correo_visitante: correoDestino 
        })
        .eq('id', vehiculo.id);

      if (!error) {
        
        // =========================================================================
        // 🔥 CONEXIÓN AL CENTRALIZADOR DE PLANTILLAS PARA LA FACTURA 🔥
        // =========================================================================
        if (correoDestino) {
          try {
            // Buscamos si el admin configuró una plantilla
            const { data: plantillasActivas } = await supabase
              .from('plantillas_notificaciones')
              .select('*')
              .eq('copropiedad_id', turno.copropiedad_id)
              .eq('tipo_evento', 'FACTURA_PARQUEADERO')
              .eq('canal', 'email')
              .eq('modulo_activo', true)
              .maybeSingle();

            // Quitamos los saltos de línea a la tabla para que generarCascaronHTML no la rompa
            const tablaHTML = `
              <table style="width: 100%; border-collapse: collapse; margin-top: 20px; margin-bottom: 20px;">
                <tr style="background-color: #f8fafc;">
                  <td style="padding: 10px; border: 1px solid #e2e8f0;"><b>Placa:</b></td>
                  <td style="padding: 10px; border: 1px solid #e2e8f0;">${vehiculo.placa}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #e2e8f0;"><b>Tiempo Total:</b></td>
                  <td style="padding: 10px; border: 1px solid #e2e8f0;">${diffMinutos} minutos</td>
                </tr>
                <tr style="background-color: #f8fafc;">
                  <td style="padding: 10px; border: 1px solid #e2e8f0;"><b>Descuento (Gracia):</b></td>
                  <td style="padding: 10px; border: 1px solid #e2e8f0;">-${tarifaAplicar?.minutos_gracia || 0} minutos</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #e2e8f0;"><b>IVA:</b></td>
                  <td style="padding: 10px; border: 1px solid #e2e8f0;">$${ivaCalculado.toLocaleString()}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #e2e8f0; font-size: 18px; color: #10b981;"><b>TOTAL PAGADO:</b></td>
                  <td style="padding: 10px; border: 1px solid #e2e8f0; font-size: 18px; font-weight: bold; color: #10b981;">$${totalPagar.toLocaleString()}</td>
                </tr>
              </table>
            `.replace(/\n/g, ''); // TRUCO VITAL

            const reemplazarVariables = (texto) => {
              if (!texto) return '';
              return texto
                .replace(/{placa}/g, vehiculo.placa)
                .replace(/{tiempo}/g, `${diffMinutos}`)
                .replace(/{gracia}/g, `${tarifaAplicar?.minutos_gracia || 0}`)
                .replace(/{iva}/g, `$${ivaCalculado.toLocaleString()}`)
                .replace(/{total}/g, `$${totalPagar.toLocaleString()}`)
                .replace(/{detalle_tabla}/g, tablaHTML);
            };

            const asuntoEmail = plantillasActivas ? reemplazarVariables(plantillasActivas.asunto) : `Recibo de Parqueadero - Placa ${vehiculo.placa}`;
            const remitenteEmail = plantillasActivas?.nombre_remitente || 'Caja de Parqueadero';
            const textoBaseEmail = plantillasActivas 
              ? reemplazarVariables(plantillasActivas.mensaje_base) 
              : `Hola, gracias por visitarnos. Aquí tienes el resumen de tu estadía:\n\n${tablaHTML}\n\nEnviado automáticamente por el Sistema de Seguridad.`;

            // Envolvemos el recibo (ya sea el por defecto o el del admin) en nuestro diseño elegante
            const htmlFinal = generarCascaronHTML(asuntoEmail, textoBaseEmail);

            await supabase.functions.invoke('resend-correo', {
              body: { 
                bcc: [correoDestino], 
                asunto: asuntoEmail, 
                mensaje: htmlFinal,
                html: htmlFinal
              }
            });

            Swal.fire('¡Transacción Exitosa!', `Recibo enviado a ${correoDestino}`, 'success');
          } catch (notifError) {
            console.error("Error procesando recibo:", notifError);
            Swal.fire('¡Transacción Exitosa!', 'Cobro registrado, pero el correo no salió.', 'success');
          }
        } else {
          Swal.fire('¡Transacción Exitosa!', 'Cobro registrado en tu caja.', 'success');
        }
        // =========================================================================

        cargarDatosPrincipales(); 
      } else {
        Swal.fire('Error', 'No se pudo registrar el pago', 'error');
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto mt-6">
      {(!configTarifa || configTarifa.length === 0) && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6">
          <p className="font-bold">⚠️ Atención Administrador</p>
          <p>Aún no se han configurado las tarifas de parqueadero. Los ingresos serán gratuitos.</p>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* PANEL IZQUIERDO: FORMULARIO DE INGRESO */}
        <div className="bg-white p-6 rounded-2xl shadow-xl border-t-4 border-indigo-500 h-fit">
          <h2 className="text-xl font-black text-gray-800 mb-6 flex items-center gap-2">🚗 Registrar Ingreso</h2>
          
          <form onSubmit={registrarIngreso} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Placa *</label>
                <input type="text" maxLength="6" value={placa} onChange={(e) => setPlaca(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl outline-none uppercase font-black text-center text-xl tracking-widest" placeholder="ABC123" required />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Vehículo *</label>
                <select value={tipoVehiculo} onChange={(e) => setTipoVehiculo(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl outline-none font-bold">
                  <option value="Carro">🚙 Carro</option>
                  <option value="Moto">🏍️ Moto</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Inmueble Destino *</label>
              <input type="text" value={inmueble} onChange={(e) => setInmueble(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Ej: Torre 3 - Apto 402" required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Propietario/Visitante</label>
                <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl outline-none" placeholder="Juan Pérez (Opcional)" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Cédula</label>
                <input type="text" value={cedula} onChange={(e) => setCedula(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl outline-none" placeholder="123456789 (Opcional)" />
              </div>
            </div>

            <button type="submit" disabled={cargando} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg rounded-xl shadow-lg transition-transform hover:-translate-y-1 mt-2">
              {cargando ? 'Guardando...' : '📥 Permitir Ingreso'}
            </button>
          </form>
        </div>

        {/* PANEL DERECHO: PESTAÑAS (ADENTRO vs HISTORIAL) */}
        <div className="xl:col-span-2 flex flex-col space-y-4">
          
          {/* TOTALIZADOR DE CAJA DEL TURNO CON OJITO */}
          <div className="bg-emerald-500 rounded-2xl shadow-lg p-6 flex justify-between items-center text-white">
            <div>
              <h3 className="text-emerald-100 font-bold uppercase text-sm tracking-wider">Caja Actual de tu Turno</h3>
              <p className="text-sm opacity-80 mt-1">Dinero que debes entregar al terminar</p>
            </div>
            <div className="text-4xl font-black flex items-center gap-3">
              <span>{mostrarValores ? `$${totalRecaudado.toLocaleString()}` : '••••••'}</span>
              <button 
                onClick={() => setMostrarValores(!mostrarValores)} 
                className="text-2xl opacity-70 hover:opacity-100 hover:scale-110 transition-all focus:outline-none"
                title={mostrarValores ? "Ocultar valor" : "Ver valor"}
              >
                {mostrarValores ? '👁️' : '🙈'}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border-t-4 border-slate-700 flex-1">
            {/* Navegación de Pestañas */}
            <div className="flex border-b bg-slate-50">
              <button 
                onClick={() => setPestanaActiva('adentro')} 
                className={`flex-1 py-4 font-bold text-sm transition-colors ${pestanaActiva === 'adentro' ? 'text-indigo-600 border-b-4 border-indigo-600 bg-white' : 'text-gray-500 hover:bg-gray-100'}`}
              >
                🅿️ Vehículos Adentro ({vehiculos.length})
              </button>
              <button 
                onClick={() => setPestanaActiva('historial')} 
                className={`flex-1 py-4 font-bold text-sm transition-colors ${pestanaActiva === 'historial' ? 'text-emerald-600 border-b-4 border-emerald-600 bg-white' : 'text-gray-500 hover:bg-gray-100'}`}
              >
                💰 Cobros de mi Turno ({historialCobros.length})
              </button>
            </div>

            <div className="p-4 overflow-x-auto">
              
              {/* VISTA 1: CARROS ADENTRO */}
              {pestanaActiva === 'adentro' && (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-black text-gray-500 uppercase">Vehículo</th>
                      <th className="px-4 py-3 text-left text-xs font-black text-gray-500 uppercase">Inmueble</th>
                      <th className="px-4 py-3 text-left text-xs font-black text-gray-500 uppercase">Hora Ingreso</th>
                      <th className="px-4 py-3 text-right text-xs font-black text-gray-500 uppercase">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {vehiculos.length === 0 ? (
                      <tr><td colSpan="4" className="px-4 py-8 text-center text-gray-400">No hay vehículos de visitantes.</td></tr>
                    ) : (
                      vehiculos.map((v) => (
                        <tr key={v.id} className="hover:bg-slate-50">
                          <td className="px-4 py-4 whitespace-nowrap"><span className="font-black text-lg text-gray-800">{v.placa}</span><br/><span className="text-xs text-gray-500">{v.tipo_vehiculo}</span></td>
                          <td className="px-4 py-4 whitespace-nowrap font-bold text-gray-700">{v.inmueble}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(v.hora_entrada).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-right">
                            <button onClick={() => procesarSalida(v)} className="bg-red-100 text-red-600 hover:bg-red-600 hover:text-white font-bold py-2 px-4 rounded-lg transition-colors">Cobrar Salida</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {/* VISTA 2: HISTORIAL DE COBROS DEL GUARDA */}
              {pestanaActiva === 'historial' && (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-black text-gray-500 uppercase">Placa</th>
                      <th className="px-4 py-3 text-left text-xs font-black text-gray-500 uppercase">Hora Salida</th>
                      <th className="px-4 py-3 text-center text-xs font-black text-gray-500 uppercase">Factura a</th>
                      <th className="px-4 py-3 text-right text-xs font-black text-gray-500 uppercase">Total Cobrado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {historialCobros.length === 0 ? (
                      <tr><td colSpan="4" className="px-4 py-8 text-center text-gray-400">Aún no has realizado cobros en este turno.</td></tr>
                    ) : (
                      historialCobros.map((h) => (
                        <tr key={h.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 whitespace-nowrap font-bold text-gray-800">{h.placa}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{new Date(h.hora_salida).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-center text-sm">
                            {h.correo_visitante ? <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-md text-xs">✔️ Enviada</span> : <span className="text-gray-400 text-xs">Físico</span>}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right font-black text-emerald-600">
                            {mostrarValores ? `$${Number(h.valor_total).toLocaleString()}` : '••••••'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}