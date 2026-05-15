import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import Swal from 'sweetalert2';

export default function Login() {
  const navigate = useNavigate();
  const [vista, setVista] = useState('login'); 
  const [cargando, setCargando] = useState(false);
  const [copropiedadId, setCopropiedadId] = useState(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [celular, setCelular] = useState('');
  const [tipoResidente, setTipoResidente] = useState('Propietario');
  const [rol, setRol] = useState('usuario');
  const [inmueble, setInmueble] = useState('');
  const [codigo, setCodigo] = useState('');
  
  const [aceptaHabeas, setAceptaHabeas] = useState(false);
  const [aceptaTratamiento, setAceptaTratamiento] = useState(false);

  const [config, setConfig] = useState({
    logo: '', 
    tituloHero: 'LumenGroup', 
    descHero: 'Ecosistema inteligente para copropiedades.',
    tituloForm: 'Login',
    nombreEmpresa: 'LumenGroup', 
    color1: '#8b5cf6', 
    color2: '#3b82f6', 
    colorFondo: '#0a0f1c', 
    requiere_codigo: true, 
    codigo_secreto: ''
  });

  useEffect(() => {
    iniciarMotorSaaS();
  }, []);

  const iniciarMotorSaaS = async () => {
    if (window.location.hash.includes('type=recovery')) {
      setVista('restablecer'); 
      return;
    }

    try {
      const dominioActual = window.location.hostname;
      const { data: cliente } = await supabase.from('clientes_saas').select('copropiedad_id').eq('dominio', dominioActual).maybeSingle();
      
      let idActual = null;
      if (cliente) {
        idActual = cliente.copropiedad_id;
        setCopropiedadId(idActual);
        sessionStorage.setItem('copropiedad_id', idActual);
      }

      if (idActual) {
        const { data: confData } = await supabase.from('configuracion').select('*').eq('copropiedad_id', idActual).maybeSingle();
        if (confData) {
          setConfig({
            logo: confData.login_logo || '',
            tituloHero: confData.login_titulo_hero || 'LumenGroup',
            descHero: confData.login_desc_hero || 'Ecosistema inteligente para copropiedades.',
            tituloForm: confData.login_titulo_form || 'Login',
            nombreEmpresa: confData.login_nombre_empresa || 'LumenGroup',
            color1: confData.login_color_1 || '#8b5cf6',
            color2: confData.login_color_2 || '#3b82f6',
            colorFondo: confData.login_color_fondo || '#0a0f1c',
            requiere_codigo: confData.requiere_codigo ?? true,
            codigo_secreto: confData.codigo_secreto_registro || ''
          });
        }
      }
    } catch (error) {
      console.error("Error al detectar entorno SaaS:", error);
    }

   const { data: { session } } = await supabase.auth.getSession();
   
   if (session?.user) {
      const idActualSession = sessionStorage.getItem('copropiedad_id') || copropiedadId;
      const { data: perfil } = await supabase.from('usuarios').select('rol, copropiedad_id').eq('id', session.user.id).eq('copropiedad_id', idActualSession).maybeSingle();
      const rolReal = perfil?.rol || session.user.user_metadata?.rol;
      
      if (perfil?.copropiedad_id) {
        sessionStorage.setItem('copropiedad_id', perfil.copropiedad_id);
      }

      if (rolReal === 'agente') {
       navigate('/admin'); 
      } else if (rolReal === 'vigilante') {
       navigate('/panel-vigilancia'); 
      } else {
       navigate('/panel-residente'); 
      }
    }
  };

  // 🔥 LÓGICA DE LOGIN: PERMITE AGREGARSE A UN NUEVO CONJUNTO 🔥
  const iniciarSesion = async (e) => {
    e.preventDefault();
    if (!email || !password) return Swal.fire('Atención', 'Ingresa correo y contraseña', 'warning');
    setCargando(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      
      if (data.user) {
        // 1. Verificamos si tiene perfil en el conjunto actual
        const { data: perfil } = await supabase
          .from('usuarios')
          .select('rol, copropiedad_id')
          .eq('id', data.user.id)
          .eq('copropiedad_id', copropiedadId)
          .maybeSingle();

        let rolFinal = 'usuario';

        // 2. Si NO tiene perfil aquí, aplicamos tu regla: lo dejamos crearlo
        if (!perfil) {
          const { value: formValues } = await Swal.fire({
            title: `¡Bienvenido a ${config.nombreEmpresa}!`,
            html: `
              <p style="font-size: 0.9em; margin-bottom: 15px;">Detectamos que tu correo existe en nuestra red. Para ingresar a este conjunto, indícanos tu inmueble:</p>
              <input id="swal-inmueble" class="swal2-input" placeholder="Torre/Apto (Ej: T1-101)">
              <input id="swal-celular" class="swal2-input" placeholder="Tu Celular">
            `,
            focusConfirm: false,
            confirmButtonText: 'Registrar Inmueble',
            confirmButtonColor: config.color1,
            preConfirm: async () => {
              const inm = document.getElementById('swal-inmueble').value;
              const cel = document.getElementById('swal-celular').value;
              if (!inm || !cel) return Swal.showValidationMessage('Ambos campos son obligatorios');
              
              // Validamos que el inmueble no exista ya en ESTE conjunto
              const { data: existe } = await supabase.from('usuarios').select('id').eq('copropiedad_id', copropiedadId).ilike('inmueble', inm.trim()).maybeSingle();
              if (existe) return Swal.showValidationMessage(`El inmueble ${inm} ya está registrado aquí.`);
              
              return { inmueble: inm, celular: cel };
            }
          });

          if (formValues) {
            // Le creamos su registro para este nuevo conjunto
            const { error: errorInsert } = await supabase.from('usuarios').insert({
              id: data.user.id,
              email: data.user.email,
              nombre: data.user.user_metadata?.nombre || 'Usuario',
              celular: formValues.celular,
              inmueble: formValues.inmueble.trim(),
              inmueble_id: formValues.inmueble.trim(),
              rol: 'usuario',
              copropiedad_id: copropiedadId,
              tipo_residente: 'Propietario'
            });

            if (errorInsert) throw errorInsert;
            Swal.fire('¡Éxito!', 'Inmueble registrado. Ingresando...', 'success');
            rolFinal = 'usuario';
          } else {
            await supabase.auth.signOut();
            setCargando(false);
            return;
          }
        } else {
          rolFinal = perfil.rol;
        }

        sessionStorage.setItem('copropiedad_id', copropiedadId);
        if (rolFinal === 'agente') navigate('/admin');
        else if (rolFinal === 'vigilante') navigate('/panel-vigilancia'); 
        else navigate('/panel-residente');
      }
    } catch (err) {
      Swal.fire('Error', 'Correo o contraseña incorrectos', 'error');
    } finally { setCargando(false); }
  };

  // 🔥 LÓGICA DE REGISTRO: VALIDA INMUEBLES Y REDIRIGE AL LOGIN SI YA EXISTE 🔥
  const registrarUsuario = async (e) => {
    e.preventDefault();
    if (!email || !password || !nombre || !rol || !inmueble || !celular) return Swal.fire('Campos incompletos', 'Diligencia todos los datos.', 'warning');
    if (!copropiedadId) return Swal.fire('Error SaaS', 'No se detectó la empresa. Revisa la URL.', 'error');
    if (!aceptaHabeas) return Swal.fire('Términos de Ley', 'Debes aceptar la política de Habeas Data para registrarte.', 'warning');

    setCargando(true);
    try {
      if (config.requiere_codigo && codigo !== config.codigo_secreto) {
        setCargando(false); return Swal.fire('Acceso Denegado', 'Código secreto incorrecto.', 'error');
      }

      if (rol === 'agente') {
        const { data: adminExiste } = await supabase.rpc('check_admin_exists', { p_copropiedad_id: copropiedadId });
        if (adminExiste) { setCargando(false); return Swal.fire('Denegado', 'Ya existe un administrador para este conjunto.', 'warning'); }
      }

      // 🔥 VALIDACIÓN DE INMUEBLE ÚNICO POR CONJUNTO 🔥
      if (rol === 'usuario') {
        const { data: inmuebleExiste } = await supabase
          .from('usuarios')
          .select('id')
          .eq('copropiedad_id', copropiedadId)
          .ilike('inmueble', inmueble.trim())
          .maybeSingle();
          
        if (inmuebleExiste) {
          setCargando(false);
          return Swal.fire('Registro Denegado', `El inmueble ${inmueble} ya tiene un usuario registrado. Solo se permite una cuenta por inmueble.`, 'error');
        }
      }

      const { error } = await supabase.auth.signUp({ 
        email, 
        password, 
        options: { 
          data: { 
            nombre, rol, inmueble: inmueble.trim(), inmueble_id: inmueble.trim(), celular, tipo_residente: tipoResidente, copropiedad_id: copropiedadId, acepta_habeas_data: aceptaHabeas, acepta_tratamiento_datos: aceptaTratamiento 
          } 
        } 
      });
      
      if (error) {
        // Si sale 422 o already registered, lo mandamos al Login para que aplique la regla de 1 correo en multiples conjuntos
        const correoExiste = error.status === 422 || error.message.toLowerCase().includes("already registered") || error.message.toLowerCase().includes("already exists");
        if (correoExiste) {
          setCargando(false);
          return Swal.fire({
            title: '¡Ya estás en la red!',
            text: 'Tu correo ya existe en otro conjunto. Por favor, ve a "Iniciar Sesión" con tu contraseña original y el sistema te dejará registrar tu inmueble para este nuevo conjunto.',
            icon: 'info',
            confirmButtonText: 'Ir a Login',
            confirmButtonColor: config.color1
          }).then(() => { setVista('login'); });
        }
        throw error;
      }

      Swal.fire('¡Éxito!', 'Usuario creado correctamente. Ya puedes ingresar.', 'success');
      setVista('login'); 
      setPassword(''); 
      setCodigo('');
      
    } catch (error) {
      let msg = "Error interno (500) en el servidor. Por favor revisa el Trigger de la base de datos Supabase.";
      if (error.message?.includes("at least 8")) msg = "La contraseña debe tener mínimo 8 caracteres.";
      else if (error.message?.includes("unique_inmueble")) msg = "El inmueble ya se encuentra registrado en el sistema.";
      
      Swal.fire('Error', msg, 'error');
    } finally { setCargando(false); }
  }; 

  const solicitarRecuperacion = async (e) => {
    e.preventDefault();
    if(!email) return Swal.fire('Atención', 'Por favor ingresa el correo a recuperar.', 'warning');
    setCargando(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { 
        redirectTo: `${window.location.origin}/login` 
      });
      if (error) throw error;
      Swal.fire('Enviado', 'Si el correo existe, recibirás un enlace de recuperación.', 'success');
      setVista('login');
      setEmail('');
    } catch (error) {
      Swal.fire('Error', error.message, 'error');
    } finally { setCargando(false); }
  };

  const actualizarClave = async (e) => {
    e.preventDefault();
    if(!password) return;
    setCargando(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      Swal.fire('¡Actualizada!', 'Tu contraseña ha sido guardada. Por favor, inicia sesión.', 'success');
      window.history.replaceState(null, null, window.location.pathname);
      await supabase.auth.signOut();
      setVista('login'); 
      setPassword('');
    } catch (err) { 
      Swal.fire('Error', err.message, 'error'); 
    } finally { setCargando(false); }
  };

  const abrirModalHabeasData = (e) => {
    e.preventDefault(); 
    Swal.fire({
      title: 'Políticas de Privacidad',
      html: `
        <div style="text-align: left; font-size: 0.9em; max-height: 300px; overflow-y: auto; padding-right: 10px;">
          <p><strong>1. Uso de Datos:</strong> Al registrarte, autorizas a <strong>${config.nombreEmpresa}</strong> y a la administración del conjunto para recolectar, almacenar y utilizar tus datos personales (nombre, celular, correo e inmueble).</p>
          <br/>
          <p><strong>2. Finalidad:</strong> Tus datos serán usados exclusivamente para:</p>
          <ul>
            <li>- Envío de comunicaciones oficiales.</li>
            <li>- Gestión de acceso, correspondencia y paquetería.</li>
            <li>- Control de zonas comunes y PQR.</li>
          </ul>
          <br/>
          <p><strong>3. Protección:</strong> En cumplimiento de la Ley 1581 de 2012 (Habeas Data), garantizamos que tu información no será compartida con terceros con fines comerciales ni de marketing.</p>
          <br/>
          <p><strong>4. Derechos:</strong> Tienes derecho a conocer, actualizar y rectificar tus datos personales en cualquier momento desde tu perfil, o solicitando su eliminación a la administración.</p>
        </div>
      `,
      icon: 'info',
      confirmButtonText: 'Entendido',
      confirmButtonColor: config.color1
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden font-sans transition-colors duration-500" style={{ backgroundColor: config.colorFondo }}>
      <style>{`
        :root { --neon-primario: ${config.color1}; --neon-secundario: ${config.color2}; }
        .input-linea { background: transparent !important; border: none !important; border-bottom: 2px solid rgba(255,255,255,0.2) !important; color: white !important; padding: 10px 0 !important; outline: none !important; transition: all 0.3s ease !important; font-size: 0.875rem !important; }
        .input-linea:focus { border-bottom: 2px solid var(--neon-primario) !important; }
        .input-linea::placeholder { color: rgba(255,255,255,0.4) !important; }
        .select-linea { background: rgba(0,0,0,0.5) !important; border: none !important; border-bottom: 2px solid rgba(255,255,255,0.2) !important; color: white !important; padding: 10px 0 !important; outline: none !important; font-size: 0.875rem !important; }
        .neon-box { box-shadow: 0 0 50px -10px var(--neon-primario); border: 1px solid color-mix(in srgb, var(--neon-primario) 40%, transparent); }
        .btn-neon { background: linear-gradient(to right, var(--neon-primario), var(--neon-secundario)); box-shadow: 0 0 20px -5px var(--neon-primario); }
        .texto-neon { color: var(--neon-primario); }
        .esconder-scroll::-webkit-scrollbar { display: none; }
        .esconder-scroll { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* BLOBS DIFUMINADOS DE FONDO */}
      <div className="absolute w-[500px] h-[500px] rounded-full blur-[120px] -top-48 -left-48 pointer-events-none opacity-30" style={{background: config.color1}}></div>
      <div className="absolute w-[400px] h-[400px] rounded-full blur-[120px] -bottom-32 -right-32 pointer-events-none opacity-30" style={{background: config.color2}}></div>

      {/* CONTENEDOR PRINCIPAL */}
      <div className="relative z-10 flex flex-col md:flex-row w-full max-w-5xl rounded-2xl overflow-hidden neon-box bg-black/40 backdrop-blur-2xl min-h-[550px] shadow-2xl">
        
        {/* MITAD IZQUIERDA: ÁREA DINÁMICA DE FORMS */}
        <div className="w-full md:w-1/2 p-8 md:p-14 flex flex-col justify-center relative z-20 max-h-[90vh] overflow-y-auto esconder-scroll">
          
          <div className="mb-6 flex justify-center md:justify-start items-center h-12">
            {config.logo ? (
              <img src={config.logo} alt="Logo" className="max-h-full object-contain" />
            ) : (
              <h2 className="text-2xl font-black text-white tracking-tight">
                {config.nombreEmpresa.split(' ')[0]}<span className="texto-neon">{config.nombreEmpresa.split(' ').slice(1).join(' ')}</span>
              </h2>
            )}
          </div>

          <h2 className="text-3xl font-bold text-white tracking-wide mb-6">
            {vista === 'login' && config.tituloForm}
            {vista === 'registro' && 'Crear Cuenta'}
            {vista === 'recuperar' && 'Recuperar Acceso'}
            {vista === 'restablecer' && 'Nueva Clave'}
          </h2>

          {/* VISTA 1: LOGIN */}
          {vista === 'login' && (
            <form onSubmit={iniciarSesion} className="space-y-6 animate-in fade-in duration-300">
              <div>
                <label className="text-xs font-semibold texto-neon opacity-80 mb-1 block tracking-widest uppercase">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full input-linea" placeholder="usuario@correo.com" required />
              </div>
              <div>
                <label className="text-xs font-semibold texto-neon opacity-80 mb-1 block tracking-widest uppercase">Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full input-linea" placeholder="••••••••" required />
              </div>
              <button type="submit" disabled={cargando} className="w-full btn-neon text-white font-bold py-3.5 rounded-full mt-6 transition-transform hover:scale-[1.02] disabled:opacity-50">
                {cargando ? 'Iniciando...' : 'Entrar'}
              </button>
              <div className="text-center mt-6 flex flex-col gap-3">
                <p className="text-white/60 text-sm">¿No tienes cuenta? <button type="button" onClick={() => {setVista('registro'); setEmail(''); setPassword('');}} className="texto-neon font-bold hover:underline">Regístrate</button></p>
                <button type="button" onClick={() => {setVista('recuperar'); setEmail(''); setPassword('');}} className="text-white/40 text-xs hover:text-white transition-colors">¿Olvidaste tu contraseña?</button>
              </div>
            </form>
          )}

          {/* VISTA 2: REGISTRO */}
          {vista === 'registro' && (
            <form onSubmit={registrarUsuario} className="space-y-4 animate-in fade-in duration-300 pb-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] font-semibold texto-neon opacity-80 mb-1 block tracking-widest uppercase">Nombre Completo</label><input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full input-linea" required /></div>
                <div><label className="text-[10px] font-semibold texto-neon opacity-80 mb-1 block tracking-widest uppercase">Celular</label><input type="tel" value={celular} onChange={(e) => setCelular(e.target.value)} className="w-full input-linea" placeholder="Ej: 3001234567" required /></div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] font-semibold texto-neon opacity-80 mb-1 block tracking-widest uppercase">Torre/Apto/Casa</label><input type="text" value={inmueble} onChange={(e) => setInmueble(e.target.value)} className="w-full input-linea" placeholder="Ej: T1-101" required /></div>
                <div>
                  <label className="text-[10px] font-semibold texto-neon opacity-80 mb-1 block tracking-widest uppercase">Tipo Residente</label>
                  <select value={tipoResidente} onChange={(e) => setTipoResidente(e.target.value)} className="w-full select-linea cursor-pointer">
                    <option value="Propietario">Propietario</option>
                    <option value="Arrendatario">Arrendatario</option>
                  </select>
                </div>
              </div>

              <div><label className="text-[10px] font-semibold texto-neon opacity-80 mb-1 block tracking-widest uppercase">Correo Electrónico</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full input-linea" required /></div>
              <div><label className="text-[10px] font-semibold texto-neon opacity-80 mb-1 block tracking-widest uppercase">Contraseña</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full input-linea" placeholder="Mínimo 8 caracteres" required minLength={8} /></div>
              
              <div className="mt-6 space-y-3 bg-black/30 p-4 rounded-xl border border-white/10">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative flex items-center pt-1">
                    <input type="checkbox" checked={aceptaHabeas} onChange={(e) => setAceptaHabeas(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600 cursor-pointer" required />
                  </div>
                  <span className="text-[10px] text-white/70 leading-relaxed group-hover:text-white transition-colors">
                    Acepto las <button onClick={abrirModalHabeasData} className="texto-neon font-bold hover:underline">Políticas de Privacidad (Ley 1581 de 2012)</button>.
                  </span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative flex items-center pt-1">
                    <input type="checkbox" checked={aceptaTratamiento} onChange={(e) => setAceptaTratamiento(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600 cursor-pointer" />
                  </div>
                  <span className="text-[10px] text-white/70 leading-relaxed group-hover:text-white transition-colors">
                    (Opcional) Autorizo expresamente el uso de mis datos exclusivamente para comunicaciones oficiales, asambleas y gestión interna de la copropiedad.
                  </span>
                </label>
              </div>
              
              <button type="submit" disabled={cargando} className="w-full btn-neon text-white font-bold py-3.5 rounded-full mt-4 transition-transform hover:scale-[1.02] disabled:opacity-50">
                {cargando ? 'Procesando...' : 'Crear Cuenta'}
              </button>
              <div className="text-center mt-4 pb-2"><button type="button" onClick={() => setVista('login')} className="texto-neon font-bold hover:underline text-sm">Volver al Login</button></div>
            </form>
          )}

          {vista === 'recuperar' && (
            <form onSubmit={solicitarRecuperacion} className="space-y-6 animate-in fade-in duration-300">
              <p className="text-white/60 text-sm leading-relaxed">Ingresa tu correo registrado. Te enviaremos un enlace universal para restaurar tu acceso.</p>
              <div><label className="text-xs font-semibold texto-neon opacity-80 mb-1 block tracking-widest uppercase">Correo Registrado</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full input-linea" placeholder="tu@correo.com" required /></div>
              <button type="submit" disabled={cargando} className="w-full btn-neon text-white font-bold py-3.5 rounded-full mt-4 transition-transform hover:scale-[1.02] disabled:opacity-50">
                {cargando ? 'Enviando enlace...' : 'Enviar Recuperación'}
              </button>
              <div className="text-center mt-4"><button type="button" onClick={() => setVista('login')} className="text-white/40 font-bold hover:text-white text-sm transition-colors">Volver al Login</button></div>
            </form>
          )}

          {vista === 'restablecer' && (
            <form onSubmit={actualizarClave} className="space-y-6 animate-in fade-in duration-300">
              <p className="text-white/60 text-sm">El enlace ha sido validado. Escribe tu nueva contraseña segura.</p>
              <div><label className="text-xs font-semibold texto-neon opacity-80 mb-1 block tracking-widest uppercase">Nueva Contraseña</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full input-linea" placeholder="Mínimo 8 caracteres" required minLength={8} /></div>
              <button type="submit" disabled={cargando} className="w-full btn-neon text-white font-bold py-3.5 rounded-full mt-4 transition-transform hover:scale-[1.02] disabled:opacity-50">
                {cargando ? 'Guardando...' : 'Guardar y Entrar'}
              </button>
            </form>
          )}
        </div>

        <div className="hidden md:flex w-1/2 relative items-center justify-end p-14 text-right overflow-hidden pointer-events-none">
          <div className="absolute inset-0 opacity-90" style={{ background: `linear-gradient(135deg, ${config.color1}, ${config.color2})`, clipPath: 'polygon(30% 0, 100% 0, 100% 100%, 0% 100%)' }}></div>
          <div className="relative z-10 max-w-sm">
            <h2 className="text-5xl font-bold text-white mb-4 tracking-wider leading-tight">
              {config.tituloHero.split(' ')[0]}<br/>{config.tituloHero.split(' ').slice(1).join(' ')}
            </h2>
            <p className="text-white/90 text-sm leading-relaxed ml-auto max-w-[250px] font-medium">{config.descHero}</p>
          </div>
        </div>

      </div>
    </div>
  );
}