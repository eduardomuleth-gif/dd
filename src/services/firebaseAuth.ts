import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  sendEmailVerification,
  sendPasswordResetEmail,
  applyActionCode,
  ActionCodeSettings,
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
auth.languageCode = 'es';

const EMAIL_VERIFICATION_COOLDOWN_MS = 60_000;
const lastVerificationEmailSentMap = new Map<string, number>();

export interface VerificationDispatchDiagnostic {
  status: 'idle' | 'sending' | 'accepted' | 'error';
  maskedEmail: string;
  uid?: string;
  timestamp: string;
  code?: string;
  rawMessage?: string;
  readableMessage: string;
}

let currentVerificationDiagnostic: VerificationDispatchDiagnostic = {
  status: 'idle',
  maskedEmail: '',
  timestamp: '',
  readableMessage: '',
};

const diagnosticListeners = new Set<(state: VerificationDispatchDiagnostic) => void>();

export function maskEmailForLog(email?: string | null): string {
  if (!email) return '(sin-email)';
  const trimmed = email.trim();
  const atIndex = trimmed.indexOf('@');
  if (atIndex <= 0) return '***';
  const local = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex + 1);
  const visibleStart = local.slice(0, Math.min(2, local.length));
  const visibleEnd = local.length > 3 ? local.slice(-1) : '';
  return `${visibleStart}***${visibleEnd}@${domain}`;
}

function updateVerificationDiagnostic(next: VerificationDispatchDiagnostic): void {
  currentVerificationDiagnostic = next;
  diagnosticListeners.forEach((listener) => {
    try {
      listener(next);
    } catch {
      // Ignore listener errors
    }
  });
}

export function getVerificationDiagnostic(): VerificationDispatchDiagnostic {
  return currentVerificationDiagnostic;
}

export function subscribeToVerificationDiagnostic(
  listener: (state: VerificationDispatchDiagnostic) => void
): () => void {
  diagnosticListeners.add(listener);
  listener(currentVerificationDiagnostic);
  return () => {
    diagnosticListeners.delete(listener);
  };
}

export function getLastInitialVerificationError(): { code: string; message: string } | null {
  if (currentVerificationDiagnostic.status === 'error') {
    return {
      code: currentVerificationDiagnostic.code || 'unknown',
      message: currentVerificationDiagnostic.readableMessage,
    };
  }
  return null;
}

export function clearLastInitialVerificationError(): void {
  if (currentVerificationDiagnostic.status === 'error') {
    updateVerificationDiagnostic({
      ...currentVerificationDiagnostic,
      status: 'idle',
    });
  }
}

export function getVerificationEmailCooldownRemaining(email?: string | null): number {
  if (!email) return 0;
  const key = email.trim().toLowerCase();
  const lastSent = lastVerificationEmailSentMap.get(key);
  if (!lastSent) return 0;
  const elapsed = Date.now() - lastSent;
  return elapsed < EMAIL_VERIFICATION_COOLDOWN_MS
    ? Math.ceil((EMAIL_VERIFICATION_COOLDOWN_MS - elapsed) / 1000)
    : 0;
}

function markVerificationEmailSent(email?: string | null): void {
  if (!email) return;
  lastVerificationEmailSentMap.set(email.trim().toLowerCase(), Date.now());
}

/**
 * Translates Firebase Auth error codes into clear Spanish messages while preserving the code for diagnostics
 */
export function formatFirebaseEmailError(code: string, rawMessage?: string): string {
  switch (code) {
    case 'auth/unauthorized-continue-uri':
      return `El dominio actual (${typeof window !== 'undefined' ? window.location.hostname : ''}) no está en "Dominios autorizados" de Firebase Console (${code}).`;
    case 'auth/invalid-continue-uri':
      return `La URL de retorno configurada en ActionCodeSettings no es válida (${code}).`;
    case 'auth/missing-continue-uri':
      return `Falta la URL de continuación en ActionCodeSettings (${code}).`;
    case 'auth/too-many-requests':
      return `Firebase rechazó la solicitud por límite de envíos consecutivos (${code}). Mensaje original: ${rawMessage || 'Too many requests'}`;
    case 'auth/invalid-email':
      return `La dirección de correo electrónico no tiene un formato válido (${code}).`;
    case 'auth/user-not-found':
      return `No existe ninguna cuenta registrada con este correo electrónico (${code}).`;
    default:
      return `Error de Firebase (${code}): ${rawMessage || 'Error desconocido'}`;
  }
}

