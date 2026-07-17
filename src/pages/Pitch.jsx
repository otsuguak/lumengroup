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
    <div className="min-h-screen flex flex-col justify-between selection:bg-purple-500 selection:text-white bg-[#05070e] text-slate-100 font-sans">
      
      {/* HEADER */}
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
        
        {/* =========================================================================
            SLIDE 1: PORTADA
        ========================================================================= */}
        <section className="slide bg-[#0a0f1c] border border-slate-800 rounded-3xl p-10 md:p-14 flex flex-col justify-between relative overflow-hidden shadow-[0_0_35px_rgba(139,92,246,0.15)] min-h-[700px]">
          <div className="absolute w-[400px] h-[400px] rounded-full blur-[150px] -top-24 -left-24 bg-purple-500/20 pointer-events-none"></div>
          <div className="absolute w-[500px] h-[500px] rounded-full blur-[180px] -bottom-40 -right-40 bg-blue-500/15 pointer-events-none"></div>

          <div className="flex justify-between items-center border-b border-slate-800/50 pb-5">
            <div className="flex items-center gap-2 text-purple-500 font-bold text-xs uppercase tracking-widest">
              <i className="fa-solid fa-rocket"></i> Propuesta Comercial Oficial
            </div>
            <div className="text-slate-500 text-xs font-semibold">ECOSISTEMA VECINDARIA • 2026</div>
          </div>

          <div className="my-auto slide-content flex flex-col lg:flex-row items-center justify-between gap-10 z-10 flex-grow">
            <div className="max-w-3xl text-center lg:text-left">
              <h2 className="text-slate-400 text-sm uppercase font-extrabold tracking-widest mb-4">REVOLUCIONANDO LA PROPIEDAD HORIZONTAL</h2>
              <h3 className="text-5xl md:text-7xl font-black tracking-tight leading-none mb-6">
                El poder de tu conjunto,<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500">
                  en una sola App.
                </span>
              </h3>
              <p className="text-slate-400 text-base md:text-lg leading-relaxed mb-10 max-w-2xl">
                Vecindaria no es solo un software; es un ecosistema digital de grado empresarial que conecta a <strong>Administradores, Guardas y Residentes</strong> en tiempo real, garantizando control absoluto, cero fugas de dinero y armonía comunitaria.
              </p>
              <div className="flex flex-wrap justify-center lg:justify-start gap-4">
                <span className="bg-purple-500/10 border border-purple-500/30 text-purple-500 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider">
                  <i className="fa-solid fa-gears mr-2"></i> 18 Módulos Core
                </span>
                <span className="bg-blue-500/10 border border-blue-500/30 text-blue-500 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider">
                  <i className="fa-solid fa-palette mr-2"></i> Marca Blanca 100%
                </span>
                <span className="bg-cyan-500/10 border border-cyan-500/30 text-cyan-500 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider">
                  <i className="fa-solid fa-mobile-screen mr-2"></i> PWA Instalable
                </span>
              </div>
            </div>

            <div className="relative w-80 h-80 flex items-center justify-center shrink-0">
              <div className="absolute inset-0 rounded-full border border-dashed border-slate-700 animate-[spin_40s_linear_infinite]"></div>
              <div className="absolute w-64 h-64 rounded-full border border-purple-500/40 animate-[ping_3s_ease-in-out_infinite] opacity-20"></div>
              
              <div className="w-40 h-40 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex flex-col items-center justify-center z-10 shadow-2xl shadow-purple-500/50">
                <i className="fa-solid fa-building-user text-4xl text-white mb-2"></i>
                <span className="font-black text-sm tracking-widest text-white">VECINDARIA</span>
              </div>
              <div className="absolute top-4 bg-[#0a0f1c] border border-slate-700 p-3 rounded-2xl text-center shadow-lg w-32 -translate-y-4">
                <i className="fa-solid fa-user-shield text-purple-500 mb-1"></i><p className="text-[10px] font-bold uppercase">Staff Portería</p>
              </div>
              <div className="absolute bottom-6 left-0 bg-[#0a0f1c] border border-slate-700 p-3 rounded-2xl text-center shadow-lg w-32 -translate-x-4">
                <i className="fa-solid fa-laptop text-blue-500 mb-1"></i><p className="text-[10px] font-bold uppercase">Administración</p>
              </div>
              <div className="absolute bottom-6 right-0 bg-[#0a0f1c] border border-slate-700 p-3 rounded-2xl text-center shadow-lg w-32 translate-x-4">
                <i className="fa-solid fa-house-chimney-user text-cyan-500 mb-1"></i><p className="text-[10px] font-bold uppercase">Residentes</p>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center border-t border-slate-800/50 pt-5 text-[11px] text-slate-500 mt-auto">
            <div>Propiedad de LumenGroup S.A.S</div>
            <div className="font-bold tracking-widest">01 / 07</div>
          </div>
        </section>

        {/* =========================================================================
            SLIDE 2: EL PROBLEMA
        ========================================================================= */}
        <section className="slide bg-[#0a0f1c] border border-slate-800 rounded-3xl p-10 md:p-14 flex flex-col justify-between relative overflow-hidden min-h-[700px]">
          <div className="flex justify-between items-center border-b border-slate-800/50 pb-5">
            <div className="flex items-center gap-2 text-rose-500 font-bold text-xs uppercase tracking-widest">
              <i className="fa-solid fa-triangle-exclamation"></i> El Problema Actual
            </div>
            <div className="text-slate-500 text-xs font-semibold">DIAGNÓSTICO</div>
          </div>

          <div className="my-auto slide-content z-10 flex-grow">
            <div className="max-w-3xl mb-10">
              <h2 className="text-slate-400 text-sm uppercase font-extrabold tracking-widest mb-2">LA GESTIÓN ANÁLOGA</h2>
              <h3 className="text-4xl font-black">Ser esclavo de lo urgente, perdiendo lo importante.</h3>
              <p className="text-slate-400 text-base mt-4 leading-relaxed">
                Hoy en día, las administraciones se asfixian apagando incendios operativos. Tienen un software contable para facturar, un chat de WhatsApp colapsado, y porterías que funcionan a punta de cuadernos. Esto genera 3 fracturas críticas:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-[#05070e]/60 border border-slate-800 p-8 rounded-2xl hover:border-rose-500/40 transition-all group">
                <div className="w-14 h-14 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 mb-5 group-hover:scale-110 transition-all">
                  <i className="fa-solid fa-sack-dollar text-2xl"></i>
                </div>
                <h4 className="font-bold text-xl mb-3 text-slate-200">Fugas de Dinero</h4>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Cobros de parqueaderos de visitantes en efectivo, planillas en papel manipulables y arqueos inexactos que exponen a la administración a auditorías riesgosas.
                </p>
              </div>
              <div className="bg-[#05070e]/60 border border-slate-800 p-8 rounded-2xl hover:border-orange-500/40 transition-all group">
                <div className="w-14 h-14 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500 mb-5 group-hover:scale-110 transition-all">
                  <i className="fa-solid fa-user-clock text-2xl"></i>
                </div>
                <h4 className="font-bold text-xl mb-3 text-slate-200">Altos Costos Tecnológicos</h4>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Softwares genéricos que te obligan a pagar por módulos de contabilidad o funciones que no necesitas, encareciendo la administración mes a mes.
                </p>
              </div>
              <div className="bg-[#05070e]/60 border border-slate-800 p-8 rounded-2xl hover:border-yellow-500/40 transition-all group">
                <div className="w-14 h-14 rounded-2xl bg-yellow-500/10 flex items-center justify-center text-yellow-500 mb-5 group-hover:scale-110 transition-all">
                  <i className="fa-solid fa-comment-slash text-2xl"></i>
                </div>
                <h4 className="font-bold text-xl mb-3 text-slate-200">Caos Comunicativo</h4>
                <p className="text-slate-400 text-sm leading-relaxed">
                  PQRS enviadas por debajo de la puerta, paquetes perdidos en portería y quejas de vecinos por roces de reservas que terminan en discusiones en la asamblea.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center border-t border-slate-800/50 pt-5 text-[11px] text-slate-500 mt-auto">
            <div>Vecindaria SaaS</div>
            <div className="font-bold tracking-widest">02 / 07</div>
          </div>
        </section>

        {/* =========================================================================
            SLIDE 3: ESCALABILIDAD
        ========================================================================= */}
        <section className="slide bg-[#0a0f1c] border border-slate-800 rounded-3xl p-10 md:p-14 flex flex-col justify-between relative overflow-hidden shadow-[0_0_35px_rgba(6,182,212,0.2)] min-h-[700px]">
          <div className="absolute w-[300px] h-[300px] rounded-full blur-[120px] -top-10 -right-10 bg-cyan-500/20 pointer-events-none"></div>

          <div className="flex justify-between items-center border-b border-slate-800/50 pb-5">
            <div className="flex items-center gap-2 text-cyan-500 font-bold text-xs uppercase tracking-widest">
              <i className="fa-solid fa-layer-group"></i> Escalabilidad y Flexibilidad
            </div>
            <div className="text-slate-500 text-xs font-semibold">PLANES A LA MEDIDA</div>
          </div>

          <div className="my-auto slide-content z-10 flex flex-col lg:flex-row gap-12 items-center flex-grow">
            <div className="flex-1">
              <h2 className="text-slate-400 text-sm uppercase font-extrabold tracking-widest mb-2">ADAPTABILIDAD FINANCIERA Y TÉCNICA</h2>
              <h3 className="text-4xl font-black mb-5">Tecnología que se adapta<br/>a tu presupuesto.</h3>
              <p className="text-slate-400 text-base leading-relaxed mb-6">
                En LumenGroup entendemos que cada copropiedad tiene realidades y presupuestos distintos. <strong>No te obligamos a pagar por herramientas que no usas.</strong> Si tu presupuesto es ajustado, ¡tranquilo! Nuestro equipo se encarga de configurarte la App con los módulos exactos que necesitas, de forma fácil y 100% segura.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3 bg-[#05070e] border border-slate-800 p-4 rounded-xl">
                  <i className="fa-solid fa-boxes-stacked text-cyan-500 mt-1 text-lg"></i>
                  <div>
                    <strong className="text-slate-200 text-sm block">Esquema Modular (Start, Pro, Master)</strong>
                    <span className="text-slate-400 text-xs">Te asesoramos para elegir el paquete ideal. Si hoy iniciamos con lo básico y mañana el conjunto crece, activamos nuevas funciones instantáneamente.</span>
                  </div>
                </li>
                <li className="flex items-start gap-3 bg-[#05070e] border border-slate-800 p-4 rounded-xl">
                  <i className="fa-solid fa-paint-roller text-cyan-500 mt-1 text-lg"></i>
                  <div>
                    <strong className="text-slate-200 text-sm block">Identidad Corporativa Garantizada</strong>
                    <span className="text-slate-400 text-xs">Sin importar el plan que elijas, la plataforma siempre llevará el logo y los colores de tu conjunto, proyectando una imagen premium ante el Consejo.</span>
                  </div>
                </li>
              </ul>
            </div>
            
            <div className="flex-1 w-full flex justify-center">
              <div className="w-full max-w-sm bg-[#05070e] border border-slate-800 rounded-2xl shadow-2xl p-6 relative">
                <div className="absolute -top-3 -right-3 bg-cyan-500 text-white text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">Ejemplo de Configuración</div>
                <h4 className="text-slate-300 font-bold mb-4 border-b border-slate-800 pb-2"><i className="fa-solid fa-user-tie text-cyan-500 mr-2"></i> Implementación LumenGroup</h4>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-[#0a0f1c] p-3 rounded-lg border border-slate-800">
                    <span className="text-xs font-bold text-slate-300"><i className="fa-solid fa-rocket text-purple-500 mr-2"></i> Plan Seleccionado</span>
                    <span className="bg-purple-500/20 text-purple-500 text-[10px] px-3 py-1 rounded font-bold uppercase border border-purple-500/30">PLAN PRO</span>
                  </div>

                  <div className="space-y-2 mt-4 pt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400"><i className="fa-solid fa-check text-emerald-500 mr-2"></i> PQRS y Reservas</span>
                      <span className="text-[9px] bg-emerald-500/20 text-emerald-500 px-2 py-0.5 rounded">INCLUIDO</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400"><i className="fa-solid fa-check text-emerald-500 mr-2"></i> Cartelera Digital</span>
                      <span className="text-[9px] bg-emerald-500/20 text-emerald-500 px-2 py-0.5 rounded">INCLUIDO</span>
                    </div>
                    <div className="flex justify-between items-center opacity-40">
                      <span className="text-xs text-slate-500"><i className="fa-solid fa-xmark text-slate-600 mr-2"></i> Parqueadero Financiero</span>
                      <span className="text-[9px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded">APAGADO</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

          <div className="flex justify-between items-center border-t border-slate-800/50 pt-5 text-[11px] text-slate-500 mt-auto">
            <div>Autonomía Tecnológica Total</div>
            <div className="font-bold tracking-widest">03 / 07</div>
          </div>
        </section>

        {/* =========================================================================
            SLIDE 4: MÓDULOS
        ========================================================================= */}
        <section className="slide bg-[#0a0f1c] border border-slate-800 rounded-3xl p-8 flex flex-col justify-between relative overflow-hidden min-h-[700px]">
          <div className="flex justify-between items-center border-b border-slate-800/50 pb-4">
            <div className="flex items-center gap-2 text-purple-500 font-bold text-xs uppercase tracking-widest">
              <i className="fa-solid fa-layer-group"></i> Capacidades Técnicas
            </div>
            <div className="text-slate-500 text-xs font-semibold">18 MÓDULOS CORE</div>
          </div>

          <div className="my-auto slide-content z-10 py-4 flex-grow">
            <div className="text-center mb-6">
              <h3 className="text-3xl font-black mb-2">El arsenal de herramientas definitivo</h3>
              <p className="text-slate-400 text-xs">Desarrollo robusto, escalable e integrado en una sola base de datos.</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              
              <div className="bg-[#05070e]/50 border border-slate-800 p-3 rounded-xl hover:border-purple-500/50 transition-all flex flex-col">
                <i className="fa-solid fa-shield-halved text-purple-500 text-lg mb-2"></i>
                <h4 className="font-bold text-[11px] text-slate-200 mb-1 leading-tight">1. Vigilancia 360</h4>
                <p className="text-[9px] text-slate-500 leading-snug">Control de turnos, novedades y acceso peatonal seguro.</p>
              </div>
              <div className="bg-[#05070e]/50 border border-slate-800 p-3 rounded-xl hover:border-blue-500/50 transition-all flex flex-col">
                <i className="fa-solid fa-users text-blue-500 text-lg mb-2"></i>
                <h4 className="font-bold text-[11px] text-slate-200 mb-1 leading-tight">2. Módulo Residentes</h4>
                <p className="text-[9px] text-slate-500 leading-snug">Directorio actualizado de propietarios y arrendatarios.</p>
              </div>
              <div className="bg-[#05070e]/50 border border-slate-800 p-3 rounded-xl hover:border-cyan-500/50 transition-all flex flex-col">
                <i className="fa-solid fa-comments text-cyan-500 text-lg mb-2"></i>
                <h4 className="font-bold text-[11px] text-slate-200 mb-1 leading-tight">3. PQRSF Interactivo</h4>
                <p className="text-[9px] text-slate-500 leading-snug">Tickets organizados con chat en vivo y control de tiempos.</p>
              </div>
              <div className="bg-[#05070e]/50 border border-slate-800 p-3 rounded-xl hover:border-emerald-500/50 transition-all flex flex-col">
                <i className="fa-solid fa-palette text-emerald-500 text-lg mb-2"></i>
                <h4 className="font-bold text-[11px] text-slate-200 mb-1 leading-tight">4. Cartelera Personalizada</h4>
                <p className="text-[9px] text-slate-500 leading-snug">Identidad visual y panel de noticias a la medida del conjunto.</p>
              </div>
              <div className="bg-[#05070e]/50 border border-slate-800 p-3 rounded-xl hover:border-amber-500/50 transition-all flex flex-col">
                <i className="fa-solid fa-calendar-check text-amber-500 text-lg mb-2"></i>
                <h4 className="font-bold text-[11px] text-slate-200 mb-1 leading-tight">5. Árbitro de Reservas</h4>
                <p className="text-[9px] text-slate-500 leading-snug">Asignación automática de BBQ y salones sociales.</p>
              </div>
              <div className="bg-[#05070e]/50 border border-slate-800 p-3 rounded-xl hover:border-rose-500/50 transition-all flex flex-col">
                <i className="fa-solid fa-triangle-exclamation text-rose-500 text-lg mb-2"></i>
                <h4 className="font-bold text-[11px] text-slate-200 mb-1 leading-tight">6. Llamados de Atención</h4>
                <p className="text-[9px] text-slate-500 leading-snug">Notificaciones formales digitales y multas de convivencia.</p>
              </div>

              <div className="bg-[#05070e]/50 border border-slate-800 p-3 rounded-xl hover:border-cyan-500/50 transition-all flex flex-col">
                <i className="fa-solid fa-store text-cyan-500 text-lg mb-2"></i>
                <h4 className="font-bold text-[11px] text-slate-200 mb-1 leading-tight">7. Mercado Inmobiliario</h4>
                <p className="text-[9px] text-slate-500 leading-snug">Venta y arriendo de inmuebles integrado a la comunidad.</p>
              </div>
              <div className="bg-[#05070e]/50 border border-slate-800 p-3 rounded-xl hover:border-purple-500/50 transition-all flex flex-col">
                <i className="fa-solid fa-square-poll-vertical text-purple-500 text-lg mb-2"></i>
                <h4 className="font-bold text-[11px] text-slate-200 mb-1 leading-tight">8. Encuestas y Votos</h4>
                <p className="text-[9px] text-slate-500 leading-snug">Consultas comunitarias ágiles antes de las asambleas.</p>
              </div>
              <div className="bg-[#05070e]/50 border border-slate-800 p-3 rounded-xl hover:border-blue-500/50 transition-all flex flex-col">
                <i className="fa-solid fa-box-open text-blue-500 text-lg mb-2"></i>
                <h4 className="font-bold text-[11px] text-slate-200 mb-1 leading-tight">9. Recepción Digital</h4>
                <p className="text-[9px] text-slate-500 leading-snug">Registro fotográfico de paquetes y trazabilidad.</p>
              </div>
              <div className="bg-[#05070e]/50 border border-slate-800 p-3 rounded-xl hover:border-emerald-500/50 transition-all flex flex-col">
                <i className="fa-solid fa-circle-question text-emerald-500 text-lg mb-2"></i>
                <h4 className="font-bold text-[11px] text-slate-200 mb-1 leading-tight">10. Centro Ayuda (FAQ)</h4>
                <p className="text-[9px] text-slate-500 leading-snug">Respuestas automáticas a las dudas más comunes del conjunto.</p>
              </div>
              <div className="bg-[#05070e]/50 border border-slate-800 p-3 rounded-xl hover:border-amber-500/50 transition-all flex flex-col">
                <i className="fa-solid fa-credit-card text-amber-500 text-lg mb-2"></i>
                <h4 className="font-bold text-[11px] text-slate-200 mb-1 leading-tight">11. Enlaces de Pago</h4>
                <p className="text-[9px] text-slate-500 leading-snug">Links integrados para pagar administración de forma fácil.</p>
              </div>
              <div className="bg-[#05070e]/50 border border-slate-800 p-3 rounded-xl hover:border-blue-500/50 transition-all flex flex-col">
                <i className="fa-solid fa-envelopes-bulk text-blue-500 text-lg mb-2"></i>
                <h4 className="font-bold text-[11px] text-slate-200 mb-1 leading-tight">12. Envío de Correos</h4>
                <p className="text-[9px] text-slate-500 leading-snug">Comunicaciones masivas oficiales vía email a residentes.</p>
              </div>

              <div className="bg-[#05070e]/50 border border-slate-800 p-3 rounded-xl hover:border-emerald-500/50 transition-all flex flex-col">
                <i className="fa-solid fa-car-side text-emerald-500 text-lg mb-2"></i>
                <h4 className="font-bold text-[11px] text-slate-200 mb-1 leading-tight">13. Parqueadero Financiero</h4>
                <p className="text-[9px] text-slate-500 leading-snug">Cálculo según ley PH y arqueo estricto de caja.</p>
              </div>
              <div className="bg-[#05070e]/50 border border-slate-800 p-3 rounded-xl hover:border-cyan-500/50 transition-all flex flex-col">
                <i className="fa-solid fa-square-parking text-cyan-500 text-lg mb-2"></i>
                <h4 className="font-bold text-[11px] text-slate-200 mb-1 leading-tight">14. Asignación Parqueaderos</h4>
                <p className="text-[9px] text-slate-500 leading-snug">Control y trazabilidad de celdas asignadas por inmueble.</p>
              </div>
              <div className="bg-[#05070e]/50 border border-slate-800 p-3 rounded-xl hover:border-purple-500/50 transition-all flex flex-col">
                <i className="fa-solid fa-folder-tree text-purple-500 text-lg mb-2"></i>
                <h4 className="font-bold text-[11px] text-slate-200 mb-1 leading-tight">15. Repositorio Legal</h4>
                <p className="text-[9px] text-slate-500 leading-snug">Actas, reglamentos y presupuestos al alcance de un clic.</p>
              </div>
              <div className="bg-[#05070e]/50 border border-slate-800 p-3 rounded-xl hover:border-blue-500/50 transition-all flex flex-col">
                <i className="fa-solid fa-chart-line text-blue-500 text-lg mb-2"></i>
                <h4 className="font-bold text-[11px] text-slate-200 mb-1 leading-tight">16. Dashboard Admin</h4>
                <p className="text-[9px] text-slate-500 leading-snug">Métricas, gráficas y estado general de la copropiedad en vivo.</p>
              </div>
              <div className="bg-[#05070e]/50 border border-slate-800 p-3 rounded-xl hover:border-rose-500/50 transition-all flex flex-col">
                <i className="fa-solid fa-bell text-rose-500 text-lg mb-2"></i>
                <h4 className="font-bold text-[11px] text-slate-200 mb-1 leading-tight">17. Alertas Push</h4>
                <p className="text-[9px] text-slate-500 leading-snug">Avisos automáticos en el celular ante paquetes o visitas.</p>
              </div>
              <div className="bg-[#05070e]/50 border border-slate-800 p-3 rounded-xl hover:border-amber-500/50 transition-all flex flex-col">
                <i className="fa-solid fa-file-export text-amber-500 text-lg mb-2"></i>
                <h4 className="font-bold text-[11px] text-slate-200 mb-1 leading-tight">18. Auditoría y Exportación</h4>
                <p className="text-[9px] text-slate-500 leading-snug">Descarga en Excel de los casos ingresados para generar reportes.</p>
              </div>

            </div>
          </div>

          <div className="flex justify-between items-center border-t border-slate-800/50 pt-4 text-[11px] text-slate-500 mt-auto">
            <div>18 Módulos construidos sobre Supabase & React</div>
            <div className="font-bold tracking-widest">04 / 07</div>
          </div>
        </section>

        {/* =========================================================================
            SLIDE 5: ROI (Optimización de Personal)
        ========================================================================= */}
        <section className="slide bg-[#0a0f1c] border border-slate-800 rounded-3xl p-10 md:p-14 flex flex-col justify-between relative overflow-hidden shadow-[0_0_35px_rgba(59,130,246,0.15)] min-h-[700px]">
          <div className="absolute w-[300px] h-[300px] rounded-full blur-[100px] -bottom-10 -left-10 bg-blue-500/20 pointer-events-none"></div>

          <div className="flex justify-between items-center border-b border-slate-800/50 pb-5">
            <div className="flex items-center gap-2 text-blue-500 font-bold text-xs uppercase tracking-widest">
              <i className="fa-solid fa-people-group"></i> Optimización de Personal
            </div>
            <div className="text-slate-500 text-xs font-semibold">RETORNO DE INVERSIÓN (ROI)</div>
          </div>

          <div className="my-auto slide-content z-10 flex flex-col md:flex-row gap-12 items-center flex-grow">
            <div className="flex-1">
              <h2 className="text-slate-400 text-sm uppercase font-extrabold tracking-widest mb-2">DE "HACER" A "GESTIONAR"</h2>
              <h3 className="text-4xl font-black mb-5">El verdadero ahorro está en el tiempo.</h3>
              <p className="text-slate-400 text-base leading-relaxed mb-6">
                Cuando un conjunto tiene un equipo administrativo de varias personas, el 70% de su día se gasta transcribiendo datos, respondiendo WhatsApps, correos inmanejables y buscando carpetas físicas.
              </p>
              <div className="bg-[#05070e]/80 border-l-4 border-blue-500 p-5 rounded-r-xl">
                <p className="text-slate-300 text-sm font-bold italic">
                  "Con Vecindaria, la plataforma automatiza lo mecánico (cobros, asignación de reservas, envío masivo de correos y notificaciones de portería). Su equipo ya no trabaja como secretarios de digitación, se transforman en gerentes de comunidad reales."
                </p>
              </div>
            </div>

            <div className="w-full max-w-sm shrink-0">
              <div className="bg-[#05070e] border border-slate-800 rounded-2xl p-6 shadow-xl relative">
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-blue-500/20 text-blue-500 absolute -top-8 left-1/2 -translate-x-1/2 border-4 border-[#0a0f1c]">
                  <i className="fa-solid fa-chart-pie text-2xl"></i>
                </div>
                <h4 className="text-center font-bold text-lg mt-8 mb-4 text-white">Impacto Operativo</h4>
                <ul className="space-y-4">
                  <li className="flex justify-between items-center border-b border-slate-800/50 pb-2">
                    <span className="text-xs text-slate-400">Tiempo en radicación manual</span>
                    <span className="text-xs font-bold text-emerald-500">- 85%</span>
                  </li>
                  <li className="flex justify-between items-center border-b border-slate-800/50 pb-2">
                    <span className="text-xs text-slate-400">Conflictos por áreas comunes</span>
                    <span className="text-xs font-bold text-emerald-500">- 95%</span>
                  </li>
                  <li className="flex justify-between items-center pb-2">
                    <span className="text-xs text-slate-400">Recaudo parqueadero visitantes</span>
                    <span className="text-xs font-bold text-purple-500">+ 40% (Auditable)</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center border-t border-slate-800/50 pt-5 text-[11px] text-slate-500 mt-auto">
            <div>Eficiencia Administrativa Garantizada</div>
            <div className="font-bold tracking-widest">05 / 07</div>
          </div>
        </section>

        {/* =========================================================================
            SLIDE 6: PLANES (Esquemas de Suscripción)
        ========================================================================= */}
        <section className="slide bg-[#0a0f1c] border border-slate-800 rounded-3xl p-10 md:p-14 flex flex-col justify-between relative overflow-hidden shadow-[0_0_35px_rgba(139,92,246,0.15)] min-h-[700px]">
          <div className="flex justify-between items-center border-b border-slate-800/50 pb-5">
            <div className="flex items-center gap-2 text-purple-500 font-bold text-xs uppercase tracking-widest">
              <i className="fa-solid fa-tags"></i> Esquemas de Suscripción
            </div>
            <div className="text-slate-500 text-xs font-semibold">PAQUETES SAAS</div>
          </div>

          <div className="my-auto slide-content z-10 py-6 flex-grow">
            <div className="text-center mb-10">
              <h3 className="text-3xl md:text-4xl font-black mb-2">Escoge el nivel de control que necesitas</h3>
              <p className="text-slate-400 text-sm">Empieza con lo esencial y escala a medida que crece tu comunidad.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
              
              <div className="bg-[#05070e]/40 border border-slate-800 p-6 rounded-2xl flex flex-col">
                <h4 className="font-black text-xl text-slate-300 mb-1">Plan Start</h4>
                <p className="text-slate-500 text-[11px] mb-6 border-b border-slate-800 pb-4">Lo esencial para digitalizar y comunicar.</p>
                <ul className="space-y-3 text-[11px] text-slate-400 flex-grow">
                  <li><i className="fa-solid fa-check text-emerald-500 mr-2"></i> PQR Interactivos</li>
                  <li><i className="fa-solid fa-check text-emerald-500 mr-2"></i> Módulo de Residentes</li>
                  <li><i className="fa-solid fa-check text-emerald-500 mr-2"></i> Módulo de Vigilantes</li>
                  <li><i className="fa-solid fa-check text-emerald-500 mr-2"></i> Personalización de Cartelera</li>
                </ul>
                <div className="mt-6 pt-4 border-t border-slate-800 text-center">
                  <span className="text-slate-500 font-bold text-xs uppercase tracking-widest">Nivel Básico</span>
                </div>
              </div>

              <div className="bg-[#05070e]/40 border border-slate-800 p-6 rounded-2xl flex flex-col">
                <h4 className="font-black text-xl text-slate-300 mb-1">Plan Pro</h4>
                <p className="text-slate-500 text-[11px] mb-6 border-b border-slate-800 pb-4">Para conjuntos con alta operatividad.</p>
                <ul className="space-y-3 text-[11px] text-slate-400 flex-grow">
                  <li className="font-bold text-slate-300"><i className="fa-solid fa-plus text-cyan-500 mr-2"></i> Todo el Plan Start</li>
                  <li><i className="fa-solid fa-check text-emerald-500 mr-2"></i> Árbitro de Reservas</li>
                  <li><i className="fa-solid fa-check text-emerald-500 mr-2"></i> Llamados de Atención Digitales</li>
                  <li><i className="fa-solid fa-check text-emerald-500 mr-2"></i> Mercado Inmobiliario Interno</li>
                  <li><i className="fa-solid fa-check text-emerald-500 mr-2"></i> Encuestas y Votaciones</li>
                </ul>
                <div className="mt-6 pt-4 border-t border-slate-800 text-center">
                  <span className="text-cyan-500 font-bold text-xs uppercase tracking-widest">Nivel Operativo</span>
                </div>
              </div>

              <div className="bg-gradient-to-b from-[#05070e] to-[#0a0f1c] border-2 border-purple-500 p-6 rounded-2xl flex flex-col relative transform md:-translate-y-4 shadow-2xl shadow-purple-500/20">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-500 text-white font-extrabold text-[9px] uppercase tracking-widest px-3 py-1 rounded-full">Recomendado</div>
                <h4 className="font-black text-2xl text-white mb-1 mt-2">Plan Master</h4>
                <p className="text-purple-500 text-[11px] font-bold mb-6 border-b border-slate-800 pb-4">Control financiero e inteligencia total.</p>
                <ul className="space-y-3 text-[11px] text-slate-300 flex-grow">
                  <li className="font-bold text-white"><i className="fa-solid fa-plus text-purple-500 mr-2"></i> Todo el Plan Pro</li>
                  <li><i className="fa-solid fa-check text-purple-500 mr-2"></i> <strong>Acceso a los 18 Módulos</strong></li>
                  <li><i className="fa-solid fa-check text-purple-500 mr-2"></i> Asignación de Parqueadero Digital</li>
                  <li><i className="fa-solid fa-check text-purple-500 mr-2"></i> Links de Pago y Correo Masivo</li>
                  <li><i className="fa-solid fa-check text-purple-500 mr-2"></i> Centro de Ayuda FAQ</li>
                </ul>
                <div className="mt-6 pt-4 border-t border-slate-800 text-center">
                  <span className="text-purple-500 font-black text-xs uppercase tracking-widest">Suite Completa 360</span>
                </div>
              </div>

            </div>
          </div>

          <div className="flex justify-between items-center border-t border-slate-800/50 pt-5 text-[11px] text-slate-500 mt-auto">
            <div>Actualiza tu plan en cualquier momento</div>
            <div className="font-bold tracking-widest">06 / 07</div>
          </div>
        </section>

        {/* =========================================================================
            SLIDE 7: SIMULADOR (Con estados de React)
        ========================================================================= */}
        <section className="slide bg-[#0a0f1c] border border-slate-800 rounded-3xl p-10 md:p-14 flex flex-col justify-between relative overflow-hidden shadow-[0_0_35px_rgba(6,182,212,0.2)] min-h-[700px]">
          <div className="flex justify-between items-center border-b border-slate-800/50 pb-5">
            <div className="flex items-center gap-2 text-cyan-500 font-bold text-xs uppercase tracking-widest">
              <i className="fa-solid fa-calculator"></i> Proyección de Inversión
            </div>
            <div className="text-slate-500 text-xs font-semibold">SIMULADOR EN TIEMPO REAL</div>
          </div>

          <div className="my-auto slide-content z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center flex-grow">
            
            {/* Controles del simulador */}
            <div className="lg:col-span-6 space-y-6">
              <div>
                <h3 className="text-3xl font-black mb-2">Simula tu Ecosistema</h3>
                <p className="text-slate-400 text-sm leading-relaxed">Ajusta las variables de tu copropiedad y descubre lo accesible que es la tecnología de alto nivel.</p>
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
                    className={`toggle-checkbox absolute block w-6 h-6 rounded-full border-4 appearance-none cursor-pointer transition-all duration-300 z-10 ${isAnual ? 'bg-cyan-500 border-cyan-500 right-0' : 'bg-white border-slate-800 right-6'}`}
                  />
                  <label htmlFor="toggle-anual" className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer transition-all duration-300 ${isAnual ? 'bg-cyan-500' : 'bg-slate-800'}`}></label>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold transition-colors ${isAnual ? 'text-white' : 'text-slate-500'}`}>Pago Anual</span>
                  <span className="bg-emerald-500 text-white text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider animate-pulse">Ahorra 20%</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className={`bg-[#05070e] border border-slate-800 p-6 rounded-2xl flex flex-col justify-center text-center transition-all duration-300 ${isAnual ? 'opacity-50' : ''}`}>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">Pago Mes a Mes</span>
                  <span className="text-3xl lg:text-4xl font-black text-white">${mrrBase.toLocaleString('es-CO')}</span>
                  <span className="text-[10px] text-slate-500 mt-2">Pesos Colombianos (Sin IVA)</span>
                </div>

                <div className={`bg-[#05070e] border border-slate-800 p-6 rounded-2xl flex flex-col justify-center text-center relative overflow-hidden transition-all duration-300 ${isAnual ? 'ring-2 ring-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.3)]' : ''}`}>
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent"></div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2 z-10 relative">Suscripción Anual</span>
                  
                  {isAnual && (
                    <span className="text-[11px] text-slate-500 line-through mb-1 z-10 relative">${arrBase.toLocaleString('es-CO')}</span>
                  )}
                  
                  <span className={`text-3xl lg:text-4xl font-black relative z-10 ${isAnual ? 'text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-cyan-500' : 'text-white'}`}>
                    ${arrConDescuento.toLocaleString('es-CO')}
                  </span>
                  
                  <span className="text-[10px] text-emerald-500 font-bold mt-2 z-10 relative">
                    {isAnual ? `¡Ahorras $${descuento.toLocaleString('es-CO')}!` : 'Inversión Total Año'}
                  </span>
                </div>
              </div>

              <div className="bg-gradient-to-r from-slate-800/30 to-[#05070e] border border-slate-800 p-5 rounded-2xl mt-4">
                <h4 className="text-xs font-black text-white uppercase tracking-wider mb-2 flex items-center gap-2"><i className="fa-solid fa-check-circle text-emerald-500"></i> La promesa Vecindaria:</h4>
                <p className="text-xs text-slate-400 leading-relaxed">Por menos de lo que cuesta un tinto al mes por apartamento, se ahorran millones en fugas, tiempo perdido y demandas por mala convivencia.</p>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center border-t border-slate-800/50 pt-5 text-[11px] text-slate-500 mt-auto">
            <div>Esquema SaaS - Pago por Uso Justo</div>
            <div className="font-bold tracking-widest">07 / 07</div>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="bg-[#030409] border-t border-slate-800 py-12 px-6 text-center no-print mt-12">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <i className="fa-solid fa-city text-white text-2xl"></i>
          </div>
          <h2 className="text-3xl font-black text-white">¿Listos para dar el salto?</h2>
          <p className="text-slate-400 text-sm max-w-xl mx-auto">
            Agendemos una demostración corporativa gratuita de 20 minutos con tu Consejo de Administración. Ver para creer.
          </p>
          
          <div className="pt-6 flex flex-col md:flex-row justify-center items-center gap-8 text-xs text-slate-400">
            <div className="flex items-center gap-2"><i className="fa-solid fa-building text-slate-600"></i> LumenGroup S.A.S</div>
            <div className="flex items-center gap-2"><i className="fa-brands fa-whatsapp text-slate-600"></i> +57 312 359 5191</div>
            <div className="flex items-center gap-2"><i className="fa-solid fa-envelope text-slate-600"></i> info@lumengroup.com.co</div>
          </div>
        </div>
      </footer>

    </div>
  );
}