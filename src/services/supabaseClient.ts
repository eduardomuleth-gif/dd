import { createClient, SupabaseClient } from '@supabase/supabase-js';

const rawSupabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
// Normaliza la URL base en caso de que incluya /rest/v1 o barras finales en .env
const supabaseUrl = rawSupabaseUrl
  .replace(/\/rest\/v1\/?$/i, '')
  .replace(/\/+$/, '');
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('http')
);

if (!isSupabaseConfigured) {
  console.warn(
    '[Security Urban :: Supabase] Variables VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY no configuradas aún en el entorno.'
  );
}

/**
 * Cliente singleton de Supabase para Security Urban.
 * Utiliza exclusivamente variables de entorno (sin claves escritas en código).
 */
export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder-project.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'security_urban_supabase_auth',
    },
  }
);
