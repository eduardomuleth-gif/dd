import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, User } from 'firebase/auth';
import { getFirestore, initializeFirestore, Firestore } from 'firebase/firestore';
import type { User as SupabaseUser, Session as SupabaseSession } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

// Se mantienen las instancias de Firebase temporalmente para compatibilidad
export const firebaseConfig = {
  apiKey: "AIzaSyAcJzklUidrUptqj79dPZruFFCJNOQqyCo",
  authDomain: "security-urban-31a7e.firebaseapp.com",
  projectId: "security-urban-31a7e",
  storageBucket: "security-urban-31a7e.firebasestorage.app",
  messagingSenderId: "715308007048",
  appId: "1:715308007048:web:33bc5c8581a84a4c67e93d",
  measurementId: "G-5F1MZCDSYG"
};

export const firebaseApp: FirebaseApp = getApps().length > 0
  ? getApp()
  : initializeApp(firebaseConfig);

const baseFirebaseAuth: Auth = getAuth(firebaseApp);

export const db: Firestore = (() => {
  try {
    return initializeFirestore(firebaseApp, {
      experimentalForceLongPolling: true,
    });
  } catch {
    return getFirestore(firebaseApp);
  }
})();

// Referencia en memoria al usuario actual adaptado desde Supabase Auth
let currentAdaptedUser: User | null = null;

// Usuario registrado pendiente de confirmación cuando Supabase devuelve user con session === null
let pendingVerificationUser: User | null = null;
let pendingSignupCredentials: { email: string; password: string } | null = null;

// Estado de recuperación de contraseña (PASSWORD_RECOVERY)
export interface PasswordRecoveryState {
  isRecovery: boolean;
  email: string | null;
  hasValidSession: boolean;
  linkError: string | null;
}

function detectInitialRecoveryUrl(): { isRecoveryUrl: boolean; linkError: string | null } {
  if (typeof window === 'undefined') {
    return { isRecoveryUrl: false, linkError: null };
  }
  const hash = window.location.hash || '';
  const search = window.location.search || '';
  const combined = `${hash}&${search}`;

  const isRecoveryType =
    combined.includes('type=recovery') ||
    new URLSearchParams(search).get('type') === 'recovery';

  if (combined.includes('error_code=otp_expired') || (combined.includes('error=') && isRecoveryType)) {
    return {
      isRecoveryUrl: true,
      linkError: 'El enlace de recuperación ha expirado o ya fue utilizado. Por favor solicita uno nuevo.',
    };
  }

  return { isRecoveryUrl: isRecoveryType, linkError: null };
}

const initialRecoveryCheck = detectInitialRecoveryUrl();
let passwordRecoveryState: PasswordRecoveryState = {
  isRecovery: initialRecoveryCheck.isRecoveryUrl,
  email: null,
  hasValidSession: false,
  linkError: initialRecoveryCheck.linkError,
};

const recoveryListeners = new Set<(state: PasswordRecoveryState) => void>();

function notifyRecoveryListeners(): void {
  const snapshot = { ...passwordRecoveryState };
  recoveryListeners.forEach((listener) => {
    try {
      listener(snapshot);
    } catch (err) {
      console.warn('[Supabase Auth] Aviso notificando listener de recuperación:', err);
    }
  });
}

// Suscriptores registrados mediante subscribeToAuth()
const authListeners = new Set<(user: User | null) => void>();

function notifyAuthListeners(user: User | null): void {
  authListeners.forEach((listener) => {
    try {
      listener(user);
    } catch (err) {
      console.warn('[Supabase Auth] Aviso notificando listener de sesión:', err);
    }
  });
}

// Proxy ligero sobre `auth` para que `auth.currentUser` devuelva siempre el usuario activo de Supabase
export const auth: Auth = new Proxy(baseFirebaseAuth, {
  get(target, prop, receiver) {
    if (prop === 'currentUser') {
      return currentAdaptedUser;
    }
    const value = Reflect.get(target, prop, receiver);
    return typeof value === 'function' ? value.bind(target) : value;
  },
});

