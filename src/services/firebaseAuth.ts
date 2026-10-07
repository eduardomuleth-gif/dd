import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  Firestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';

// Official hardcoded Firebase Configuration for Security Urban
export const firebaseConfig = {
  apiKey: "AIzaSyAcJzklUidrUptqj79dPZruFFCJNOQqyCo",
  authDomain: "security-urban-31a7e.firebaseapp.com",
  projectId: "security-urban-31a7e",
  storageBucket: "security-urban-31a7e.firebasestorage.app",
  messagingSenderId: "715308007048",
  appId: "1:715308007048:web:33bc5c8581a84a4c67e93d",
  measurementId: "G-5F1MZCDSYG"
};

// Initialize Firebase cleanly as a singleton
export const firebaseApp: FirebaseApp = getApps().length > 0
  ? getApp()
  : initializeApp(firebaseConfig);

export const auth: Auth = getAuth(firebaseApp);

// Initialize Firestore with long-polling fallback to prevent WebSocket drops in sandboxed iframe previews
export const db: Firestore = (() => {
  try {
    return initializeFirestore(firebaseApp, {
      experimentalForceLongPolling: true,
    });
  } catch {
    return getFirestore(firebaseApp);
  }
})();

console.log('[Security Urban :: Firebase] SDK inicializado con proyecto:', firebaseConfig.projectId);

/**
 * Execute Sign In with email and password
 * Requirement 3: Checks suspension state in Firestore. If 'suspendido', logs out immediately.
 */
export async function executeSignIn(
  email: string,
  pass: string
): Promise<{ user: User | null; error: string | null; role?: string }> {
  console.log('[Firebase Auth] Iniciando signInWithEmailAndPassword para:', email.trim());
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email.trim(), pass);
    const user = userCredential.user;
    console.log('[Firebase Auth] ✔ Autenticación exitosa para:', user.email, `(UID: ${user.uid}, emailVerified: ${user.emailVerified})`);

    // Requirement 3: Consultar Firestore y verificar estado 'suspendido'
    try {
      const userDocRef = doc(db, 'usuarios', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        if (userData.estado === 'suspendido') {
          console.warn('[Firebase Auth] ✖ Acceso denegado: Usuario suspendido:', user.email);
          await signOut(auth);
          return { user: null, error: 'ACCOUNT_SUSPENDED' };
        }

        // Update last access timestamp
        updateDoc(userDocRef, { ultimoAcceso: new Date().toISOString() }).catch(() => {});
        return { user, error: null, role: userData.rol || 'ciudadano' };
      } else {
        // Self-healing: existing auth user without firestore doc yet
        const defaultRole = email.toLowerCase().includes('admin') ? 'administrador' : 'ciudadano';
        await setDoc(userDocRef, {
          uid: user.uid,
          nombre: user.displayName || email.split('@')[0],
          correo: email.trim().toLowerCase(),
          fechaRegistro: serverTimestamp(),
          fechaRegistroISO: new Date().toISOString(),
          rol: defaultRole,
          estado: 'activo',
          sector: 'Comuna 8 - No especificado',
          ultimoAcceso: new Date().toISOString(),
        });
        return { user, error: null, role: defaultRole };
      }
    } catch (firestoreErr) {
      console.warn('[Firebase Auth] No se pudo consultar Firestore en login (permitiendo sesión):', firestoreErr);
    }

    return { user, error: null };
  } catch (err: unknown) {
    const firebaseError = err as { code?: string; message?: string };
    const code = firebaseError.code || 'unknown';

    // 1. Direct user-not-found code from Firebase Auth
    if (code === 'auth/user-not-found') {
      console.warn('[Firebase Auth] Aviso: Usuario no registrado (auth/user-not-found) para:', email.trim());
      return { user: null, error: 'USER_NOT_FOUND' };
    }

    // 2. Modern Firebase returns auth/invalid-credential for both wrong password AND non-existent user
    if (code === 'auth/invalid-credential') {
      console.warn('[Firebase Auth] Aviso: auth/invalid-credential recibido. Verificando si el usuario existe para:', email.trim());
      try {
        const methods = await fetchSignInMethodsForEmail(auth, email.trim());
        if (methods.length === 0) {
          console.warn('[Firebase Auth] Correo sin métodos de acceso registrados (USER_NOT_FOUND):', email.trim());
          return { user: null, error: 'USER_NOT_FOUND' };
        }
      } catch (checkErr) {
        // If fetchSignInMethodsForEmail fails or is restricted, fallback to standard neutral credential error
        console.warn('[Firebase Auth] Verificación de métodos complementaria ignorada:', checkErr);
      }
      return { user: null, error: 'INVALID_CREDENTIALS' };
    }

    // 3. Wrong password explicitly: Keep neutral as requested for security
    if (code === 'auth/wrong-password') {
      console.warn('[Firebase Auth] Aviso: Contraseña incorrecta para usuario existente:', email.trim());
      return { user: null, error: 'INVALID_CREDENTIALS' };
    }

    if (code === 'auth/invalid-email') {
      console.warn('[Firebase Auth] Aviso: Formato de correo no válido:', email.trim());
      return { user: null, error: 'INVALID_EMAIL' };
    }

    if (code === 'auth/too-many-requests') {
      console.warn('[Firebase Auth] Aviso: Demasiados intentos fallidos (' + code + ')');
      return { user: null, error: 'TOO_MANY_REQUESTS' };
    }

    console.warn('[Firebase Auth] Aviso general en inicio de sesión (' + code + '):', firebaseError.message);
    return { user: null, error: firebaseError.message || 'AUTH_ERROR' };
  }
}

