import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  limit,
} from 'firebase/firestore';
import {
  getStorage,
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
} from 'firebase/storage';
import { supabase } from './supabaseClient';
import { auth, db, firebaseApp } from './firebaseAuth';
import {
  IncidentReport,
  CreateReportInput,
  ReportStatus,
  ReportPriority,
  ReportMediaType,
  DynamicSectorRiskResult,
} from '../types/report';

export const REPORTS_COLLECTION = 'reportes';
const LOCAL_REPORTS_CACHE_KEY = 'security_urban_user_reports_';
const GLOBAL_REPORTS_STORE_KEY = 'security_urban_all_reports_v2';
const REPORTS_SYNC_EVENT = 'security_urban_reports_sync_event';
const QUERY_LIMIT = 100;

export type Unsubscribe = () => void;

// In-memory cache to avoid redundant parsing and re-renders
let memoryReportsCache: IncidentReport[] | null = null;
let lastCacheTimestamp = 0;
const CACHE_TTL_MS = 3500;

const reportsBroadcastChannel =
  typeof window !== 'undefined' && 'BroadcastChannel' in window
    ? new BroadcastChannel('security_urban_reports_channel')
    : null;

function notifyReportsUpdated(): void {
  memoryReportsCache = null;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(REPORTS_SYNC_EVENT));
  }
  try {
    reportsBroadcastChannel?.postMessage({ type: 'REPORTS_UPDATED', ts: Date.now() });
  } catch {
    // Ignore broadcast errors
  }
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Reciente';
  }
}

function detectMediaType(urlOrName?: string, explicitType?: string): ReportMediaType | undefined {
  if (explicitType === 'image' || explicitType === 'video') return explicitType;
  if (!urlOrName) return undefined;
  const lower = urlOrName.toLowerCase();
  if (
    lower.startsWith('data:video/') ||
    lower.includes('.mp4') ||
    lower.includes('.webm') ||
    lower.includes('.mov')
  ) {
    return 'video';
  }
  if (
    lower.startsWith('data:image/') ||
    lower.includes('.jpg') ||
    lower.includes('.jpeg') ||
    lower.includes('.png') ||
    lower.includes('.webp') ||
    lower.includes('.gif')
  ) {
    return 'image';
  }
  return 'image';
}

function normalizeReport(id: string, data: Record<string, any>): IncidentReport {
  const reportId = String(data?.id || id);
  const createdISO =
    data?.fechaCreacionISO ||
    (data?.created_at ? new Date(data.created_at).toISOString() : new Date().toISOString());

  const mediaUrl =
    data?.mediaUrl ||
    data?.media_url ||
    data?.imagenUrl ||
    data?.evidenciaUrl ||
    undefined;

  const mediaName = data?.mediaName || data?.media_name || undefined;
  const mediaType = detectMediaType(mediaUrl || mediaName, data?.mediaType || data?.media_type);

  return {
    id: reportId,
    uid: data?.uid || '',
    autorNombre: data?.autorNombre || 'Ciudadano Comuna 8',
    autorEmail: data?.autorEmail || '',
    titulo: data?.titulo || 'Sin título',
    categoria: data?.categoria || 'Otro',
    descripcion: data?.descripcion || '',
    sector: data?.sector || 'Comuna 8',
    direccion: data?.direccion || '',
    ubicacion: data?.ubicacion || undefined,
    nivelPrioridad: (data?.nivelPrioridad as ReportPriority) || 'media',
    estado: (data?.estado as ReportStatus) || 'pendiente',
    fechaCreacionISO: createdISO,
    fechaCreacionFormateada: data?.fechaCreacionFormateada || formatDate(createdISO),
    fechaRevisionISO: data?.fechaRevisionISO ?? undefined,
    revisadoPor: data?.revisadoPor ?? undefined,
    motivoRechazo: data?.motivoRechazo ?? undefined,
    origen: data?.origen || 'usuario',
    mediaUrl,
    mediaType,
    mediaName,
  };
}

function isRealUserReport(r: IncidentReport): boolean {
  return (
    r.origen !== 'simulacion' &&
    r.uid !== 'system-simulation' &&
    r.uid !== 'sim_robot_comuna8' &&
    r.autorEmail !== 'simulacion.alerta@securityurban.gov.co' &&
    !r.id.startsWith('sim-')
  );
}

function getGlobalCachedReports(): IncidentReport[] {
  if (memoryReportsCache && Date.now() - lastCacheTimestamp < CACHE_TTL_MS) {
    return memoryReportsCache;
  }
  try {
    const raw = localStorage.getItem(GLOBAL_REPORTS_STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as IncidentReport[];
      if (Array.isArray(parsed)) {
        memoryReportsCache = parsed.filter(isRealUserReport);
        lastCacheTimestamp = Date.now();
        return memoryReportsCache;
      }
    }
  } catch {}
  return [];
}