/**
 * ActionCodeSettings for email verification and password reset redirecting back to the Vercel production URL.
 */
export const verificationActionCodeSettings: ActionCodeSettings = {
  url: 'https://securityurban.vercel.app',
  handleCodeInApp: false,
};

/**
 * Builds ActionCodeSettings pointing back to https://securityurban.vercel.app
 * so email verification and password reset links return directly to the login screen.
 */
export function buildActionCodeSettings(_flow: 'verifyEmail' | 'resetPassword'): ActionCodeSettings {
  return verificationActionCodeSettings;
}

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
  const maskedTarget = maskEmailForLog(email);
  console.log('[DIAGNÓSTICO VERIFICACIÓN] 1. Iniciando registro con createUserWithEmailAndPassword() para:', maskedTarget);
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    const user = userCredential.user;

    if (!user || !user.email) {
      const preErrorMsg = 'Excepción previa al envío: El objeto user devuelto por createUserWithEmailAndPassword no tiene email válido.';
      console.warn('[DIAGNÓSTICO VERIFICACIÓN] ✖', preErrorMsg, { uid: user?.uid });
      updateVerificationDiagnostic({
        status: 'error',
        maskedEmail: maskedTarget,
        uid: user?.uid,
        timestamp: new Date().toLocaleTimeString(),
        code: 'auth/missing-user-email',
        rawMessage: preErrorMsg,
        readableMessage: preErrorMsg,
      });
    } else {
      const maskedCreatedUserEmail = maskEmailForLog(user.email);
      console.log(
        '[DIAGNÓSTICO VERIFICACIÓN] 2. Usuario autenticado creado correctamente:',
        {
          uid: user.uid,
          email: maskedCreatedUserEmail,
          sameAsCurrentUser: auth.currentUser?.uid === user.uid,
          emailVerified: user.emailVerified,
        }
      );

      // Update reactive diagnostic state to 'sending' BEFORE awaiting sendEmailVerification
      updateVerificationDiagnostic({
        status: 'sending',
        maskedEmail: maskedCreatedUserEmail,
        uid: user.uid,
        timestamp: new Date().toLocaleTimeString(),
        readableMessage: `Enviando solicitud sendEmailVerification() a Firebase para ${maskedCreatedUserEmail}...`,
      });

      const actionCodeSettings: ActionCodeSettings = {
        url: 'https://securityurban.vercel.app',
        handleCodeInApp: false,
      };

      console.log(
        '[DIAGNÓSTICO VERIFICACIÓN] 3. Inicio del envío: ejecutando await sendEmailVerification(user, actionCodeSettings) para:',
        maskedCreatedUserEmail,
        'con URL:',
        actionCodeSettings.url
      );
      try {
        await sendEmailVerification(user, actionCodeSettings);
        markVerificationEmailSent(user.email);
        const acceptedMsg = `Firebase aceptó la solicitud de envío del correo de verificación (promesa sendEmailVerification resuelta para ${maskedCreatedUserEmail} con redirección a ${actionCodeSettings.url}). Esto confirma que Firebase procesó la petición, aunque la entrega final depende del servidor de correo.`;
        console.log(
          `%c[DIAGNÓSTICO VERIFICACIÓN] 4. ✔ Promesa sendEmailVerification() resuelta con éxito para: ${maskedCreatedUserEmail}`,
          'color: #10b981; font-weight: bold;'
        );
        updateVerificationDiagnostic({
          status: 'accepted',
          maskedEmail: maskedCreatedUserEmail,
          uid: user.uid,
          timestamp: new Date().toLocaleTimeString(),
          readableMessage: acceptedMsg,
        });
      } catch (emailErr: any) {
        const errCode = emailErr?.code || 'auth/unknown-email-error';
        const rawMsg = emailErr?.message || String(emailErr);
        const readableMsg = formatFirebaseEmailError(errCode, rawMsg);
        console.warn('[DIAGNÓSTICO VERIFICACIÓN] 4. ✖ Error devuelto por Firebase en sendEmailVerification():', {
          code: errCode,
          message: rawMsg,
          maskedEmail: maskedCreatedUserEmail,
          uid: user.uid,
        });
        updateVerificationDiagnostic({
          status: 'error',
          maskedEmail: maskedCreatedUserEmail,
          uid: user.uid,
          timestamp: new Date().toLocaleTimeString(),
          code: errCode,
          rawMessage: rawMsg,
          readableMessage: readableMsg,
        });
      }
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
      console.warn('[Firebase Auth] Aviso guardando en Firestore usuarios:', firestoreErr);
      // Non-fatal: the user account in Auth was created successfully
    }

    return { user, error: null };
  } catch (err: unknown) {
    const firebaseError = err as { code?: string; message?: string };
    const code = firebaseError.code || 'unknown';
    console.warn('[DIAGNÓSTICO VERIFICACIÓN] ✖ Excepción antes de ejecutar el envío (falló createUserWithEmailAndPassword):', {
      code,
      message: firebaseError.message,
      maskedEmail: maskedTarget,
    });

    if (code === 'auth/email-already-in-use') {
      return { user: null, error: 'EMAIL_ALREADY_IN_USE' };
    }

    if (code === 'auth/weak-password') {
      return { user: null, error: 'WEAK_PASSWORD' };
    }

    return { user: null, error: `${code}: ${firebaseError.message || 'SIGNUP_ERROR'}` };
  }
}