/**
 * Adaptador compatible: Convierte un usuario de Supabase Auth (`SupabaseUser`)
 * a la interfaz `User` que esperan los componentes actuales de Security Urban.
 * - Si el usuario tiene `email_confirmed_at` o Supabase ya otorgó una `session` activa
 *   (cuando la confirmación de correo está desactivada en desarrollo), `emailVerified` es `true`.
 * - Si `session === null` y `email_confirmed_at === null`, `emailVerified` es estrictamente `false`.
 */
export function mapSupabaseUserToCompatUser(
  sbUser: SupabaseUser,
  overrideDisplayName?: string,
  activeSession?: SupabaseSession | null
): User {
  const derivedDisplayName =
    overrideDisplayName ||
    sbUser.user_metadata?.nombre ||
    sbUser.user_metadata?.full_name ||
    sbUser.user_metadata?.displayName ||
    (sbUser.email ? sbUser.email.split('@')[0] : 'Usuario Comunal');

  // Si Supabase otorgó sesión activa o email_confirmed_at está presente, el usuario puede continuar.
  // Si session === null y email_confirmed_at es null, emailVerified se mantiene en false.
  const isConfirmed = Boolean(sbUser.email_confirmed_at || activeSession);

  const compatUser: Record<string, any> = {
    uid: sbUser.id,
    email: sbUser.email ?? null,
    displayName: derivedDisplayName,
    emailVerified: isConfirmed,
    phoneNumber: sbUser.phone || sbUser.user_metadata?.telefono || null,
    photoURL: sbUser.user_metadata?.avatar_url || null,
    isAnonymous: false,
    tenantId: null,
    providerData: [],
    providerId: 'supabase',
    metadata: {
      creationTime: sbUser.created_at,
      lastSignInTime: sbUser.last_sign_in_at || sbUser.created_at,
    },
    refreshToken: '',
    reload: async () => {
      // 1. Consultar si ya existe sesión activa en Supabase
      const { data: sessionData } = await supabase.auth.getSession();

      if (sessionData?.session?.user) {
        const fresh = sessionData.session.user;
        const confirmedNow = Boolean(fresh.email_confirmed_at || sessionData.session);
        compatUser.uid = fresh.id;
        compatUser.email = fresh.email ?? compatUser.email;
        compatUser.displayName =
          fresh.user_metadata?.nombre ||
          fresh.user_metadata?.full_name ||
          fresh.user_metadata?.displayName ||
          compatUser.displayName;
        compatUser.emailVerified = confirmedNow;

        if (confirmedNow) {
          pendingVerificationUser = null;
          pendingSignupCredentials = null;
          currentAdaptedUser = compatUser as unknown as User;
          await supabase
            .from('usuarios')
            .update({
              correoVerificado: true,
              ultimoAcceso: new Date().toISOString(),
            })
            .eq('uid', fresh.id);
        }
        return;
      }

      // 2. Si el usuario se registró con session === null y acaba de confirmar su correo
      // (por ejemplo en otra pestaña o desde su celular), intentar obtener la sesión real
      if (
        pendingSignupCredentials &&
        compatUser.email &&
        pendingSignupCredentials.email.toLowerCase() === String(compatUser.email).toLowerCase()
      ) {
        const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
          email: pendingSignupCredentials.email,
          password: pendingSignupCredentials.password,
        });

        if (!signInErr && signInData?.user && signInData?.session) {
          const fresh = signInData.user;
          compatUser.uid = fresh.id;
          compatUser.email = fresh.email ?? compatUser.email;
          compatUser.displayName =
            fresh.user_metadata?.nombre ||
            fresh.user_metadata?.full_name ||
            fresh.user_metadata?.displayName ||
            compatUser.displayName;
          compatUser.emailVerified = Boolean(fresh.email_confirmed_at || signInData.session);

          pendingVerificationUser = null;
          pendingSignupCredentials = null;
          currentAdaptedUser = compatUser as unknown as User;

          await supabase
            .from('usuarios')
            .update({
              correoVerificado: true,
              ultimoAcceso: new Date().toISOString(),
            })
            .eq('uid', fresh.id);

          notifyAuthListeners(currentAdaptedUser);
          return;
        }
      }

      // 3. Fallback estándar con getUser() si existiera token en memoria
      const { data, error } = await supabase.auth.getUser();
      if (!error && data?.user) {
        const fresh = data.user;
        const confirmedNow = Boolean(fresh.email_confirmed_at);
        compatUser.email = fresh.email ?? compatUser.email;
        compatUser.displayName =
          fresh.user_metadata?.nombre ||
          fresh.user_metadata?.full_name ||
          fresh.user_metadata?.displayName ||
          compatUser.displayName;
        compatUser.emailVerified = confirmedNow;

        if (confirmedNow && fresh.id) {
          pendingVerificationUser = null;
          pendingSignupCredentials = null;
          await supabase
            .from('usuarios')
            .update({
              correoVerificado: true,
              ultimoAcceso: new Date().toISOString(),
            })
            .eq('uid', fresh.id);
        }
      }
    },
    getIdToken: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token || '';
    },
    getIdTokenResult: async () => {
      const { data } = await supabase.auth.getSession();
      return {
        token: data.session?.access_token || '',
        claims: {},
        authTime: new Date().toISOString(),
        issuedAtTime: new Date().toISOString(),
        expirationTime: new Date(Date.now() + 3600 * 1000).toISOString(),
        signInProvider: 'password',
        signInSecondFactor: null,
      };
    },
    delete: async () => {
      pendingVerificationUser = null;
      pendingSignupCredentials = null;
      currentAdaptedUser = null;
      await supabase.auth.signOut();
    },
    toJSON: () => ({
      uid: compatUser.uid,
      email: compatUser.email,
      displayName: compatUser.displayName,
      emailVerified: compatUser.emailVerified,
    }),
  };

  return compatUser as unknown as User;
}