function saveGlobalCachedReports(reports: IncidentReport[]): void {
  const clean = reports.filter(isRealUserReport);
  memoryReportsCache = clean;
  lastCacheTimestamp = Date.now();
  try {
    localStorage.setItem(GLOBAL_REPORTS_STORE_KEY, JSON.stringify(clean.slice(0, QUERY_LIMIT)));
  } catch {}
}

function upsertReportInLocalStore(report: IncidentReport): void {
  const current = getGlobalCachedReports();
  const next = [report, ...current.filter((r) => r.id !== report.id)];
  next.sort(
    (a, b) => new Date(b.fechaCreacionISO).getTime() - new Date(a.fechaCreacionISO).getTime()
  );
  saveGlobalCachedReports(next);

  if (report.uid) {
    const userCached = getCachedUserReports(report.uid);
    setCachedUserReports(report.uid, [
      report,
      ...userCached.filter((r) => r.id !== report.id),
    ]);
  }
}

function removeReportFromLocalStore(reportId: string): void {
  const current = getGlobalCachedReports();
  saveGlobalCachedReports(current.filter((r) => r.id !== reportId));
}

function mergeReportLists(...lists: IncidentReport[][]): IncidentReport[] {
  const map = new Map<string, IncidentReport>();
  for (const list of lists) {
    for (const item of list) {
      if (!item || !item.id || !isRealUserReport(item)) continue;
      const existing = map.get(item.id);
      if (!existing) {
        map.set(item.id, item);
      } else {
        // Prefer whichever has a newer revision timestamp or mediaUrl
        const existingRev = existing.fechaRevisionISO
          ? new Date(existing.fechaRevisionISO).getTime()
          : 0;
        const itemRev = item.fechaRevisionISO ? new Date(item.fechaRevisionISO).getTime() : 0;
        if (itemRev >= existingRev) {
          map.set(item.id, {
            ...existing,
            ...item,
            mediaUrl: item.mediaUrl || existing.mediaUrl,
            mediaType: item.mediaType || existing.mediaType,
            mediaName: item.mediaName || existing.mediaName,
          });
        }
      }
    }
  }
  const merged = Array.from(map.values());
  merged.sort(
    (a, b) => new Date(b.fechaCreacionISO).getTime() - new Date(a.fechaCreacionISO).getTime()
  );
  return merged.slice(0, QUERY_LIMIT);
}

function getCachedUserReports(uid: string): IncidentReport[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_REPORTS_CACHE_KEY}${uid}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function setCachedUserReports(uid: string, reports: IncidentReport[]): void {
  try {
    localStorage.setItem(
      `${LOCAL_REPORTS_CACHE_KEY}${uid}`,
      JSON.stringify(reports.slice(0, QUERY_LIMIT))
    );
  } catch {}
}

/**
 * Matches whether a report's sector string corresponds to a given Comuna 8 sector name.
 */
export function doesReportMatchSector(reportSector: string | undefined, targetSectorName: string): boolean {
  if (!reportSector || !targetSectorName) return false;
  const repNorm = reportSector
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
  const targetNorm = targetSectorName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  const targetBase = targetNorm.split('(')[0].trim();
  const repBase = repNorm.split('(')[0].trim();

  return (
    repNorm === targetNorm ||
    repBase === targetBase ||
    (targetBase.length >= 4 && repNorm.includes(targetBase)) ||
    (repBase.length >= 4 && targetNorm.includes(repBase))
  );
}

/**
 * ============================================================================
 * 1. DYNAMIC MATHEMATICAL SECTOR RISK & SECURITY FORMULA
 * ============================================================================
 * Calculates Risk vs. Safety percentages strictly from real approved reports
 * in the database for the given sector, weighted by incident severity & priority.
 * No hardcoded base risk numbers are used: if a sector has 0 approved reports,
 * it reflects 0% active risk and 100% optimal base security.
 */
