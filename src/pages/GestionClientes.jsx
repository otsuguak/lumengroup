import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { supabase } from '../lib/supabaseClient';
import { 
  Building2, Database, CheckCircle2, AlertCircle, 
  Loader2, LayoutGrid, Edit, Trash2 
} from 'lucide-react';

const ESTADO_INICIAL = {
  nombre: '', nit: '', direccion: '', ciudad: '', telefono_contacto: '', representante: '',
  dominio: '', plan: 'PRO', estado: true,
  mod_zonas: false, mod_reservas: false, mod_mercado: false, mod_exportar: false,
  mod_salas: false, mod_escalar: false, mod_formularios: false, mod_comunicaciones: false,
  mod_convivencia: false, mod_noticias: false, mod_pagos: false, mod_tiempos_pqr: false,
  mod_documentos: false, 
  mod_fqr: false
};

export default function GestionClientes() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  
  const [editIds, setEditIds] = useState({ saasId: null, coproId: null });
  const [formData, setFormData] = useState(ESTADO_INICIAL);

  useEffect(() => { fetchClientes(); }, []);

  const fetchClientes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('clientes_saas')
      .select('*, copropiedades(id, nombre, nit, ciudad, direccion, telefono_contacto, representante, estado)')
      .order('created_at', { ascending: false });

    if (!error && data) setClientes(data);
    setLoading(false);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
  };

  const handleEdit = (cliente) => {
    const copro = cliente.copropiedades?.[0] || {};
    setFormData({
      nombre: copro.nombre || '',
      nit: copro.nit || '',
      direccion: copro.direccion || '',
      ciudad: copro.ciudad || '',
      telefono_contacto: copro.telefono_contacto || '',
      representante: copro.representante || '',
      dominio: cliente.dominio || '',
      plan: cliente.plan || 'PRO',
      estado: copro.estado ?? true,
      mod_zonas: cliente.mod_zonas || false,
      mod_reservas: cliente.mod_reservas || false,
      mod_mercado: cliente.mod_mercado || false,
      mod_exportar: cliente.mod_exportar || false,
      mod_salas: cliente.mod_salas || false,
      mod_escalar: cliente.mod_escalar || false,
      mod_formularios: cliente.mod_formularios || false,
      mod_comunicaciones: cliente.mod_comunicaciones || false,
      mod_convivencia: cliente.mod_convivencia || false,
      mod_noticias: cliente.mod_noticias || false,
      mod_pagos: cliente.mod_pagos || false,
      mod_tiempos_pqr: cliente.mod_tiempos_pqr || false,
      mod_documentos: cliente.mod_documentos || false,
      mod_fqr: cliente.mod_fqr || false
    });
    setEditIds({ saasId: cliente.id, coproId: copro.id });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (saasId, coproId) => {
    if(!window.confirm("¿Estás segura de que deseas eliminar este cliente por completo?")) return;
    
    if(coproId) await supabase.from('copropiedades').delete().eq('id', coproId);
    await supabase.from('clientes_saas').delete().eq('id', saasId);
    
    fetchClientes();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMensaje({ tipo: '', texto: '' });

    try {
      const dataSaaS = {
        dominio: formData.dominio, 
        plan: formData.plan, 
        mod_zonas: formData.mod_zonas,
        mod_reservas: formData.mod_reservas, 
        mod_mercado: formData.mod_mercado, 
        mod_exportar: formData.mod_exportar,
        mod_salas: formData.mod_salas, 
        mod_escalar: formData.mod_escalar, 
        mod_formularios: formData.mod_formularios,
        mod_comunicaciones: formData.mod_comunicaciones, 
        mod_convivencia: formData.mod_convivencia,
        mod_noticias: formData.mod_noticias, 
        mod_pagos: formData.mod_pagos, 
        mod_tiempos_pqr: formData.mod_tiempos_pqr,
        mod_documentos: formData.mod_documentos,
        mod_fqr: formData.mod_fqr
      };

      const dataCopro = {
        nombre: formData.nombre, nit: formData.nit, direccion: formData.direccion, ciudad: formData.ciudad,
        telefono_contacto: formData.telefono_contacto, representante: formData.representante, estado: formData.estado
      };

      if (editIds.saasId) {
        const { error: errSaaSUpdate } = await supabase.from('clientes_saas').update(dataSaaS).eq('id', editIds.saasId);
        if (errSaaSUpdate) throw errSaaSUpdate; 

        if (editIds.coproId) {
          const { error: errCoproUpdate } = await supabase.from('copropiedades').update(dataCopro).eq('id', editIds.coproId);
          if (errCoproUpdate) throw errCoproUpdate;
        }
        setMensaje({ tipo: 'exito', texto: '¡Registro actualizado con éxito!' });

      } else {
        const { data: newSaaS, error: errSaaS } = await supabase.from('clientes_saas').insert([dataSaaS]).select().single();
        if (errSaaS) throw errSaaS;

        dataCopro.cliente_saas_id = newSaaS.id;
        const { data: newCopro, error: errCopro } = await supabase.from('copropiedades').insert([dataCopro]).select().single();
        if (errCopro) throw errCopro;

        // ✅ AQUÍ ESTÁ LA CORRECCIÓN QUE TÚ MISMO DESCUBRISTE: copropiedad_id
        const { error: errLink } = await supabase.from('clientes_saas').update({ copropiedad_id: newCopro.id }).eq('id', newSaaS.id);
        if (errLink) throw errLink; 

        setMensaje({ tipo: 'exito', texto: '¡Registro creado y enlazado perfectamente!' });
      }
      
      setFormData(ESTADO_INICIAL);
      setEditIds({ saasId: null, coproId: null });
      fetchClientes();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
    } catch (err) {
      let mensajeAmigable = 'Fallo al guardar: ' + err.message;
      
      if (err.code === '23505' || (err.message && err.message.toLowerCase().includes('duplicate'))) {
        mensajeAmigable = '⚠️ ¡Ups! Ya existe un registro con este Dominio o NIT. Por favor, verifica los datos e intenta de nuevo.';
      }

      setMensaje({ tipo: 'error', texto: mensajeAmigable });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setMensaje({ tipo: '', texto: '' }), 8000);
    }
  };  

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-6 md:p-10 w-full max-w-[1800px] mx-auto">
        <header className="mb-8 flex items-center gap-4">
          <div className="bg-lumenPrimary p-3 rounded-2xl text-white shadow-xl"><LayoutGrid size={28} /></div>
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Gestión Maestra Unificada</h1>
            <p className="text-gray-500 font-medium">Llenas una vez, guardas en dos tablas.</p>
          </div>
        </header>

        {mensaje.texto && (
          <div className={`mb-8 p-5 rounded-2xl flex items-center gap-4 text-sm font-black shadow-lg ${mensaje.tipo === 'error' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>
            {mensaje.tipo === 'error' ? <AlertCircle size={24} /> : <CheckCircle2 size={24} />}
            <span className="text-base">{mensaje.texto}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold mb-6 flex items-center justify-between text-gray-800">
                <span className="flex items-center gap-2"><Building2 size={20} className="text-lumenPrimary" /> Datos de Copropiedad</span>
                {editIds.saasId && <span className="bg-yellow-100 text-yellow-700 text-[10px] uppercase font-black px-3 py-1 rounded-full">Modo Edición</span>}
              </h2>
              <div className="space-y-4">
                <input type="text" name="nombre" required value={formData.nombre || ''} onChange={handleChange} className="w-full p-4 bg-slate-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:border-lumenPrimary" placeholder="Nombre del Conjunto" />
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" name="nit" required value={formData.nit || ''} onChange={handleChange} className="w-full p-4 bg-slate-50 border border-gray-100 rounded-2xl text-sm outline-none" placeholder="NIT" />
                  <input type="text" name="ciudad" required value={formData.ciudad || ''} onChange={handleChange} className="w-full p-4 bg-slate-50 border border-gray-100 rounded-2xl text-sm outline-none" placeholder="Ciudad" />
                </div>
                <input type="text" name="direccion" required value={formData.direccion || ''} onChange={handleChange} className="w-full p-4 bg-slate-50 border border-gray-100 rounded-2xl text-sm outline-none" placeholder="Dirección" />
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" name="telefono_contacto" required value={formData.telefono_contacto || ''} onChange={handleChange} className="w-full p-4 bg-slate-50 border border-gray-100 rounded-2xl text-sm outline-none" placeholder="Teléfono" />
                  <input type="text" name="representante" required value={formData.representante || ''} onChange={handleChange} className="w-full p-4 bg-slate-50 border border-gray-100 rounded-2xl text-sm outline-none" placeholder="Representante" />
                </div>
              </div>
            </div>

            <div className="bg-slate-900 p-8 rounded-[2rem] shadow-2xl text-white">
              <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-blue-400"><Database size={20} /> Parámetros SaaS</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                  <span className="text-xs font-black text-blue-300 uppercase">Copropiedad Activa</span>
                  <input type="checkbox" name="estado" checked={formData.estado || false} onChange={handleChange} className="w-6 h-6 accent-blue-400" />
                </div>
                <input type="text" name="dominio" required value={formData.dominio || ''} onChange={handleChange} className="w-full p-4 bg-white/10 border border-white/10 rounded-2xl text-sm text-blue-200 outline-none" placeholder="dominio.centrikview.com" />
                <select name="plan" value={formData.plan} onChange={handleChange} className="w-full p-4 bg-white/10 border border-white/10 rounded-2xl text-sm font-bold outline-none text-white">
                  <option value="START" className="text-black">START</option>
                  <option value="PRO" className="text-black">PRO</option>
                  <option value="MASTER" className="text-black">MASTER</option>
                </select>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold mb-8 flex items-center gap-2">Gestión de Módulos</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { name: 'mod_zonas', label: 'Zonas' }, { name: 'mod_reservas', label: 'Reservas' },
                  { name: 'mod_mercado', label: 'Mercado' }, { name: 'mod_exportar', label: 'Exportar' },
                  { name: 'mod_documentos', label: 'Documentos' }, { name: 'mod_salas', label: 'Salas' }, 
                  { name: 'mod_escalar', label: 'Escalar' }, { name: 'mod_formularios', label: 'Formularios' }, 
                  { name: 'mod_comunicaciones', label: 'Email' }, { name: 'mod_convivencia', label: 'Convivencia' }, 
                  { name: 'mod_noticias', label: 'Noticias' }, { name: 'mod_pagos', label: 'Pagos' }, 
                  { name: 'mod_tiempos_pqr', label: 'Tiempos PQR' }, { name: 'mod_fqr', label: 'Preguntas Frecuentes' }
                ].map((mod) => (
                  <label key={mod.name} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 cursor-pointer">
                    <span className="text-[10px] font-bold text-gray-600 uppercase">{mod.label}</span>
                    <input type="checkbox" name={mod.name} checked={formData[mod.name] || false} onChange={handleChange} className="w-5 h-5 accent-lumenPrimary" />
                  </label>
                ))}
              </div>
              <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end gap-4">
                {editIds.saasId && (
                  <button type="button" onClick={() => { setFormData(ESTADO_INICIAL); setEditIds({saasId: null, coproId: null}); }} className="px-8 py-4 bg-gray-100 text-gray-600 rounded-2xl font-black hover:bg-gray-200 transition-all">
                    Cancelar
                  </button>
                )}
                <button type="submit" disabled={isSubmitting} className="px-12 py-4 bg-lumenPrimary text-white rounded-2xl font-black shadow-xl hover:bg-blue-700 transition-all disabled:opacity-50">
                  {isSubmitting ? <Loader2 className="animate-spin" /> : editIds.saasId ? 'Actualizar Registro' : 'Guardar Nuevo Registro'}
                </button>
              </div>
            </div>

            {/* Directorio de Clientes */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 bg-slate-50/50 border-b">
                <h3 className="font-bold">Directorio Administrativo</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap">
                  <thead>
                    <tr>
                      <th className="p-4 text-[10px] font-black text-gray-400 uppercase">Copropiedad</th>
                      <th className="p-4 text-[10px] font-black text-gray-400 uppercase">Estado</th>
                      <th className="p-4 text-[10px] font-black text-gray-400 uppercase text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientes.map((c) => {
                      const copro = c.copropiedades?.[0] || {};
                      const isPrendido = copro.estado === true;

                      return (
                        <tr key={c.id} className="hover:bg-slate-50 border-b border-gray-50">
                          <td className="p-4">
                            <p className="font-black text-gray-800 text-sm">{copro.nombre || 'Sin nombre'}</p>
                            <p className="text-[10px] text-gray-400 font-mono mt-1">SaaS ID: {c.id.substring(0,8)}</p>
                          </td>
                          <td className="p-4">
                             <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${isPrendido ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                {isPrendido ? 'Prendido' : 'Apagado'}
                             </span>
                          </td>
                          <td className="p-4 flex items-center justify-end gap-2">
                             <button type="button" onClick={() => handleEdit(c)} className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-all" title="Editar">
                               <Edit size={18} />
                             </button>
                             <button type="button" onClick={() => handleDelete(c.id, copro.id)} className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-all" title="Eliminar">
                               <Trash2 size={18} />
                             </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}