console.log('[Security Urban :: Supabase Auth] Servicio de autenticación inicializado con Supabase.');

/**
 * Execute Sign In with email and password via Supabase Auth (`supabase.auth.signInWithPassword`)
 * Verifica en `public.usuarios` si la cuenta está en estado `suspendido` y obtiene su `rol`.
 */
export async function executeSignIn(
  email: string,
  pass: string
): Promise<{ user: User | null; error: string | null; role?: string }> {
  const cleanEmail = email.trim();
  console.log('[Supabase Auth] Iniciando signInWithPassword para:', cleanEmail);

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: pass,
    });

    if (error || !data.user) {
      const msg = (error?.message || '').toLowerCase();
      const code = (error as any)?.code || '';

      if (msg.includes('invalid format') || msg.includes('invalid email')) {
        console.warn('[Supabase Auth] Aviso: Formato de correo no válido:', cleanEmail);
        return { user: null, error: 'INVALID_EMAIL' };
      }

      if (msg.includes('rate limit') || msg.includes('too many requests') || code === 'over_request_rate_limit') {
        console.warn('[Supabase Auth] Aviso: Demasiados intentos fallidos.');
        return { user: null, error: 'TOO_MANY_REQUESTS' };
      }

      if (msg.includes('user not found')) {
        console.warn('[Supabase Auth] Aviso: Usuario no registrado para:', cleanEmail);
        return { user: null, error: 'USER_NOT_FOUND' };
      }

      console.warn('[Supabase Auth] Aviso en signInWithPassword:', error?.message);
      return { user: null, error: 'INVALID_CREDENTIALS' };
    }

    const sbUser = data.user;
    const nowISO = new Date().toISOString();
    const isEmailConfirmed = Boolean(sbUser.email_confirmed_at || data.session);

    // Consultar public.usuarios en Supabase para verificar estado 'suspendido' y rol
    let userRole = 'ciudadano';
    let profileName: string | undefined = undefined;

    try {
      const { data: userProfile, error: profileError } = await supabase
        .from('usuarios')
        .select('uid, nombre, rol, estado')
        .eq('uid', sbUser.id)
        .maybeSingle();

      if (!profileError && userProfile) {
        if (userProfile.estado === 'suspendido') {
          console.warn('[Supabase Auth] ✖ Acceso denegado: Usuario suspendido:', cleanEmail);
          await supabase.auth.signOut();
          currentAdaptedUser = null;
          pendingVerificationUser = null;
          pendingSignupCredentials = null;
          return { user: null, error: 'ACCOUNT_SUSPENDED' };
        }

        userRole = userProfile.rol || 'ciudadano';
        profileName = userProfile.nombre || undefined;

        await supabase
          .from('usuarios')
          .update({
            ultimoAcceso: nowISO,
            correoVerificado: isEmailConfirmed,
          })
          .eq('uid', sbUser.id);
      } else if (!profileError && !userProfile) {
        const fallbackName =
          sbUser.user_metadata?.nombre ||
          sbUser.user_metadata?.full_name ||
          cleanEmail.split('@')[0];
        const fallbackSector =
          sbUser.user_metadata?.sector || 'Comuna 8 - No especificado';

        await supabase.from('usuarios').upsert({
          uid: sbUser.id,
          nombre: fallbackName,
          correo: cleanEmail.toLowerCase(),
          fechaRegistroISO: nowISO,
          rol: 'ciudadano',
          estado: 'activo',
          sector: fallbackSector,
          ultimoAcceso: nowISO,
          correoVerificado: isEmailConfirmed,
        });
        userRole = 'ciudadano';
        profileName = fallbackName;
      }
    } catch (dbErr) {
      console.warn('[Supabase Auth] No se pudo consultar public.usuarios en login (permitiendo sesión):', dbErr);
    }

    pendingVerificationUser = null;
    pendingSignupCredentials = null;
    const adaptedUser = mapSupabaseUserToCompatUser(sbUser, profileName, data.session);
    currentAdaptedUser = adaptedUser;

    console.log(
      '[Supabase Auth] ✔ Autenticación exitosa para:',
      adaptedUser.email,
      `(UID: ${adaptedUser.uid}, emailVerified: ${adaptedUser.emailVerified}, rol: ${userRole})`
    );

    return { user: adaptedUser, error: null, role: userRole };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'AUTH_ERROR';
    console.warn('[Supabase Auth] Aviso general en inicio de sesión:', message);
    return { user: null, error: message };
  }
}

