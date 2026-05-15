import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export default function LlamadosResidente() {
  const [llamados, setLlamados] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [docSeleccionado, setDocSeleccionado] = useState(null); // Para el PDF

  useEffect(() => {
    cargarLlamados();
  }, []);

  const cargarLlamados = async () => {
    setCargando(true);
    try {
      const copropiedadId = sessionStorage.getItem('copropiedad_id');
      const { data: { user } } = await supabase.auth.getUser();

      if (!user || !copropiedadId) return;

      // Traemos todos los llamados de este usuario en específico
      const { data, error } = await supabase
        .from('llamados_atencion')
        .select('*')
        .eq('copropiedad_id', copropiedadId)
        .eq('usuario_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLlamados(data || []);

    } catch (error) {
      console.error("Error trayendo los llamados de atención:", error);
    } finally {
      setCargando(false);
    }
  };

  if (cargando) {
    return (
      <div className="flex justify-center p-20">
        <div className="animate-spin w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4">
      
      {/* HEADER DE LA PÁGINA */}
      <div className="bg-gradient-to-r from-red-600 to-rose-500 p-8 rounded-3xl shadow-xl mb-8 text-white">
        <div className="flex items-center gap-4 mb-2">
          <span className="text-4xl">🚨</span>
          <h1 className="text-3xl font-black">Convivencia y Novedades</h1>
        </div>
        <p className="text-red-100 opacity-90 pl-14">Historial de llamados de atención y reportes de la administración.</p>
      </div>

      {/* LISTADO DE LLAMADOS (TARJETAS) */}
      {llamados.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border-2 border-dashed border-emerald-200 text-center shadow-sm">
          <span className="text-6xl mb-4 block">🎉</span>
          <h3 className="text-2xl font-black text-slate-800 mb-2">¡Excelente comportamiento!</h3>
          <p className="text-slate-500">No tienes llamados de atención ni novedades registradas en tu historial.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {llamados.map(llamado => (
            <div key={llamado.id} className="bg-white rounded-3xl p-6 border border-red-100 shadow-lg shadow-red-100/50 relative overflow-hidden group hover:border-red-300 transition-colors">
              
              {/* Etiqueta de fecha */}
              <div className="absolute top-0 right-0 bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-bl-xl border-b border-l border-red-100">
                {new Date(llamado.created_at).toLocaleDateString('es-CO')}
              </div>

              <div className="pr-20 mb-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Motivo del Reporte</p>
                <h3 className="text-lg font-bold text-slate-800 leading-snug">{llamado.motivo}</h3>
              </div>
              
              <div className="pt-4 border-t border-slate-100 mt-auto">
                {llamado.documento_url ? (
                  <button 
                    onClick={() => setDocSeleccionado(llamado.documento_url)} 
                    className="w-full bg-red-50 hover:bg-red-500 text-red-600 hover:text-white font-bold py-3 rounded-xl transition-colors shadow-sm"
                  >
                    📄 Ver Documento Oficial
                  </button>
                ) : (
                  <button disabled className="w-full bg-slate-50 text-slate-400 font-bold py-3 rounded-xl cursor-not-allowed">
                    Sin archivo adjunto
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================
          MODAL: IFRAME PARA VISUALIZAR EL DOCUMENTO (PDF)
          ======================================================== */}
      {docSeleccionado && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-5xl h-[85vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
            
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-xl">📄</span>
                <h3 className="font-black tracking-widest uppercase text-sm">Visor Oficial</h3>
              </div>
              <button 
                onClick={() => setDocSeleccionado(null)} 
                className="w-10 h-10 bg-white/10 hover:bg-red-500 rounded-full flex items-center justify-center font-bold transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="flex-1 bg-slate-200 p-2 md:p-4">
              <iframe 
                src={docSeleccionado} 
                className="w-full h-full rounded-2xl border-0 shadow-inner bg-white"
                title="Documento Oficial"
              ></iframe>
            </div>
            
          </div>
        </div>
      )}

    </div>
  );
}