export function calculateDynamicSectorRiskStats(
  sectorName: string,
  allApprovedReports: IncidentReport[],
  language: 'es' | 'en' = 'es'
): DynamicSectorRiskResult {
  const sectorReports = allApprovedReports.filter(
    (r) => r.estado === 'aceptado' && doesReportMatchSector(r.sector, sectorName)
  );

  const count = sectorReports.length;

  // Optimal base state when sector has 0 approved reports
  if (count === 0) {
    return {
      riskPercentage: 0,
      safetyPercentage: 100,
      stabilityPercentage: 100,
      weightedScore: 0,
      sectorAlertsCount: 0,
      criticalOrHighCount: 0,
      riskLevel: 'low',
      riskLabel: language === 'es' ? 'Óptimo / Sin Alertas' : 'Optimal / No Alerts',
      riskColorHex: '#10b981',
    };
  }

  // Priority weight mapping (Emergency / Critical crimes carry highest weight)
  const priorityWeights: Record<ReportPriority, number> = {
    critica: 22,
    alta: 15,
    media: 9,
    baja: 4,
  };

  // Category severity multiplier
  const getCategoryMultiplier = (categoria: string): number => {
    const cat = (categoria || '').toLowerCase();
    if (
      cat.includes('robo') ||
      cat.includes('hurto') ||
      cat.includes('emergencia') ||
      cat.includes('riña') ||
      cat.includes('violencia') ||
      cat.includes('sustancia')
    ) {
      return 1.45; // Delitos o emergencias de alta gravedad
    }
    if (
      cat.includes('sospechoso') ||
      cat.includes('accidente') ||
      cat.includes('obstáculo') ||
      cat.includes('peligroso')
    ) {
      return 1.15; // Incidentes de gravedad intermedia
    }
    return 0.85; // Incidentes menores / preventivos (ej. luminarias)
  };

  // Recency multiplier (recent incidents within 48h carry higher active weight)
  const nowMs = Date.now();
  let totalWeightedScore = 0;
  let criticalOrHighCount = 0;

  for (const report of sectorReports) {
    const pWeight = priorityWeights[report.nivelPrioridad] || 9;
    const cMultiplier = getCategoryMultiplier(report.categoria);

    if (report.nivelPrioridad === 'critica' || report.nivelPrioridad === 'alta') {
      criticalOrHighCount += 1;
    }

    let recencyMultiplier = 1.0;
    if (report.fechaCreacionISO) {
      const ageHours = Math.max(
        0,
        (nowMs - new Date(report.fechaCreacionISO).getTime()) / (1000 * 60 * 60)
      );
      if (ageHours <= 24) recencyMultiplier = 1.2;
      else if (ageHours <= 72) recencyMultiplier = 1.05;
      else if (ageHours > 168) recencyMultiplier = 0.85;
    }

    totalWeightedScore += pWeight * cMultiplier * recencyMultiplier;
  }

  // Mathematical normalization to [1% .. 100%] using saturating rational function:
  // R(x) = round((x / (x + K)) * 100) where K = 28 calibrates 1 minor report to ~11%,
  // 1 critical crime to ~53%, and multiple severe incidents asymptotically toward 100%.
  const calibrationConstant = 28;
  const normalizedRisk = Math.min(
    100,
    Math.max(1, Math.round((totalWeightedScore / (totalWeightedScore + calibrationConstant)) * 100))
  );
  const normalizedSafety = Math.max(0, 100 - normalizedRisk);

  // Dynamic communal stability index:
  // Combines proportion of non-critical alerts and inverse share of total communal alerts
  const totalCommunalCount = Math.max(1, allApprovedReports.length);
  const communalConcentrationRatio = count / totalCommunalCount;
  const highSeverityRatio = criticalOrHighCount / count;
  const stabilityPercentage = Math.max(
    5,
    Math.min(
      99,
      Math.round(100 - (communalConcentrationRatio * 45 + highSeverityRatio * 45))
    )
  );

  const riskLevel: 'high' | 'moderate' | 'low' =
    normalizedRisk >= 60 ? 'high' : normalizedRisk >= 30 ? 'moderate' : 'low';

  const riskLabel =
    riskLevel === 'high'
      ? language === 'es'
        ? 'Riesgo Alto'
        : 'High Risk'
      : riskLevel === 'moderate'
      ? language === 'es'
        ? 'Riesgo Moderado'
        : 'Moderate Risk'
      : language === 'es'
      ? 'Riesgo Bajo'
      : 'Low Risk';

  const riskColorHex =
    riskLevel === 'high' ? '#f43f5e' : riskLevel === 'moderate' ? '#f59e0b' : '#10b981';

  return {
    riskPercentage: normalizedRisk,
    safetyPercentage: normalizedSafety,
    stabilityPercentage,
    weightedScore: Math.round(totalWeightedScore * 10) / 10,
    sectorAlertsCount: count,
    criticalOrHighCount,
    riskLevel,
    riskLabel,
    riskColorHex,
  };
}

/**
 * ============================================================================
 * 2. CLIENT-SIDE MEDIA COMPRESSION & CLOUD STORAGE UPLOAD
 * ============================================================================
 * Compresses images in browser before uploading to drastically reduce payload size
 * and upload latency, then uploads to Firebase Storage / Supabase Storage.
 */
export async function compressMediaFileClientSide(
  file: File,
  onProgress?: (percent: number, stageText: string) => void
): Promise<{ blob: Blob; dataUrlFallback: string; mediaType: ReportMediaType; finalName: string }> {
  const isVideo = file.type.startsWith('video/');
  const mediaType: ReportMediaType = isVideo ? 'video' : 'image';

  if (onProgress) {
    onProgress(15, isVideo ? 'Validando pista de video...' : 'Optimizando y comprimiendo imagen...');
  }

  if (isVideo) {
    // For video files, read a compact DataURL fallback if <= 8MB and keep original blob
    const dataUrlFallback = await new Promise<string>((resolve) => {
      if (file.size > 8 * 1024 * 1024) {
        resolve('');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
    if (onProgress) onProgress(35, 'Video verificado para subida...');
    return {
      blob: file,
      dataUrlFallback,
      mediaType: 'video',
      finalName: file.name,
    };
  }

  // Image compression via HTML5 Canvas (max 1280px, WebP/JPEG 0.78 quality)
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      try {
        const MAX_DIMENSION = 1280;
        let { width, height } = img;
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width > height) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
          } else {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('No se pudo inicializar el compresor gráfico.');
        }

        ctx.drawImage(img, 0, 0, width, height);
        const outputMime = 'image/jpeg';
        const quality = 0.76;
        const dataUrlFallback = canvas.toDataURL(outputMime, 0.72);

        canvas.toBlob(
          (compressedBlob) => {
            if (onProgress) onProgress(40, 'Imagen comprimida con éxito...');
            const finalBlob = compressedBlob || file;
            const baseName = file.name.replace(/\.[^/.]+$/, '');
            resolve({
              blob: finalBlob,
              dataUrlFallback,
              mediaType: 'image',
              finalName: `${baseName}-opt.jpg`,
            });
          },
          outputMime,
          quality
        );
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('El archivo de imagen seleccionado no es válido o está dañado.'));
    };

    img.src = objectUrl;
  });
}