/**
 * Re-send Email Verification
 */
export async function executeSendEmailVerification(
  user: User
): Promise<{ success: boolean; error: string | null; code?: string; rawMessage?: string }> {
  const targetUser = auth.currentUser && auth.currentUser.uid === user.uid ? auth.currentUser : user;
  const maskedEmail = maskEmailForLog(targetUser?.email);

  if (!targetUser || !targetUser.email) {
    const missingMsg = 'Excepción previa al envío: No hay un usuario autenticado válido o el usuario carece de dirección de correo.';
    console.warn('[DIAGNÓSTICO VERIFICACIÓN] ✖', missingMsg);
    updateVerificationDiagnostic({
      status: 'error',
      maskedEmail,
      uid: targetUser?.uid,
      timestamp: new Date().toLocaleTimeString(),
      code: 'auth/missing-user',
      rawMessage: missingMsg,
      readableMessage: missingMsg,
    });
    return {
      success: false,
      error: missingMsg,
      code: 'auth/missing-user',
      rawMessage: missingMsg,
    };
  }

  console.log('[DIAGNÓSTICO VERIFICACIÓN] ▶ Inicio de envío manual sendEmailVerification() para:', {
    maskedEmail,
    uid: targetUser.uid,
    emailVerified: targetUser.emailVerified,
  });

  updateVerificationDiagnostic({
    status: 'sending',
    maskedEmail,
    uid: targetUser.uid,
    timestamp: new Date().toLocaleTimeString(),
    readableMessage: `Ejecutando sendEmailVerification() en Firebase para ${maskedEmail}...`,
  });

  const actionCodeSettings: ActionCodeSettings = {
    url: 'https://securityurban.vercel.app',
    handleCodeInApp: false,
  };

  try {
    console.log(
      '[DIAGNÓSTICO VERIFICACIÓN] Ejecutando await sendEmailVerification(targetUser, actionCodeSettings) con URL:',
      actionCodeSettings.url
    );
    await sendEmailVerification(targetUser, actionCodeSettings);
    markVerificationEmailSent(targetUser.email);
    const acceptedMsg = `Firebase aceptó la solicitud de envío (promesa sendEmailVerification resuelta para ${maskedEmail} con redirección a ${actionCodeSettings.url}).`;
    console.log(`%c[DIAGNÓSTICO VERIFICACIÓN] ✔ Promesa sendEmailVerification() resuelta para: ${maskedEmail}`, 'color: #10b981; font-weight: bold;');
    updateVerificationDiagnostic({
      status: 'accepted',
      maskedEmail,
      uid: targetUser.uid,
      timestamp: new Date().toLocaleTimeString(),
      readableMessage: acceptedMsg,
    });
    return { success: true, error: null };
  } catch (err: unknown) {
    const firebaseErr = err as { code?: string; message?: string };
    const errCode = firebaseErr?.code || 'auth/unknown-error';
    const rawMsg = firebaseErr?.message || String(err);
    const readableMsg = formatFirebaseEmailError(errCode, rawMsg);
    console.warn('[DIAGNÓSTICO VERIFICACIÓN] ✖ Error devuelto por Firebase en sendEmailVerification():', {
      code: errCode,
      message: rawMsg,
      maskedEmail,
      uid: targetUser.uid,
    });
    updateVerificationDiagnostic({
      status: 'error',
      maskedEmail,
      uid: targetUser.uid,
      timestamp: new Date().toLocaleTimeString(),
      code: errCode,
      rawMessage: rawMsg,
      readableMessage: readableMsg,
    });
    return {
      success: false,
      error: readableMsg,
      code: errCode,
      rawMessage: rawMsg,
    };
  }
}

