import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import emailjs from '@emailjs/browser';
import { supabase } from '../supabase';

export default function SalasVirtualesAdmin() {
  const [vista, setVista] = useState('opciones'); // 'opciones', 'express', 'premium', 'share'
  const [cargando, setCargando] = useState(false);
  const [usuarioEmail, setUsuarioEmail] = useState('');

  // Estados Express (Tu lógica original)
  const [tituloExpress, setTituloExpress] = useState('');
  const [linkJitsi, setLinkJitsi] = useState('');

  // Estados Premium (Tu lógica original)
  const [vipMotivo, setVipMotivo] = useState('');
  const [vipFecha, setVipFecha] = useState('');
  const [vipHora, setVipHora] = useState('');

  useEffect(() => {
    // Inicialización obligatoria de EmailJS
    emailjs.init("hWOGPxekMX4ceP4AZ");
    obtenerUsuario();
  }, []);

  const obtenerUsuario = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) setUsuarioEmail(session.user.email);
  };

  const generarSalaExpress = () => {
    if (!tituloExpress.trim()) return Swal.fire('Atención', 'Ingresa el motivo de la reunión.', 'warning');
    
    // Tu lógica de ID aleatorio y limpieza de caracteres (Protección de URL)
    const randomID = Math.random().toString(36).substring(2, 8);
    const nombreLimpio = tituloExpress.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, '');
    const enlace = `https://meet.jit.si/LumenGroup-${nombreLimpio}-${randomID}`;
    
    setLinkJitsi(enlace);
    setVista('share');
  };

  const solicitarSalaPremium = async () => {
    if (!vipMotivo || !vipFecha || !vipHora) {
      return Swal.fire('Atención', 'Completa los datos de la reserva.', 'warning');
    }

    setCargando(true);
    const idConjunto = sessionStorage.getItem('copropiedad_id');

    try {
      // Notificación automática a sistemas LumenGroup
      await emailjs.send('service_yy0gcdm', 'template_57qohkp', {
        admin_email: usuarioEmail || "Email no detectado",
        motivo_reunion: vipMotivo,
        fecha_reunion: vipFecha,
        hora_reunion: vipHora,
        copropiedad_id: idConjunto, // Añadimos ID para logística SaaS
        to_email: 'info@lumengroup.com.co'
      });
      
      Swal.fire({ 
        title: '¡Solicitud Enviada!', 
        text: 'Validaremos el calendario VIP y te enviaremos la confirmación al correo.', 
        icon: 'success',
        confirmButtonColor: '#4f46e5'
      });
      setVista('opciones');
      setVipMotivo(''); setVipFecha(''); setVipHora('');
    } catch (e) {
      console.error(e);
      Swal.fire('Error', 'No se pudo enviar la solicitud. Revisa tu conexión.', 'error');
    } finally {
      setCargando(false);
    }
  };

  const compartirWhatsApp = () => {
    const msj = encodeURIComponent(`Hola, te invito a la reunión virtual de LumenGroup: *${tituloExpress}*.\n👉 Únete aquí: ${linkJitsi}`);
    window.open(`https://api.whatsapp.com/send?text=${msj}`, '_blank');
  };

  const compartirCorreo = () => {
    const asunto = encodeURIComponent(`Invitación a Reunión Virtual: ${tituloExpress}`);
    const cuerpo = encodeURIComponent(`Se ha programado una sesión virtual. Para entrar a la sala, haz clic en el siguiente enlace:\n\n${linkJitsi}\n\nLumenGroup CRM.`);
    window.location.href = `mailto:?subject=${asunto}&body=${cuerpo}`;
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-700 pb-20">
      
      {/* HEADER DINÁMICO */}
      <div className="bg-slate-900 rounded-[2.5rem] p-8 md:p-12 mb-8 relative overflow-hidden shadow-2xl shadow-indigo-500/20">
        <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h2 className="text-3xl font-black text-white tracking-tight">Workspace <span className="text-indigo-400">Virtual</span></h2>
            <p className="text-indigo-200/60 font-medium text-sm mt-1 uppercase tracking-widest text-[10px]">LumenGroup Videoconference System</p>
          </div>
          <div className="px-5 py-2 bg-white/5 border border-white/10 rounded-full backdrop-blur-md">
            <span className="text-indigo-300 font-black text-[10px] tracking-tighter">Sujeto a políticas de grabación 2026</span>
          </div>
        </div>
      </div>

      {/* VISTA: SELECTOR DE OPCIONES BENTO */}
      {vista === 'opciones' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div onClick={() => setVista('express')} className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 hover:-translate-y-2 transition-all cursor-pointer group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full"></div>
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center text-3xl mb-8 group-hover:scale-110 transition-transform">⚡</div>
            <h4 className="font-black text-slate-800 text-xl mb-3 tracking-tight">Sala Express</h4>
            <p className="text-slate-500 text-sm font-medium leading-relaxed">Genera un enlace instantáneo sin registro. Ideal para reuniones rápidas de hasta 100 personas.</p>
            <div className="mt-8 flex items-center gap-2 text-xs font-black text-blue-600 uppercase tracking-widest">
              <span>Iniciar Ahora</span>
              <span className="group-hover:translate-x-2 transition-transform">→</span>
            </div>
          </div>

          <div onClick={() => setVista('premium')} className="bg-indigo-600 p-10 rounded-[2.5rem] shadow-xl shadow-indigo-200 relative overflow-hidden group cursor-pointer hover:-translate-y-2 transition-all">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-bl-full"></div>
            <div className="w-16 h-16 bg-white/10 text-white rounded-3xl flex items-center justify-center text-3xl mb-8 group-hover:scale-110 transition-transform backdrop-blur-md border border-white/20">👑</div>
            <h4 className="font-black text-white text-xl mb-3 tracking-tight">Sala VIP / Asamblea</h4>
            <p className="text-indigo-100 text-sm font-medium leading-relaxed">Solicita una sala con soporte para votaciones y grabación oficial en la nube de LumenGroup.</p>
            <div className="mt-8 flex items-center gap-2 text-xs font-black text-white uppercase tracking-widest">
              <span>Agendar con Soporte</span>
              <span className="group-hover:translate-x-2 transition-transform">→</span>
            </div>
          </div>
        </div>
      )}

      {/* VISTA: EXPRESS FORM */}
      {vista === 'express' && (
        <div className="bg-white p-10 md:p-14 rounded-[3rem] border border-slate-100 shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
          <button onClick={() => setVista('opciones')} className="mb-10 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-800 flex items-center gap-2">← Volver al Menú</button>
          <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center text-4xl mb-6">⚡</div>
          <h4 className="text-3xl font-black text-slate-800 mb-2">Configura tu Sesión</h4>
          <p className="text-slate-500 font-medium mb-10">Dale un nombre a la sala para generar el acceso cifrado.</p>
          
          <div className="w-full max-w-md space-y-6">
            <input 
              type="text" 
              value={tituloExpress} 
              onChange={e => setTituloExpress(e.target.value)} 
              className="w-full p-6 bg-slate-50 border border-slate-100 rounded-[2rem] outline-none font-black text-blue-600 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-center text-2xl placeholder-slate-300 transition-all shadow-inner" 
              placeholder="Ej: Comité de Torre 4" 
            />
            <button onClick={generarSalaExpress} className="w-full bg-slate-900 text-white font-black py-5 rounded-[1.5rem] shadow-xl hover:bg-blue-600 transition-all uppercase tracking-widest text-xs">Desplegar Sala Instantánea</button>
          </div>
        </div>
      )}

      {/* VISTA: PREMIUM FORM */}
      {vista === 'premium' && (
        <div className="bg-white p-10 md:p-14 rounded-[3rem] border border-slate-100 shadow-2xl animate-in zoom-in-95 duration-300">
          <button onClick={() => setVista('opciones')} className="mb-10 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-800 flex items-center gap-2">← Volver al Menú</button>
          <div className="flex flex-col md:flex-row gap-10">
            <div className="flex-1 space-y-6">
              <h4 className="text-3xl font-black text-slate-800 leading-tight">Solicitud de <span className="text-indigo-600">Sala VIP</span></h4>
              <p className="text-slate-500 font-medium leading-relaxed">Nuestros ingenieros prepararán la sala y te enviarán el enlace de co-anfitrión junto con el manual de votaciones.</p>
            </div>
            <div className="flex-1 space-y-5">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Motivo Oficial</label>
                <input type="text" value={vipMotivo} onChange={e => setVipMotivo(e.target.value)} className="w-full p-4 bg-indigo-50/30 border border-indigo-100 rounded-2xl outline-none font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500" placeholder="Ej: Asamblea Extraordinaria" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Fecha</label>
                  <input type="date" value={vipFecha} onChange={e => setVipFecha(e.target.value)} className="w-full p-4 bg-indigo-50/30 border border-indigo-100 rounded-2xl outline-none font-bold text-sm" style={{colorScheme:'light'}} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Hora Inicio</label>
                  <input type="time" value={vipHora} onChange={e => setVipHora(e.target.value)} className="w-full p-4 bg-indigo-50/30 border border-indigo-100 rounded-2xl outline-none font-bold text-sm" style={{colorScheme:'light'}} />
                </div>
              </div>
              <button 
                onClick={solicitarSalaPremium} 
                disabled={cargando} 
                className="w-full bg-indigo-600 text-white font-black py-5 rounded-[1.5rem] shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all uppercase tracking-widest text-[10px] disabled:opacity-50"
              >
                {cargando ? 'Transmitiendo Petición...' : 'Enviar Solicitud Formal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VISTA: SHARE (Lógica de éxito) */}
      {vista === 'share' && (
        <div className="bg-white p-10 md:p-14 rounded-[3rem] border border-slate-100 shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-500">
          <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-[2rem] flex items-center justify-center text-5xl mb-8 shadow-inner border border-emerald-100">✅</div>
          <h4 className="font-black text-3xl text-slate-800 mb-2 tracking-tight">Sala Cifrada Lista</h4>
          <p className="text-slate-500 mb-10 font-medium max-w-sm">El túnel de comunicación Jitsi está operativo. Elige tu canal de difusión.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-md">
            <button onClick={compartirWhatsApp} className="w-full bg-[#25D366] text-white text-[10px] font-black p-5 rounded-[1.5rem] shadow-xl hover:scale-[1.02] transition-all uppercase tracking-widest flex items-center justify-center gap-3">
              <span>WhatsApp</span> 📱
            </button>
            <button onClick={compartirCorreo} className="w-full bg-slate-900 text-white text-[10px] font-black p-5 rounded-[1.5rem] shadow-xl hover:scale-[1.02] transition-all uppercase tracking-widest flex items-center justify-center gap-3">
              <span>Email Masivo</span> ✉️
            </button>
          </div>
          <button onClick={() => setVista('opciones')} className="mt-10 text-[10px] font-black text-slate-400 hover:text-slate-800 transition-colors uppercase tracking-[0.2em]">Cerrar y crear otra sala</button>
        </div>
      )}
    </div>
  );
}