/**
 * Execute Sign Up via Supabase Auth (`supabase.auth.signUp`)
 * - Si Supabase devuelve `session` activa (Confirm Email desactivado en desarrollo),
 *   el usuario continúa directamente dentro de la aplicación.
 * - Si Supabase devuelve `user` con `session === null` (Confirm Email activado),
 *   NO se inventa sesión ni se marca el correo como verificado artificialmente:
 *   se notifica a `subscribeToAuth` con `emailVerified: false` para mostrar la pantalla
 *   de verificación existente (`EmailVerificationView`).
 */
export async function executeSignUp(
  email: string,
  pass: string,
  displayName: string,
  sector: string = 'No especificado'
): Promise<{ user: User | null; error: string | null }> {
  const cleanEmail = email.trim();
  const cleanName = displayName.trim() || cleanEmail.split('@')[0];
  const cleanSector = sector.trim() || 'No especificado';

  console.log('[Supabase Auth] Iniciando supabase.auth.signUp() para:', cleanEmail);

  try {
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: pass,
      options: {
        data: {
          nombre: cleanName,
          full_name: cleanName,
          displayName: cleanName,
          sector: cleanSector,
        },
      },
    });

    if (error) {
      const msg = (error.message || '').toLowerCase();
      const code = (error as any)?.code || '';

      if (
        msg.includes('already registered') ||
        msg.includes('already exists') ||
        code === 'user_already_exists' ||
        code === 'email_exists'
      ) {
        console.warn('[Supabase Auth] Aviso: Correo ya registrado para:', cleanEmail);
        return { user: null, error: 'EMAIL_ALREADY_IN_USE' };
      }

      if (msg.includes('password') && (msg.includes('weak') || msg.includes('short') || msg.includes('at least'))) {
        console.warn('[Supabase Auth] Aviso: Contraseña débil para:', cleanEmail);
        return { user: null, error: 'WEAK_PASSWORD' };
      }

      if (msg.includes('invalid') && msg.includes('email')) {
        console.warn('[Supabase Auth] Aviso: Formato de correo inválido para:', cleanEmail);
        return { user: null, error: 'INVALID_EMAIL' };
      }

      if (msg.includes('rate limit') || msg.includes('too many') || code === 'over_email_send_rate_limit') {
        console.warn('[Supabase Auth] Aviso: Límite de envíos alcanzado en registro.');
        return { user: null, error: 'TOO_MANY_REQUESTS' };
      }

      // Si Supabase falló al enviar el correo de confirmación pero el usuario ya fue creado
      // o ya puede iniciar sesión (por ejemplo tras desactivar Confirm Email en Supabase),
      // comprobamos con signInWithPassword sin inventar sesión:
      if (msg.includes('sending confirmation email') || msg.includes('confirmation email')) {
        console.warn('[Supabase Auth] Aviso SMTP en signUp ("Error sending confirmation email"). Verificando estado de la cuenta en Supabase Auth...');
        const { data: signInCheck, error: signInCheckErr } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: pass,
        });

        if (!signInCheckErr && signInCheck?.user) {
          const adapted = mapSupabaseUserToCompatUser(signInCheck.user, cleanName, signInCheck.session);
          currentAdaptedUser = adapted;
          pendingVerificationUser = null;
          pendingSignupCredentials = null;
          notifyAuthListeners(adapted);
          return { user: adapted, error: null };
        }
      }

      console.warn('[Supabase Auth] Aviso en signUp (' + code + '):', error.message);
      return { user: null, error: error.message || 'SIGNUP_ERROR' };
    }

    if (!data.user) {
      return { user: null, error: 'SIGNUP_ERROR' };
    }

    // En Supabase, cuando un correo ya existe y la confirmación está activa,
    // devuelve un objeto user con identities vacío ([]).
    if (Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      console.warn('[Supabase Auth] Aviso: Correo ya registrado (identities vacío) para:', cleanEmail);
      return { user: null, error: 'EMAIL_ALREADY_IN_USE' };
    }

    const sbUser = data.user;
    const nowISO = new Date().toISOString();

    // Caso 1: Supabase devolvió sesión inmediata (Confirm Email desactivado en desarrollo)
    if (data.session) {
      const isConfirmed = Boolean(sbUser.email_confirmed_at || data.session);
      try {
        await supabase.from('usuarios').upsert(
          {
            uid: sbUser.id,
            nombre: cleanName,
            correo: cleanEmail.toLowerCase(),
            fechaRegistroISO: nowISO,
            rol: 'ciudadano',
            estado: 'activo',
            sector: cleanSector,
            ultimoAcceso: nowISO,
            correoVerificado: isConfirmed,
          },
          { onConflict: 'uid' }
        );
      } catch (profileErr) {
        console.warn('[Supabase Auth] El perfil será gestionado por el trigger on_auth_user_created:', profileErr);
      }

      pendingVerificationUser = null;
      pendingSignupCredentials = null;
      const adaptedUser = mapSupabaseUserToCompatUser(sbUser, cleanName, data.session);
      currentAdaptedUser = adaptedUser;
      notifyAuthListeners(adaptedUser);

      console.log(
        '[Supabase Auth] ✔ Registro con sesión inmediata activo para:',
        adaptedUser.email,
        `(UID: ${adaptedUser.uid}, emailVerified: ${adaptedUser.emailVerified})`
      );

      return { user: adaptedUser, error: null };
    }

    // Caso 2: Supabase creó el usuario pero data.session === null (Confirm Email activo)
    // NO se inventa sesión ni se marca emailVerified como true.
    // Se conserva el usuario con emailVerified = false y se notifica a subscribeToAuth
    // para que la interfaz muestre el flujo de verificación existente (EmailVerificationView).
    const unverifiedUser = mapSupabaseUserToCompatUser(sbUser, cleanName, null);
    pendingVerificationUser = unverifiedUser;
    pendingSignupCredentials = { email: cleanEmail, password: pass };
    currentAdaptedUser = unverifiedUser;
    notifyAuthListeners(unverifiedUser);

    console.log(
      '[Supabase Auth] ✔ Usuario creado en Supabase Auth pendiente de confirmación (session === null):',
      unverifiedUser.email,
      `(UID: ${unverifiedUser.uid}, emailVerified: ${unverifiedUser.emailVerified})`
    );

    return { user: unverifiedUser, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'SIGNUP_ERROR';
    console.warn('[Supabase Auth] Aviso inesperado en signUp:', message);
    return { user: null, error: message };
  }
}

