import { supabase } from './supabaseClient';
import { auth } from './firebaseAuth';
import { IncidentReport, CreateReportInput, ReportStatus } from '../types/report';

export const REPORTS_COLLECTION = 'reportes';
const LOCAL_REPORTS_CACHE_KEY = 'security_urban_user_reports_';

export type Unsubscribe = () => void;

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

function normalizeReport(id: string, data: Record<string, any>): IncidentReport {
  const reportId = data?.id || id;
  const createdISO =
    data?.fechaCreacionISO ||
    (data?.created_at ? new Date(data.created_at).toISOString() : new Date().toISOString());

  console.log('[Security Urban :: Reporte] Leyendo reporte:', {
    id: reportId,
    titulo: data?.titulo,
    categoria: data?.categoria,
    estado: data?.estado,
    uid: data?.uid,
  });

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
    nivelPrioridad: data?.nivelPrioridad || 'media',
    estado: (data?.estado as ReportStatus) || 'pendiente',
    fechaCreacionISO: createdISO,
    fechaCreacionFormateada: data?.fechaCreacionFormateada || formatDate(createdISO),
    fechaRevisionISO: data?.fechaRevisionISO ?? undefined,
    revisadoPor: data?.revisadoPor ?? undefined,
    motivoRechazo: data?.motivoRechazo ?? undefined,
    origen: data?.origen || 'usuario',
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
 * Creates a new incident report in Supabase 'public.reportes' with initial state "pendiente".
 * Must log both titulo and categoria together.
 */
export async function createIncidentReport(input: CreateReportInput): Promise<IncidentReport> {
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

  const nowISO = new Date().toISOString();
  const formattedDate = formatDate(nowISO);

  const reportPayload = {
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
  };

  console.log('[Security Urban :: Reporte] Guardando reporte en Supabase:', {
    titulo: reportPayload.titulo,
    categoria: reportPayload.categoria,
    estado: reportPayload.estado,
    uid: reportPayload.uid,
    sector: reportPayload.sector,
  });

  try {
    const { data, error } = await supabase
      .from(REPORTS_COLLECTION)
      .insert(reportPayload)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    const createdReport = normalizeReport(data.id, data);

    const currentCached = getCachedUserReports(currentUser.uid);
    setCachedUserReports(currentUser.uid, [
      createdReport,
      ...currentCached.filter((r) => r.id !== createdReport.id),
    ]);

    return createdReport;
  } catch (err: unknown) {
    console.warn('[Security Urban :: Reporte] Fallo directo en Supabase, guardando en contingencia local:', err);
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
 * Real-time listener via Supabase Realtime.
 */
export function subscribeToUserReports(
  uid: string,
  onUpdate: (reports: IncidentReport[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  console.log('[Security Urban :: Reporte] Subscribiendo en tiempo real a reportes de usuario en Supabase:', uid);
  let isActive = true;

  const loadUserReports = async () => {
    try {
      const { data, error } = await supabase
        .from(REPORTS_COLLECTION)
        .select('*')
        .eq('uid', uid)
        .order('fechaCreacionISO', { ascending: false });

      if (!isActive) return;

      if (error) {
        throw error;
      }

      const reports: IncidentReport[] = (data || []).map((row: any) =>
        normalizeReport(row.id, row)
      );

      reports.sort(
        (a, b) => new Date(b.fechaCreacionISO).getTime() - new Date(a.fechaCreacionISO).getTime()
      );

      setCachedUserReports(uid, reports);
      onUpdate(reports);
    } catch (err: any) {
      console.warn('[Security Urban :: Reporte] Aviso cargando reportes de usuario en Supabase:', err);
      if (!isActive) return;
      const cached = getCachedUserReports(uid);
      onUpdate(cached);
      if (onError) onError(err instanceof Error ? err : new Error(String(err)));
    }
  };

  loadUserReports();

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
        if (isActive) {
          loadUserReports();
        }
      }
    )
    .subscribe();

  return () => {
    isActive = false;
    supabase.removeChannel(channel).catch(() => {});
  };
}

/**
 * Subscribes to all publicly accepted reports (where estado == 'aceptado').
 * Only accepted reports created by users are visible publicly on maps and alert center.
 */
export function subscribeToPublicAcceptedReports(
  onUpdate: (reports: IncidentReport[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  console.log('[Security Urban :: Reporte] Subscribiendo a reportes públicos aceptados en Supabase (estado == aceptado)');
  let isActive = true;

  const loadAcceptedReports = async () => {
    try {
      const { data, error } = await supabase
        .from(REPORTS_COLLECTION)
        .select('*')
        .eq('estado', 'aceptado')
        .order('fechaCreacionISO', { ascending: false });

      if (!isActive) return;

      if (error) {
        throw error;
      }

      const reports: IncidentReport[] = (data || []).map((row: any) =>
        normalizeReport(row.id, row)
      );

      reports.sort(
        (a, b) => new Date(b.fechaCreacionISO).getTime() - new Date(a.fechaCreacionISO).getTime()
      );

      const visibleReports = reports.filter(
        (r) =>
          r.estado === 'aceptado' &&
          r.origen !== 'simulacion' &&
          r.uid !== 'system-simulation' &&
          r.uid !== 'sim_robot_comuna8' &&
          r.autorEmail !== 'simulacion.alerta@securityurban.gov.co' &&
          !r.id.startsWith('sim-')
      );

      onUpdate(visibleReports);
    } catch (err: any) {
      console.warn('[Security Urban :: Reporte] Aviso en listener de reportes aceptados en Supabase:', err);
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
        if (isActive) {
          loadAcceptedReports();
        }
      }
    )
    .subscribe();

  return () => {
    isActive = false;
    supabase.removeChannel(channel).catch(() => {});
  };
}

/**
 * Subscribes to all reports for administrator/operator review (all statuses).
 */
export function subscribeToAllReportsForAdmin(
  onUpdate: (reports: IncidentReport[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  console.log('[Security Urban :: Reporte] Subscribiendo a panel de revisión de administrador en Supabase...');
  let isActive = true;

  const loadAdminReports = async () => {
    try {
      const { data, error } = await supabase
        .from(REPORTS_COLLECTION)
        .select('*')
        .order('fechaCreacionISO', { ascending: false });

      if (!isActive) return;

      if (error) {
        throw error;
      }

      const reports: IncidentReport[] = [];
      (data || []).forEach((row: any) => {
        const normalized = normalizeReport(row.id, row);
        if (
          normalized.origen !== 'simulacion' &&
          normalized.uid !== 'system-simulation' &&
          !normalized.id.startsWith('sim-')
        ) {
          reports.push(normalized);
        }
      });

      reports.sort(
        (a, b) => new Date(b.fechaCreacionISO).getTime() - new Date(a.fechaCreacionISO).getTime()
      );
      onUpdate(reports);
    } catch (err: any) {
      console.warn('[Security Urban :: Reporte] Aviso en listener de administrador en Supabase:', err);
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
        if (isActive) {
          loadAdminReports();
        }
      }
    )
    .subscribe();

  return () => {
    isActive = false;
    supabase.removeChannel(channel).catch(() => {});
  };
}

/**
 * Updates a report's title and description in Supabase 'public.reportes' (for user edit).
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

  console.log('[Security Urban :: Reporte] Actualizando título/descripción de reporte en Supabase:', {
    reportId,
    nuevoTitulo: updates.titulo,
  });

  const { error } = await supabase
    .from(REPORTS_COLLECTION)
    .update(updates)
    .eq('id', reportId);

  if (error) {
    console.warn('[Security Urban :: Reporte] Error al actualizar reporte en Supabase:', error.message);
    throw new Error(error.message);
  }
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

  console.log('[Security Urban :: Reporte] Administrador actualiza estado de reporte en Supabase:', {
    reportId,
    nuevoEstado: newStatus,
    revisadoPor: updates.revisadoPor,
  });

  const { error } = await supabase
    .from(REPORTS_COLLECTION)
    .update(updates)
    .eq('id', reportId);

  if (error) {
    console.warn('[Security Urban :: Reporte] Error al actualizar estado de reporte en Supabase:', error.message);
    throw new Error(error.message);
  }
}

/**
 * Delete a report from Supabase 'public.reportes'
 */
export async function deleteReport(reportId: string): Promise<void> {
  const { error } = await supabase
    .from(REPORTS_COLLECTION)
    .delete()
    .eq('id', reportId);

  if (error) {
    console.warn('[Security Urban :: Reporte] Error al eliminar reporte en Supabase:', error.message);
    throw new Error(error.message);
  }

  console.log('[Security Urban :: Reporte] Reporte eliminado en Supabase:', reportId);
}