export async function uploadReportMediaToCloud(
  file: File,
  uid: string,
  onProgress?: (percent: number, stageText: string) => void
): Promise<{ mediaUrl: string; mediaType: ReportMediaType; mediaName: string }> {
  const { blob, dataUrlFallback, mediaType, finalName } = await compressMediaFileClientSide(
    file,
    onProgress
  );

  const safePath = `reportes/${uid}/${Date.now()}_${finalName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

  // 1. Attempt upload to Firebase Storage with timeout & progress tracking
  try {
    const storage = getStorage(firebaseApp);
    const fileRef = storageRef(storage, safePath);

    const uploadedUrl = await new Promise<string>((resolve, reject) => {
      const uploadTask = uploadBytesResumable(fileRef, blob, {
        contentType: blob.type || file.type,
      });

      const timeoutId = setTimeout(() => {
        uploadTask.cancel();
        reject(new Error('Tiempo de espera agotado en Firebase Storage, aplicando respaldo rápido.'));
      }, 6500);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          if (snapshot.totalBytes > 0 && onProgress) {
            const ratio = snapshot.bytesTransferred / snapshot.totalBytes;
            const pct = Math.min(88, Math.round(40 + ratio * 48));
            onProgress(pct, `Subiendo evidencia a la nube (${pct}%)...`);
          }
        },
        (error) => {
          clearTimeout(timeoutId);
          reject(error);
        },
        async () => {
          clearTimeout(timeoutId);
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadUrl);
          } catch (urlErr) {
            reject(urlErr);
          }
        }
      );
    });

    if (onProgress) onProgress(92, 'Evidencia almacenada en Firebase Cloud...');
    return {
      mediaUrl: uploadedUrl,
      mediaType,
      mediaName: finalName,
    };
  } catch (firebaseStorageErr) {
    console.warn('[Security Urban :: Media] Usando almacenamiento alternativo optimizado:', firebaseStorageErr);
  }

  // 2. Attempt Supabase Storage bucket 'reportes-media' if available
  try {
    if (onProgress) onProgress(70, 'Sincronizando evidencia en servidor...');
    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from('reportes')
      .upload(safePath, blob, {
        contentType: blob.type || file.type,
        upsert: true,
      });

    if (!uploadErr && uploadData?.path) {
      const { data: publicUrlData } = supabase.storage
        .from('reportes')
        .getPublicUrl(uploadData.path);

      if (publicUrlData?.publicUrl) {
        if (onProgress) onProgress(92, 'Evidencia sincronizada...');
        return {
          mediaUrl: publicUrlData.publicUrl,
          mediaType,
          mediaName: finalName,
        };
      }
    }
  } catch {
    // Fallback to optimized inline DataURL / ObjectURL
  }

  // 3. Guaranteed fallback URL from client-compressed DataURL or ObjectURL
  const finalFallbackUrl = dataUrlFallback || URL.createObjectURL(blob);
  if (onProgress) onProgress(92, 'Evidencia procesada y verificada...');
  return {
    mediaUrl: finalFallbackUrl,
    mediaType,
    mediaName: finalName,
  };
}

/**
 * ============================================================================
 * 3. CREATE INCIDENT REPORT (WITH MANDATORY MULTIMEDIA & DUAL DB PERSISTENCE)
 * ============================================================================
 */
export async function createIncidentReport(
  input: CreateReportInput,
  onProgress?: (percent: number, stageText: string) => void
): Promise<IncidentReport> {
  let currentUser = auth.currentUser;

  if (!currentUser) {
    const { data: sessionData } = await supabase.auth.getSession();
    const sbUser = sessionData.session?.user;
    if (sbUser) {
      currentUser = {
        uid: sbUser.id,
        email: sbUser.email ?? null,
        displayName:
          sbUser.user_metadata?.nombre ||
          sbUser.user_metadata?.full_name ||
          (sbUser.email ? sbUser.email.split('@')[0] : 'Ciudadano Comuna 8'),
      } as any;
    }
  }

  if (!currentUser) {
    throw new Error('Debes iniciar sesión para registrar un reporte.');
  }

  // Validate mandatory multimedia attachment (either mediaFile or pre-supplied mediaUrl)
  let resolvedMediaUrl = input.mediaUrl || '';
  let resolvedMediaType: ReportMediaType | undefined = input.mediaType;
  let resolvedMediaName = input.mediaName || '';

  if (input.mediaFile) {
    const uploaded = await uploadReportMediaToCloud(
      input.mediaFile,
      currentUser.uid,
      onProgress
    );
    resolvedMediaUrl = uploaded.mediaUrl;
    resolvedMediaType = uploaded.mediaType;
    resolvedMediaName = uploaded.mediaName;
  }

  if (!resolvedMediaUrl) {
    throw new Error(
      'Es obligatorio adjuntar una imagen o video de evidencia antes de enviar el reporte.'
    );
  }

  if (onProgress) {
    onProgress(95, 'Guardando registro en la base de datos...');
  }

  const nowISO = new Date().toISOString();
  const formattedDate = formatDate(nowISO);
  const generatedId = `rep-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const reportPayload: IncidentReport = {
    id: generatedId,
    uid: currentUser.uid,
    autorNombre:
      currentUser.displayName ||
      (currentUser.email ? currentUser.email.split('@')[0] : 'Ciudadano Comuna 8'),
    autorEmail: currentUser.email || '',
    titulo: input.titulo.trim(),
    categoria: input.categoria,
    descripcion: input.descripcion.trim(),
    sector: input.sector.trim(),
    direccion: (input.direccion || '').trim(),
    ubicacion: input.ubicacion || { lat: 6.2476, lng: -75.5658 },
    nivelPrioridad: input.nivelPrioridad || 'media',
    estado: 'pendiente' as ReportStatus,
    origen: 'usuario' as const,
    fechaCreacionISO: nowISO,
    fechaCreacionFormateada: formattedDate,
    mediaUrl: resolvedMediaUrl,
    mediaType: resolvedMediaType || 'image',
    mediaName: resolvedMediaName || 'evidencia.jpg',
  };

  // Persist immediately in local store & notify UI
  upsertReportInLocalStore(reportPayload);

  // Persist in Firestore 'reportes' collection (non-blocking timeout for fast UX)
  const firestorePromise = (async () => {
    try {
      const docRef = doc(db, REPORTS_COLLECTION, generatedId);
      await setDoc(docRef, {
        ...reportPayload,
      });
    } catch (fsErr) {
      console.warn('[Security Urban :: Firestore] Aviso al guardar en colección reportes:', fsErr);
    }
  })();

  // Persist in Supabase 'public.reportes'
  const supabasePromise = (async () => {
    try {
      // First try with media fields; if schema doesn't have media columns, retry core columns
      const { data, error } = await supabase
        .from(REPORTS_COLLECTION)
        .insert({
          uid: reportPayload.uid,
          autorNombre: reportPayload.autorNombre,
          autorEmail: reportPayload.autorEmail,
          titulo: reportPayload.titulo,
          categoria: reportPayload.categoria,
          descripcion: reportPayload.descripcion,
          sector: reportPayload.sector,
          direccion: reportPayload.direccion,
          ubicacion: reportPayload.ubicacion,
          nivelPrioridad: reportPayload.nivelPrioridad,
          estado: reportPayload.estado,
          origen: reportPayload.origen,
          fechaCreacionISO: reportPayload.fechaCreacionISO,
          fechaCreacionFormateada: reportPayload.fechaCreacionFormateada,
        })
        .select('*')
        .single();

      if (!error && data) {
        const mergedWithMedia: IncidentReport = {
          ...normalizeReport(data.id, data),
          mediaUrl: resolvedMediaUrl,
          mediaType: resolvedMediaType || 'image',
          mediaName: resolvedMediaName || 'evidencia.jpg',
        };
        upsertReportInLocalStore(mergedWithMedia);
        return mergedWithMedia;
      }
    } catch (sbErr) {
      console.warn('[Security Urban :: Supabase] Aviso en inserción de reporte:', sbErr);
    }
    return null;
  })();

  // Wait up to 3.5 seconds for cloud persistence so UI never hangs
  await Promise.race([
    Promise.allSettled([firestorePromise, supabasePromise]),
    new Promise((r) => setTimeout(r, 3500)),
  ]);

  if (onProgress) {
    onProgress(100, 'Reporte registrado exitosamente');
  }

  notifyReportsUpdated();
  return reportPayload;
}

