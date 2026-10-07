import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  AlertTriangle,
  Send,
  Loader2,
  MapPin,
  FileText,
  Clock,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { INCIDENT_CATEGORIES, IncidentCategory, ReportPriority, CreateReportInput } from '../types/report';
import { createIncidentReport } from '../services/reportService';
import { ModalPortal } from './ModalPortal';

interface CreateReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReportCreated?: () => void;
  defaultSector?: string;
}

const COMUNA_8_SECTORS = [
  'Villa Hermosa (Centro)',
  'Sucre',
  'El Pinal',
  'Trece de Noviembre',
  'La Libertad',
  'Llanaditas',
  'San Antonio',
  'Las Estancias',
  'Villa Turbay',
  'Villatina',
  'Enciso',
  'La Ladera',
  'Los Mangos',
  'Boston',
  'Otro',
];

export const CreateReportModal: React.FC<CreateReportModalProps> = ({
  isOpen,
  onClose,
  onReportCreated,
  defaultSector,
}) => {
  const { theme, colors } = useTheme();
  const { language, t, translateCategory, translatePriority } = useLanguage();
  const isDark = theme === 'dark';

  // Form state
  const [categoria, setCategoria] = useState<IncidentCategory>('Sujeto sospechoso');
  const [titulo, setTitulo] = useState<string>('');
  const [sector, setSector] = useState<string>(defaultSector || 'Villa Hermosa (Centro)');
  const [customSector, setCustomSector] = useState<string>('');
  const [direccion, setDireccion] = useState<string>('');
  const [descripcion, setDescripcion] = useState<string>('');
  const [nivelPrioridad, setNivelPrioridad] = useState<ReportPriority>('media');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const alertContainerRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to alert messages when they appear
  useEffect(() => {
    if ((errorMsg || successMsg) && alertContainerRef.current) {
      alertContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [errorMsg, successMsg]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validation
    const cleanTitle = titulo.trim();
    if (!cleanTitle) {
      setErrorMsg(language === 'es' ? 'Ingresa un título o asunto breve para el reporte.' : 'Please enter a brief title for the report.');
      return;
    }

    if (cleanTitle.length < 4) {
      setErrorMsg(language === 'es' ? 'El título debe tener al menos 4 caracteres.' : 'Title must be at least 4 characters long.');
      return;
    }

    const finalSector = sector === 'Otro' ? (customSector.trim() || 'Comuna 8') : sector;
    const cleanDescription = descripcion.trim();
    if (!cleanDescription) {
      setErrorMsg(language === 'es' ? 'Por favor describe lo sucedido en el campo de descripción.' : 'Please describe the incident.');
      return;
    }

    setIsSubmitting(true);

    try {
      const input: CreateReportInput = {
        titulo: cleanTitle,
        categoria,
        descripcion: cleanDescription,
        sector: finalSector,
        direccion: direccion.trim(),
        nivelPrioridad,
      };

      await createIncidentReport(input);

      setSuccessMsg(
        language === 'es'
          ? '✔ Reporte enviado con éxito con estado PENDIENTE. Será revisado por un administrador antes de su publicación comunitaria.'
          : '✔ Report submitted with PENDING status. An administrator will review it before public broadcast.'
      );

      setTimeout(() => {
        setSuccessMsg(null);
        // Reset form
        setTitulo('');
        setDescripcion('');
        setDireccion('');
        setCustomSector('');
        onClose();
        if (onReportCreated) onReportCreated();
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalPortal
      isOpen={isOpen}
      onClose={onClose}
      disableClose={isSubmitting}
      maxWidthClass="max-w-2xl"
      cardClassName={
        isDark
          ? 'bg-slate-900 border-slate-700/80 text-white'
          : 'bg-white border-slate-200 text-slate-900'
      }
    >
      {/* Fixed Top Header HUD Bar */}
      <div className="shrink-0 px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-gradient-to-r from-red-600/10 via-amber-500/10 to-transparent">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-md shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <span className="text-[10px] font-mono font-bold tracking-widest text-red-600 dark:text-red-400 uppercase truncate">
                SISTEMA DE MONITOREO // COMUNA 8
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0">
                REVISIÓN ADMIN
              </span>
            </div>
            <h2 className="text-base sm:text-xl font-black font-['Rajdhani'] uppercase tracking-wide truncate">
              {language === 'es' ? 'Reportar Incidente Comunitario' : 'Report Community Incident'}
            </h2>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          aria-label={language === 'es' ? 'Cerrar ventana' : 'Close modal'}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shrink-0 disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Form Container: Scrollable Middle Body + Fixed Bottom Action Bar */}
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Scrollable Content Area */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 space-y-4">
          {/* Verification Notice Banner (Inside scrollable area right at the top so it is never cut off) */}
          <div className="p-3 sm:p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5 sm:gap-3 text-xs text-amber-800 dark:text-amber-300">
            <Clock className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
            <p className="leading-relaxed">
              <strong>{language === 'es' ? 'Política de Verificación:' : 'Verification Notice:'}</strong>{' '}
              {language === 'es'
                ? 'Por seguridad comunitaria, tu reporte se registrará con estado 🟡 PENDIENTE. No será visible en el mapa público ni en alertas generales hasta que un administrador lo verifique.'
                : 'For community safety, your report starts as 🟡 PENDING and will only be publicly broadcast once verified by an admin.'}
            </p>
          </div>

          {/* Row 1: Categoría y Nivel de Urgencia */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold font-mono uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                {language === 'es' ? '1. Categoría de Incidente *' : '1. Incident Category *'}
              </label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value as IncidentCategory)}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500/40 transition cursor-pointer ${
                  isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-800'
                }`}
              >
                {INCIDENT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {translateCategory(cat)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold font-mono uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                {language === 'es' ? '2. Nivel de Urgencia / Prioridad *' : '2. Urgency Level *'}
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['baja', 'media', 'alta', 'critica'] as ReportPriority[]).map((prio) => (
                  <button
                    key={prio}
                    type="button"
                    onClick={() => setNivelPrioridad(prio)}
                    className={`py-2 px-1 rounded-xl text-[11px] font-bold font-mono uppercase border transition cursor-pointer text-center ${
                      nivelPrioridad === prio
                        ? prio === 'critica'
                          ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                          : prio === 'alta'
                          ? 'bg-amber-500 text-black border-amber-500 shadow-sm'
                          : prio === 'media'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : isDark
                        ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                        : 'bg-slate-100 border-slate-300 text-slate-600 hover:text-slate-800'
                    }`}
                  >
                    {translatePriority(prio)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Row 2: Título o Asunto Breve */}
          <div>
            <label className="block text-xs font-bold font-mono uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              {language === 'es' ? '3. Título / Asunto Breve *' : '3. Short Title / Subject *'}
            </label>
            <div className="relative">
              <input
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder={
                  language === 'es'
                    ? 'Ej. Luminaria averiada en callejón sector Sucre'
                    : 'E.g., Broken streetlight on alley in Sucre sector'
                }
                maxLength={120}
                required
                className={`w-full pl-3.5 pr-14 py-2.5 rounded-xl border text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500/40 transition ${
                  isDark ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-800 placeholder-slate-400'
                }`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 pointer-events-none">
                {titulo.length}/120
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              {language === 'es'
                ? 'Este título se mantendrá estrictamente asociado a esta categoría y se sincronizará en tiempo real.'
                : 'This title will remain strictly synced to this report and category in real time.'}
            </p>
          </div>

          {/* Row 3: Sector de Residencia y Dirección */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold font-mono uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                {language === 'es' ? '4. Sector de la Comuna 8 *' : '4. Comuna 8 Sector *'}
              </label>
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500/40 transition cursor-pointer ${
                  isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-800'
                }`}
              >
                {COMUNA_8_SECTORS.map((sec) => (
                  <option key={sec} value={sec}>
                    {sec}
                  </option>
                ))}
              </select>

              {sector === 'Otro' && (
                <input
                  type="text"
                  value={customSector}
                  onChange={(e) => setCustomSector(e.target.value)}
                  placeholder={language === 'es' ? 'Escribe el nombre del barrio o sector' : 'Enter neighborhood name'}
                  className={`mt-2 w-full px-3.5 py-2 rounded-xl border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-500/40 ${
                    isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-800'
                  }`}
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-bold font-mono uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                {language === 'es' ? '5. Dirección o Punto de Referencia' : '5. Address / Landmark'}
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  placeholder={language === 'es' ? 'Ej. Cra 40 # 56-20 cerca a la cancha' : 'E.g., Cra 40 # 56-20 near sports field'}
                  className={`w-full pl-9 pr-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500/40 transition ${
                    isDark ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-800 placeholder-slate-400'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Row 4: Descripción Detallada */}
          <div>
            <label className="block text-xs font-bold font-mono uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              {language === 'es' ? '6. Descripción Detallada del Suceso *' : '6. Detailed Description *'}
            </label>
            <textarea
              rows={3}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder={
                language === 'es'
                  ? 'Detalla qué ocurrió, vestimenta de personas involucradas, vehículos o situación de riesgo que las autoridades y líderes deban conocer...'
                  : 'Detail what happened, description of individuals or vehicles involved, or safety risk for authorities...'
              }
              required
              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500/40 transition leading-relaxed ${
                isDark ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-800 placeholder-slate-400'
              }`}
            />
          </div>

          {/* Feedback alert positioned inside scrollable area with auto-scroll */}
          {(errorMsg || successMsg) && (
            <div ref={alertContainerRef} className="pt-1">
              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border-2 border-red-500/40 text-red-600 dark:text-red-400 text-xs sm:text-sm font-bold flex items-center gap-2.5 shadow-sm animate-in fade-in duration-150">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{errorMsg}</span>
                </div>
              )}
              {successMsg && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border-2 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm font-bold flex items-center gap-2.5 shadow-sm animate-in fade-in duration-150">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{successMsg}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Fixed Bottom Footer: Action Buttons always visible */}
        <div
          className={`shrink-0 px-4 sm:px-6 py-3.5 sm:py-4 border-t flex items-center justify-end gap-2.5 sm:gap-3 ${
            isDark
              ? 'border-slate-800 bg-slate-900/95'
              : 'border-slate-200 bg-slate-50/95'
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider border transition cursor-pointer ${
              isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-300 bg-white hover:bg-slate-100 text-slate-700'
            }`}
          >
            {language === 'es' ? 'Cancelar' : 'Cancel'}
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 sm:px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-red-950/40 transition cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{language === 'es' ? 'Enviando...' : 'Saving...'}</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>{language === 'es' ? 'Registrar Reporte' : 'Submit Report'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </ModalPortal>
  );
};