/**
 * Execute Sign Up and immediately trigger sendEmailVerification()
 * Requirement 1: Stores complementary user document in Firestore 'usuarios' collection.
 */
export async function executeSignUp(
  email: string,
  pass: string,
  displayName: string,
  sector: string = 'No especificado'
): Promise<{ user: User | null; error: string | null }> {
  console.log('[Firebase Auth] Iniciando createUserWithEmailAndPassword para:', email.trim());
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    const user = userCredential.user;
    console.log('[Firebase Auth] ✔ Usuario creado en Firebase Auth con UID:', user.uid, 'Email:', user.email);

    // PROMPT 4: Inmediatamente después de createUserWithEmailAndPassword(), disparar sendEmailVerification()
    console.log('[Firebase Auth] ▶ [INMEDIATO] Disparando sendEmailVerification() automático para:', user.email);
    try {
      await sendEmailVerification(user);
      console.log(
        `%c[Firebase Auth] ✔ [INMEDIATO] Correo de verificación inicial enviado exitosamente a: ${user.email}`,
        'color: #10b981; font-weight: bold;'
      );
    } catch (emailErr: any) {
      console.error('[Firebase Auth] ✖ [INMEDIATO] Error en envío inicial de sendEmailVerification():', {
        code: emailErr?.code,
        message: emailErr?.message,
        detail: emailErr,
      });
    }

    // Update display name if provided
    if (displayName.trim()) {
      try {
        await updateProfile(user, { displayName: displayName.trim() });
        console.log('[Firebase Auth] ✔ Perfil de usuario actualizado con nombre:', displayName.trim());
      } catch (profileErr) {
        console.warn('[Firebase Auth] No se pudo actualizar el nombre de perfil:', profileErr);
      }
    }

    // Requirement 1: Complementary record in Firestore 'usuarios' collection
    try {
      const userDocRef = doc(db, 'usuarios', user.uid);
      const isInitialAdmin = email.toLowerCase().includes('admin');
      const now = new Date();
      await setDoc(userDocRef, {
        uid: user.uid,
        nombre: displayName.trim() || email.split('@')[0],
        correo: email.trim().toLowerCase(),
        fechaRegistro: serverTimestamp(),
        fechaRegistroISO: now.toISOString(),
        rol: isInitialAdmin ? 'administrador' : 'ciudadano',
        estado: 'activo',
        sector: sector.trim() || 'No especificado',
        ultimoAcceso: now.toISOString(),
      });
      console.log('[Firebase Auth] ✔ Registro complementario guardado en Firestore (usuarios/' + user.uid + ')');
    } catch (firestoreErr) {
      console.error('[Firebase Auth] ✖ Error guardando en Firestore usuarios:', firestoreErr);
      // Non-fatal: the user account in Auth was created successfully
    }

    return { user, error: null };
  } catch (err: unknown) {
    const firebaseError = err as { code?: string; message?: string };
    const code = firebaseError.code || 'unknown';
    console.error('[Firebase Auth] ✖ Error en registro createUserWithEmailAndPassword (' + code + '):', firebaseError.message);

    if (code === 'auth/email-already-in-use') {
      return { user: null, error: 'EMAIL_ALREADY_IN_USE' };
    }

    if (code === 'auth/weak-password') {
      return { user: null, error: 'WEAK_PASSWORD' };
    }

    return { user: null, error: firebaseError.message || 'SIGNUP_ERROR' };
  }
}

/**
 * Re-send Email Verification
 */
export async function executeSendEmailVerification(user: User): Promise<{ success: boolean; error: string | null }> {
  console.log('[Firebase Auth] Disparando reenvío de sendEmailVerification() para:', user.email);
  try {
    await sendEmailVerification(user);
    console.log(`%c[Firebase Auth] ✔ Correo de verificación reenviado con éxito a: ${user.email}`, 'color: #10b981; font-weight: bold;');
    return { success: true, error: null };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[Firebase Auth] ✖ Error en reenvío sendEmailVerification():', errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Execute Password Reset Email
 */
export async function executePasswordReset(email: string): Promise<{ success: boolean; error: string | null }> {
  console.log('[Firebase Auth] Disparando sendPasswordResetEmail() para:', email.trim());
  try {
    await sendPasswordResetEmail(auth, email.trim());
    console.log(`%c[Firebase Auth] ✔ Correo de recuperación de contraseña enviado exitosamente a: ${email.trim()}`, 'color: #10b981; font-weight: bold;');
    return { success: true, error: null };
  } catch (err: unknown) {
    const firebaseError = err as { code?: string; message?: string };
    console.error('[Firebase Auth] ✖ Error en sendPasswordResetEmail():', firebaseError.code, firebaseError.message);
    // Return success: true to UI to prevent email enumeration, but log the real error in console
    return { success: true, error: null };
  }
}

/**
 * Execute Sign Out
 */
export async function executeSignOut(): Promise<void> {
  try {
    console.log('[Firebase Auth] Cerrando sesión del usuario...');
    await signOut(auth);
    console.log('[Firebase Auth] ✔ Sesión cerrada con éxito.');
  } catch (err) {
    console.error('[Firebase Auth] ✖ Error al cerrar sesión:', err);
  }
}

/**
 * Subscribe to Auth State Changes
 */
export function subscribeToAuth(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log('[Firebase Auth] Sesión activa detectada:', user.email, `(emailVerified: ${user.emailVerified})`);
    } else {
      console.log('[Firebase Auth] No hay sesión activa.');
    }
    callback(user);
  });
}
