import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Unsubscribe,
  DocumentData,
  QuerySnapshot,
} from 'firebase/firestore';
import { db, auth } from './firebaseAuth';
import { IncidentReport, CreateReportInput, ReportStatus } from '../types/report';

export const REPORTS_COLLECTION = 'reportes';
const LOCAL_REPORTS_CACHE_KEY = 'security_urban_user_reports_';

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

function normalizeReport(id: string, data: DocumentData): IncidentReport {
  // Required log upon reading a report showing titulo and categoria together
  console.log('[Security Urban :: Reporte] Leyendo reporte:', {
    id,
    titulo: data.titulo,
    categoria: data.categoria,
    estado: data.estado,
    uid: data.uid,
  });

  return {
    id,
    uid: data.uid || '',
    autorNombre: data.autorNombre || 'Ciudadano Comuna 8',
    autorEmail: data.autorEmail || '',
    titulo: data.titulo || 'Sin título',
    categoria: data.categoria || 'Otro',
    descripcion: data.descripcion || '',
    sector: data.sector || 'Comuna 8',
    direccion: data.direccion || '',
    ubicacion: data.ubicacion || undefined,
    nivelPrioridad: data.nivelPrioridad || 'media',
    estado: data.estado || 'pendiente',
    fechaCreacionISO: data.fechaCreacionISO || new Date().toISOString(),
    fechaCreacionFormateada: data.fechaCreacionFormateada || formatDate(data.fechaCreacionISO || new Date().toISOString()),
    fechaRevisionISO: data.fechaRevisionISO,
    revisadoPor: data.revisadoPor,
    motivoRechazo: data.motivoRechazo,
  };
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
    localStorage.setItem(`${LOCAL_REPORTS_CACHE_KEY}${uid}`, JSON.stringify(reports));
  } catch {}
}

/**
 * Creates a new incident report in Firestore with initial state "pendiente".
 * Must log both titulo and categoria together.
 */
export async function createIncidentReport(input: CreateReportInput): Promise<IncidentReport> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Debes iniciar sesión para registrar un reporte.');
  }

  const nowISO = new Date().toISOString();
  const formattedDate = formatDate(nowISO);

  // Exact fields defined by user, no default or cross-report leakage
  const reportPayload = {
    uid: currentUser.uid,
    autorNombre: currentUser.displayName || (currentUser.email ? currentUser.email.split('@')[0] : 'Ciudadano Comuna 8'),
    autorEmail: currentUser.email || '',
    titulo: input.titulo.trim(),
    categoria: input.categoria,
    descripcion: input.descripcion.trim(),
    sector: input.sector.trim(),
    direccion: (input.direccion || '').trim(),
    ubicacion: input.ubicacion || { lat: 6.2476, lng: -75.5658 },
    nivelPrioridad: input.nivelPrioridad || 'media',
    estado: 'pendiente' as ReportStatus, // Mandatory initial status
    fechaCreacionISO: nowISO,
    fechaCreacionFormateada: formattedDate,
  };

  // Required console.log showing titulo and categoria together upon saving
  console.log('[Security Urban :: Reporte] Guardando reporte:', {
    titulo: reportPayload.titulo,
    categoria: reportPayload.categoria,
    estado: reportPayload.estado,
    uid: reportPayload.uid,
    sector: reportPayload.sector,
  });

  try {
    const colRef = collection(db, REPORTS_COLLECTION);
    const docRef = await addDoc(colRef, reportPayload);

    const createdReport: IncidentReport = {
      id: docRef.id,
      ...reportPayload,
    };

    // Update local cache
    const currentCached = getCachedUserReports(currentUser.uid);
    setCachedUserReports(currentUser.uid, [createdReport, ...currentCached]);

    return createdReport;
  } catch (err: unknown) {
    console.warn('[Security Urban :: Reporte] Fallo directo en Firestore, guardando en contingencia local:', err);
    // Optimistic fallback for local preview
    const fallbackReport: IncidentReport = {
      id: `local-rep-${Date.now()}`,
      ...reportPayload,
    };
    const currentCached = getCachedUserReports(currentUser.uid);
    setCachedUserReports(currentUser.uid, [fallbackReport, ...currentCached]);
    return fallbackReport;
  }
}

/**
 * Subscribes to reports created by a specific user (where uid == user.uid).
 * Real-time onSnapshot listener.
 */
