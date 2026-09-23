export type ThemeMode = 'dark' | 'light';
export type Language = 'es' | 'en';

export interface FirebaseCustomConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

export interface SecurityLogItem {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  category: 'AUTH' | 'SECURITY' | 'FIREBASE' | 'CONFIG';
  message: string;
  details?: Record<string, unknown> | string;
}

export interface PasswordCriteria {
  minLength: boolean;
  hasUppercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
}

export type AuthScreen = 'login' | 'register' | 'forgot_password';
