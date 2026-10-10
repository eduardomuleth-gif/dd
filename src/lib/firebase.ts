import { User } from 'firebase/auth';
import {
  firebaseConfig,
  firebaseApp,
  auth,
  executeSignIn,
  executeSignUp,
  executeSendEmailVerification,
  executePasswordReset,
  executeApplyActionCode,
  getLastInitialVerificationError,
  clearLastInitialVerificationError,
  executeSignOut,
  subscribeToAuth,
} from '../services/firebaseAuth';
import { SecurityLogItem } from '../types/auth';

export {
  firebaseConfig,
  firebaseApp,
  auth,
  executeSignIn,
  executeSignUp,
  executeSendEmailVerification,
  executePasswordReset,
  executeApplyActionCode,
  getLastInitialVerificationError,
  clearLastInitialVerificationError,
  executeSignOut,
  subscribeToAuth,
};

// Console logger helper for security auditing (visible in DevTools F12 console)
export function logSecurityEvent(
  level: SecurityLogItem['level'],
  category: SecurityLogItem['category'],
  message: string,
  details?: Record<string, unknown> | string
) {
  const prefix = `[Security Urban :: ${category}]`;
  if (level === 'error') {
    console.error(prefix, message, details || '');
  } else if (level === 'warn') {
    console.warn(prefix, message, details || '');
  } else if (level === 'success') {
    console.log(`%c${prefix} ✔ ${message}`, 'color: #10b981; font-weight: bold;', details || '');
  } else {
    console.log(prefix, message, details || '');
  }
}