/**
 * Re-send Email Verification via Supabase Auth (`supabase.auth.resend`)
 */
export async function executeSendEmailVerification(
  user: User
): Promise<{ success: boolean; error: string | null }> {
  const targetEmail = user.email?.trim();
  if (!targetEmail) {
    return { success: false, error: 'No se encontró dirección de correo electrónico.' };
  }

  console.log('[Supabase Auth] Disparando supabase.auth.resend() de confirmación para:', targetEmail);
  try {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: targetEmail,
    });

    if (error) {
      console.warn('[Supabase Auth] Aviso en supabase.auth.resend():', error.message);
      return { success: false, error: error.message };
    }

    console.log(
      `%c[Supabase Auth] ✔ Correo de confirmación reenviado con éxito a: ${targetEmail}`,
      'color: #10b981; font-weight: bold;'
    );
    return { success: true, error: null };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.warn('[Supabase Auth] Aviso en reenvío de confirmación:', errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Execute Password Reset Email via Supabase Auth (`supabase.auth.resetPasswordForEmail`)
 */
export async function executePasswordReset(
  email: string
): Promise<{ success: boolean; error: string | null }> {
  const cleanEmail = email.trim();
  console.log('[Supabase Auth] Disparando supabase.auth.resetPasswordForEmail() para:', cleanEmail);
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
    });

    if (error) {
      console.warn('[Supabase Auth] Aviso en resetPasswordForEmail():', error.message);
      return { success: true, error: null };
    }

    console.log(
      `%c[Supabase Auth] ✔ Correo de recuperación de contraseña enviado a: ${cleanEmail}`,
      'color: #10b981; font-weight: bold;'
    );
    return { success: true, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn('[Supabase Auth] Aviso en resetPasswordForEmail():', message);
    return { success: true, error: null };
  }
}

