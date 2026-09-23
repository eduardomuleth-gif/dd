import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db } from './firebaseAuth';
import { FirestoreUser, UserRole, UserStatus, UserStats } from '../types/user';

const USERS_COLLECTION = 'usuarios';

/**
 * Normalizes Firestore document data into a strongly typed FirestoreUser
 */
export function normalizeUserData(id: string, data: any): FirestoreUser {
  let fechaRegistroFormatted = 'Reciente';
  let fechaRegistroISO = new Date().toISOString();

  if (data.fechaRegistro) {
    if (data.fechaRegistro instanceof Timestamp) {
      const date = data.fechaRegistro.toDate();
      fechaRegistroISO = date.toISOString();
      fechaRegistroFormatted = date.toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } else if (typeof data.fechaRegistro === 'string') {
      fechaRegistroISO = data.fechaRegistro;
      try {
        fechaRegistroFormatted = new Date(data.fechaRegistro).toLocaleDateString('es-CO', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      } catch {
        fechaRegistroFormatted = data.fechaRegistro;
      }
    }
  } else if (data.fechaRegistroISO) {
    fechaRegistroISO = data.fechaRegistroISO;
    try {
      fechaRegistroFormatted = new Date(data.fechaRegistroISO).toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      fechaRegistroFormatted = data.fechaRegistroISO;
    }
  }

  return {
    uid: id,
    nombre: data.nombre || 'Usuario Comunal',
    correo: data.correo || '',
    fechaRegistro: fechaRegistroFormatted,
    fechaRegistroISO: fechaRegistroISO,
    rol: (data.rol as UserRole) || 'ciudadano',
    estado: (data.estado as UserStatus) || 'activo',
    sector: data.sector || 'Comuna 8 - No especificado',
    ultimoAcceso: data.ultimoAcceso || 'No registrado',
    telefono: data.telefono,
  };
}

/**
 * Calculates live summary statistics from users list
 */
export function calculateUserStats(users: FirestoreUser[]): UserStats {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  let activos = 0;
  let suspendidos = 0;
  let nuevosEstaSemana = 0;
  let ciudadanos = 0;
  let operadores = 0;
  let administradores = 0;

  users.forEach((u) => {
    if (u.estado === 'activo') activos++;
    if (u.estado === 'suspendido') suspendidos++;

    if (u.rol === 'ciudadano') ciudadanos++;
    else if (u.rol === 'operador') operadores++;
    else if (u.rol === 'administrador') administradores++;

    // Check if new this week
    if (u.fechaRegistroISO) {
      try {
        const regDate = new Date(u.fechaRegistroISO);
        if (regDate >= oneWeekAgo) {
          nuevosEstaSemana++;
        }
      } catch {
        // ignore parse error
      }
    }
  });

  return {
    total: users.length,
    activos,
    suspendidos,
    nuevosEstaSemana,
    ciudadanos,
    operadores,
    administradores,
  };
}

/**
 * Real-time listener for all users in Firestore collection 'usuarios'
 */
export function subscribeToFirestoreUsers(
  onUpdate: (users: FirestoreUser[], stats: UserStats) => void,
  onError?: (err: any) => void
): () => void {
  console.log('[Security Urban :: UserService] Suscribiéndose en tiempo real a colección "usuarios"...');
  const usersRef = collection(db, USERS_COLLECTION);
  const q = query(usersRef);

  return onSnapshot(
    q,
    (snapshot) => {
      const users: FirestoreUser[] = [];
      snapshot.forEach((docSnap) => {
        users.push(normalizeUserData(docSnap.id, docSnap.data()));
      });

      // Sort: Admins & Operadores first, then by registration date or name
      users.sort((a, b) => {
        const roleOrder: Record<UserRole, number> = { administrador: 1, operador: 2, ciudadano: 3 };
        const roleDiff = (roleOrder[a.rol] || 3) - (roleOrder[b.rol] || 3);
        if (roleDiff !== 0) return roleDiff;
        return a.nombre.localeCompare(b.nombre);
      });

      const stats = calculateUserStats(users);
      console.log(`[Security Urban :: UserService] ✔ Actualización en vivo: ${users.length} usuarios en Firestore.`);
      onUpdate(users, stats);
    },
    (err) => {
      console.error('[Security Urban :: UserService] ✖ Error en listener onSnapshot de usuarios:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * One-time fetch of all users from Firestore
 */
export async function fetchFirestoreUsers(): Promise<{ users: FirestoreUser[]; stats: UserStats }> {
  try {
    const usersRef = collection(db, USERS_COLLECTION);
    const snapshot = await getDocs(usersRef);
    const users: FirestoreUser[] = [];

    snapshot.forEach((docSnap) => {
      users.push(normalizeUserData(docSnap.id, docSnap.data()));
    });

    users.sort((a, b) => a.nombre.localeCompare(b.nombre));
    const stats = calculateUserStats(users);
    return { users, stats };
  } catch (err) {
    console.error('[Security Urban :: UserService] ✖ Error al consultar usuarios de Firestore:', err);
    throw err;
  }
}

/**
 * Get profile of a specific user
 */
export async function getFirestoreUserProfile(uid: string): Promise<FirestoreUser | null> {
  try {
    const userDocRef = doc(db, USERS_COLLECTION, uid);
    const snap = await getDoc(userDocRef);
    if (!snap.exists()) return null;
    return normalizeUserData(snap.id, snap.data());
  } catch (err) {
    console.error('[Security Urban :: UserService] Error obteniendo perfil:', err);
    return null;
  }
}

/**
 * Update user role in Firestore ('ciudadano' | 'operador' | 'administrador')
 */
export async function updateFirestoreUserRole(uid: string, newRole: UserRole): Promise<void> {
  console.log(`[Security Urban :: UserService] Actualizando rol de ${uid} a "${newRole}"...`);
  try {
    const userDocRef = doc(db, USERS_COLLECTION, uid);
    await updateDoc(userDocRef, {
      rol: newRole,
      fechaModificacionRol: new Date().toISOString(),
    });
    console.log(`[Security Urban :: UserService] ✔ Rol actualizado exitosamente.`);
  } catch (err) {
    console.error('[Security Urban :: UserService] ✖ Error al actualizar rol:', err);
    throw err;
  }
}

/**
 * Update user status in Firestore ('activo' | 'suspendido')
 */
export async function updateFirestoreUserStatus(uid: string, newStatus: UserStatus): Promise<void> {
  console.log(`[Security Urban :: UserService] Actualizando estado de ${uid} a "${newStatus}"...`);
  try {
    const userDocRef = doc(db, USERS_COLLECTION, uid);
    await updateDoc(userDocRef, {
      estado: newStatus,
      fechaModificacionEstado: new Date().toISOString(),
    });
    console.log(`[Security Urban :: UserService] ✔ Estado actualizado exitosamente.`);
  } catch (err) {
    console.error('[Security Urban :: UserService] ✖ Error al actualizar estado:', err);
    throw err;
  }
}

/**
 * Syncs the current logged in user's profile with Firestore.
 * Ensures the user has a document in 'usuarios/{uid}'.
 */
export async function syncCurrentUserFirestoreProfile(user: User): Promise<FirestoreUser> {
  const userDocRef = doc(db, USERS_COLLECTION, user.uid);
  try {
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      return normalizeUserData(snap.id, snap.data());
    }

    // Auto-create document
    const isEmailAdmin = (user.email || '').toLowerCase().includes('admin');
    const now = new Date();
    const newProfile: Record<string, any> = {
      uid: user.uid,
      nombre: user.displayName || (user.email ? user.email.split('@')[0] : 'Usuario Comuna 8'),
      correo: user.email || '',
      fechaRegistro: serverTimestamp(),
      fechaRegistroISO: now.toISOString(),
      rol: isEmailAdmin ? 'administrador' : 'ciudadano',
      estado: 'activo',
      sector: 'Villa Hermosa, Comuna 8',
      ultimoAcceso: now.toISOString(),
    };

    await setDoc(userDocRef, newProfile);
    console.log(`[Security Urban :: UserService] ✔ Perfil de usuario inicializado en Firestore:`, user.email);
    return normalizeUserData(user.uid, newProfile);
  } catch (err) {
    console.warn('[Security Urban :: UserService] No se pudo sincronizar perfil en Firestore:', err);
    return {
      uid: user.uid,
      nombre: user.displayName || (user.email ? user.email.split('@')[0] : 'Usuario Comuna 8'),
      correo: user.email || '',
      fechaRegistro: 'Hoy',
      fechaRegistroISO: new Date().toISOString(),
      rol: 'ciudadano',
      estado: 'activo',
      sector: 'Villa Hermosa, Comuna 8',
    };
  }
}

/**
 * Pre-populates initial representative users for Comuna 8 if the collection is fresh,
 * so the administrator has a realistic operational dashboard to manage immediately.
 */
export async function seedInitialCommunityUsersIfEmpty(): Promise<void> {
  try {
    const usersRef = collection(db, USERS_COLLECTION);
    const snap = await getDocs(usersRef);
    if (!snap.empty) {
      return; // Already populated
    }

    console.log('[Security Urban :: UserService] Inicializando usuarios semilla para Comuna 8...');
    const now = new Date();

    const sampleUsers = [
      {
        uid: 'usr_sec_admin_01',
        nombre: 'Sargento Carlos Mario Echeverri',
        correo: 'admin.seguridad@securityurban.medellin.gov.co',
        rol: 'administrador',
        estado: 'activo',
        sector: 'Villa Hermosa (Comando Central)',
        diasAtras: 30,
      },
      {
        uid: 'usr_sec_op_01',
        nombre: 'Patrullera Mariana Restrepo G.',
        correo: 'operador.enciso@seguridadcomuna8.gov.co',
        rol: 'operador',
        estado: 'activo',
        sector: 'Enciso - Cuadrante 8-2',
        diasAtras: 18,
      },
      {
        uid: 'usr_sec_op_02',
        nombre: 'Agente David Londoño Vélez',
        correo: 'operador.ladera@seguridadcomuna8.gov.co',
        rol: 'operador',
        estado: 'activo',
        sector: 'La Ladera - Parque Biblioteca',
        diasAtras: 12,
      },
      {
        uid: 'usr_sec_cit_01',
        nombre: 'Gloria Inés Montoya',
        correo: 'gloria.montoya@comuna8unida.org',
        rol: 'ciudadano',
        estado: 'activo',
        sector: 'Sucre - Sector Los Mangos',
        diasAtras: 3,
      },
      {
        uid: 'usr_sec_cit_02',
        nombre: 'Julián Andrés Henao',
        correo: 'j.henao88@gmail.com',
        rol: 'ciudadano',
        estado: 'activo',
        sector: 'Trece de Noviembre',
        diasAtras: 2,
      },
      {
        uid: 'usr_sec_cit_03',
        nombre: 'Felipe Quintero Berrío',
        correo: 'felipe.quintero.infraccion@correo.com',
        rol: 'ciudadano',
        estado: 'suspendido',
        sector: 'El Pinal (Reportes Falsos)',
        diasAtras: 25,
      },
    ];

    for (const sample of sampleUsers) {
      const regDate = new Date(now.getTime() - sample.diasAtras * 24 * 60 * 60 * 1000);
      await setDoc(doc(db, USERS_COLLECTION, sample.uid), {
        uid: sample.uid,
        nombre: sample.nombre,
        correo: sample.correo,
        fechaRegistro: Timestamp.fromDate(regDate),
        fechaRegistroISO: regDate.toISOString(),
        rol: sample.rol,
        estado: sample.estado,
        sector: sample.sector,
        ultimoAcceso: new Date().toISOString(),
      });
    }

    console.log('[Security Urban :: UserService] ✔ Usuarios iniciales de Comuna 8 sembrados exitosamente.');
  } catch (err) {
    console.warn('[Security Urban :: UserService] No se pudieron sembrar usuarios semilla:', err);
  }
}
