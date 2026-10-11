export type IncidentCategory =
  | 'Sujeto sospechoso'
  | 'Accidente de tránsito'
  | 'Robo o hurto'
  | 'Falla de luminaria / Alumbrado público'
  | 'Consumo o venta de sustancias'
  | 'Perturbación a la tranquilidad / Riña'
  | 'Vía u obstáculo peligroso'
  | 'Emergencia médica en vía pública'
  | 'Otro';

export const INCIDENT_CATEGORIES: IncidentCategory[] = [
  'Sujeto sospechoso',
  'Accidente de tránsito',
  'Robo o hurto',
  'Falla de luminaria / Alumbrado público',
  'Consumo o venta de sustancias',
  'Perturbación a la tranquilidad / Riña',
  'Vía u obstáculo peligroso',
  'Emergencia médica en vía pública',
  'Otro',
];

export type ReportStatus = 'pendiente' | 'aceptado' | 'rechazado';
export type ReportPriority = 'baja' | 'media' | 'alta' | 'critica';
export type ReportMediaType = 'image' | 'video';

export interface IncidentReport {
  id: string;
  uid: string;
  autorNombre: string;
  autorEmail: string;
  titulo: string;
  categoria: IncidentCategory | string;
  descripcion: string;
  sector: string;
  direccion?: string;
  ubicacion?: {
    lat: number;
    lng: number;
  };
  nivelPrioridad: ReportPriority;
  estado: ReportStatus;
  fechaCreacionISO: string;
  fechaCreacionFormateada: string;
  fechaRevisionISO?: string;
  revisadoPor?: string;
  motivoRechazo?: string;
  origen?: 'simulacion' | 'usuario' | string;
  mediaUrl?: string;
  mediaType?: ReportMediaType;
  mediaName?: string;
}

export interface CreateReportInput {
  titulo: string;
  categoria: IncidentCategory | string;
  descripcion: string;
  sector: string;
  direccion?: string;
  ubicacion?: {
    lat: number;
    lng: number;
  };
  nivelPrioridad: ReportPriority;
  estadoInicial?: ReportStatus;
  mediaFile?: File | null;
  mediaUrl?: string;
  mediaType?: ReportMediaType;
  mediaName?: string;
}

export interface DynamicSectorRiskResult {
  riskPercentage: number;
  safetyPercentage: number;
  stabilityPercentage: number;
  weightedScore: number;
  sectorAlertsCount: number;
  criticalOrHighCount: number;
  riskLevel: 'high' | 'moderate' | 'low';
  riskLabel: string;
  riskColorHex: string;
}

