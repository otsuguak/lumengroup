import React, { useState, useRef } from 'react';
import html2pdf from 'html2pdf.js';

export default function Pitch() {
  // Estados para el Simulador
  const [apartamentos, setApartamentos] = useState(100);
  const [precioBase, setPrecioBase] = useState(900);
  const [isAnual, setIsAnual] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Referencia para exportar a PDF
  const presentacionRef = useRef(null);

  // Cálculos Automáticos
  const mrrBase = apartamentos * precioBase; // Mensualidad Normal
  const arrBase = mrrBase * 12; // Anualidad Normal
  const descuento = isAnual ? arrBase * 0.20 : 0;
  const arrConDescuento = arrBase - descuento;

  // Función para Exportar PDF
  const generarPDF = async () => {
    setIsExporting(true);
    const elemento = presentacionRef.current;
    
    // Quitamos los márgenes temporalmente para el PDF
    elemento.classList.remove('gap-12', 'p-4', 'md:p-8');
    const diapositivas = elemento.querySelectorAll('.slide');
    
    diapositivas.forEach(slide => {
      slide.style.borderRadius = '0';
      slide.style.border = 'none';
      slide.style.margin = '0';
    });

    const opcionesPDF = {
      margin: 0,
      filename: 'Propuesta_Vecindaria_SaaS_LumenGroup.pdf',
      image: { type: 'jpeg', quality: 1.0 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#05070e', windowWidth: 1920 },
      jsPDF: { unit: 'px', format: [1920, 1080], orientation: 'landscape' }
    };

    try {
      await html2pdf().set(opcionesPDF).from(elemento).save();
    } catch (err) {
      console.error("Error renderizando PDF:", err);
      alert("Hubo un error al generar el PDF");
    } finally {
      setIsExporting(false);
      // Restauramos los estilos de la web
      elemento.classList.add('gap-12', 'p-4', 'md:p-8');
      diapositivas.forEach(slide => {
        slide.style.borderRadius = '';
        slide.style.border = '';
        slide.style.margin = '';
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between selection:bg-brand-accent selection:text-white bg-[#05070e] text-slate-100 font-sans">
      <header className="no-print bg-[#05070e]/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
            <i className="fa-solid fa-city text-white text-xl"></i>
          </div>
          <div>
            <h1 className="font-extrabold text-xl tracking-wide text-white">VECINDARIA <span className="text-slate-500 font-normal">SaaS</span></h1>
            <p className="text-[10px] text-cyan-500 tracking-widest uppercase font-bold">Desarrollado por LumenGroup</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={generarPDF} 
            disabled={isExporting}
            className="bg-gradient-to-r from-purple-500 to-blue-500 hover:opacity-90 text-white font-bold px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-lg transition-all"
          >
            {isExporting ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-file-pdf"></i>}
            {isExporting ? 'Exportando...' : 'Exportar Presentación'}
          </button>
        </div>
      </header>

      <main ref={presentacionRef} className="max-w-[1400px] w-full mx-auto p-4 md:p-8 flex flex-col gap-12" id="contenedor-presentacion">
        
        {/* SLIDE 1 */}
        <section className="slide bg-[#0a0f1c] border border-slate-800 rounded-3xl p-10 md:p-14 flex flex-col justify-between relative overflow-hidden glow-purple">
          <div className="flex justify-between items-center border-b border-slate-800/50 pb-5">
            <div className="flex items-center gap-2 text-purple-500 font-bold text-xs uppercase tracking-widest">
              <i className="fa-solid fa-rocket"></i> Propuesta Comercial Oficial
            </div>
            <div className="text-slate-500 text-xs font-semibold">ECOSISTEMA VECINDARIA • 2026</div>
          </div>
          <div className="my-auto slide-content flex flex-col lg:flex-row items-center justify-between gap-10 z-10">
            <div className="max-w-3xl text-center lg:text-left">
              <h2 className="text-slate-400 text-sm uppercase font-extrabold tracking-widest mb-4">REVOLUCIONANDO LA PROPIEDAD HORIZONTAL</h2>
              <h3 className="text-5xl md:text-7xl font-black tracking-tight leading-none mb-6">
                El poder de tu conjunto,<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500">en una sola App.</span>
              </h3>
              <p className="text-slate-400 text-base md:text-lg leading-relaxed mb-10 max-w-2xl">
                Vecindaria no es solo un software; es un ecosistema digital de grado empresarial que conecta a <strong>Administradores, Guardas y Residentes</strong> en tiempo real.
              </p>
            </div>
            <div className="w-80 h-80 flex items-center justify-center shrink-0">
               <div className="w-40 h-40 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex flex-col items-center justify-center shadow-2xl">
                 <i className="fa-solid fa-building-user text-4xl text-white mb-2"></i>
                 <span className="font-black text-sm tracking-widest text-white">VECINDARIA</span>
               </div>
            </div>
          </div>
        </section>

        {/* SLIDE SIMULADOR (Tu slide 6, resumido para el ejemplo) */}
        <section className="slide bg-[#0a0f1c] border border-slate-800 rounded-3xl p-10 md:p-14 flex flex-col justify-between relative overflow-hidden glow-cyan">
          <div className="flex justify-between items-center border-b border-slate-800/50 pb-5">
            <div className="flex items-center gap-2 text-cyan-500 font-bold text-xs uppercase tracking-widest">
              <i className="fa-solid fa-calculator"></i> Proyección de Inversión
            </div>
            <div className="text-slate-500 text-xs font-semibold">SIMULADOR EN TIEMPO REAL</div>
          </div>

          <div className="my-auto slide-content z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            {/* Controles del simulador */}
            <div className="lg:col-span-6 space-y-6">
              <div>
                <h3 className="text-3xl font-black mb-2">Simula tu Ecosistema</h3>
                <p className="text-slate-400 text-sm">Ajusta las variables de tu copropiedad.</p>
              </div>

              <div className="bg-[#05070e]/60 border border-slate-800 p-5 rounded-xl">
                <div className="flex justify-between mb-3">
                  <span className="text-xs font-bold text-slate-300">UNIDADES / INMUEBLES:</span>
                  <span className="text-sm font-black text-cyan-500">{apartamentos.toLocaleString('es-CO')} INMUEBLES</span>
                </div>
                <input 
                  type="range" min="50" max="2000" step="10" 
                  value={apartamentos} 
                  onChange={(e) => setApartamentos(Number(e.target.value))}
                  className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500" 
                />
              </div>

              <div className="bg-[#05070e]/60 border border-slate-800 p-5 rounded-xl">
                <div className="flex justify-between mb-3">
                  <span className="text-xs font-bold text-slate-300">TARIFA MENSUAL POR INMUEBLE (COP):</span>
                  <span className="text-sm font-black text-purple-500">${precioBase.toLocaleString('es-CO')} COP</span>
                </div>
                <input 
                  type="range" min="500" max="3000" step="100" 
                  value={precioBase} 
                  onChange={(e) => setPrecioBase(Number(e.target.value))}
                  className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500" 
                />
              </div>
            </div>

            {/* Resultados del Simulador */}
            <div className="lg:col-span-6 space-y-5">
              <div className="flex items-center justify-center gap-4 bg-[#05070e]/50 p-4 rounded-xl border border-slate-800">
                <span className={`text-sm font-bold transition-colors ${!isAnual ? 'text-white' : 'text-slate-500'}`}>Pago Mensual</span>
                
                <div className="relative inline-block w-12 h-6 align-middle select-none">
                  <input 
                    type="checkbox" id="toggle-anual" 
                    checked={isAnual} 
                    onChange={(e) => setIsAnual(e.target.checked)}
                    className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 border-slate-800 appearance-none cursor-pointer transition-all duration-300 z-10"
                  />
                  <label htmlFor="toggle-anual" className="toggle-label block overflow-hidden h-6 rounded-full bg-slate-800 cursor-pointer"></label>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold transition-colors ${isAnual ? 'text-white' : 'text-slate-500'}`}>Pago Anual</span>
                  <span className="bg-emerald-500 text-white text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider animate-pulse">Ahorra 20%</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className={`bg-[#05070e] border border-slate-800 p-6 rounded-2xl flex flex-col justify-center text-center transition-all ${isAnual ? 'opacity-50' : ''}`}>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">Pago Mes a Mes</span>
                  <span className="text-3xl lg:text-4xl font-black text-white">${mrrBase.toLocaleString('es-CO')}</span>
                </div>

                <div className={`bg-[#05070e] border border-slate-800 p-6 rounded-2xl flex flex-col justify-center text-center relative overflow-hidden transition-all ${isAnual ? 'ring-2 ring-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.3)]' : ''}`}>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2 z-10">Suscripción Anual</span>
                  {isAnual && (
                    <span className="text-[11px] text-slate-500 line-through mb-1 z-10">${arrBase.toLocaleString('es-CO')} Regular</span>
                  )}
                  <span className={`text-3xl lg:text-4xl font-black relative z-10 ${isAnual ? 'text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-cyan-500' : 'text-white'}`}>
                    ${arrConDescuento.toLocaleString('es-CO')}
                  </span>
                  <span className="text-[10px] text-emerald-500 font-bold mt-2 z-10">
                    {isAnual ? `¡Ahorras $${descuento.toLocaleString('es-CO')}!` : 'Inversión Total Año'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}