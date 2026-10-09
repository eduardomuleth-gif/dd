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
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import {
  User,
  updateProfile,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { db, auth } from './firebaseAuth';
import { FirestoreUser, UserRole, UserStatus, UserStats, UserPreferences } from '../types/user';

const USERS_COLLECTION = 'usuarios';
const USER_PROFILE_CACHE_PREFIX = 'security_urban_user_profile_';
const deletingUserUids = new Set<string>();

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
    const snap = await getDoc(userDocRef);
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
      const fallback: FirestoreUser = {
        uid: u.uid,
        nombre: u.displayName || (u.email ? u.email.split('@')[0] : 'Usuario Comuna 8'),
        correo: u.email || '',
        fechaRegistro: 'Hoy',
        fechaRegistroISO: new Date().toISOString(),
        rol: (u.email || '').toLowerCase().includes('admin') ? 'administrador' : 'ciudadano',
        estado: 'activo',
        sector: 'Villa Hermosa, Comuna 8',
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
    await updateDoc(userDocRef, {
      rol: newRole,
      fechaModificacionRol: new Date().toISOString(),
    });
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
    await updateDoc(userDocRef, {
      estado: newStatus,
      fechaModificacionEstado: new Date().toISOString(),
    });
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
  console.log(`[Security Urban :: UserService] Sincronizando perfil de ${uid} en Auth y Firestore...`, data);

  // 1. Update Firebase Auth displayName if provided and changed
  if (data.nombre !== undefined && data.nombre.trim() !== '') {
    try {
      await updateProfile(user, { displayName: data.nombre.trim() });
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
    rol: existing?.rol || ((user.email || '').toLowerCase().includes('admin') ? 'administrador' : 'ciudadano'),
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

    await setDoc(userDocRef, updates, { merge: true });
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
    await updateDoc(userDocRef, {
      preferencias: prefs,
      fechaActualizacionPreferencias: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[Security Urban :: UserService] Advertencia guardando preferencias en Firestore (guardadas localmente):', err);
  }
}

/**
 * Permanently deletes a user's Firestore document (Admin action) with non-blocking timeout
 */
export async function deleteFirestoreUserByAdmin(uid: string): Promise<void> {
  deletingUserUids.add(uid);
  try {
    const userDocRef = doc(db, USERS_COLLECTION, uid);
    await Promise.race([
      deleteDoc(userDocRef),
      new Promise((_, reject) => setTimeout(() => reject(new Error('FIRESTORE_TIMEOUT')), 2500)),
    ]);
    try {
      localStorage.removeItem(`${USER_PROFILE_CACHE_PREFIX}${uid}`);
    } catch {
      // Ignore storage error
    }
    console.log(`[Security Urban :: UserService] ✔ Documento de usuario ${uid} eliminado de Firestore.`);
  } catch (err) {
    console.warn('[Security Urban :: UserService] Aviso al eliminar documento de usuario en Firestore:', err);
  } finally {
    setTimeout(() => deletingUserUids.delete(uid), 5000);
  }
}

/**
 * Permanently deletes the user account:
 * 1. Re-authenticates with password if provided (prevents auth/requires-recent-login)
 * 2. Deletes their document in Firestore ('usuarios/{uid}') with a bounded timeout so it never hangs
 * 3. Deletes the user in Firebase Authentication (deleteUser) and clears session/cache
 */
export async function deleteUserAccountAndFirestore(
  user: User,
  currentPassword?: string
): Promise<{
  success: boolean;
  requiresRecentLogin?: boolean;
  wrongPassword?: boolean;
  error?: string;
}> {
  let targetUser: User | null = auth.currentUser || user;
  const uid = targetUser?.uid || user?.uid;
  const userEmail = (targetUser?.email || user?.email || '').trim();

  if (!targetUser || !uid) {
    return {
      success: false,
      error: 'No se encontró una sesión activa para eliminar la cuenta.',
    };
  }

  deletingUserUids.add(uid);
  console.log('[Security Urban :: UserService] ⚠️ Iniciando eliminación irreversible de cuenta...');

  const trimmedPassword = currentPassword ? currentPassword.trim() : '';
  let isReauthenticated = false;

  // 1. If password is provided, re-authenticate first so Firebase Auth token is fresh
  if (trimmedPassword && userEmail) {
    try {
      const credential = EmailAuthProvider.credential(userEmail, trimmedPassword);
      await reauthenticateWithCredential(targetUser, credential);
      targetUser = auth.currentUser || targetUser;
      isReauthenticated = true;
      console.log('[Security Urban :: UserService] ✔ Reautenticación previa exitosa.');
    } catch (reauthErr: unknown) {
      const code = (reauthErr as { code?: string })?.code || 'unknown';
      console.warn('[Security Urban :: UserService] Aviso en reauthenticateWithCredential (' + code + ').');

      if (
        code === 'auth/wrong-password' ||
        code === 'auth/invalid-credential' ||
        code === 'auth/invalid-login-credentials'
      ) {
        deletingUserUids.delete(uid);
        return {
          success: false,
          requiresRecentLogin: true,
          wrongPassword: true,
          error: 'La contraseña ingresada es incorrecta. Verifica tus datos e inténtalo nuevamente.',
        };
      }

      if (code === 'auth/too-many-requests') {
        deletingUserUids.delete(uid);
        return {
          success: false,
          requiresRecentLogin: true,
          error: 'Demasiados intentos fallidos. Espera unos minutos antes de volver a intentarlo.',
        };
      }

      // Fallback: sign in directly to refresh the User instance & token
      try {
        const freshCred = await signInWithEmailAndPassword(auth, userEmail, trimmedPassword);
        targetUser = freshCred.user;
        isReauthenticated = true;
        console.log('[Security Urban :: UserService] ✔ Sesión refrescada para eliminación.');
      } catch (fallbackErr: unknown) {
        const fbCode = (fallbackErr as { code?: string })?.code || 'unknown';
        deletingUserUids.delete(uid);
        if (
          fbCode === 'auth/wrong-password' ||
          fbCode === 'auth/invalid-credential' ||
          fbCode === 'auth/invalid-login-credentials'
        ) {
          return {
            success: false,
            requiresRecentLogin: true,
            wrongPassword: true,
            error: 'La contraseña ingresada es incorrecta. Verifica tus datos e inténtalo nuevamente.',
          };
        }
        return {
          success: false,
          requiresRecentLogin: true,
          error: 'No se pudo verificar tu contraseña. Verifica tu conexión e inténtalo nuevamente.',
        };
      }
    }
  }

  // Check if session login is recent (< 4 minutes) when password wasn't provided
  const lastSignInTimeStr = targetUser.metadata?.lastSignInTime;
  const isRecentSession =
    isReauthenticated ||
    (lastSignInTimeStr
      ? Date.now() - new Date(lastSignInTimeStr).getTime() < 4 * 60 * 1000
      : false);

  const userDocRef = doc(db, USERS_COLLECTION, uid);

  try {
    // 2. If reauthenticated or session is recent, delete Firestore doc with a strict 1.2s timeout
    // so Firestore offline/long-polling states NEVER block Firebase Auth deleteUser()
    if (isRecentSession) {
      await Promise.race([
        deleteDoc(userDocRef).catch((e) => {
          console.warn('[Security Urban :: UserService] Aviso eliminando documento en Firestore:', e);
        }),
        new Promise((resolve) => setTimeout(resolve, 1200)),
      ]);
    }

    // 3. Delete Firebase Auth user using the live Auth user instance
    await deleteUser(targetUser);

    // 4. Clean local storage cache & ensure sign-out
    try {
      localStorage.removeItem(`${USER_PROFILE_CACHE_PREFIX}${uid}`);
    } catch {
      // Ignore storage error
    }

    try {
      if (auth.currentUser) {
        await signOut(auth);
      }
    } catch {
      // Ignore signOut error
    }

    console.log('[Security Urban :: UserService] ✔ Cuenta de Firebase Auth eliminada exitosamente.');
    return { success: true };
  } catch (err: unknown) {
    const firebaseErr = err as { code?: string; message?: string };
    const code = firebaseErr.code || 'unknown';
    console.warn('[Security Urban :: UserService] Aviso al eliminar cuenta (' + code + ').');
    deletingUserUids.delete(uid);

    if (code === 'auth/requires-recent-login') {
      return {
        success: false,
        requiresRecentLogin: true,
        error: 'Por seguridad, ingresa tu contraseña actual para confirmar la eliminación definitiva de tu cuenta.',
      };
    }

    if (code === 'auth/network-request-failed') {
      return {
        success: false,
        error: 'Error de conexión de red. Verifica tu internet e inténtalo nuevamente.',
      };
    }

    return {
      success: false,
      error: 'No se pudo eliminar la cuenta en este momento. Ingresa tu contraseña actual e inténtalo nuevamente.',
      requiresRecentLogin: true,
    };
  }
}

/**
 * Syncs the current logged in user's profile with Firestore.
 * Ensures the user has a document in 'usuarios/{uid}'.
 */
export async function syncCurrentUserFirestoreProfile(user: User): Promise<FirestoreUser> {
  if (deletingUserUids.has(user.uid)) {
    return {
      uid: user.uid,
      nombre: user.displayName || 'Usuario',
      correo: user.email || '',
      fechaRegistro: 'Hoy',
      fechaRegistroISO: new Date().toISOString(),
      rol: 'ciudadano',
      estado: 'activo',
      sector: 'Comuna 8',
    };
  }

  const userDocRef = doc(db, USERS_COLLECTION, user.uid);
  try {
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      return normalizeUserData(snap.id, snap.data());
    }

    if (deletingUserUids.has(user.uid)) {
      return normalizeUserData(user.uid, {});
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
