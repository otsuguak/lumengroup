import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import Swal from 'sweetalert2';

export default function CanalesPagoAdmin() {
  const [cargando, setCargando] = useState(true);
  const [copropiedadId, setCopropiedadId] = useState(null);
  const [enlaces, setEnlaces] = useState([]);
  
  // Estados para el Modal
  const [mostrarModal, setMostrarModal] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [formData, setFormData] = useState({ id: null, titulo: '', url_pago: '' });

  useEffect(() => {
    inicializar();
  }, []);

  const inicializar = async () => {
    const idConjunto = sessionStorage.getItem('copropiedad_id');
    if (!idConjunto || idConjunto === 'null') {
      setCargando(false);
      return; 
    }
    setCopropiedadId(idConjunto);
    await cargarPagos(idConjunto);
  };

  const cargarPagos = async (id) => {
    setCargando(true);
    try {
      const { data, error } = await supabase
        .from('configuracion_pagos')
        .select('*')
        .eq('copropiedad_id', id)
        .order('created_at', { ascending: true });
        
      if (error) throw error;
      setEnlaces(data || []);
    } catch (error) {
      console.error("Error cargando pagos:", error);
    } finally {
      setCargando(false);
    }
  };

  const abrirModalNuevo = () => {
    setModoEdicion(false);
    setFormData({ id: null, titulo: '', url_pago: '' });
    setMostrarModal(true);
  };

  const abrirModalEditar = (pago) => {
    setModoEdicion(true);
    setFormData({ id: pago.id, titulo: pago.titulo, url_pago: pago.url_pago });
    setMostrarModal(true);
  };

  const guardarPago = async (e) => {
    e.preventDefault();
    if (!formData.titulo || !formData.url_pago) {
      return Swal.fire('Atención', 'Todos los campos son obligatorios.', 'warning');
    }

    Swal.fire({ title: 'Guardando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
      if (modoEdicion) {
        // ACTUALIZAR
        const { error } = await supabase
          .from('configuracion_pagos')
          .update({ titulo: formData.titulo, url_pago: formData.url_pago, updated_at: new Date().toISOString() })
          .eq('id', formData.id);
        if (error) throw error;
        Swal.fire('¡Actualizado!', 'El canal de pago ha sido modificado.', 'success');
      } else {
        // CREAR NUEVO
        const { error } = await supabase
          .from('configuracion_pagos')
          .insert([{ copropiedad_id: copropiedadId, titulo: formData.titulo, url_pago: formData.url_pago }]);
        if (error) throw error;
        Swal.fire('¡Creado!', 'El nuevo canal de pago está activo.', 'success');
      }
      
      setMostrarModal(false);
      cargarPagos(copropiedadId);
    } catch (error) {
      Swal.fire('Error', 'Hubo un problema al guardar los datos.', 'error');
    }
  };

  const eliminarPago = async (id) => {
    const confirm = await Swal.fire({
      title: '¿Eliminar canal de pago?',
      text: 'Los residentes ya no verán este link en su portal.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Sí, eliminar'
    });

    if (confirm.isConfirmed) {
      try {
        const { error } = await supabase.from('configuracion_pagos').delete().eq('id', id);
        if (error) throw error;
        setEnlaces(enlaces.filter(e => e.id !== id));
        Swal.fire('Eliminado', 'El canal de pago ha sido borrado.', 'success');
      } catch (error) {
        Swal.fire('Error', 'No se pudo eliminar el registro.', 'error');
      }
    }
  };

  if (cargando) return <div className="flex justify-center p-20"><div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full"></div></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      
      {/* HEADER */}
      <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight mb-2">Canales de <span className="text-blue-600">Recaudo</span></h2>
          <p className="text-slate-500 font-medium">Administra las pasarelas de pago y cuotas para los residentes.</p>
        </div>
        <button onClick={abrirModalNuevo} className="bg-slate-900 hover:bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg transform hover:-translate-y-1 flex items-center gap-2">
          <span>+</span> Nuevo Canal
        </button>
      </div>

      {/* LISTA DE PAGOS (TABLA) */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
        <div className="p-6 overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead>
              <tr className="text-slate-400 font-black uppercase text-[10px] tracking-widest border-b border-slate-100">
                <th className="px-6 py-5">Identificador / Título</th>
                <th className="px-6 py-5">URL de Destino</th>
                <th className="px-6 py-5 text-right">Gestión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {enlaces.length === 0 ? (
                <tr><td colSpan="3" className="text-center py-20 text-slate-400 font-bold italic">No hay canales de pago configurados.</td></tr>
              ) : (
                enlaces.map(enlace => (
                  <tr key={enlace.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl shadow-inner">💳</div>
                        <div>
                          <p className="font-black text-slate-800 text-sm">{enlace.titulo}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Activo en Portal</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <a href={enlace.url_pago} target="_blank" rel="noreferrer" className="text-xs text-blue-500 font-medium hover:underline truncate block max-w-xs">
                        {enlace.url_pago}
                      </a>
                    </td>
                    <td className="px-6 py-5 text-right space-x-2">
                      <button onClick={() => abrirModalEditar(enlace)} className="inline-flex items-center justify-center px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase hover:bg-blue-500 hover:text-white transition-colors">
                        ✏️ Editar
                      </button>
                      <button onClick={() => eliminarPago(enlace.id)} className="inline-flex items-center justify-center w-8 h-8 bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-colors">
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CREAR / EDITAR */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100">
            <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <span className="text-2xl">💳</span> {modoEdicion ? 'Editar Canal' : 'Nuevo Canal de Pago'}
              </h3>
              <button onClick={() => setMostrarModal(false)} className="w-10 h-10 rounded-full bg-white border border-slate-200 text-slate-400 hover:bg-red-500 hover:border-red-500 hover:text-white font-bold transition-colors">✕</button>
            </div>
            
            <form onSubmit={guardarPago} className="p-8 space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Título del Cobro</label>
                <input 
                  type="text" 
                  value={formData.titulo} 
                  onChange={e => setFormData({...formData, titulo: e.target.value})} 
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold text-slate-700"
                  placeholder="Ej: Cuota de Administración, Parqueadero..."
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Enlace de Pasarela (URL)</label>
                <input 
                  type="url" 
                  value={formData.url_pago} 
                  onChange={e => setFormData({...formData, url_pago: e.target.value})} 
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono text-blue-600 placeholder-slate-400"
                  placeholder="https://checkout.wompi.co/..."
                />
              </div>

              <button type="submit" className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl hover:bg-blue-600 transition-all shadow-xl shadow-slate-200 uppercase tracking-widest text-xs transform hover:-translate-y-1">
                {modoEdicion ? 'Guardar Cambios' : 'Crear Canal'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}