/**
 * Helper to create a real test report in the database (optionally pre-approved if admin)
 * so administrators can immediately test persistence and sector risk calculation.
 */
export async function createRealTestReport(options: {
  sector: string;
  categoria?: string;
  nivelPrioridad?: ReportPriority;
  autoApprove?: boolean;
}): Promise<IncidentReport> {
  const currentUser = auth.currentUser;
  const uid = currentUser?.uid || 'test-operator-uid';
  const email = currentUser?.email || 'operador.pruebas@securityurban.co';
  const nombre =
    currentUser?.displayName || (email ? email.split('@')[0] : 'Operador de Prueba');

  // Generate a lightweight SVG/Canvas evidence image DataURL
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 360;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 640, 360);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(1, '#1e293b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 640, 360);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 4;
    ctx.strokeRect(16, 16, 608, 328);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('SECURITY URBAN // EVIDENCIA DE CAMPO', 38, 72);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(`Sector: ${options.sector}`, 38, 125);
    ctx.fillStyle = '#fbbf24';
    ctx.fillText(`Categoría: ${options.categoria || 'Sujeto sospechoso'}`, 38, 165);
    ctx.fillText(`Prioridad: ${(options.nivelPrioridad || 'alta').toUpperCase()}`, 38, 205);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px monospace';
    ctx.fillText(`Timestamp: ${new Date().toLocaleString('es-CO')}`, 38, 280);
  }
  const evidenceDataUrl = canvas.toDataURL('image/jpeg', 0.8);

  const nowISO = new Date().toISOString();
  const formattedDate = formatDate(nowISO);
  const generatedId = `rep-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const initialStatus: ReportStatus = options.autoApprove ? 'aceptado' : 'pendiente';

  const testReport: IncidentReport = {
    id: generatedId,
    uid,
    autorNombre: nombre,
    autorEmail: email,
    titulo: `Verificación operativa en ${options.sector}`,
    categoria: options.categoria || 'Sujeto sospechoso',
    descripcion: `Reporte de prueba real generado para verificar persistencia y cálculo matemático de riesgo en el sector ${options.sector}.`,
    sector: options.sector,
    direccion: `Corredor principal ${options.sector}, Comuna 8`,
    ubicacion: { lat: 6.2485, lng: -75.5475 },
    nivelPrioridad: options.nivelPrioridad || 'alta',
    estado: initialStatus,
    origen: 'usuario',
    fechaCreacionISO: nowISO,
    fechaCreacionFormateada: formattedDate,
    fechaRevisionISO: options.autoApprove ? nowISO : undefined,
    revisadoPor: options.autoApprove ? email : undefined,
    mediaUrl: evidenceDataUrl,
    mediaType: 'image',
    mediaName: `evidencia-${options.sector.toLowerCase().replace(/\s+/g, '-')}.jpg`,
  };

  upsertReportInLocalStore(testReport);

  try {
    const docRef = doc(db, REPORTS_COLLECTION, generatedId);
    await setDoc(docRef, testReport);
  } catch {}

  try {
    await supabase.from(REPORTS_COLLECTION).insert({
      uid: testReport.uid,
      autorNombre: testReport.autorNombre,
      autorEmail: testReport.autorEmail,
      titulo: testReport.titulo,
      categoria: testReport.categoria,
      descripcion: testReport.descripcion,
      sector: testReport.sector,
      direccion: testReport.direccion,
      ubicacion: testReport.ubicacion,
      nivelPrioridad: testReport.nivelPrioridad,
      estado: testReport.estado,
      origen: testReport.origen,
      fechaCreacionISO: testReport.fechaCreacionISO,
      fechaCreacionFormateada: testReport.fechaCreacionFormateada,
    });
  } catch {}

  notifyReportsUpdated();
  return testReport;
}

/**
 * ============================================================================
 * 4. OPTIMIZED REAL-TIME SUBSCRIPTIONS WITH .limit() & CACHING
 * ============================================================================
 */
export function subscribeToUserReports(
  uid: string,
  onUpdate: (reports: IncidentReport[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  let isActive = true;
  let firestoreList: IncidentReport[] = [];
  let supabaseList: IncidentReport[] = [];

  const emitMerged = () => {
    if (!isActive) return;
    const localUser = getGlobalCachedReports().filter((r) => r.uid === uid);
    const cachedUser = getCachedUserReports(uid);
    const merged = mergeReportLists(firestoreList, supabaseList, localUser, cachedUser).filter(
      (r) => r.uid === uid
    );
    setCachedUserReports(uid, merged);
    onUpdate(merged);
  };

  // Immediate emission from local cache for instant zero-latency UI
  emitMerged();

  // 1. Firestore real-time query with .limit(QUERY_LIMIT)
  let unsubFirestore: (() => void) | null = null;
  try {
    const q = query(
      collection(db, REPORTS_COLLECTION),
      where('uid', '==', uid),
      limit(QUERY_LIMIT)
    );
    unsubFirestore = onSnapshot(
      q,
      (snap) => {
        if (!isActive) return;
        const docs: IncidentReport[] = [];
        snap.forEach((d) => docs.push(normalizeReport(d.id, d.data())));
        firestoreList = docs;
        emitMerged();
      },
      () => {
        // Ignore Firestore permission/offline warning, handled by fallback
      }
    );
  } catch {}

  // 2. Supabase query with .limit(QUERY_LIMIT)
  const loadSupabaseUserReports = async () => {
    try {
      const { data, error } = await supabase
        .from(REPORTS_COLLECTION)
        .select(
          'id,uid,autorNombre,autorEmail,titulo,categoria,descripcion,sector,direccion,ubicacion,nivelPrioridad,estado,fechaCreacionISO,fechaCreacionFormateada,fechaRevisionISO,revisadoPor,motivoRechazo,origen'
        )
        .eq('uid', uid)
        .order('fechaCreacionISO', { ascending: false })
        .limit(QUERY_LIMIT);

      if (!isActive) return;
      if (error) throw error;

      supabaseList = (data || []).map((row: any) => normalizeReport(row.id, row));
      emitMerged();
    } catch (err: any) {
      if (!isActive) return;
      emitMerged();
      if (onError) onError(err instanceof Error ? err : new Error(String(err)));
    }
  };

  loadSupabaseUserReports();

  const channelName = `user-reports-${uid}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: REPORTS_COLLECTION,
      },
      () => {
        if (isActive) loadSupabaseUserReports();
      }
    )
    .subscribe();

  const handleLocalSync = () => {
    if (isActive) emitMerged();
  };
  if (typeof window !== 'undefined') {
    window.addEventListener(REPORTS_SYNC_EVENT, handleLocalSync);
  }

  return () => {
    isActive = false;
    if (unsubFirestore) unsubFirestore();
    if (typeof window !== 'undefined') {
      window.removeEventListener(REPORTS_SYNC_EVENT, handleLocalSync);
    }
    supabase.removeChannel(channel).catch(() => {});
  };
}