// Listener global inmediato para no perder el evento PASSWORD_RECOVERY antes de que monte React
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'PASSWORD_RECOVERY') {
    console.log(
      '%c[Supabase Auth] ✔ Evento PASSWORD_RECOVERY detectado para:',
      'color: #f59e0b; font-weight: bold;',
      session?.user?.email || 'sesión de recuperación'
    );
    passwordRecoveryState = {
      isRecovery: true,
      email: session?.user?.email ?? null,
      hasValidSession: Boolean(session?.user),
      linkError: null,
    };
    currentAdaptedUser = null;
    notifyRecoveryListeners();
    notifyAuthListeners(null);
  } else if (passwordRecoveryState.isRecovery && session?.user) {
    passwordRecoveryState = {
      ...passwordRecoveryState,
      email: session.user.email ?? passwordRecoveryState.email,
      hasValidSession: true,
    };
    notifyRecoveryListeners();
  }
});

/**
 * Subscribe to Password Recovery state (`PASSWORD_RECOVERY` event from Supabase Auth)
 */
export function subscribeToPasswordRecovery(
  callback: (state: PasswordRecoveryState) => void
): () => void {
  recoveryListeners.add(callback);
  callback({ ...passwordRecoveryState });

  // Si se detectó URL de recuperación al cargar, sincronizar con la sesión actual de Supabase
  if (passwordRecoveryState.isRecovery) {
    supabase.auth.getSession().then(({ data }) => {
      if (!passwordRecoveryState.isRecovery) return;
      const sbUser = data.session?.user ?? null;
      passwordRecoveryState = {
        ...passwordRecoveryState,
        email: sbUser?.email ?? passwordRecoveryState.email,
        hasValidSession: Boolean(sbUser),
      };
      notifyRecoveryListeners();
    });
  }

  return () => {
    recoveryListeners.delete(callback);
  };
}

/**
 * Update user password during an active Supabase `PASSWORD_RECOVERY` session
 * Uses `supabase.auth.updateUser({ password: newPassword })`
 */
