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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setVista('restablecer');
      }
    });

    iniciarMotorSaaS();

    return () => subscription.unsubscribe();
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

      if (rolReal === 'agente') navigate('/admin'); 
      else if (rolReal === 'vigilante') navigate('/panel-vigilancia'); 
      else navigate('/panel-residente'); 
    }
  };

  const iniciarSesion = async (e) => {
    e.preventDefault();
    if (!email || !password) return Swal.fire('Atención', 'Ingresa correo y contraseña', 'warning');
    setCargando(true);
    try {
      // 🔥 AJUSTE BUG: Limpiamos espacios en blanco accidentales del correo
      const emailLimpio = email.trim();
      const { data, error } = await supabase.auth.signInWithPassword({ email: emailLimpio, password });
      if (error) throw error;
      
      if (data.user) {
        const { data: perfil } = await supabase
          .from('usuarios')
          .select('rol, copropiedad_id')
          .eq('id', data.user.id)
          .eq('copropiedad_id', copropiedadId)
          .maybeSingle();

        let rolFinal = 'usuario';

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
              
              const { data: existe } = await supabase.from('usuarios')
                .select('id')
                .eq('copropiedad_id', copropiedadId)
                .ilike('inmueble', inm.trim())
                .maybeSingle();

              if (existe) return Swal.showValidationMessage(`El inmueble ${inm} ya está registrado aquí por otro usuario.`);
              
              return { inmueble: inm, celular: cel };
            }
          });

          if (formValues) {
            // 🔥 AQUÍ OCURRE LA MAGIA MULTI-TENANT 🔥
            const { error: errorInsert } = await supabase.from('usuarios').insert({
              id: data.user.id,
              email: data.user.email,
              nombre: data.user.user_metadata?.nombre || 'Usuario',
              celular: formValues.celular,
              inmueble: formValues.inmueble.trim(),
              rol: 'usuario',
              copropiedad_id: copropiedadId,
              tipo_residente: 'Propietario'
            });

            if (errorInsert) throw errorInsert;
            Swal.fire({toast: true, position: 'top-end', icon: 'success', title: 'Cuenta vinculada exitosamente', showConfirmButton: false, timer: 3000});
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

      if (rol === 'usuario') {
        const { data: inmuebleExiste } = await supabase
          .from('usuarios')
          .select('id, email')
          .eq('copropiedad_id', copropiedadId)
          .ilike('inmueble', inmueble.trim())
          .maybeSingle();
          
        if (inmuebleExiste) {
          setCargando(false);
          return Swal.fire({
            title: 'Inmueble ya registrado',
            text: `El inmueble ${inmueble} ya tiene un usuario asignado. Por seguridad, solo se permite una cuenta por inmueble.`,
            icon: 'error'
          });
        }
      }

      // 🔥 AJUSTE BUG: Limpiamos correo antes de enviarlo
      const emailLimpio = email.trim();
      
      const { error } = await supabase.auth.signUp({ 
        email: emailLimpio, 
        password, 
        options: { 
          data: { 
            nombre, 
            rol, 
            inmueble: inmueble.trim(), 
            celular, 
            tipo_residente: tipoResidente, 
            copropiedad_id: copropiedadId, 
            acepta_habeas_data: aceptaHabeas, 
            acepta_tratamiento_datos: aceptaTratamiento 
          } 
        } 
      });
      
      if (error) {
        const correoExiste = error.status === 422 || error.message.toLowerCase().includes("already registered") || error.message.toLowerCase().includes("already exists");
        if (correoExiste) {
          setCargando(false);
          return Swal.fire({
            title: '¡Ya estás en la red!',
            text: 'Tu correo ya existe en otro conjunto de nuestra red. Ve a "Iniciar Sesión" con tu contraseña original y el sistema te permitirá vincularte a este nuevo conjunto.',
            icon: 'info',
            confirmButtonText: 'Ir a Login',
            confirmButtonColor: config.color1
          }).then(() => { setVista('login'); });
        }
        throw error;
      }

      // 🔥 AJUSTE BUG SESIONES: Cierre seguro y sin Reload abrupto
      await supabase.auth.signOut();
      await Swal.fire('¡Éxito!', 'Usuario creado correctamente. Ya puedes ingresar.', 'success');
      
      // Limpiamos campos y cambiamos a vista login suavemente
      setEmail('');
      setPassword('');
      setVista('login');
      
    } catch (error) {
      console.error("Error capturado en Registro:", error);
      let msg = "Error interno en el servidor.";
      if (error.message?.includes("at least 8")) {
        msg = "La contraseña debe tener mínimo 8 caracteres.";
      } else if (error.code === '23505' || error.message?.includes("unique_inmueble") || error.message?.includes("duplicate key")) {
        msg = `El inmueble ${inmueble} ya está registrado en este conjunto.`;
      } else if (error.status === 500) {
        msg = "Hubo un conflicto al guardar los datos. Es posible que el inmueble ya exista.";
      }
      Swal.fire('Error de Registro', msg, 'error');
    } finally { setCargando(false); }
  }; 

  const solicitarRecuperacion = async (e) => {
    e.preventDefault();
    if(!email) return Swal.fire('Atención', 'Por favor ingresa tu correo electrónico.', 'warning');
    setCargando(true);
    try {
      const emailLimpio = email.trim();
      const { error } = await supabase.auth.resetPasswordForEmail(emailLimpio, { 
        redirectTo: `${window.location.origin}/login` 
      });
      if (error) throw error;
      Swal.fire('¡Correo Enviado!', 'Revisa tu bandeja de entrada (y la carpeta de Spam) para restablecer tu clave.', 'success');
      setVista('login');
    } catch (error) {
      Swal.fire('Error', error.message, 'error');
    } finally { setCargando(false); }
  };

  const actualizarClave = async (e) => {
    e.preventDefault();
    if(!password || password.length < 8) return Swal.fire('Contraseña débil', 'Debe tener al menos 8 caracteres.', 'warning');
    setCargando(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      
      Swal.fire('¡Éxito!', 'Tu nueva contraseña ha sido guardada.', 'success');
      
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
      title: 'Políticas de Privacidad y Habeas Data',
      width: '600px',
      html: `
        <div style="text-align: justify; font-size: 0.85em; max-height: 400px; overflow-y: auto; padding-right: 15px; color: #475569; line-height: 1.6;">
          <p style="margin-bottom: 10px;"><strong>MARCO LEGAL:</strong> En estricto cumplimiento de la <strong>Ley 1581 de 2012</strong> y el <strong>Decreto 1377 de 2013</strong> de la República de Colombia, que regulan la Protección de Datos Personales, te informamos sobre el tratamiento de tu información dentro de la plataforma <strong>${config.nombreEmpresa}</strong>.</p>
          
          <h4 style="color: #1e293b; margin-top: 15px; margin-bottom: 5px; font-weight: bold;">Artículo 1. Datos Recolectados</h4>
          <p style="margin-bottom: 10px;">Al registrarte en este portal, autorizas de manera previa, expresa e informada a la Administración del Conjunto y a LumenGroup (como proveedor tecnológico) la recolección, almacenamiento y uso de los siguientes datos: Nombre completo, correo electrónico, número de celular, tipo de tenencia e identificación del inmueble.</p>

          <h4 style="color: #1e293b; margin-top: 15px; margin-bottom: 5px; font-weight: bold;">Artículo 2. Finalidad del Tratamiento</h4>
          <p style="margin-bottom: 10px;">Tus datos serán utilizados única y exclusivamente para fines operativos y de seguridad propios de la Propiedad Horizontal, los cuales incluyen, pero no se limitan a:</p>
          <ul style="margin-left: 20px; margin-bottom: 10px; list-style-type: disc;">
            <li>Envío de comunicaciones oficiales, citaciones a asambleas y cobros de administración.</li>
            <li>Gestión y trazabilidad de Peticiones, Quejas, Reclamos y Sugerencias (PQRS).</li>
            <li>Control de acceso, gestión de parqueaderos y recepción de correspondencia/paquetería.</li>
            <li>Administración y reserva de zonas comunes.</li>
          </ul>

          <h4 style="color: #1e293b; margin-top: 15px; margin-bottom: 5px; font-weight: bold;">Artículo 3. Protección y Confidencialidad</h4>
          <p style="margin-bottom: 10px;">Garantizamos que tu información <strong>NO será vendida, cedida ni compartida</strong> con terceros para fines comerciales, publicitarios o de marketing. Los datos están protegidos en servidores seguros bajo altos estándares de encriptación.</p>

          <h4 style="color: #1e293b; margin-top: 15px; margin-bottom: 5px; font-weight: bold;">Artículo 4. Derechos del Titular</h4>
          <p style="margin-bottom: 10px;">Como titular de los datos, tienes derecho constitucional a <strong>Conocer, Actualizar, Rectificar y Suprimir</strong> tu información personal en cualquier momento. Podrás ejercer estos derechos modificando tu perfil dentro de la aplicación o enviando una solicitud formal a la Administración de tu copropiedad.</p>
          
          <div style="margin-top: 20px; padding: 10px; background-color: #f1f5f9; border-left: 4px solid #3b82f6; border-radius: 4px;">
            <p style="font-size: 0.9em; margin: 0;"><em>Al marcar la casilla de aceptación en el formulario de registro, declaras haber leído y comprendido estas políticas, otorgando tu consentimiento legal para el tratamiento de tus datos en los términos aquí expuestos.</em></p>
          </div>
        </div>
      `,
      icon: 'info',
      confirmButtonText: 'He leído y entendido',
      confirmButtonColor: config.color1,
      customClass: {
        confirmButton: 'font-bold rounded-lg px-6 py-2'
      }
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
        
        {/* MITAD IZQUIERDA */}
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
                    <input 
                      type="checkbox" 
                      checked={aceptaHabeas} 
                      onChange={(e) => setAceptaHabeas(e.target.checked)} 
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600 cursor-pointer" 
                      required 
                    />
                  </div>
                  <span className="text-[10px] text-white/70 leading-relaxed group-hover:text-white transition-colors">
                    Acepto las <button type="button" onClick={abrirModalHabeasData} className="texto-neon font-bold hover:underline">Políticas de Privacidad (Ley 1581 de 2012)</button>.
                  </span>
                </label>
                
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative flex items-center pt-1">
                    <input 
                      type="checkbox" 
                      checked={aceptaTratamiento} 
                      onChange={(e) => setAceptaTratamiento(e.target.checked)} 
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600 cursor-pointer" 
                    />
                  </div>
                  <span className="text-[10px] text-white/70 leading-relaxed group-hover:text-white transition-colors">
                    (Opcional) Autorizo expresamente el uso de mis datos exclusivamente para comunicaciones oficiales, y gestión interna de la copropiedad.
                  </span>
                </label>
              </div>
              
              <button type="submit" disabled={cargando} className="w-full btn-neon text-white font-bold py-3.5 rounded-full mt-4 transition-transform hover:scale-[1.02] disabled:opacity-50">Crear Cuenta</button>
              <div className="text-center mt-4 pb-2"><button type="button" onClick={() => setVista('login')} className="texto-neon font-bold hover:underline text-sm">Volver al Login</button></div>
            </form>
          )}

          {/* 🔥 VISTA 3: RECUPERAR CLAVE (Agregada) */}
          {vista === 'recuperar' && (
            <form onSubmit={solicitarRecuperacion} className="space-y-6 animate-in fade-in duration-300">
              <p className="text-white/70 text-sm">Ingresa tu correo. Te enviaremos un link para restaurar tu contraseña.</p>
              <div>
                <label className="text-xs font-semibold texto-neon opacity-80 mb-1 block tracking-widest uppercase">Correo Registrado</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full input-linea" placeholder="tu@correo.com" required />
              </div>
              <button type="submit" disabled={cargando} className="w-full btn-neon text-white font-bold py-3.5 rounded-full mt-4">
                {cargando ? 'Enviando...' : 'Enviar Enlace'}
              </button>
              <button type="button" onClick={() => setVista('login')} className="w-full text-white/40 text-sm hover:text-white">Cancelar</button>
            </form>
          )}

          {/* 🔥 VISTA 4: RESTABLECER (Nueva Clave) */}
          {vista === 'restablecer' && (
            <form onSubmit={actualizarClave} className="space-y-6 animate-in fade-in duration-300">
              <p className="text-white/70 text-sm">Ingresa tu nueva contraseña para acceder.</p>
              <div>
                <label className="text-xs font-semibold texto-neon opacity-80 mb-1 block tracking-widest uppercase">Nueva Contraseña</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full input-linea" placeholder="Mínimo 8 caracteres" required minLength={8} />
              </div>
              <button type="submit" disabled={cargando} className="w-full btn-neon text-white font-bold py-3.5 rounded-full mt-4">
                {cargando ? 'Guardando...' : 'Cambiar Contraseña'}
              </button>
            </form>
          )}

        </div>

        {/* MITAD DERECHA: DISEÑO HERO */}
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