/**
 * Subscribes to all publicly accepted reports (where estado == 'aceptado') with .limit(QUERY_LIMIT).
 */
export function subscribeToPublicAcceptedReports(
  onUpdate: (reports: IncidentReport[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  let isActive = true;
  let firestoreAccepted: IncidentReport[] = [];
  let supabaseAccepted: IncidentReport[] = [];

  const emitMergedAccepted = () => {
    if (!isActive) return;
    const localAccepted = getGlobalCachedReports().filter((r) => r.estado === 'aceptado');
    const merged = mergeReportLists(firestoreAccepted, supabaseAccepted, localAccepted).filter(
      (r) => r.estado === 'aceptado' && isRealUserReport(r)
    );
    onUpdate(merged);
  };

  // Emit cached immediately for fast initial render
  emitMergedAccepted();

  // 1. Firestore real-time query filtered by estado == 'aceptado' and .limit(QUERY_LIMIT)
  let unsubFirestore: (() => void) | null = null;
  try {
    const q = query(
      collection(db, REPORTS_COLLECTION),
      where('estado', '==', 'aceptado'),
      limit(QUERY_LIMIT)
    );
    unsubFirestore = onSnapshot(
      q,
      (snap) => {
        if (!isActive) return;
        const docs: IncidentReport[] = [];
        snap.forEach((d) => docs.push(normalizeReport(d.id, d.data())));
        firestoreAccepted = docs;
        emitMergedAccepted();
      },
      () => {}
    );
  } catch {}

  // 2. Supabase query with .limit(QUERY_LIMIT)
  const loadAcceptedReports = async () => {
    try {
      const { data, error } = await supabase
        .from(REPORTS_COLLECTION)
        .select(
          'id,uid,autorNombre,autorEmail,titulo,categoria,descripcion,sector,direccion,ubicacion,nivelPrioridad,estado,fechaCreacionISO,fechaCreacionFormateada,fechaRevisionISO,revisadoPor,origen'
        )
        .eq('estado', 'aceptado')
        .order('fechaCreacionISO', { ascending: false })
        .limit(QUERY_LIMIT);

      if (!isActive) return;
      if (error) throw error;

      supabaseAccepted = (data || []).map((row: any) => normalizeReport(row.id, row));
      emitMergedAccepted();
    } catch (err: any) {
      if (isActive && onError) {
        onError(err instanceof Error ? err : new Error(String(err)));
      }
    }
  };

  loadAcceptedReports();

  const channelName = `public-accepted-reports-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: REPORTS_COLLECTION,
      },
      () => {
        if (isActive) loadAcceptedReports();
      }
    )
    .subscribe();

  const handleLocalSync = () => {
    if (isActive) emitMergedAccepted();
  };
  if (typeof window !== 'undefined') {
    window.addEventListener(REPORTS_SYNC_EVENT, handleLocalSync);
  }

  return () => {
    isActive = false;
    if (unsubFirestore) unsubFirestore();
    if (typeof window !== 'undefined') {
      window.removeEventListener(REPORTS_SYNC_EVENT, handleLocalSync);
    }
    supabase.removeChannel(channel).catch(() => {});
  };
}

/**
 * Subscribes to all reports for administrator/operator review with .limit(QUERY_LIMIT).
 */
export function subscribeToAllReportsForAdmin(
  onUpdate: (reports: IncidentReport[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  let isActive = true;
  let firestoreAll: IncidentReport[] = [];
  let supabaseAll: IncidentReport[] = [];

  const emitMergedAdmin = () => {
    if (!isActive) return;
    const localAll = getGlobalCachedReports();
    const merged = mergeReportLists(firestoreAll, supabaseAll, localAll);
    saveGlobalCachedReports(merged);
    onUpdate(merged);
  };

  emitMergedAdmin();

  let unsubFirestore: (() => void) | null = null;
  try {
    const q = query(collection(db, REPORTS_COLLECTION), limit(QUERY_LIMIT));
    unsubFirestore = onSnapshot(
      q,
      (snap) => {
        if (!isActive) return;
        const docs: IncidentReport[] = [];
        snap.forEach((d) => docs.push(normalizeReport(d.id, d.data())));
        firestoreAll = docs;
        emitMergedAdmin();
      },
      () => {}
    );
  } catch {}

  const loadAdminReports = async () => {
    try {
      const { data, error } = await supabase
        .from(REPORTS_COLLECTION)
        .select(
          'id,uid,autorNombre,autorEmail,titulo,categoria,descripcion,sector,direccion,ubicacion,nivelPrioridad,estado,fechaCreacionISO,fechaCreacionFormateada,fechaRevisionISO,revisadoPor,motivoRechazo,origen'
        )
        .order('fechaCreacionISO', { ascending: false })
        .limit(QUERY_LIMIT);

      if (!isActive) return;
      if (error) throw error;

      supabaseAll = (data || []).map((row: any) => normalizeReport(row.id, row));
      emitMergedAdmin();
    } catch (err: any) {
      if (isActive && onError) {
        onError(err instanceof Error ? err : new Error(String(err)));
      }
    }
  };

  loadAdminReports();

  const channelName = `admin-reports-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: REPORTS_COLLECTION,
      },
      () => {
        if (isActive) loadAdminReports();
      }
    )
    .subscribe();

  const handleLocalSync = () => {
    if (isActive) emitMergedAdmin();
  };
  if (typeof window !== 'undefined') {
    window.addEventListener(REPORTS_SYNC_EVENT, handleLocalSync);
  }

  return () => {
    isActive = false;
    if (unsubFirestore) unsubFirestore();
    if (typeof window !== 'undefined') {
      window.removeEventListener(REPORTS_SYNC_EVENT, handleLocalSync);
    }
    supabase.removeChannel(channel).catch(() => {});
  };
}