export async function executeUpdateRecoveredPassword(
  newPassword: string
): Promise<{ success: boolean; error: string | null }> {
  console.log('[Supabase Auth] Verificando sesión de recuperación antes de actualizar contraseña...');

  if (!passwordRecoveryState.isRecovery) {
    console.warn('[Supabase Auth] ✖ Intento de cambio de contraseña rechazado: no está activo el flujo PASSWORD_RECOVERY.');
    return { success: false, error: 'NO_RECOVERY_SESSION' };
  }

  try {
    const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
    const recoveryUser = sessionData?.session?.user;

    if (sessionErr || !sessionData?.session || !recoveryUser) {
      console.warn('[Supabase Auth] ✖ No existe una sesión de recuperación válida o el enlace ha expirado.');
      return { success: false, error: 'NO_RECOVERY_SESSION' };
    }

    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error || !data.user) {
      const msg = (error?.message || '').toLowerCase();
      const code = (error as any)?.code || '';

      if (
        msg.includes('different from the old password') ||
        msg.includes('same_password') ||
        code === 'same_password'
      ) {
        return { success: false, error: 'SAME_PASSWORD' };
      }

      if (msg.includes('weak') || msg.includes('short') || msg.includes('at least') || code === 'weak_password') {
        return { success: false, error: 'WEAK_PASSWORD' };
      }

      if (msg.includes('expired') || msg.includes('missing') || msg.includes('session')) {
        return { success: false, error: 'NO_RECOVERY_SESSION' };
      }

      console.warn('[Supabase Auth] Aviso en supabase.auth.updateUser():', error?.message);
      return { success: false, error: error?.message || 'UPDATE_PASSWORD_ERROR' };
    }

    console.log(
      `%c[Supabase Auth] ✔ Contraseña actualizada exitosamente para: ${data.user.email}`,
      'color: #10b981; font-weight: bold;'
    );

    // Limpiar hash/query de recuperación de la URL
    if (typeof window !== 'undefined' && (window.location.hash || window.location.search)) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Cerrar la sesión temporal de recuperación para que el usuario inicie sesión normalmente con su nueva clave
    passwordRecoveryState = {
      isRecovery: false,
      email: null,
      hasValidSession: false,
      linkError: null,
    };
    currentAdaptedUser = null;
    await supabase.auth.signOut();
    notifyAuthListeners(null);

    return { success: true, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'UPDATE_PASSWORD_ERROR';
    console.warn('[Supabase Auth] Aviso actualizando contraseña de recuperación:', message);
    return { success: false, error: message };
  }
}

/**
 * Cancel / close active Password Recovery flow and sign out any temporary recovery session
 */
