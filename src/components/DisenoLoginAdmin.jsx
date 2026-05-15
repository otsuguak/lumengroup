import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import Swal from 'sweetalert2';

export default function DisenoLoginAdmin() {
  const [cargando, setCargando] = useState(false);
  const [copropiedadId, setCopropiedadId] = useState(null);
  const [archivoLogo, setArchivoLogo] = useState(null);
  const [configId, setConfigId] = useState(null);

  const [conf, setConf] = useState({
    logoActual: '', 
    tituloHero: 'WELCOME BACK!', 
    descHero: 'LumenGroup Ecosistema.', 
    tituloForm: 'Login',
    nombreEmpresa: 'LumenGroup',
    color1: '#8b5cf6', 
    color2: '#3b82f6',
    colorFondo: '#0a0f1c' // 🔥 NUEVO ESTADO PARA EL FONDO DEL LOGIN
  });

  useEffect(() => {
    const id = sessionStorage.getItem('copropiedad_id');
    if (id) {
      setCopropiedadId(id);
      cargarConfiguracion(id);
    }
  }, []);

  const cargarConfiguracion = async (id) => {
    try {
      const { data, error } = await supabase
        .from('configuracion')
        .select('id, login_logo, login_titulo_hero, login_desc_hero, login_titulo_form, login_nombre_empresa, login_color_1, login_color_2, login_color_fondo')
        .eq('copropiedad_id', id)
        .maybeSingle();

      if (data) {
        setConfigId(data.id);
        setConf({
          logoActual: data.login_logo || '',
          tituloHero: data.login_titulo_hero || 'WELCOME BACK!',
          descHero: data.login_desc_hero || 'Ecosistema inteligente.',
          tituloForm: data.login_titulo_form || 'Login',
          nombreEmpresa: data.login_nombre_empresa || 'LumenGroup',
          color1: data.login_color_1 || '#8b5cf6',
          color2: data.login_color_2 || '#3b82f6',
          colorFondo: data.login_color_fondo || '#0a0f1c' // 🔥 CARGAMOS EL FONDO
        });
      }
    } catch (error) {
      console.error("Error cargando config de login:", error);
    }
  };

  const subirLogo = async () => {
    if (!archivoLogo) return conf.logoActual;
    const ext = archivoLogo.name.split('.').pop();
    const nombre = `login_logo_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('documentos').upload(nombre, archivoLogo);
    if (error) throw error;
    return supabase.storage.from('documentos').getPublicUrl(nombre).data.publicUrl;
  };

  const guardarConfiguracion = async (e) => {
    e.preventDefault();
    if (!copropiedadId) return Swal.fire('Error', 'No se detectó la copropiedad.', 'error');
    setCargando(true);

    try {
      const urlLogo = await subirLogo();
      
      const payload = {
        copropiedad_id: copropiedadId,
        login_logo: urlLogo,
        login_titulo_hero: conf.tituloHero,
        login_desc_hero: conf.descHero,
        login_titulo_form: conf.tituloForm,
        login_nombre_empresa: conf.nombreEmpresa,
        login_color_1: conf.color1,
        login_color_2: conf.color2,
        login_color_fondo: conf.colorFondo // 🔥 GUARDAMOS EL FONDO
      };

      let errorDb;

      if (configId) {
        const { error } = await supabase.from('configuracion').update(payload).eq('id', configId);
        errorDb = error;
      } else {
        const { error } = await supabase.from('configuracion').insert([payload]);
        errorDb = error;
      }

      if (errorDb) throw errorDb;
      
      Swal.fire("¡Éxito!", "Diseño del Login guardado correctamente. Cierra sesión para verlo.", "success");
      setArchivoLogo(null);
      cargarConfiguracion(copropiedadId);
    } catch (error) {
      Swal.fire("Error", error.message, "error");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-300">
      <div className="mb-8 border-b border-slate-100 pb-5">
        <h2 className="text-2xl font-black text-slate-800">🎨 Diseño de Pantalla de Acceso</h2>
        <p className="text-slate-500 text-sm mt-1">Personaliza cómo se ve el Login para los residentes y el staff de tu conjunto.</p>
      </div>

      <form onSubmit={guardarConfiguracion} className="space-y-8">
        
        {/* LOGO */}
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">1. Logo del Conjunto</label>
          <div className="flex items-center gap-6">
            <input type="file" accept="image/*" onChange={(e) => setArchivoLogo(e.target.files[0])} className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-colors" />
            {conf.logoActual && !archivoLogo && <img src={conf.logoActual} alt="Logo" className="h-12 object-contain bg-slate-800 rounded p-2 shadow-md" />}
          </div>
        </div>

        {/* COLORES NEÓN Y FONDO */}
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">2. Colores Corporativos (Neón & Fondo)</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Color Primario */}
            <div>
              <label className="text-sm font-semibold text-slate-600 block mb-2">Primario (Oscuro)</label>
              <div className="flex items-center gap-3">
                <input type="color" value={conf.color1} onChange={e => setConf({...conf, color1: e.target.value})} className="h-12 w-12 rounded-lg cursor-pointer border-0 shadow-sm" />
                <input type="text" value={conf.color1} onChange={e => setConf({...conf, color1: e.target.value})} className="border border-slate-200 rounded-lg px-3 py-2 w-full text-xs font-mono uppercase focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>
            
            {/* Color Secundario */}
            <div>
              <label className="text-sm font-semibold text-slate-600 block mb-2">Secundario (Brillo)</label>
              <div className="flex items-center gap-3">
                <input type="color" value={conf.color2} onChange={e => setConf({...conf, color2: e.target.value})} className="h-12 w-12 rounded-lg cursor-pointer border-0 shadow-sm" />
                <input type="text" value={conf.color2} onChange={e => setConf({...conf, color2: e.target.value})} className="border border-slate-200 rounded-lg px-3 py-2 w-full text-xs font-mono uppercase focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>

            {/* 🔥 NUEVO: Color de Fondo 🔥 */}
            <div>
              <label className="text-sm font-semibold text-slate-600 block mb-2">Fondo del Login</label>
              <div className="flex items-center gap-3">
                <input type="color" value={conf.colorFondo} onChange={e => setConf({...conf, colorFondo: e.target.value})} className="h-12 w-12 rounded-lg cursor-pointer border-0 shadow-sm" />
                <input type="text" value={conf.colorFondo} onChange={e => setConf({...conf, colorFondo: e.target.value})} className="border border-slate-200 rounded-lg px-3 py-2 w-full text-xs font-mono uppercase focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>

          </div>
        </div>

        {/* TEXTOS */}
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">3. Textos Personalizados</label>
          <div className="space-y-4">
            
            <div className="p-4 bg-white border border-slate-200 rounded-xl">
              <label className="text-sm font-black text-slate-700">Nombre de la Empresa (Arriba a la izquierda)</label>
              <p className="text-xs text-slate-500 mb-2">Este texto aparecerá en grande arriba del título del formulario.</p>
              <input type="text" value={conf.nombreEmpresa} onChange={e => setConf({...conf, nombreEmpresa: e.target.value})} placeholder="Ej: Torres del Parque" className="w-full border border-slate-200 rounded-lg px-4 py-2 outline-none focus:border-blue-500 transition-all" required />
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-xl">
              <label className="text-sm font-black text-slate-700">Título del Formulario (Lado Oscuro)</label>
              <p className="text-xs text-slate-500 mb-2">Aparecerá justo arriba de donde se pide el correo y la contraseña.</p>
              <input type="text" value={conf.tituloForm} onChange={e => setConf({...conf, tituloForm: e.target.value})} placeholder="Ej: Ingreso Residentes" className="w-full border border-slate-200 rounded-lg px-4 py-2 outline-none focus:border-blue-500 transition-all" required />
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-xl">
              <label className="text-sm font-black text-slate-700">Título del Panel Brillante (Lado Claro)</label>
              <p className="text-xs text-slate-500 mb-2">Máximo 3 palabras (Ej: WELCOME BACK!)</p>
              <input type="text" value={conf.tituloHero} onChange={e => setConf({...conf, tituloHero: e.target.value})} placeholder="Ej: BIENVENIDO A CASA" className="w-full border border-slate-200 rounded-lg px-4 py-2 outline-none focus:border-blue-500 transition-all" required />
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-xl">
              <label className="text-sm font-black text-slate-700">Subtítulo / Eslogan (Lado Claro)</label>
              <textarea value={conf.descHero} onChange={e => setConf({...conf, descHero: e.target.value})} placeholder="Ej: Plataforma exclusiva de residentes." className="w-full border border-slate-200 rounded-lg px-4 py-2 outline-none focus:border-blue-500 resize-none h-16 transition-all" required />
            </div>

          </div>
        </div>

        <button type="submit" disabled={cargando} className="w-full bg-[#00A6FB] hover:bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/30 transition-all transform hover:-translate-y-1 disabled:opacity-50 flex justify-center items-center gap-2">
          {cargando ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : '💾 Guardar Diseño del Login'}
        </button>
      </form>
    </div>
  );
}