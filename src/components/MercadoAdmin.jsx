import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import Swal from 'sweetalert2';

export default function MercadoAdmin() {
  const [inmuebles, setInmuebles] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [subiendo, setSubiendo] = useState(false);

  // Estados del formulario (Tus 12 estados originales intactos)
  const [tipo, setTipo] = useState('Se Arrienda');
  const [precio, setPrecio] = useState('');
  const [titulo, setTitulo] = useState('');
  const [hab, setHab] = useState('');
  const [banos, setBanos] = useState('');
  const [area, setArea] = useState('');
  const [parq, setParq] = useState('');
  const [desc, setDesc] = useState('');
  const [nombre, setNombre] = useState('');
  const [tel, setTel] = useState('');
  const [destacado, setDestacado] = useState(false);
  const [archivos, setArchivos] = useState([]);

  useEffect(() => {
    cargarInmueblesAdmin();
  }, []);

  const cargarInmueblesAdmin = async () => {
    setCargando(true);
    try {
      const copropiedadId = sessionStorage.getItem('copropiedad_id');
      const { data, error } = await supabase
        .from('inmuebles')
        .select('*')
        .eq('copropiedad_id', copropiedadId)
        .order('id', { ascending: false });

      if (error) throw error;
      setInmuebles(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setCargando(false);
    }
  };

  const guardarInmueble = async () => {
    // Tus validaciones de negocio (Obligatorias)
    if (!titulo || !precio || !tel || !desc) {
      return Swal.fire('Faltan Datos', 'El título, precio, descripción y teléfono son obligatorios.', 'warning');
    }
    if (archivos.length === 0) {
      return Swal.fire('Sin fotos', 'Debes subir al menos una foto del inmueble.', 'warning');
    }
    if (archivos.length > 6) {
      return Swal.fire('Límite excedido', 'Solo puedes subir un máximo de 6 fotos por inmueble.', 'warning');
    }

    const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp'];
    for (let i = 0; i < archivos.length; i++) {
      if (!tiposPermitidos.includes(archivos[i].type)) {
        return Swal.fire('Archivo Peligroso', 'Solo se permiten imágenes en formato JPG, PNG o WEBP.', 'error');
      }
    }

    const copropiedadId = sessionStorage.getItem('copropiedad_id');

    // Validación SaaS (Límite de 8 destacados)
    if (destacado) {
      const { count } = await supabase.from('inmuebles').select('*', { count: 'exact', head: true }).eq('copropiedad_id', copropiedadId).eq('destacado', true);
      if (count >= 8) {
        return Swal.fire('Límite Alcanzado', 'Solo puedes tener un máximo de 8 inmuebles destacados.', 'warning');
      }
    }

    setSubiendo(true);
    Swal.fire({ title: 'Publicando Inmueble...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
      let urlsImagenes = [];
      for (let i = 0; i < archivos.length; i++) {
        const file = archivos[i];
        const fileName = `inmueble_${Date.now()}_${i}_${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
        const { error: uploadError } = await supabase.storage.from('inmuebles').upload(fileName, file);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('inmuebles').getPublicUrl(fileName);
        urlsImagenes.push(publicUrl);
      }

      const { error: dbError } = await supabase.from('inmuebles').insert([{
        copropiedad_id: copropiedadId,
        tipo_oferta: tipo,
        titulo,
        precio: parseFloat(precio),
        habitaciones: parseInt(hab) || 0,
        banos: parseInt(banos) || 0,
        area: parseFloat(area) || 0,
        parqueadero: parseInt(parq) || 0,
        descripcion: desc,
        contacto_nombre: nombre,
        contacto_tel: tel,
        destacado,
        imagenes: urlsImagenes
      }]);

      if (dbError) throw dbError;

      Swal.fire('¡Publicado!', 'El inmueble ya está en el catálogo.', 'success');
      
      // Limpieza de formulario (Tu lógica original)
      setTitulo(''); setPrecio(''); setDesc(''); setTel(''); setNombre(''); setHab(''); setBanos(''); setArea(''); setParq(''); setDestacado(false); setArchivos([]);
      document.getElementById('inm-fotos-input').value = '';
      cargarInmueblesAdmin();

    } catch (e) {
      console.error(e);
      Swal.fire('Error', 'Hubo un problema al subir el inmueble.', 'error');
    } finally {
      setSubiendo(false);
    }
  };

  const borrarInmueble = async (id) => {
    const result = await Swal.fire({ 
      title: '¿Borrar inmueble?', 
      text: "Se eliminará del catálogo y sus fotos del servidor.", 
      icon: 'warning', 
      showCancelButton: true, 
      confirmButtonColor: '#ef4444', 
      confirmButtonText: 'Sí, borrar definitivamente' 
    });

    if (result.isConfirmed) {
      try {
        const { data: inm } = await supabase.from('inmuebles').select('imagenes').eq('id', id).single();
        await supabase.from('inmuebles').delete().eq('id', id);
        
        if (inm && inm.imagenes && inm.imagenes.length > 0) {
          const rutasArchivos = inm.imagenes.map(url => url.split('/').pop());
          await supabase.storage.from('inmuebles').remove(rutasArchivos);
        }
        cargarInmueblesAdmin();
        Swal.fire('Borrado', 'El inmueble ha sido eliminado.', 'success');
      } catch (e) {
        Swal.fire('Error', 'No se pudo eliminar.', 'error');
      }
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 animate-in fade-in duration-500 pb-10">
      
      {/* SECCIÓN FORMULARIO (Bento Izquierdo) */}
      <div className="xl:col-span-5 bg-white p-8 md:p-10 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 space-y-6 h-fit">
        <div>
          <h4 className="font-black text-2xl text-slate-800 tracking-tight">Publicar <span className="text-emerald-600">Propiedad</span></h4>
          <p className="text-slate-500 text-sm font-medium">Completa los datos técnicos del inmueble.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Modalidad</label>
            <select value={tipo} onChange={e => setTipo(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-bold text-sm">
              <option>Se Arrienda</option><option>Se Vende</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Precio (COP)</label>
            <input type="number" value={precio} onChange={e => setPrecio(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-bold text-sm" placeholder="0.00" />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Título del Anuncio</label>
          <input type="text" value={titulo} onChange={e => setTitulo(e.target.value)} maxLength="40" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-bold text-slate-700" placeholder="Ej: Penthouse con vista al parque" />
        </div>

        {/* Fila de Specs Técnicas */}
        <div className="grid grid-cols-4 gap-3">
          <div className="text-center bg-slate-50 p-3 rounded-2xl border border-slate-100">
            <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Hab</label>
            <input type="number" value={hab} onChange={e => setHab(e.target.value)} className="w-full bg-transparent text-center font-black text-slate-800 outline-none" />
          </div>
          <div className="text-center bg-slate-50 p-3 rounded-2xl border border-slate-100">
            <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Baños</label>
            <input type="number" value={banos} onChange={e => setBanos(e.target.value)} className="w-full bg-transparent text-center font-black text-slate-800 outline-none" />
          </div>
          <div className="text-center bg-slate-50 p-3 rounded-2xl border border-slate-100">
            <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Mts²</label>
            <input type="number" value={area} onChange={e => setArea(e.target.value)} className="w-full bg-transparent text-center font-black text-slate-800 outline-none" />
          </div>
          <div className="text-center bg-slate-50 p-3 rounded-2xl border border-slate-100">
            <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Parq</label>
            <input type="number" value={parq} onChange={e => setParq(e.target.value)} className="w-full bg-transparent text-center font-black text-slate-800 outline-none" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Nombre Propietario</label>
            <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-sm font-medium" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">WhatsApp de Contacto</label>
            <input type="number" value={tel} onChange={e => setTel(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-sm font-bold text-emerald-600" />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Descripción Detallada</label>
          <textarea value={desc} onChange={e => setDesc(e.target.value)} rows="3" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-sm resize-none font-medium leading-relaxed"></textarea>
        </div>

        <div className="flex items-center gap-4 p-5 bg-amber-50 rounded-[1.5rem] border border-amber-100">
          <input type="checkbox" checked={destacado} onChange={e => setDestacado(e.target.checked)} className="w-6 h-6 accent-amber-500 rounded-lg cursor-pointer" />
          <div className="flex-1">
            <p className="text-xs font-black text-amber-800 uppercase tracking-widest">Inmueble Destacado (⭐ VIP)</p>
            <p className="text-[10px] text-amber-600 font-medium">Aparecerá en la portada principal del portal.</p>
          </div>
        </div>

        <div className="p-6 border-2 border-dashed border-slate-200 rounded-[2rem] bg-slate-50 group hover:border-emerald-400 transition-colors">
          <label className="text-xs font-black text-slate-400 group-hover:text-emerald-600 block mb-3 text-center cursor-pointer uppercase tracking-widest">Multimedia (Max 6 fotos)</label>
          <input type="file" id="inm-fotos-input" accept="image/*" multiple onChange={e => setArchivos(e.target.files)} className="w-full text-xs font-mono text-slate-400" />
        </div>

        <button onClick={guardarInmueble} disabled={subiendo} className="w-full bg-slate-900 hover:bg-emerald-600 text-white font-black p-5 rounded-[1.5rem] transition-all shadow-xl shadow-slate-200 uppercase tracking-widest text-xs disabled:opacity-50 transform hover:-translate-y-1">
          {subiendo ? 'Subiendo Archivos...' : 'Publicar en el Catálogo'}
        </button>
      </div>

      {/* SECCIÓN TABLA (Bento Derecho) */}
      <div className="xl:col-span-7 bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 flex flex-col overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex justify-between items-center">
          <h4 className="font-black text-xl text-slate-800">Catálogo <span className="text-blue-600">Activo</span></h4>
          <span className="bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100">{inmuebles.length} Propiedades</span>
        </div>
        
        <div className="flex-1 overflow-x-auto p-4">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="text-slate-400 font-bold uppercase text-[9px] tracking-widest border-b border-slate-50">
                <th className="px-6 py-4">Propiedad</th>
                <th className="px-6 py-4">Precio / Oferta</th>
                <th className="px-6 py-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {cargando ? (
                <tr><td colSpan="3" className="text-center py-20 text-slate-400 font-black uppercase text-xs">Sincronizando Galería...</td></tr>
              ) : inmuebles.length === 0 ? (
                <tr><td colSpan="3" className="text-center py-20 text-slate-400 font-medium italic">No has publicado inmuebles todavía.</td></tr>
              ) : inmuebles.map(inm => (
                <tr key={inm.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-md border border-slate-100">
                        <img src={inm.imagenes?.[0] || 'https://via.placeholder.com/100'} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
                      </div>
                      <div>
                        <span className="font-black text-slate-800 text-base">{inm.titulo}</span>
                        <div className="flex gap-2 mt-1">
                          {inm.destacado && <span className="bg-amber-100 text-amber-700 text-[8px] font-black px-2 py-0.5 rounded uppercase">Destacado ⭐</span>}
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">📏 {inm.area}m² | 🛏️ {inm.habitaciones} | 🚿 {inm.banos}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`px-2 py-1 text-[9px] font-black rounded-lg uppercase tracking-widest border ${inm.tipo_oferta === 'Se Arrienda' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                      {inm.tipo_oferta}
                    </span>
                    <p className="font-black text-slate-800 mt-2 text-lg tracking-tight">${inm.precio.toLocaleString()}</p>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <button 
                      onClick={() => borrarInmueble(inm.id)} 
                      className="w-10 h-10 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm flex items-center justify-center mx-auto"
                      title="Eliminar Propiedad"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}