/**
 * Execute Password Reset Email using standard Firebase hosted flow redirecting to https://securityurban.vercel.app
 */
export async function executePasswordReset(
  email: string
): Promise<{ success: boolean; error: string | null; code?: string }> {
  const actionCodeSettings: ActionCodeSettings = {
    url: 'https://securityurban.vercel.app',
    handleCodeInApp: false,
  };
  console.log('[Firebase Auth] Disparando sendPasswordResetEmail() para:', email.trim(), 'con actionCodeSettings:', actionCodeSettings);
  try {
    await sendPasswordResetEmail(auth, email.trim(), actionCodeSettings);
    console.log(`%c[Firebase Auth] ✔ Correo de recuperación de contraseña enviado exitosamente a: ${email.trim()}`, 'color: #10b981; font-weight: bold;');
    return { success: true, error: null };
  } catch (err: unknown) {
    const firebaseError = err as { code?: string; message?: string };
    const errCode = firebaseError?.code || 'auth/unknown-error';
    const readableMsg = formatFirebaseEmailError(errCode, firebaseError?.message);
    console.warn(`[Firebase Auth] ⚠ Fallo en sendPasswordResetEmail() [Código: ${errCode}]:`, firebaseError?.message);
    return {
      success: false,
      error: readableMsg,
      code: errCode,
    };
  }
}

/**
 * Apply Email Verification Action Code (when user returns with ?mode=verifyEmail&oobCode=...)
 */
export async function executeApplyActionCode(oobCode: string): Promise<{ success: boolean; error: string | null }> {
  console.log('[Firebase Auth] Aplicando código de verificación de correo (applyActionCode)...');
  try {
    await applyActionCode(auth, oobCode);
    if (auth.currentUser) {
      await auth.currentUser.reload();
    }
    console.log('%c[Firebase Auth] ✔ Código de verificación aplicado con éxito.', 'color: #10b981; font-weight: bold;');
    return { success: true, error: null };
  } catch (err: unknown) {
    const firebaseError = err as { code?: string; message?: string };
    console.error('[Firebase Auth] ✖ Error en applyActionCode():', firebaseError.code, firebaseError.message);
    if (firebaseError.code === 'auth/expired-action-code') {
      return { success: false, error: 'El enlace de verificación ha expirado. Solicita uno nuevo.' };
    }
    if (firebaseError.code === 'auth/invalid-action-code') {
      return { success: false, error: 'El enlace de verificación ya fue utilizado o no es válido.' };
    }
    return { success: false, error: firebaseError.message || 'No se pudo verificar el código.' };
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
