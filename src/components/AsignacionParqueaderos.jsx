import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import Swal from 'sweetalert2';

export default function AsignacionParqueaderos({ copropiedadId }) {
  const [residentes, setResidentes] = useState([]);
  const [asignaciones, setAsignaciones] = useState([]);
  const [cargando, setCargando] = useState(false);
  
  // Estado para el buscador de la tabla inferior
  const [busqueda, setBusqueda] = useState('');

  // Estados del Buscador Desplegable (Custom Dropdown)
  const [filtroDropdown, setFiltroDropdown] = useState('');
  const [dropdownAbierto, setDropdownAbierto] = useState(false);

  // 🔥 NUEVO: Estados para MODO EDICIÓN 🔥
  const [modoEdicion, setModoEdicion] = useState(false);
  const [idEdicion, setIdEdicion] = useState(null);
  const [urlsExistentes, setUrlsExistentes] = useState({ tarjeta: null, soat: null, tecno: null });

  // Formulario
  const [inmuebleSeleccionado, setInmuebleSeleccionado] = useState('');
  const [nombrePrecargado, setNombrePrecargado] = useState('');
  const [numeroParqueadero, setNumeroParqueadero] = useState('');
  const [placa, setPlaca] = useState('');
  const [tipoParqueadero, setTipoParqueadero] = useState('Carro');
  const [tipoVehiculo, setTipoVehiculo] = useState('Automóvil');
  
  // Archivos
  const [docTarjeta, setDocTarjeta] = useState(null);
  const [docSoat, setDocSoat] = useState(null);
  const [docTecno, setDocTecno] = useState(null);

  useEffect(() => {
    if (copropiedadId) {
      cargarResidentes();
      cargarAsignaciones();
    }
  }, [copropiedadId]);

  const cargarResidentes = async () => {
    const { data } = await supabase
      .from('usuarios')
      .select('inmueble, nombre')
      .eq('copropiedad_id', copropiedadId)
      .order('inmueble', { ascending: true });
    if (data) setResidentes(data);
  };

  const cargarAsignaciones = async () => {
    const { data } = await supabase
      .from('parqueaderos_asignados')
      .select('*')
      .eq('copropiedad_id', copropiedadId)
      .order('created_at', { ascending: false });
    if (data) setAsignaciones(data);
  };

  const residentesFiltrados = residentes.filter(r => {
    const inmuebleTexto = r.inmueble || '';
    const nombreTexto = r.nombre || '';    
    const filtro = filtroDropdown || '';

    return inmuebleTexto.toLowerCase().includes(filtro.toLowerCase()) || 
           nombreTexto.toLowerCase().includes(filtro.toLowerCase());
  });

  const seleccionarResidente = (inmueble, nombre) => {
    const inmuebleSeguro = inmueble || 'Sin Inmueble';
    const nombreSeguro = nombre || 'Sin Nombre';

    setInmuebleSeleccionado(inmuebleSeguro);
    setNombrePrecargado(nombreSeguro);
    setFiltroDropdown(`${inmuebleSeguro} - ${nombreSeguro}`); 
    setDropdownAbierto(false); 
  };

  const subirArchivo = async (archivo, tipoDoc) => {
    if (!archivo) return null;
    const fileExt = archivo.name.split('.').pop();
    const fileName = `${copropiedadId}_${placa}_${tipoDoc}_${Math.random()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('documentos_vehiculos')
      .upload(fileName, archivo);

    if (error) {
      console.error(`Error subiendo ${tipoDoc}:`, error);
      return null;
    }
    
    const { data: publicUrlData } = supabase.storage
      .from('documentos_vehiculos')
      .getPublicUrl(fileName);
      
    return publicUrlData.publicUrl;
  };

  // 🔥 NUEVO: Función para resetear el formulario 🔥
  const limpiarFormulario = () => {
    setModoEdicion(false);
    setIdEdicion(null);
    setFiltroDropdown('');
    setInmuebleSeleccionado('');
    setNombrePrecargado('');
    setNumeroParqueadero('');
    setPlaca('');
    setUrlsExistentes({ tarjeta: null, soat: null, tecno: null });
    setDocTarjeta(null);
    setDocSoat(null);
    setDocTecno(null);
    
    document.getElementById('input-tarjeta').value = '';
    document.getElementById('input-soat').value = '';
    document.getElementById('input-tecno').value = '';
  };

  // 🔥 NUEVO: Función para preparar la edición 🔥
  const editarAsignacion = (asig) => {
    setModoEdicion(true);
    setIdEdicion(asig.id);
    
    const inmuebleSeguro = asig.inmueble || 'Sin Inmueble';
    const nombreSeguro = asig.nombre_residente || 'Sin Nombre';
    
    setInmuebleSeleccionado(inmuebleSeguro);
    setNombrePrecargado(nombreSeguro);
    setFiltroDropdown(`${inmuebleSeguro} - ${nombreSeguro}`);
    
    setNumeroParqueadero(asig.numero_parqueadero);
    setPlaca(asig.placa);
    setTipoParqueadero(asig.tipo_parqueadero);
    setTipoVehiculo(asig.tipo_vehiculo);
    
    setUrlsExistentes({
      tarjeta: asig.doc_tarjeta_propiedad,
      soat: asig.doc_soat,
      tecno: asig.doc_tecnomecanica
    });

    // Subir suavemente al inicio de la página para que el admin vea el formulario
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 🔥 NUEVO: Función para borrar registro 🔥
  const eliminarAsignacion = async (id, placaVehiculo) => {
    const { isConfirmed } = await Swal.fire({
      title: '¿Eliminar registro?',
      text: `Estás a punto de borrar la placa ${placaVehiculo}. Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#9ca3af',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (isConfirmed) {
      const { error } = await supabase.from('parqueaderos_asignados').delete().eq('id', id);
      if (error) {
        Swal.fire('Error', 'No se pudo eliminar el registro.', 'error');
      } else {
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Borrado correctamente', showConfirmButton: false, timer: 1500 });
        cargarAsignaciones();
        if (modoEdicion && idEdicion === id) limpiarFormulario(); // Si estaba editando el que borró, limpia
      }
    }
  };

  const guardarAsignacion = async (e) => {
    e.preventDefault();
    if (!inmuebleSeleccionado || !numeroParqueadero || !placa) {
      return Swal.fire('Faltan Datos', 'Debes seleccionar un inmueble de la lista, escribir el parqueadero y la placa.', 'warning');
    }

    setCargando(true);
    try {
      // Si estamos editando y NO subió archivo nuevo, conservamos la URL vieja
      const urlTarjeta = docTarjeta ? await subirArchivo(docTarjeta, 'tarjeta') : (modoEdicion ? urlsExistentes.tarjeta : null);
      const urlSoat = docSoat ? await subirArchivo(docSoat, 'soat') : (modoEdicion ? urlsExistentes.soat : null);
      const urlTecno = docTecno ? await subirArchivo(docTecno, 'tecno') : (modoEdicion ? urlsExistentes.tecno : null);

      const payload = {
        copropiedad_id: copropiedadId,
        inmueble: inmuebleSeleccionado,
        nombre_residente: nombrePrecargado,
        numero_parqueadero: numeroParqueadero,
        placa: placa.toUpperCase(),
        tipo_parqueadero: tipoParqueadero,
        tipo_vehiculo: tipoVehiculo,
        doc_tarjeta_propiedad: urlTarjeta,
        doc_soat: urlSoat,
        doc_tecnomecanica: urlTecno
      };

      if (modoEdicion) {
        // ACTUALIZAR REGISTRO
        const { error } = await supabase.from('parqueaderos_asignados').update(payload).eq('id', idEdicion);
        if (error) throw error;
        Swal.fire('¡Actualizado!', 'El registro fue modificado con éxito.', 'success');
      } else {
        // CREAR NUEVO REGISTRO
        const { error } = await supabase.from('parqueaderos_asignados').insert([payload]);
        if (error) throw error;
        Swal.fire('¡Éxito!', 'Parqueadero asignado y documentos guardados.', 'success');
      }
      
      limpiarFormulario();
      cargarAsignaciones(); 
    } catch (error) {
      Swal.fire('Error', error.message, 'error');
    } finally {
      setCargando(false);
    }
  };

  const asignacionesFiltradas = asignaciones.filter(asig => {
    const inmuebleTexto = asig.inmueble || '';
    const placaTexto = asig.placa || '';
    const filtro = busqueda || '';

    return inmuebleTexto.toLowerCase().includes(filtro.toLowerCase()) ||
           placaTexto.toLowerCase().includes(filtro.toLowerCase());
  });

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative">
      <h2 className="text-2xl font-black text-slate-800 mb-6">
        {modoEdicion ? '✏️ Editando Asignación' : 'Asignación de Parqueaderos'}
      </h2>
      
      <form onSubmit={guardarAsignacion} className={`p-6 rounded-xl border mb-10 relative transition-colors ${modoEdicion ? 'bg-amber-50/50 border-amber-300' : 'bg-slate-50 border-slate-200'}`}>
        <h3 className="font-bold text-slate-700 mb-4 border-b pb-2">Vincular Residente y Vehículo</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="relative z-20">
            {dropdownAbierto && (
              <div className="fixed inset-0 z-10" onClick={() => setDropdownAbierto(false)}></div>
            )}
            
            <div className="relative z-20">
              <label className="text-xs font-bold text-slate-500 uppercase">Inmueble (Buscar y Seleccionar)</label>
              <input 
                type="text" 
                placeholder="🔍 Escribe apto o nombre..." 
                value={filtroDropdown}
                onChange={(e) => {
                  setFiltroDropdown(e.target.value);
                  setDropdownAbierto(true);
                  setInmuebleSeleccionado(''); 
                  setNombrePrecargado('');
                }}
                onClick={() => setDropdownAbierto(true)}
                className="w-full mt-1 p-2 rounded-lg border border-slate-300 focus:border-[#00A6FB] outline-none bg-white shadow-sm"
              />
              
              {dropdownAbierto && (
                <ul className="absolute w-full bg-white border border-slate-200 mt-1 rounded-lg shadow-2xl max-h-52 overflow-y-auto custom-scrollbar">
                  {residentesFiltrados.length > 0 ? (
                    residentesFiltrados.map((r, i) => (
                      <li 
                        key={i} 
                        onClick={() => seleccionarResidente(r.inmueble, r.nombre)}
                        className="p-3 text-sm hover:bg-[#00A6FB] hover:text-white cursor-pointer border-b border-slate-50 last:border-0 transition-colors"
                      >
                        <span className="font-black">{r.inmueble || 'N/A'}</span> - {r.nombre || 'N/A'}
                      </li>
                    ))
                  ) : (
                    <li className="p-3 text-sm text-slate-400 text-center font-bold">No hay coincidencias</li>
                  )}
                </ul>
              )}
            </div>
          </div>

          <div className="relative z-0">
            <label className="text-xs font-bold text-slate-500 uppercase">Residente Principal</label>
            <input 
              type="text" 
              value={nombrePrecargado} 
              disabled 
              className={`w-full mt-1 p-2 rounded-lg border outline-none font-bold transition-colors ${nombrePrecargado ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-200 border-slate-300 text-slate-400'}`} 
              placeholder="Esperando selección de la lista..."
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 relative z-0">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">N° Parqueadero</label>
            <input type="text" value={numeroParqueadero} onChange={(e) => setNumeroParqueadero(e.target.value)} required className="w-full mt-1 p-2 rounded-lg border border-slate-300" placeholder="Ej: 45-Sótano 2"/>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Placa</label>
            <input type="text" value={placa} onChange={(e) => setPlaca(e.target.value)} required className="w-full mt-1 p-2 rounded-lg border border-slate-300 uppercase" placeholder="ABC-123"/>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Tipo Puesto</label>
            <select value={tipoParqueadero} onChange={(e) => setTipoParqueadero(e.target.value)} className="w-full mt-1 p-2 rounded-lg border border-slate-300 bg-white">
              <option value="Carro">Carro</option>
              <option value="Moto">Moto</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Tipo Vehículo</label>
            <select value={tipoVehiculo} onChange={(e) => setTipoVehiculo(e.target.value)} className="w-full mt-1 p-2 rounded-lg border border-slate-300 bg-white">
              <option value="Automóvil">Automóvil</option>
              <option value="Camioneta/SUV">Camioneta/SUV</option>
              <option value="Motocicleta">Motocicleta</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4 border-b pb-2">
          <h3 className="font-bold text-slate-700">Carga de Documentos Legales <span className="text-xs font-normal text-slate-400">{modoEdicion && '(Deja vacío para conservar los actuales)'}</span></h3>
          <span className="bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full animate-pulse shadow-sm border border-blue-200">
            💡 TIP: Doble clic en los cuadros para cargar archivo
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 relative z-0">
          <div className="bg-white p-3 rounded border border-slate-200 hover:border-blue-400 transition-colors cursor-pointer shadow-sm">
            <label className="text-xs font-black text-[#00A6FB] block mb-2 cursor-pointer uppercase tracking-wider">📄 Tarjeta de Propiedad</label>
            <input id="input-tarjeta" type="file" accept=".pdf,image/*" onChange={(e) => setDocTarjeta(e.target.files[0])} className="text-xs w-full cursor-pointer text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
            {modoEdicion && urlsExistentes.tarjeta && !docTarjeta && <p className="text-[10px] text-emerald-600 mt-2 font-bold">✓ Documento ya subido</p>}
          </div>
          <div className="bg-white p-3 rounded border border-slate-200 hover:border-emerald-400 transition-colors cursor-pointer shadow-sm">
            <label className="text-xs font-black text-emerald-600 block mb-2 cursor-pointer uppercase tracking-wider">🛡️ SOAT Vigente</label>
            <input id="input-soat" type="file" accept=".pdf,image/*" onChange={(e) => setDocSoat(e.target.files[0])} className="text-xs w-full cursor-pointer text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100" />
            {modoEdicion && urlsExistentes.soat && !docSoat && <p className="text-[10px] text-emerald-600 mt-2 font-bold">✓ Documento ya subido</p>}
          </div>
          <div className="bg-white p-3 rounded border border-slate-200 hover:border-amber-400 transition-colors cursor-pointer shadow-sm">
            <label className="text-xs font-black text-amber-600 block mb-2 cursor-pointer uppercase tracking-wider">🔧 Tecnomecánica</label>
            <input id="input-tecno" type="file" accept=".pdf,image/*" onChange={(e) => setDocTecno(e.target.files[0])} className="text-xs w-full cursor-pointer text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100" />
            {modoEdicion && urlsExistentes.tecno && !docTecno && <p className="text-[10px] text-emerald-600 mt-2 font-bold">✓ Documento ya subido</p>}
          </div>
        </div>

        {/* 🔥 BOTONES DE ACCIÓN DINÁMICOS 🔥 */}
        <div className="flex gap-4">
          <button type="submit" disabled={cargando} className={`flex-1 text-white font-black uppercase tracking-widest py-3.5 rounded-xl transition-transform hover:scale-[1.01] disabled:opacity-50 shadow-lg hover:shadow-xl ${modoEdicion ? 'bg-amber-500 hover:bg-amber-600' : 'bg-[#00A6FB] hover:bg-blue-600'}`}>
            {cargando ? 'Guardando...' : (modoEdicion ? 'Actualizar Asignación' : 'Guardar Asignación')}
          </button>
          
          {modoEdicion && (
            <button type="button" onClick={limpiarFormulario} disabled={cargando} className="w-1/3 bg-slate-300 text-slate-700 font-black uppercase tracking-widest py-3.5 rounded-xl hover:bg-slate-400 transition-colors shadow-sm">
              Cancelar
            </button>
          )}
        </div>
      </form>

      {/* ============================================================== */}
      {/* TABLA DE ASIGNACIONES CON BUSCADOR DE LA TABLA                 */}
      {/* ============================================================== */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
        <h3 className="font-bold text-slate-800 text-lg">Registro Operativo de Parqueaderos</h3>
        
        <div className="relative w-full md:w-72">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">🔍</span>
          <input 
            type="text" 
            placeholder="Buscar inmueble o placa..." 
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-10 p-2 rounded-xl border border-slate-300 focus:border-[#00A6FB] focus:ring-1 focus:ring-[#00A6FB] outline-none transition-all shadow-sm"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
        <table className="w-full text-left bg-white text-sm">
          <thead className="bg-slate-800 text-white">
            <tr>
              <th className="p-4 font-bold">Inmueble / Residente</th>
              <th className="p-4 font-bold">Placa</th>
              <th className="p-4 font-bold">Puesto</th>
              <th className="p-4 font-bold text-center">Documentos</th>
              <th className="p-4 font-bold text-center">Acciones</th> {/* NUEVA COLUMNA */}
            </tr>
          </thead>
          <tbody className="divide-y border-slate-100">
            {asignacionesFiltradas.map((asig) => (
              <tr key={asig.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-4">
                  <span className="block font-black text-slate-800 text-base">{asig.inmueble || 'N/A'}</span>
                  <span className="text-xs text-slate-500 uppercase tracking-wide">{asig.nombre_residente || 'N/A'}</span>
                </td>
                <td className="p-4 font-mono font-bold text-[#00A6FB] text-lg">{asig.placa || 'N/A'}</td>
                <td className="p-4">
                  <span className="bg-slate-200 px-3 py-1 rounded-lg text-xs font-black mr-2 text-slate-700">{asig.numero_parqueadero}</span>
                  <span className="text-xs text-slate-500 hidden md:inline-block">{asig.tipo_vehiculo}</span>
                </td>
                <td className="p-4 text-center">
                  <div className="flex justify-center gap-2">
                    {asig.doc_tarjeta_propiedad ? (
                      <a href={asig.doc_tarjeta_propiedad} target="_blank" rel="noreferrer" className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-200 transition-colors shadow-sm">Tarjeta</a>
                    ) : <span className="text-xs text-slate-300">N/A</span>}
                    
                    {asig.doc_soat ? (
                      <a href={asig.doc_soat} target="_blank" rel="noreferrer" className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-emerald-200 transition-colors shadow-sm">SOAT</a>
                    ) : <span className="text-xs text-slate-300">N/A</span>}
                    
                    {asig.doc_tecnomecanica ? (
                      <a href={asig.doc_tecnomecanica} target="_blank" rel="noreferrer" className="bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-amber-200 transition-colors shadow-sm">Tecno</a>
                    ) : <span className="text-xs text-slate-300">N/A</span>}
                  </div>
                </td>
                
                {/* 🔥 NUEVOS BOTONES DE ACCIÓN 🔥 */}
                <td className="p-4 text-center">
                  <div className="flex justify-center gap-2">
                    <button 
                      onClick={() => editarAsignacion(asig)} 
                      className="p-2 bg-amber-100 text-amber-600 rounded-lg hover:bg-amber-200 transition-colors shadow-sm" 
                      title="Editar Asignación"
                    >
                      ✏️
                    </button>
                    <button 
                      onClick={() => eliminarAsignacion(asig.id, asig.placa)} 
                      className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors shadow-sm" 
                      title="Eliminar Asignación"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            
            {asignacionesFiltradas.length === 0 && (
              <tr>
                <td colSpan="5" className="p-10 text-center">
                  <div className="flex flex-col items-center justify-center text-slate-400">
                    <span className="text-4xl mb-3">📭</span>
                    <p className="font-bold">{busqueda ? 'No se encontraron resultados para tu búsqueda.' : 'Aún no hay parqueaderos asignados.'}</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}