export function subscribeToUserReports(
  uid: string,
  onUpdate: (reports: IncidentReport[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  console.log('[Security Urban :: Reporte] Subscribiendo en tiempo real a reportes de usuario:', uid);

  try {
    const colRef = collection(db, REPORTS_COLLECTION);
    const q = query(
      colRef,
      where('uid', '==', uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const reports: IncidentReport[] = [];
        snapshot.forEach((docSnap) => {
          reports.push(normalizeReport(docSnap.id, docSnap.data()));
        });

        // Sort descending by fechaCreacionISO
        reports.sort((a, b) => new Date(b.fechaCreacionISO).getTime() - new Date(a.fechaCreacionISO).getTime());

        // Cache update
        setCachedUserReports(uid, reports);
        onUpdate(reports);
      },
      (err) => {
        console.warn('[Security Urban :: Reporte] onSnapshot usuario error/offline:', err);
        const cached = getCachedUserReports(uid);
        onUpdate(cached);
        if (onError) onError(err);
      }
    );

    return unsubscribe;
  } catch (err: any) {
    console.warn('[Security Urban :: Reporte] Error inicializando listener de usuario:', err);
    const cached = getCachedUserReports(uid);
    onUpdate(cached);
    return () => {};
  }
}

/**
 * Subscribes to all publicly accepted reports (where estado == 'aceptado').
 * Only accepted reports are visible publicly on maps and alert center.
 */
export function subscribeToPublicAcceptedReports(
  onUpdate: (reports: IncidentReport[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  console.log('[Security Urban :: Reporte] Subscribiendo a reportes públicos aceptados (estado == aceptado)');

  try {
    const colRef = collection(db, REPORTS_COLLECTION);
    const q = query(
      colRef,
      where('estado', '==', 'aceptado')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const reports: IncidentReport[] = [];
        snapshot.forEach((docSnap) => {
          reports.push(normalizeReport(docSnap.id, docSnap.data()));
        });

        reports.sort((a, b) => new Date(b.fechaCreacionISO).getTime() - new Date(a.fechaCreacionISO).getTime());
        onUpdate(reports);
      },
      (err) => {
        console.warn('[Security Urban :: Reporte] onSnapshot reportes aceptados error:', err);
        if (onError) onError(err);
      }
    );

    return unsubscribe;
  } catch (err: any) {
    console.warn('[Security Urban :: Reporte] Error en listener público:', err);
    return () => {};
  }
}

/**
 * Subscribes to all reports for administrator review (all statuses or pending).
 */
export function subscribeToAllReportsForAdmin(
  onUpdate: (reports: IncidentReport[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  console.log('[Security Urban :: Reporte] Subscribiendo a panel de revisión de administrador...');

  try {
    const colRef = collection(db, REPORTS_COLLECTION);
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const reports: IncidentReport[] = [];
        snapshot.forEach((docSnap) => {
          reports.push(normalizeReport(docSnap.id, docSnap.data()));
        });

        reports.sort((a, b) => new Date(b.fechaCreacionISO).getTime() - new Date(a.fechaCreacionISO).getTime());
        onUpdate(reports);
      },
      (err) => {
        console.warn('[Security Urban :: Reporte] Error en listener de admin:', err);
        if (onError) onError(err);
      }
    );

    return unsubscribe;
  } catch (err: any) {
    console.warn('[Security Urban :: Reporte] Error inicializando listener de admin:', err);
    return () => {};
  }
}

/**
 * Updates a report's title and description in Firestore (for user edit).
 * Immediately synchronizes across all listeners via onSnapshot.
 */
export async function updateReportTitleAndDescription(
  reportId: string,
  newTitle: string,
  newDescription?: string
): Promise<void> {
  const docRef = doc(db, REPORTS_COLLECTION, reportId);
  const updates: Record<string, any> = {
    titulo: newTitle.trim(),
    fechaActualizacionISO: new Date().toISOString(),
  };

  if (newDescription !== undefined) {
    updates.descripcion = newDescription.trim();
  }

  console.log('[Security Urban :: Reporte] Actualizando título de reporte:', {
    reportId,
    nuevoTitulo: updates.titulo,
  });

  await updateDoc(docRef, updates);
}

/**
 * Administrative action: Verify report and change state to 'aceptado' (🟢) or 'rechazado' (🔴).
 */
export async function updateReportStatusByAdmin(
  reportId: string,
  newStatus: 'aceptado' | 'rechazado',
  adminUid: string,
  adminEmail?: string,
  motivoRechazo?: string
): Promise<void> {
  const docRef = doc(db, REPORTS_COLLECTION, reportId);
  const nowISO = new Date().toISOString();

  const updates: Record<string, any> = {
    estado: newStatus,
    fechaRevisionISO: nowISO,
    revisadoPor: adminEmail || adminUid,
  };

  if (motivoRechazo) {
    updates.motivoRechazo = motivoRechazo.trim();
  }

  console.log('[Security Urban :: Reporte] Administrador actualiza estado de reporte:', {
    reportId,
    nuevoEstado: newStatus,
    revisadoPor: updates.revisadoPor,
  });

  await updateDoc(docRef, updates);
}

/**
 * Delete a report
 */
export async function deleteReport(reportId: string): Promise<void> {
  const docRef = doc(db, REPORTS_COLLECTION, reportId);
  await deleteDoc(docRef);
  console.log('[Security Urban :: Reporte] Reporte eliminado:', reportId);
}
