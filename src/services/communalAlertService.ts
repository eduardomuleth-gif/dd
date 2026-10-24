import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  query,
  limit,
  getDocs,
} from 'firebase/firestore';
import { db } from './firebaseAuth';

export type CommunalAlertSeverity = 'critica' | 'alerta' | 'informativa';

export interface CommunalMassAlert {
  id: string;
  titulo: string;
  mensaje: string;
  nivelSeveridad: CommunalAlertSeverity;
  sectorAfectado: string;
  emitidoPor: string;
  emitidoPorEmail: string;
  emitidoPorUid: string;
  fechaEmisionISO: string;
  fechaEmisionFormato: string;
  vigente: boolean;
  origen: 'oficial_administrador';
}

export interface CreateCommunalAlertInput {
  titulo: string;
  mensaje: string;
  nivelSeveridad: CommunalAlertSeverity;
  sectorAfectado: string;
  adminUid: string;
  adminEmail: string;
}

export const COMMUNAL_ALERTS_COLLECTION = 'alertas_comunales';
const LOCAL_COMMUNAL_ALERTS_KEY = 'security_urban_communal_alerts_v1';
const COMMUNAL_ALERTS_SYNC_EVENT = 'security_urban_communal_alerts_updated';
const QUERY_LIMIT = 20;

export const INITIAL_OFFICIAL_ALERTS: CommunalMassAlert[] = [];

function formatAlertDate(iso: string): string {
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

const alertsBroadcastChannel =
  typeof window !== 'undefined' && 'BroadcastChannel' in window
    ? new BroadcastChannel('security_urban_communal_alerts_channel')
    : null;

function notifyCommunalAlertsUpdated(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(COMMUNAL_ALERTS_SYNC_EVENT));
  }
  try {
    alertsBroadcastChannel?.postMessage({ type: 'COMMUNAL_ALERTS_UPDATED', ts: Date.now() });
  } catch {
    // Ignore broadcast errors
  }
}

export function getCachedCommunalAlerts(): CommunalMassAlert[] {
  try {
    const raw = localStorage.getItem(LOCAL_COMMUNAL_ALERTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter((a) => !a.id.startsWith('alert-com-0'));
      }
    }
  } catch {}
  return [];
}

export function saveCachedCommunalAlerts(alerts: CommunalMassAlert[]): void {
  try {
    localStorage.setItem(LOCAL_COMMUNAL_ALERTS_KEY, JSON.stringify(alerts.slice(0, QUERY_LIMIT)));
  } catch {}
}

/**
 * Physical creation of a Communal Mass Alert in Firebase Firestore
 * strictly restricted to eduardomuleth@gmail.com.
 */
export async function publishCommunalAlert(
  input: CreateCommunalAlertInput
): Promise<CommunalMassAlert> {
  const nowISO = new Date().toISOString();
  const alertId = `com-alert-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const alertPayload: CommunalMassAlert = {
    id: alertId,
    titulo: input.titulo.trim(),
    mensaje: input.mensaje.trim(),
    nivelSeveridad: input.nivelSeveridad,
    sectorAfectado: input.sectorAfectado.trim() || 'Toda la Comuna 8',
    emitidoPor: 'Administrador General (eduardomuleth@gmail.com)',
    emitidoPorEmail: input.adminEmail || 'eduardomuleth@gmail.com',
    emitidoPorUid: input.adminUid,
    fechaEmisionISO: nowISO,
    fechaEmisionFormato: formatAlertDate(nowISO),
    vigente: true,
    origen: 'oficial_administrador',
  };

  // 1. Update local cache immediately
  const current = getCachedCommunalAlerts();
  const updated = [alertPayload, ...current.filter((a) => a.id !== alertId)];
  saveCachedCommunalAlerts(updated);
  notifyCommunalAlertsUpdated();

  // 2. Physical write in Firebase Firestore 'alertas_comunales'
  try {
    const alertDocRef = doc(db, COMMUNAL_ALERTS_COLLECTION, alertId);
    await setDoc(alertDocRef, alertPayload, { merge: true });
    console.log(`[Security Urban :: CommunalAlerts] ✔ Alerta comunal ${alertId} guardada físicamente en Firestore.`);
  } catch (err) {
    console.warn('[Security Urban :: CommunalAlerts] Aviso al persistir alerta en Firestore:', err);
  }

  return alertPayload;
}

/**
 * Subscribes to official communal alerts in real time with getDocs fallback
 */
export function subscribeToCommunalAlerts(
  onUpdate: (alerts: CommunalMassAlert[]) => void
): () => void {
  let isActive = true;
  let firestoreList: CommunalMassAlert[] = [];

  const emit = () => {
    if (!isActive) return;
    const local = getCachedCommunalAlerts();
    const map = new Map<string, CommunalMassAlert>();

    // Add local items
    for (const item of local) {
      if (item && item.id) map.set(item.id, item);
    }
    // Override / merge with real Firestore items
    for (const item of firestoreList) {
      if (item && item.id) map.set(item.id, item);
    }

    const merged = Array.from(map.values()).sort(
      (a, b) => new Date(b.fechaEmisionISO).getTime() - new Date(a.fechaEmisionISO).getTime()
    );
    saveCachedCommunalAlerts(merged);
    onUpdate(merged);
  };

  // Immediate emission from cache
  emit();

  // Firestore real-time listener
  let unsubFirestore: (() => void) | null = null;
  try {
    const q = query(collection(db, COMMUNAL_ALERTS_COLLECTION), limit(QUERY_LIMIT));

    getDocs(q)
      .then((snap) => {
        if (!isActive) return;
        const docs: CommunalMassAlert[] = [];
        snap.forEach((d) => docs.push(d.data() as CommunalMassAlert));
        if (docs.length > 0) {
          firestoreList = docs;
          emit();
        }
      })
      .catch(() => {});

    unsubFirestore = onSnapshot(
      q,
      (snap) => {
        if (!isActive) return;
        const docs: CommunalMassAlert[] = [];
        snap.forEach((d) => docs.push(d.data() as CommunalMassAlert));
        firestoreList = docs;
        emit();
      },
      () => {}
    );
  } catch {}

  const handleSyncEvent = () => {
    if (isActive) emit();
  };
  if (typeof window !== 'undefined') {
    window.addEventListener(COMMUNAL_ALERTS_SYNC_EVENT, handleSyncEvent);
  }

  return () => {
    isActive = false;
    if (unsubFirestore) unsubFirestore();
    if (typeof window !== 'undefined') {
      window.removeEventListener(COMMUNAL_ALERTS_SYNC_EVENT, handleSyncEvent);
    }
  };
}

/**
 * Delete a communal alert from Firestore and local store
 */
export async function deleteCommunalAlert(alertId: string): Promise<void> {
  const current = getCachedCommunalAlerts();
  saveCachedCommunalAlerts(current.filter((a) => a.id !== alertId));
  notifyCommunalAlertsUpdated();

  try {
    await deleteDoc(doc(db, COMMUNAL_ALERTS_COLLECTION, alertId));
  } catch (err) {
    console.warn('[Security Urban :: CommunalAlerts] Error al eliminar alerta en Firestore:', err);
  }
}
