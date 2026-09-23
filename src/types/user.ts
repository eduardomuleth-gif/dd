export type UserRole = 'ciudadano' | 'operador' | 'administrador';
export type UserStatus = 'activo' | 'suspendido';

export interface FirestoreUser {
  uid: string;
  nombre: string;
  correo: string;
  fechaRegistro: any;
  fechaRegistroISO?: string;
  rol: UserRole;
  estado: UserStatus;
  sector: string;
  ultimoAcceso?: string;
  telefono?: string;
}

export interface UserStats {
  total: number;
  activos: number;
  suspendidos: number;
  nuevosEstaSemana: number;
  ciudadanos: number;
  operadores: number;
  administradores: number;
}