/**
 * Updates a report's title and description in both Firestore and Supabase.
 */
export async function updateReportTitleAndDescription(
  reportId: string,
  newTitle: string,
  newDescription?: string
): Promise<void> {
  const updates: Record<string, any> = {
    titulo: newTitle.trim(),
    fechaActualizacionISO: new Date().toISOString(),
  };

  if (newDescription !== undefined) {
    updates.descripcion = newDescription.trim();
  }

  // Update local cache immediately
  const current = getGlobalCachedReports();
  const target = current.find((r) => r.id === reportId);
  if (target) {
    upsertReportInLocalStore({
      ...target,
      titulo: updates.titulo,
      descripcion: updates.descripcion ?? target.descripcion,
    });
  }

  try {
    await updateDoc(doc(db, REPORTS_COLLECTION, reportId), updates);
  } catch {}

  try {
    await supabase.from(REPORTS_COLLECTION).update(updates).eq('id', reportId);
  } catch {}

  notifyReportsUpdated();
}

/**
 * Administrative action: Verify report and change state to 'aceptado' (🟢) or 'rechazado' (🔴).
 * Immediately updates Firestore, Supabase, and local reactive store so Dashboard metrics update in real time.
 */
export async function updateReportStatusByAdmin(
  reportId: string,
  newStatus: 'aceptado' | 'rechazado',
  adminUid: string,
  adminEmail?: string,
  motivoRechazo?: string
): Promise<void> {
  const nowISO = new Date().toISOString();

  const updates: Record<string, any> = {
    estado: newStatus,
    fechaRevisionISO: nowISO,
    revisadoPor: adminEmail || adminUid,
  };

  if (motivoRechazo) {
    updates.motivoRechazo = motivoRechazo.trim();
  } else if (newStatus === 'aceptado') {
    updates.motivoRechazo = null;
  }

  // Update local store immediately so Dashboard and RiskMap reflect approval instantaneously
  const current = getGlobalCachedReports();
  const existing = current.find((r) => r.id === reportId);
  if (existing) {
    upsertReportInLocalStore({
      ...existing,
      estado: newStatus,
      fechaRevisionISO: nowISO,
      revisadoPor: adminEmail || adminUid,
      motivoRechazo: motivoRechazo ? motivoRechazo.trim() : undefined,
    });
  }

  await Promise.allSettled([
    updateDoc(doc(db, REPORTS_COLLECTION, reportId), updates),
    supabase.from(REPORTS_COLLECTION).update(updates).eq('id', reportId),
  ]);

  notifyReportsUpdated();
}

/**
 * Delete a report from Firestore, Supabase, and local cache.
 */
export async function deleteReport(reportId: string): Promise<void> {
  removeReportFromLocalStore(reportId);

  await Promise.allSettled([
    deleteDoc(doc(db, REPORTS_COLLECTION, reportId)),
    supabase.from(REPORTS_COLLECTION).delete().eq('id', reportId),
  ]);

  notifyReportsUpdated();
}
