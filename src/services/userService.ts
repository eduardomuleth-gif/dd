import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import {
  User,
  updateProfile,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from 'firebase/auth';
import { db, auth } from './firebaseAuth';
import { FirestoreUser, UserRole, UserStatus, UserStats, UserPreferences } from '../types/user';

const USERS_COLLECTION = 'usuarios';
const USER_PROFILE_CACHE_PREFIX = 'security_urban_user_profile_';
const FIRESTORE_OP_TIMEOUT_MS = 2200;

export const SOLE_ADMIN_EMAIL = 'eduardomuleth@gmail.com';
export const ADMIN_EMAILS: string[] = [SOLE_ADMIN_EMAIL];

export function isExplicitAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return email.toLowerCase().trim() === SOLE_ADMIN_EMAIL;
}

function withFirestoreTimeout<T>(promise: Promise<T>, ms = FIRESTORE_OP_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Tiempo de espera de Firestore agotado')), ms);
    promise
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

function getCachedProfile(uid: string): FirestoreUser | null {
  try {
    const raw = localStorage.getItem(`${USER_PROFILE_CACHE_PREFIX}${uid}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function setCachedProfile(uid: string, profile: FirestoreUser): void {
  try {
    localStorage.setItem(`${USER_PROFILE_CACHE_PREFIX}${uid}`, JSON.stringify(profile));
  } catch {}
}

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

  const userEmail = String(data.correo || '').toLowerCase().trim();
  const isExplicitAdmin = isExplicitAdminEmail(userEmail);
  // Exclusively eduardomuleth@gmail.com is granted 'administrador'. Everyone else is strictly 'ciudadano'.
  const normalizedRol: UserRole = isExplicitAdmin ? 'administrador' : 'ciudadano';

  // Compute name with explicit Administrator support for eduardomuleth@gmail.com
  let resolvedNombre = data.nombre ? String(data.nombre).trim() : '';
  if (isExplicitAdmin) {
    if (!resolvedNombre || resolvedNombre === 'Ciudadano' || resolvedNombre.toLowerCase() === 'eduardomuleth') {
      resolvedNombre = 'Luis (Administrador)';
    }
  } else if (!resolvedNombre) {
    resolvedNombre = 'Ciudadano';
  }

  return {
    uid: id,
    nombre: resolvedNombre,
    correo: data.correo || '',
    fechaRegistro: fechaRegistroFormatted,
    fechaRegistroISO: fechaRegistroISO,
    rol: normalizedRol,
    estado: (data.estado as UserStatus) || 'activo',
    sector: isExplicitAdmin ? (data.sector || 'Villa Hermosa (Comando Central)') : (data.sector || 'Comuna 8 - No especificado'),
    ultimoAcceso: data.ultimoAcceso || 'No registrado',
    telefono: data.telefono,
    preferencias: data.preferencias,
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
  const q = query(usersRef, limit(100));

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
    const snapshot = await withFirestoreTimeout(getDocs(query(usersRef, limit(50))));
    const users: FirestoreUser[] = [];

    snapshot.forEach((docSnap) => {
      users.push(normalizeUserData(docSnap.id, docSnap.data()));
    });

    users.sort((a, b) => a.nombre.localeCompare(b.nombre));
    const stats = calculateUserStats(users);
    return { users, stats };
  } catch (err) {
    console.warn('[Security Urban :: UserService] Firestore temporalmente inaccesible o en modo offline:', err);
    return {
      users: [],
      stats: { total: 0, activos: 0, suspendidos: 0, nuevosEstaSemana: 0, ciudadanos: 0, operadores: 0, administradores: 0 }
    };
  }
}

/**
 * Get profile of a specific user with local-first cache and graceful offline recovery
 */
export async function getFirestoreUserProfile(uid: string): Promise<FirestoreUser | null> {
  const cached = getCachedProfile(uid);

  try {
    const userDocRef = doc(db, USERS_COLLECTION, uid);
    const snap = await withFirestoreTimeout(getDoc(userDocRef));
    if (!snap.exists()) {
      return cached;
    }
    const normalized = normalizeUserData(snap.id, snap.data());
    setCachedProfile(uid, normalized);
    return normalized;
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.warn('[Security Urban :: UserService] Firestore en espera o modo sin conexión:', errMsg);

    // 1. Fallback to cached profile if available
    if (cached) {
      return cached;
    }

    // 2. Self-healing fallback from active Firebase Auth session
    if (auth.currentUser && auth.currentUser.uid === uid) {
      const u = auth.currentUser;
      const isAdmin = isExplicitAdminEmail(u.email);
      const fallback: FirestoreUser = {
        uid: u.uid,
        nombre: isAdmin
          ? (u.displayName && u.displayName !== 'Ciudadano' && u.displayName !== 'eduardomuleth' ? u.displayName : 'Luis (Administrador)')
          : (u.displayName || (u.email ? u.email.split('@')[0] : 'Ciudadano')),
        correo: u.email || '',
        fechaRegistro: 'Hoy',
        fechaRegistroISO: new Date().toISOString(),
        rol: isAdmin ? 'administrador' : 'ciudadano',
        estado: 'activo',
        sector: isAdmin ? 'Villa Hermosa (Comando Central)' : 'Villa Hermosa, Comuna 8',
      };
      setCachedProfile(uid, fallback);
      return fallback;
    }

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
    await withFirestoreTimeout(
      updateDoc(userDocRef, {
        rol: newRole,
        fechaModificacionRol: new Date().toISOString(),
      })
    );
    console.log(`[Security Urban :: UserService] ✔ Rol actualizado exitosamente.`);
  } catch (err) {
    console.warn('[Security Urban :: UserService] No se pudo actualizar rol en servidor de inmediato:', err);
  }
}

/**
 * Update user status in Firestore ('activo' | 'suspendido')
 */
export async function updateFirestoreUserStatus(uid: string, newStatus: UserStatus): Promise<void> {
  console.log(`[Security Urban :: UserService] Actualizando estado de ${uid} a "${newStatus}"...`);
  try {
    const userDocRef = doc(db, USERS_COLLECTION, uid);
    await withFirestoreTimeout(
      updateDoc(userDocRef, {
        estado: newStatus,
        fechaModificacionEstado: new Date().toISOString(),
      })
    );
    console.log(`[Security Urban :: UserService] ✔ Estado actualizado exitosamente.`);
  } catch (err) {
    console.warn('[Security Urban :: UserService] No se pudo actualizar estado en servidor de inmediato:', err);
  }
}

/**
 * Updates both Firebase Auth (displayName) and Firestore document ('usuarios/{uid}')
 * keeping both strictly in sync as requested in Section 1.
 */
export async function updateUserProfileAndFirestore(
  user: User,
  data: {
    nombre?: string;
    telefono?: string;
    sector?: string;
    preferencias?: UserPreferences;
  }
): Promise<FirestoreUser> {
  const uid = user.uid;
  const activeAuthUser = auth.currentUser && auth.currentUser.uid === uid ? auth.currentUser : user;
  console.log(`[Security Urban :: UserService] Sincronizando perfil de ${uid} en Auth y Firestore...`, data);

  // 1. Update Firebase Auth displayName if provided and changed
  if (data.nombre !== undefined && data.nombre.trim() !== '') {
    try {
      await updateProfile(activeAuthUser, { displayName: data.nombre.trim() });
      console.log('[Security Urban :: UserService] ✔ Firebase Auth updateProfile(displayName) completado');
    } catch (authErr) {
      console.warn('[Security Urban :: UserService] Advertencia al actualizar displayName en Auth:', authErr);
    }
  }

  // 2. Prepare updated local entity
  const existing = getCachedProfile(uid);
  const nowISO = new Date().toISOString();
  const updatedUser: FirestoreUser = {
    uid,
    nombre: data.nombre !== undefined && data.nombre.trim() !== ''
      ? data.nombre.trim()
      : (existing?.nombre || user.displayName || 'Usuario Comuna 8'),
    correo: user.email || (existing?.correo || ''),
    fechaRegistro: existing?.fechaRegistro || 'Hoy',
    fechaRegistroISO: existing?.fechaRegistroISO || nowISO,
    rol: existing?.rol || 'ciudadano',
    estado: existing?.estado || 'activo',
    sector: data.sector !== undefined ? data.sector.trim() : (existing?.sector || 'Villa Hermosa, Comuna 8'),
    telefono: data.telefono !== undefined ? data.telefono.trim() : existing?.telefono,
    preferencias: data.preferencias !== undefined ? data.preferencias : existing?.preferencias,
    ultimoAcceso: nowISO,
  };
  setCachedProfile(uid, updatedUser);

  // 3. Update Firestore document (with setDoc merge for robustness)
  try {
    const userDocRef = doc(db, USERS_COLLECTION, uid);
    const updates: Record<string, any> = {
      fechaActualizacion: nowISO,
    };
    if (data.nombre !== undefined) updates.nombre = data.nombre.trim();
    if (data.telefono !== undefined) updates.telefono = data.telefono.trim();
    if (data.sector !== undefined) updates.sector = data.sector.trim();
    if (data.preferencias !== undefined) updates.preferencias = data.preferencias;

    await withFirestoreTimeout(setDoc(userDocRef, updates, { merge: true }));
    console.log('[Security Urban :: UserService] ✔ Firestore document actualizado exitosamente');
  } catch (err) {
    console.warn('[Security Urban :: UserService] No se pudo sincronizar de inmediato en Firestore (guardado en caché local):', err);
  }

  return updatedUser;
}

/**
 * Updates user preferences in Firestore
 */
export async function saveUserPreferences(uid: string, prefs: UserPreferences): Promise<void> {
  const cached = getCachedProfile(uid);
  if (cached) {
    setCachedProfile(uid, { ...cached, preferencias: prefs });
  }

  try {
    const userDocRef = doc(db, USERS_COLLECTION, uid);
    await withFirestoreTimeout(
      updateDoc(userDocRef, {
        preferencias: prefs,
        fechaActualizacionPreferencias: new Date().toISOString(),
      })
    );
  } catch (err) {
    console.warn('[Security Urban :: UserService] Advertencia guardando preferencias en Firestore (guardadas localmente):', err);
  }
}

/**
 * Permanently deletes the user account:
 * 1. Resolves the live Firebase Auth User instance (auth.currentUser) so prototype methods are intact
 * 2. Re-authenticates with currentPassword if provided (preventing auth/requires-recent-login)
 * 3. Deletes their document in Firestore ('usuarios/{uid}') and cleans local cache
 * 4. Deletes the user in Firebase Authentication (deleteUser)
 */
export async function deleteUserAccountAndFirestore(
  user: User,
  currentPassword?: string
): Promise<{ success: boolean; requiresRecentLogin?: boolean; error?: string }> {
  const activeUser = auth.currentUser || user;
  const uid = activeUser?.uid || user?.uid;

  if (!activeUser || !uid) {
    return {
      success: false,
      error: 'No se encontró una sesión activa de Firebase Authentication para eliminar.',
    };
  }

  console.log(`[Security Urban :: UserService] ⚠️ Iniciando eliminación irreversible de cuenta: ${uid} (${activeUser.email})`);

  try {
    // 1. If password was provided, re-authenticate first so deleteUser() is guaranteed a fresh token
    if (currentPassword && currentPassword.trim() && activeUser.email) {
      try {
        console.log('[Security Urban :: UserService] Reautenticando usuario antes de eliminar cuenta...');
        const credential = EmailAuthProvider.credential(activeUser.email, currentPassword);
        await reauthenticateWithCredential(activeUser, credential);
        console.log('[Security Urban :: UserService] ✔ Reautenticación exitosa.');
      } catch (reauthErr: unknown) {
        const errObj = reauthErr as { code?: string; message?: string };
        console.warn('[Security Urban :: UserService] ✖ Error en reautenticación:', errObj.code, errObj.message);
        if (
          errObj.code === 'auth/wrong-password' ||
          errObj.code === 'auth/invalid-credential' ||
          errObj.code === 'auth/invalid-login-credentials'
        ) {
          return {
            success: false,
            requiresRecentLogin: true,
            error: 'La contraseña actual ingresada es incorrecta. Verifícala e inténtalo de nuevo.',
          };
        }
        if (errObj.code === 'auth/too-many-requests') {
          return {
            success: false,
            requiresRecentLogin: true,
            error: 'Demasiados intentos fallidos. Espera unos segundos antes de volver a intentarlo.',
          };
        }
        return {
          success: false,
          requiresRecentLogin: true,
          error: `No se pudo verificar tu contraseña (${errObj.code || 'error'}).`,
        };
      }
    }

    // 2. Delete Firebase Auth user FIRST before deleting Firestore doc if no password was given,
    // OR delete Firestore doc then Auth user now that re-auth succeeded.
    // Wait: Firestore rules require request.auth != null && request.auth.uid == userId to delete /usuarios/{userId}.
    // Therefore we must delete the Firestore document WHILE request.auth is still valid, OR if deleteUser fails with requires-recent-login we restore/keep it.
    // Even better: let's read the doc snapshot first so if deleteUser throws auth/requires-recent-login (when no password was supplied), we can restore it immediately!
    let backupUserData: Record<string, any> | null = null;
    const userDocRef = doc(db, USERS_COLLECTION, uid);
    try {
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        backupUserData = snap.data();
      }
      await deleteDoc(userDocRef);
      console.log(`[Security Urban :: UserService] ✔ Documento de Firestore /usuarios/${uid} eliminado`);
    } catch (firestoreErr) {
      console.warn('[Security Urban :: UserService] Aviso eliminando doc en Firestore:', firestoreErr);
    }

    // 3. Delete Firebase Auth user using the real auth.currentUser instance
    try {
      await deleteUser(activeUser);
      try {
        localStorage.removeItem(`${USER_PROFILE_CACHE_PREFIX}${uid}`);
      } catch {}
      console.log(`[Security Urban :: UserService] ✔ Usuario de Firebase Auth eliminado exitosamente`);
      return { success: true };
    } catch (deleteAuthErr: unknown) {
      // Restore Firestore document if Auth deletion failed (e.g. requires-recent-login)
      if (backupUserData) {
        try {
          await setDoc(userDocRef, backupUserData);
        } catch {}
      }
      throw deleteAuthErr;
    }
  } catch (err: unknown) {
    const firebaseErr = err as { code?: string; message?: string };
    console.error('[Security Urban :: UserService] ✖ Error eliminando cuenta:', firebaseErr);
    if (firebaseErr.code === 'auth/requires-recent-login') {
      return {
        success: false,
        requiresRecentLogin: true,
        error: 'Por seguridad de Firebase, ingresa tu contraseña actual en el campo inferior para confirmar la eliminación de tu cuenta.',
      };
    }
    return {
      success: false,
      error: firebaseErr.message || 'Error al eliminar la cuenta de usuario.',
    };
  }
}

/**
 * Deletes a user document from Firestore ('usuarios/{uid}') as an Administrator
 */
export async function deleteFirestoreUserByAdmin(uid: string): Promise<{ success: boolean; error?: string }> {
  console.log(`[Security Urban :: UserService] Eliminando expediente de usuario ${uid} de Firestore...`);
  try {
    const userDocRef = doc(db, USERS_COLLECTION, uid);
    await deleteDoc(userDocRef);
    try {
      localStorage.removeItem(`${USER_PROFILE_CACHE_PREFIX}${uid}`);
    } catch {}
    console.log(`[Security Urban :: UserService] ✔ Expediente de usuario ${uid} eliminado de Firestore.`);
    return { success: true };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('[Security Urban :: UserService] ✖ Error al eliminar usuario de Firestore:', err);
    return {
      success: false,
      error: errMsg || 'No se pudo eliminar el registro del usuario en Firestore.',
    };
  }
}

/**
 * Syncs the current logged in user's profile with Firestore.
 * Ensures the user has a document in 'usuarios/{uid}'.
 */
export async function syncCurrentUserFirestoreProfile(user: User): Promise<FirestoreUser> {
  const userDocRef = doc(db, USERS_COLLECTION, user.uid);
  const isExplicitAdmin = isExplicitAdminEmail(user.email);
  const targetRole: UserRole = isExplicitAdmin ? 'administrador' : 'ciudadano';
  const defaultDisplayName = isExplicitAdmin
    ? (user.displayName && user.displayName !== 'Ciudadano' && user.displayName !== 'eduardomuleth' ? user.displayName : 'Luis (Administrador)')
    : (user.displayName || (user.email ? user.email.split('@')[0] : 'Ciudadano'));

  try {
    const snap = await withFirestoreTimeout(getDoc(userDocRef));
    if (snap.exists()) {
      const rawData = snap.data();
      const normalized = normalizeUserData(snap.id, rawData);

      // Enforce administrator role ONLY for eduardomuleth@gmail.com; enforce ciudadano for everyone else
      if (isExplicitAdmin && normalized.rol !== 'administrador') {
        normalized.rol = 'administrador';
        updateDoc(userDocRef, { rol: 'administrador', nombre: normalized.nombre }).catch(() => {});
      } else if (!isExplicitAdmin && normalized.rol !== 'ciudadano') {
        normalized.rol = 'ciudadano';
        updateDoc(userDocRef, { rol: 'ciudadano' }).catch(() => {});
      }

      setCachedProfile(user.uid, normalized);
      return normalized;
    }

    // Auto-create document: Administrator for eduardomuleth@gmail.com, Ciudadano for everyone else
    const now = new Date();
    const newProfile: Record<string, any> = {
      uid: user.uid,
      nombre: defaultDisplayName,
      correo: user.email || '',
      fechaRegistro: serverTimestamp(),
      fechaRegistroISO: now.toISOString(),
      rol: targetRole,
      estado: 'activo',
      sector: isExplicitAdmin ? 'Villa Hermosa (Comando Central)' : 'Villa Hermosa, Comuna 8',
      ultimoAcceso: now.toISOString(),
    };

    await withFirestoreTimeout(setDoc(userDocRef, newProfile)).catch(() => {});
    console.log(`[Security Urban :: UserService] ✔ Perfil de usuario inicializado en Firestore con rol ${targetRole}:`, user.email);
    const normalized = normalizeUserData(user.uid, newProfile);
    setCachedProfile(user.uid, normalized);
    return normalized;
  } catch (err) {
    console.warn('[Security Urban :: UserService] No se pudo sincronizar perfil en Firestore:', err);
    const cached = getCachedProfile(user.uid);
    if (cached) return cached;
    return {
      uid: user.uid,
      nombre: defaultDisplayName,
      correo: user.email || '',
      fechaRegistro: 'Hoy',
      fechaRegistroISO: new Date().toISOString(),
      rol: targetRole,
      estado: 'activo',
      sector: isExplicitAdmin ? 'Villa Hermosa (Comando Central)' : 'Villa Hermosa, Comuna 8',
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
