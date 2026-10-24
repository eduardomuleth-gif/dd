import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  AlertTriangle,
  Send,
  Loader2,
  MapPin,
  Clock,
  CheckCircle2,
  Upload,
  Image as ImageIcon,
  Video,
  Trash2,
  Crosshair,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import {
  INCIDENT_CATEGORIES,
  IncidentCategory,
  ReportPriority,
  CreateReportInput,
  ReportMediaType,
} from '../types/report';
import { createIncidentReport } from '../services/reportService';
import { ModalPortal } from './ModalPortal';

interface CreateReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReportCreated?: () => void;
  onReportError?: (errorMessage: string) => void;
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
  'San Miguel',
  'La Mansión',
  'Caicedo',
  'Batallón Girardot',
  'Otro',
];

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB max before compression

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export const CreateReportModal: React.FC<CreateReportModalProps> = ({
  isOpen,
  onClose,
  onReportCreated,
  onReportError,
  defaultSector,
}) => {
  const { theme } = useTheme();
  const { language, translateCategory, translatePriority } = useLanguage();
  const isDark = theme === 'dark';

  // Form state
  const [categoria, setCategoria] = useState<IncidentCategory>('Sujeto sospechoso');
  const [titulo, setTitulo] = useState<string>('');
  const [sector, setSector] = useState<string>(defaultSector || 'Villa Hermosa (Centro)');
  const [customSector, setCustomSector] = useState<string>('');
  const [direccion, setDireccion] = useState<string>('');
  const [descripcion, setDescripcion] = useState<string>('');
  const [nivelPrioridad, setNivelPrioridad] = useState<ReportPriority>('media');

  // Real GPS location state
  const [realLocation, setRealLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Mandatory multimedia state (image or video)
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<ReportMediaType>('image');
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);

  // Submission & upload progress state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStageText, setUploadStageText] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const alertContainerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Clean up object URL on unmount or file change
  useEffect(() => {
    return () => {
      if (mediaPreviewUrl) {
        URL.revokeObjectURL(mediaPreviewUrl);
      }
    };
  }, [mediaPreviewUrl]);

  // Auto-scroll to alert messages when they appear
  useEffect(() => {
    if ((errorMsg || successMsg) && alertContainerRef.current) {
      alertContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [errorMsg, successMsg]);

  if (!isOpen) return null;

  const validateAndSelectFile = (file: File | undefined | null) => {
    setErrorMsg(null);
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      setErrorMsg(
        language === 'es'
          ? 'Formato no válido. Debes adjuntar obligatoriamente una imagen (JPG, PNG, WEBP) o un video (MP4, WEBM, MOV).'
          : 'Invalid format. Please attach a valid image (JPG, PNG, WEBP) or video (MP4, WEBM, MOV).'
      );
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setErrorMsg(
        language === 'es'
          ? 'El archivo supera el límite máximo permitido de 25 MB. Selecciona un archivo más liviano.'
          : 'File exceeds the 25 MB maximum size limit.'
      );
      return;
    }

    if (mediaPreviewUrl) {
      URL.revokeObjectURL(mediaPreviewUrl);
    }

    const preview = URL.createObjectURL(file);
    setMediaFile(file);
    setMediaPreviewUrl(preview);
    setMediaType(isVideo ? 'video' : 'image');
  };

  const handleRemoveMedia = () => {
    if (mediaPreviewUrl) {
      URL.revokeObjectURL(mediaPreviewUrl);
    }
    setMediaFile(null);
    setMediaPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDetectRealLocation = () => {
    setLocationError(null);
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationError(
        language === 'es'
          ? 'Tu navegador o dispositivo no soporta geolocalización GPS.'
          : 'Your browser or device does not support GPS geolocation.'
      );
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const coords = { lat: latitude, lng: longitude };
        setRealLocation(coords);

        // Attempt reverse geocoding to human-readable address
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&accept-language=es`,
            { headers: { 'Accept': 'application/json' } }
          );
          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            const road = addr.road || addr.pedestrian || addr.suburb || '';
            const houseNumber = addr.house_number ? `# ${addr.house_number}` : '';
            const neighbourhood = addr.neighbourhood || addr.suburb || addr.quarter || '';
            const city = addr.city || addr.town || 'Medellín';

            const formattedAddress = [road, houseNumber, neighbourhood, city]
              .filter(Boolean)
              .join(', ');

            if (formattedAddress) {
              setDireccion(formattedAddress);
            } else if (data.display_name) {
              setDireccion(data.display_name.split(',').slice(0, 3).join(','));
            } else {
              setDireccion(`GPS: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
            }

            // Auto-match Comuna 8 sector if detected
            if (neighbourhood) {
              const matchedSector = COMUNA_8_SECTORS.find((s) =>
                s.toLowerCase().includes(neighbourhood.toLowerCase()) ||
                neighbourhood.toLowerCase().includes(s.toLowerCase().split('(')[0].trim())
              );
              if (matchedSector) {
                setSector(matchedSector);
              }
            }
          } else {
            setDireccion(`GPS: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
          }
        } catch {
          setDireccion(`GPS: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        setIsLocating(false);
        let msg = language === 'es' ? 'No se pudo obtener la ubicación GPS.' : 'Could not get GPS location.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = language === 'es'
            ? 'Permiso de ubicación denegado. Permite el acceso a la ubicación en tu navegador.'
            : 'Location permission denied. Please allow location access in your browser.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = language === 'es'
            ? 'Señal de ubicación no disponible en este momento.'
            : 'Location signal unavailable.';
        } else if (error.code === error.TIMEOUT) {
          msg = language === 'es'
            ? 'Tiempo de espera agotado al consultar ubicación GPS.'
            : 'GPS location request timed out.';
        }
        setLocationError(msg);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  };

  const isFormValid =
    titulo.trim().length >= 4 &&
    descripcion.trim().length > 0 &&
    Boolean(mediaFile);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanTitle = titulo.trim();
    if (!cleanTitle || cleanTitle.length < 4) {
      setErrorMsg(
        language === 'es'
          ? 'El título debe tener al menos 4 caracteres.'
          : 'Title must be at least 4 characters long.'
      );
      return;
    }

    const finalSector = sector === 'Otro' ? customSector.trim() || 'Comuna 8' : sector;
    const cleanDescription = descripcion.trim();
    if (!cleanDescription) {
      setErrorMsg(
        language === 'es'
          ? 'Por favor describe lo sucedido en el campo de descripción.'
          : 'Please describe the incident.'
      );
      return;
    }

    // Mandatory multimedia validation
    if (!mediaFile) {
      setErrorMsg(
        language === 'es'
          ? 'Es obligatorio adjuntar una imagen o video de evidencia del suceso para enviar el reporte.'
          : 'Attaching an evidence image or video is mandatory to submit the report.'
      );
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(10);
    setUploadStageText(
      language === 'es' ? 'Procesando evidencia del suceso...' : 'Processing incident evidence...'
    );

    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

    try {
      const input: CreateReportInput = {
        titulo: cleanTitle,
        categoria,
        descripcion: cleanDescription,
        sector: finalSector,
        direccion: direccion.trim(),
        ubicacion: realLocation || undefined,
        nivelPrioridad,
        estadoInicial: 'pendiente',
        mediaFile,
        mediaType,
        mediaName: mediaFile.name,
      };

      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(
            new Error(
              language === 'es'
                ? 'El tiempo de espera de conexión se agotó al procesar el reporte. Por favor intenta nuevamente.'
                : 'Connection timed out while processing the report. Please try again.'
            )
          );
        }, 4500);
      });

      await Promise.race([
        createIncidentReport(input, (pct, stage) => {
          setUploadProgress(pct);
          setUploadStageText(stage);
        }),
        timeoutPromise,
      ]);

      if (timeoutHandle) clearTimeout(timeoutHandle);

      setUploadProgress(100);
      setSuccessMsg(
        language === 'es'
          ? '✔ Reporte y evidencia del suceso registrados exitosamente.'
          : '✔ Report and incident evidence submitted successfully.'
      );

      setTitulo('');
      setDescripcion('');
      setDireccion('');
      setCustomSector('');
      setRealLocation(null);
      setLocationError(null);
      handleRemoveMedia();
      setUploadProgress(0);
      setUploadStageText('');

      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
        if (onReportCreated) onReportCreated();
      }, 450);
    } catch (err: unknown) {
      if (timeoutHandle) clearTimeout(timeoutHandle);
      const rawMsg = err instanceof Error ? err.message : String(err);
      const cleanError =
        rawMsg.toLowerCase().includes('permission') || rawMsg.toLowerCase().includes('insufficient')
          ? language === 'es'
            ? 'No tienes permisos suficientes para completar esta operación.'
            : 'You do not have sufficient permissions to complete this action.'
          : rawMsg ||
            (language === 'es'
              ? 'No fue posible procesar el reporte en este momento.'
              : 'Could not process the report at this time.');

      setUploadProgress(0);
      setUploadStageText('');
      setIsSubmitting(false);

      if (onReportError) {
        onClose();
        onReportError(cleanError);
      } else {
        setErrorMsg(cleanError);
      }
    } finally {
      if (timeoutHandle) clearTimeout(timeoutHandle);
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
              <span className="text-slate-400">·</span>
              <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400 uppercase">
                EVIDENCIA DEL SUCESO
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

      {/* Form Container */}
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Scrollable Content Area */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 space-y-4">
          {/* Incident Evidence Notice Banner */}
          <div className="p-3 sm:p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
            <Clock className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
            <p className="leading-relaxed">
              <strong>{language === 'es' ? 'Evidencia del Suceso:' : 'Incident Evidence:'}</strong>{' '}
              {language === 'es'
                ? 'Adjunta una fotografía o video del suceso para registrar tu reporte comunitario.'
                : 'Attach a photo or video of the event to register your community report.'}
            </p>
          </div>

          {/* Row 1: Categoría y Nivel de Urgencia */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="report-category-select"
                className="block text-xs font-bold font-mono uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
              >
                {language === 'es' ? '1. Categoría de Incidente *' : '1. Incident Category *'}
              </label>
              <select
                id="report-category-select"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value as IncidentCategory)}
                className={`w-full min-h-[42px] px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500/40 transition cursor-pointer ${
                  isDark
                    ? 'bg-slate-800 border-slate-700 text-slate-100'
                    : 'bg-slate-50 border-slate-300 text-slate-800'
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
              <span
                id="report-priority-group-label"
                className="block text-xs font-bold font-mono uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
              >
                {language === 'es' ? '2. Nivel de Urgencia / Gravedad *' : '2. Urgency / Severity *'}
              </span>
              <div
                role="radiogroup"
                aria-labelledby="report-priority-group-label"
                className="grid grid-cols-2 min-[400px]:grid-cols-4 gap-1.5"
              >
                {(['baja', 'media', 'alta', 'critica'] as ReportPriority[]).map((prio) => (
                  <button
                    key={prio}
                    type="button"
                    role="radio"
                    aria-checked={nivelPrioridad === prio}
                    onClick={() => setNivelPrioridad(prio)}
                    className={`min-h-[38px] py-2 px-2 rounded-xl text-xs font-bold font-mono uppercase border transition cursor-pointer text-center truncate ${
                      nivelPrioridad === prio
                        ? prio === 'critica'
                          ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                          : prio === 'alta'
                          ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
                          : prio === 'media'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : isDark
                        ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                        : 'bg-slate-100 border-slate-300 text-slate-700 hover:text-slate-900'
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
            <label
              htmlFor="report-title-input"
              className="block text-xs font-bold font-mono uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
            >
              {language === 'es' ? '3. Título / Asunto Breve *' : '3. Short Title / Subject *'}
            </label>
            <div className="relative">
              <input
                id="report-title-input"
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
                className={`w-full min-h-[42px] pl-3.5 pr-14 py-2.5 rounded-xl border text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500/40 transition ${
                  isDark
                    ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-400'
                    : 'bg-slate-50 border-slate-300 text-slate-800 placeholder-slate-500'
                }`}
              />
              <span
                aria-hidden="true"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500 dark:text-slate-400 pointer-events-none"
              >
                {titulo.length}/120
              </span>
            </div>
          </div>

          {/* Row 3: Sector de la Comuna 8 y Dirección */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="report-sector-select"
                className="block text-xs font-bold font-mono uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
              >
                {language === 'es' ? '4. Sector de la Comuna 8 *' : '4. Comuna 8 Sector *'}
              </label>
              <select
                id="report-sector-select"
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className={`w-full min-h-[42px] px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500/40 transition cursor-pointer ${
                  isDark
                    ? 'bg-slate-800 border-slate-700 text-slate-100'
                    : 'bg-slate-50 border-slate-300 text-slate-800'
                }`}
              >
                {COMUNA_8_SECTORS.map((sec) => (
                  <option key={sec} value={sec}>
                    {sec}
                  </option>
                ))}
              </select>

              {sector === 'Otro' && (
                <div className="mt-2">
                  <input
                    id="report-custom-sector-input"
                    type="text"
                    value={customSector}
                    onChange={(e) => setCustomSector(e.target.value)}
                    placeholder={
                      language === 'es'
                        ? 'Escribe el nombre del barrio o sector'
                        : 'Enter neighborhood name'
                    }
                    className={`w-full min-h-[40px] px-3.5 py-2 rounded-xl border text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500/40 ${
                      isDark
                        ? 'bg-slate-800 border-slate-700 text-slate-100'
                        : 'bg-slate-50 border-slate-300 text-slate-800'
                    }`}
                  />
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                <label
                  htmlFor="report-address-input"
                  className="block text-xs font-bold font-mono uppercase tracking-wider text-slate-700 dark:text-slate-300"
                >
                  {language === 'es' ? '5. Dirección o Punto de Referencia' : '5. Address / Landmark'}
                </label>

                {/* Opción de Ubicación Real arribita del campo */}
                <button
                  type="button"
                  onClick={handleDetectRealLocation}
                  disabled={isLocating}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all cursor-pointer active:scale-95 disabled:opacity-60"
                  title={language === 'es' ? 'Detectar mi ubicación real actual por GPS' : 'Detect my real current location via GPS'}
                >
                  {isLocating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Crosshair className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  )}
                  <span>
                    {isLocating
                      ? (language === 'es' ? 'Detectando GPS...' : 'Locating GPS...')
                      : (language === 'es' ? '📍 Ubicación Real' : '📍 Real Location')}
                  </span>
                </button>
              </div>

              <div className="relative">
                <MapPin
                  className="w-4 h-4 text-slate-500 dark:text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="report-address-input"
                  type="text"
                  value={direccion}
                  onChange={(e) => {
                    setDireccion(e.target.value);
                    if (realLocation && !e.target.value) {
                      setRealLocation(null);
                    }
                  }}
                  placeholder={
                    language === 'es'
                      ? 'Ej. Cra 40 # 56-20 cerca a la cancha'
                      : 'E.g., Cra 40 # 56-20 near sports field'
                  }
                  className={`w-full min-h-[42px] pl-9 pr-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500/40 transition ${
                    isDark
                      ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-400'
                      : 'bg-slate-50 border-slate-300 text-slate-800 placeholder-slate-500'
                  }`}
                />
              </div>

              {/* Indicador de Ubicación Real detectada */}
              {realLocation && (
                <div className="mt-1.5 flex items-center justify-between text-[11px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>
                      {language === 'es'
                        ? `GPS fijado: ${realLocation.lat.toFixed(5)}, ${realLocation.lng.toFixed(5)}`
                        : `GPS locked: ${realLocation.lat.toFixed(5)}, ${realLocation.lng.toFixed(5)}`}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setRealLocation(null);
                      setDireccion('');
                    }}
                    className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 underline cursor-pointer text-[10px]"
                  >
                    {language === 'es' ? 'Quitar' : 'Clear'}
                  </button>
                </div>
              )}

              {locationError && (
                <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400 font-mono">
                  {locationError}
                </p>
              )}
            </div>
          </div>

          {/* Row 4: Descripción Detallada */}
          <div>
            <label
              htmlFor="report-description-textarea"
              className="block text-xs font-bold font-mono uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
            >
              {language === 'es' ? '6. Descripción Detallada del Suceso *' : '6. Detailed Description *'}
            </label>
            <textarea
              id="report-description-textarea"
              rows={3}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder={
                language === 'es'
                  ? 'Detalla qué ocurrió, vestimenta de personas involucradas, vehículos o situación de riesgo...'
                  : 'Detail what happened, description of individuals or vehicles involved...'
              }
              required
              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500/40 transition leading-relaxed ${
                isDark
                  ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-400'
                  : 'bg-slate-50 border-slate-300 text-slate-800 placeholder-slate-500'
              }`}
            />
          </div>

          {/* Row 5: MANDATORY MULTIMEDIA ATTACHMENT (Imagen o Video) */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label
                htmlFor="report-media-file-input"
                className="block text-xs font-bold font-mono uppercase tracking-wider text-slate-700 dark:text-slate-300"
              >
                {language === 'es'
                  ? '7. Evidencia del Suceso (Imagen o Video) *'
                  : '7. Incident Evidence (Image or Video) *'}
              </label>
              <span
                className={`text-[11px] font-mono font-bold ${
                  mediaFile
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {mediaFile
                  ? language === 'es'
                    ? '✔ Archivo adjunto'
                    : '✔ File attached'
                  : language === 'es'
                  ? '* Requerido para enviar'
                  : '* Required to submit'}
              </span>
            </div>

            <input
              ref={fileInputRef}
              id="report-media-file-input"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
              onChange={(e) => validateAndSelectFile(e.target.files?.[0])}
              className="sr-only"
            />

            {!mediaFile ? (
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingOver(true);
                }}
                onDragLeave={() => setIsDraggingOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingOver(false);
                  validateAndSelectFile(e.dataTransfer.files?.[0]);
                }}
                className={`w-full p-5 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-2 ${
                  isDraggingOver
                    ? 'border-red-500 bg-red-500/10'
                    : isDark
                    ? 'border-slate-700 hover:border-red-500/60 bg-slate-800/50 hover:bg-slate-800'
                    : 'border-slate-300 hover:border-red-500/60 bg-slate-50 hover:bg-slate-100/70'
                }`}
              >
                <div className="w-11 h-11 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-500 flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">
                    {language === 'es'
                      ? 'Haz clic aquí o arrastra una fotografía o video del incidente'
                      : 'Click here or drag & drop a photo or video of the incident'}
                  </p>
                  <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                    {language === 'es'
                      ? 'Soporta JPG, PNG, WEBP, MP4, WEBM (Compresión automática rápida)'
                      : 'Supports JPG, PNG, WEBP, MP4, WEBM (Automatic fast client compression)'}
                  </p>
                </div>
              </div>
            ) : (
              <div
                className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-3 ${
                  isDark
                    ? 'bg-slate-800/90 border-emerald-500/40'
                    : 'bg-emerald-50/60 border-emerald-300'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
                  {mediaPreviewUrl && mediaType === 'image' ? (
                    <img
                      src={mediaPreviewUrl}
                      alt="Vista previa de evidencia"
                      className="w-16 h-16 rounded-xl object-cover border border-emerald-500/40 shrink-0"
                    />
                  ) : mediaPreviewUrl && mediaType === 'video' ? (
                    <video
                      src={mediaPreviewUrl}
                      className="w-20 h-16 rounded-xl object-cover border border-emerald-500/40 shrink-0 bg-black"
                      muted
                      playsInline
                    />
                  ) : null}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                      {mediaType === 'video' ? (
                        <Video className="w-3.5 h-3.5 shrink-0" />
                      ) : (
                        <ImageIcon className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span className="truncate">{mediaFile.name}</span>
                    </div>
                    <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                      {formatBytes(mediaFile.size)} ·{' '}
                      {mediaType === 'image'
                        ? language === 'es'
                          ? 'Optimización inteligente lista'
                          : 'Smart compression ready'
                        : language === 'es'
                        ? 'Video verificado'
                        : 'Verified video'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSubmitting}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition cursor-pointer"
                  >
                    {language === 'es' ? 'Cambiar' : 'Change'}
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveMedia}
                    disabled={isSubmitting}
                    className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-500/15 transition cursor-pointer"
                    title={language === 'es' ? 'Quitar archivo' : 'Remove file'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Upload & Compression Progress Indicator */}
          {isSubmitting && (
            <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/40 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono font-bold text-cyan-600 dark:text-cyan-300">
                <span className="flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                  <span>{uploadStageText || 'Procesando reporte...'}</span>
                </span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Feedback alert positioned inside scrollable area with auto-scroll */}
          {(errorMsg || successMsg) && (
            <div ref={alertContainerRef} className="pt-1">
              {errorMsg && (
                <div
                  role="alert"
                  className="p-3.5 rounded-xl bg-red-500/10 border-2 border-red-500/40 text-red-700 dark:text-red-300 text-xs sm:text-sm font-bold flex items-center gap-2.5 shadow-xs animate-in fade-in duration-150"
                >
                  <AlertTriangle
                    className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400"
                    aria-hidden="true"
                  />
                  <span>{errorMsg}</span>
                </div>
              )}
              {successMsg && (
                <div
                  role="status"
                  aria-live="polite"
                  className="p-3.5 rounded-xl bg-emerald-500/10 border-2 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm font-bold flex items-center gap-2.5 shadow-xs animate-in fade-in duration-150"
                >
                  <CheckCircle2
                    className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                    aria-hidden="true"
                  />
                  <span>{successMsg}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Fixed Bottom Footer: Action Buttons always visible */}
        <div
          className={`shrink-0 px-4 sm:px-6 py-3.5 sm:py-4 border-t flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 ${
            isDark
              ? 'border-slate-800 bg-slate-900/95'
              : 'border-slate-200 bg-slate-50/95'
          }`}
        >
          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
            {!mediaFile
              ? language === 'es'
                ? '⚠️ Adjunta una imagen o video para habilitar el envío'
                : '⚠️ Attach an image or video to enable submission'
              : language === 'es'
              ? '✔ Evidencia lista para envío seguro'
              : '✔ Evidence ready for secure submission'}
          </span>

          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className={`min-h-[42px] px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider border transition cursor-pointer ${
                isDark
                  ? 'border-slate-700 hover:bg-slate-800 text-slate-300'
                  : 'border-slate-300 bg-white hover:bg-slate-100 text-slate-700'
              }`}
            >
              {language === 'es' ? 'Cancelar' : 'Cancel'}
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !isFormValid}
              title={
                !mediaFile
                  ? language === 'es'
                    ? 'Debes adjuntar una imagen o video obligatorio'
                    : 'You must attach an image or video'
                  : undefined
              }
              className="min-h-[42px] px-5 sm:px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  <span>
                    {language === 'es'
                      ? `Enviando (${uploadProgress}%)...`
                      : `Uploading (${uploadProgress}%)...`}
                  </span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{language === 'es' ? 'Enviar Reporte' : 'Submit Report'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </ModalPortal>
  );
};