export async function cancelPasswordRecovery(): Promise<void> {
  const hadRecovery = passwordRecoveryState.isRecovery;
  passwordRecoveryState = {
    isRecovery: false,
    email: null,
    hasValidSession: false,
    linkError: null,
  };
  notifyRecoveryListeners();

  if (typeof window !== 'undefined' && (window.location.hash || window.location.search)) {
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  if (hadRecovery) {
    try {
      currentAdaptedUser = null;
      await supabase.auth.signOut();
      notifyAuthListeners(null);
    } catch (err) {
      console.warn('[Supabase Auth] Aviso cerrando sesión temporal de recuperación:', err);
    }
  }
}

/**
 * Execute Sign Out via Supabase Auth (`supabase.auth.signOut`)
 */
export async function executeSignOut(): Promise<void> {
  try {
    console.log('[Supabase Auth] Cerrando sesión del usuario en Supabase...');
    pendingVerificationUser = null;
    pendingSignupCredentials = null;
    passwordRecoveryState = {
      isRecovery: false,
      email: null,
      hasValidSession: false,
      linkError: null,
    };
    currentAdaptedUser = null;
    notifyRecoveryListeners();
    notifyAuthListeners(null);
    await supabase.auth.signOut();
    console.log('[Supabase Auth] ✔ Sesión cerrada con éxito.');
  } catch (err) {
    console.warn('[Supabase Auth] Aviso al cerrar sesión:', err);
  }
}

/**
 * Subscribe to Auth State Changes via Supabase Auth (`supabase.auth.onAuthStateChange`)
 */
export function subscribeToAuth(callback: (user: User | null) => void): () => void {
  let isActive = true;
  authListeners.add(callback);

  // 1. Resolver estado inicial de sesión inmediatamente
  supabase.auth
    .getSession()
    .then(({ data }) => {
      if (!isActive) return;
      const sbUser = data.session?.user ?? null;

      // Evitar que una sesión de recuperación (PASSWORD_RECOVERY) se trate como inicio de sesión normal
      if (passwordRecoveryState.isRecovery) {
        passwordRecoveryState = {
          ...passwordRecoveryState,
          email: sbUser?.email ?? passwordRecoveryState.email,
          hasValidSession: Boolean(sbUser),
        };
        currentAdaptedUser = null;
        notifyRecoveryListeners();
        console.log('[Supabase Auth] Sesión de recuperación activa: mostrando formulario de nueva contraseña.');
        callback(null);
        return;
      }

      if (sbUser) {
        pendingVerificationUser = null;
        pendingSignupCredentials = null;
        const adapted = mapSupabaseUserToCompatUser(sbUser, undefined, data.session);
        currentAdaptedUser = adapted;
        console.log(
          '[Supabase Auth] Sesión inicial activa detectada:',
          adapted.email,
          `(emailVerified: ${adapted.emailVerified})`
        );
        callback(adapted);
      } else if (pendingVerificationUser) {
        currentAdaptedUser = pendingVerificationUser;
        callback(pendingVerificationUser);
      } else {
        currentAdaptedUser = null;
        console.log('[Supabase Auth] No hay sesión inicial activa.');
        callback(null);
      }
    })
    .catch((err) => {
      console.warn('[Supabase Auth] Aviso obteniendo sesión inicial:', err);
      if (isActive) {
        currentAdaptedUser = pendingVerificationUser ?? null;
        callback(currentAdaptedUser);
      }
    });

  // 2. Escuchar cambios de sesión en tiempo real con onAuthStateChange
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, session) => {
    if (!isActive) return;
    const sbUser = session?.user ?? null;

    // Detectar explícitamente PASSWORD_RECOVERY y evitar tratarlo como inicio de sesión normal
    if (event === 'PASSWORD_RECOVERY' || passwordRecoveryState.isRecovery) {
      if (event === 'SIGNED_OUT') {
        passwordRecoveryState = {
          isRecovery: false,
          email: null,
          hasValidSession: false,
          linkError: null,
        };
        currentAdaptedUser = null;
        notifyRecoveryListeners();
        callback(null);
        return;
      }

      passwordRecoveryState = {
        ...passwordRecoveryState,
        isRecovery: true,
        email: sbUser?.email ?? passwordRecoveryState.email,
        hasValidSession: Boolean(sbUser),
      };
      currentAdaptedUser = null;
      notifyRecoveryListeners();
      console.log(
        `[Supabase Auth] Evento ${event} en modo PASSWORD_RECOVERY -> Manteniendo pantalla de cambio de contraseña.`
      );
      callback(null);
      return;
    }

    if (sbUser) {
      pendingVerificationUser = null;
      pendingSignupCredentials = null;
      const adapted = mapSupabaseUserToCompatUser(sbUser, undefined, session);
      currentAdaptedUser = adapted;
      console.log(
        `[Supabase Auth] Evento ${event} -> Sesión activa:`,
        adapted.email,
        `(emailVerified: ${adapted.emailVerified})`
      );
      callback(adapted);
    } else if (pendingVerificationUser && event !== 'SIGNED_OUT') {
      // Conservar la vista de verificación pendiente mientras el usuario recién registrado
      // espera confirmar su correo (session === null)
      currentAdaptedUser = pendingVerificationUser;
      callback(pendingVerificationUser);
    } else {
      currentAdaptedUser = null;
      console.log(`[Supabase Auth] Evento ${event} -> Sin sesión activa.`);
      callback(null);
    }
  });

  return () => {
    isActive = false;
    authListeners.delete(callback);
    subscription.unsubscribe();
  };
}
