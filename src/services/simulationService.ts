import {
  collection,
  doc,
  addDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  limit,
} from 'firebase/firestore';
import { db } from './firebaseAuth';
import { IncidentReport, IncidentCategory, ReportPriority } from '../types/report';
import { COMUNA_8_SECTORS } from '../components/RiskMapScreen';

/**
 * =====================================================================
 * MODO DEMOSTRACIÓN // SIMULACIÓN DE ACTIVIDAD (PROYECTO ESCOLAR)
 * =====================================================================
 * Cambia esta constante a `false` para desactivar por completo la
 * generación periódica de reportes simulados y mantener la base de datos limpia.
 */
export const DEMO_MODE = true;

// Configuración de frecuencia y saturación
const SIMULATION_CHECK_INTERVAL_MS = 3.5 * 60 * 1000; // Cada 3.5 minutos (dentro del rango 3-5 minutos)
const SIMULATION_PROBABILITY = 0.6; // 60% de probabilidad en cada intervalo
const MIN_INTERVAL_BETWEEN_SIMS_MS = 5 * 60 * 1000; // Estricto: Mínimo 5 minutos entre reportes simulados
const MAX_ACTIVE_SIMULATED_REPORTS = 18; // Límite de saturación: Entre 15 y 20 reportes simulados activos en 24h
const LAST_SIM_TIMESTAMP_KEY = 'security_urban_last_simulation_timestamp';
const HISTORICAL_SEEDED_KEY = 'security_urban_historical_seeded_v1';

/**
 * Catálogo de 8 combinaciones predefinidas, realistas y coherentes
 * entre categoría, título, descripción y prioridad.
 */
export interface SimulationPreset {
  categoria: IncidentCategory;
  titulo: string;
  descripcion: string;
  nivelPrioridad: ReportPriority;
  direccionTemplate: string;
}

export const SIMULATION_PRESETS: SimulationPreset[] = [
  {
    categoria: 'Sujeto sospechoso',
    titulo: 'Sujeto no identificado en zona restringida',
    descripcion: 'Se observa individuo merodeando de forma reiterada cerca de portones residenciales sin causa justificada.',
    nivelPrioridad: 'media',
    direccionTemplate: 'Carrera 40 con Calle 56',
  },
  {
    categoria: 'Falla de luminaria / Alumbrado público',
    titulo: 'Luminaria apagada en corredor peatonal',
    descripcion: 'Punto oscuro reportado en callejón de acceso comunitario. Se solicita revisión técnica de Alumbrado Público.',
    nivelPrioridad: 'baja',
    direccionTemplate: 'Callejón peatonal sector central',
  },
  {
    categoria: 'Perturbación a la tranquilidad / Riña',
    titulo: 'Discusión en vía pública cerca a parque',
    descripcion: 'Altercado verbal entre transeúntes generando inquietud entre los vecinos. Vecinos solicitan patrullaje preventivo.',
    nivelPrioridad: 'media',
    direccionTemplate: 'Alrededores de cancha comunitaria',
  },
  {
    categoria: 'Accidente de tránsito',
    titulo: 'Colisión menor de motocicleta en curva',
    descripcion: 'Caída de motociclista por calzada húmeda. Se verifica que no hay heridos de gravedad pero hay paso restringido.',
    nivelPrioridad: 'media',
    direccionTemplate: 'Vía principal hacia ladera',
  },
  {
    categoria: 'Robo o hurto',
    titulo: 'Intento de hurto frustrado en parada de bus',
    descripcion: 'Ciudadanos alertaron oportunamente a la patrulla del cuadrante ante tentativa de raponazo a pasajero.',
    nivelPrioridad: 'alta',
    direccionTemplate: 'Paradero del alimentador Metro',
  },
  {
    categoria: 'Vía u obstáculo peligroso',
    titulo: 'Escombros o bloqueo temporal en calzada',
    descripcion: 'Material de construcción abandonado sobre un carril de la vía pública obstaculizando el tránsito vehicular.',
    nivelPrioridad: 'baja',
    direccionTemplate: 'Calle 54 cerca a cruce semafórico',
  },
  {
    categoria: 'Emergencia médica en vía pública',
    titulo: 'Solicitud de apoyo para adulto mayor',
    descripcion: 'Ciudadano de la tercera edad presentó desorientación temporal en acera. Se brindó resguardo comunitario inmediato.',
    nivelPrioridad: 'media',
    direccionTemplate: 'Plazoleta de encuentro barrial',
  },
  {
    categoria: 'Consumo o venta de sustancias',
    titulo: 'Presunta actividad sospechosa en escalinatas',
    descripcion: 'Vecinos informan presencia reiterada de personas ajenas al sector en escalinatas de poco tránsito nocturno.',
    nivelPrioridad: 'media',
    direccionTemplate: 'Escalinatas sector alto',
  },
];

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Reciente';
  }
}

/**
 * Obtiene el estado actual de la simulación (respeta DEMO_MODE y override en localStorage).
 */
export function isDemoModeActive(): boolean {
  if (!DEMO_MODE) return false;
  try {
    const saved = localStorage.getItem('security_urban_demo_mode_override');
    if (saved !== null) {
      return saved === 'true';
    }
  } catch {}
  return DEMO_MODE;
}

/**
 * Permite alternar la simulación en tiempo de ejecución.
 */
export function setDemoModeActive(enabled: boolean): void {
  try {
    localStorage.setItem('security_urban_demo_mode_override', enabled ? 'true' : 'false');
  } catch {}
}

/**
 * Genera un reporte simulado en Firestore asegurando límites de saturación:
 * - No más de 1 cada 5 minutos
 * - No más de 15-20 reportes simulados activos en las últimas 24 horas
 */
export async function generateSimulatedIncidentReport(force: boolean = false): Promise<IncidentReport | null> {
  if (!isDemoModeActive() && !force) {
    return null;
  }

  const now = Date.now();
  const lastSimStr = localStorage.getItem(LAST_SIM_TIMESTAMP_KEY) || sessionStorage.getItem(LAST_SIM_TIMESTAMP_KEY);
  const lastSimTime = lastSimStr ? parseInt(lastSimStr, 10) : 0;

  // 1. Verificación del límite de saturación de 5 minutos
  if (!force && (now - lastSimTime < MIN_INTERVAL_BETWEEN_SIMS_MS)) {
    console.log('[Security Urban :: Simulación] Omitiendo ciclo: límite de saturación (menos de 5 minutos desde el último reporte simulado).');
    return null;
  }

  try {
    // 2. Control del límite total de reportes simulados activos (máximo 18 en 24h)
    const reportsCol = collection(db, 'reportes');
    const simQuery = query(reportsCol, where('origen', '==', 'simulacion'));
    const simSnap = await getDocs(simQuery);

    const simulatedDocs: Array<{ id: string; fechaCreacionISO: string }> = [];
    simSnap.forEach((d) => {
      const data = d.data();
      simulatedDocs.push({
        id: d.id,
        fechaCreacionISO: data.fechaCreacionISO || '',
      });
    });

    // Si ya alcanzamos o superamos el límite, eliminamos el más antiguo para evitar saturar
    if (simulatedDocs.length >= MAX_ACTIVE_SIMULATED_REPORTS) {
      simulatedDocs.sort((a, b) => new Date(a.fechaCreacionISO).getTime() - new Date(b.fechaCreacionISO).getTime());
      const excessCount = (simulatedDocs.length - MAX_ACTIVE_SIMULATED_REPORTS) + 1;
      const toDelete = simulatedDocs.slice(0, excessCount);

      for (const item of toDelete) {
        try {
          await deleteDoc(doc(db, 'reportes', item.id));
          console.log('[Security Urban :: Simulación] Poda de saturación: reporte simulado antiguo reciclado:', item.id);
        } catch (delErr) {
          console.warn('[Security Urban :: Simulación] Error al podar reporte simulado:', delErr);
        }
      }
    }

    // 3. Selección aleatoria pero coherente
    const preset = SIMULATION_PRESETS[Math.floor(Math.random() * SIMULATION_PRESETS.length)];
    const sector = COMUNA_8_SECTORS[Math.floor(Math.random() * COMUNA_8_SECTORS.length)];

    // Pequeño desplazamiento de coordenadas realista dentro del cuadrante del sector (±0.0015 grados)
    const latOffset = (Math.random() - 0.5) * 0.003;
    const lngOffset = (Math.random() - 0.5) * 0.003;
    const lat = Number((sector.coordinates.lat + latOffset).toFixed(5));
    const lng = Number((sector.coordinates.lng + lngOffset).toFixed(5));

    const nowISO = new Date().toISOString();
    const formattedDate = formatDate(nowISO);

    // Documento listo y marcado con estado "aceptado" y origen "simulacion"
    const reportPayload = {
      uid: 'usr_simulacion_comunal',
      autorNombre: 'Veeduría Ciudadana Comuna 8',
      autorEmail: 'alertas.comuna8@securityurban.medellin.gov.co',
      titulo: preset.titulo,
      categoria: preset.categoria,
      descripcion: `${preset.descripcion} [Sector: ${sector.name}]`,
      sector: sector.name,
      direccion: `${preset.direccionTemplate}, ${sector.name}`,
      ubicacion: { lat, lng },
      nivelPrioridad: preset.nivelPrioridad,
      estado: 'aceptado' as const, // Pre-verificado para que impacte el mapa y centro de alertas
      origen: 'simulacion' as const, // Campo para diferenciarlo internamente de reportes reales
      fechaCreacionISO: nowISO,
      fechaCreacionFormateada: formattedDate,
      fechaRevisionISO: nowISO,
      revisadoPor: 'Mando Central Comuna 8 (Automático)',
    };

    const docRef = await addDoc(reportsCol, reportPayload);

    // Actualizar marca de tiempo
    localStorage.setItem(LAST_SIM_TIMESTAMP_KEY, now.toString());
    sessionStorage.setItem(LAST_SIM_TIMESTAMP_KEY, now.toString());

    console.log('[Security Urban :: Simulación] ✔ Nuevo reporte simulado generado con éxito en Firestore:', {
      id: docRef.id,
      titulo: reportPayload.titulo,
      categoria: reportPayload.categoria,
      sector: reportPayload.sector,
      estado: reportPayload.estado,
      origen: reportPayload.origen,
    });

    return {
      id: docRef.id,
      ...reportPayload,
    };
  } catch (err) {
    console.warn('[Security Urban :: Simulación] Error al generar reporte simulado en Firestore:', err);
    return null;
  }
}

/**
 * Si es la primera vez que se ejecuta el proyecto o la base de datos no tiene
 * histórico suficiente, genera una distribución representativa de los últimos 14 días
 * para que tanto "Semana actual" como "Semana anterior" muestren variación real.
 */
export async function seedHistoricalSimulatedReportsIfEmpty(): Promise<void> {
  if (!isDemoModeActive()) return;

  try {
    const isSeeded = localStorage.getItem(HISTORICAL_SEEDED_KEY);
    if (isSeeded === 'true') {
      return;
    }

    const reportsCol = collection(db, 'reportes');
    const existingSnap = await getDocs(query(reportsCol, limit(20)));
    
    // Si ya hay varios reportes, no necesitamos sembrar
    if (existingSnap.size >= 10) {
      localStorage.setItem(HISTORICAL_SEEDED_KEY, 'true');
      return;
    }

    console.log('[Security Urban :: Simulación] Inicializando histórico de 14 días para gráficos de tendencia...');

    const now = new Date();
    // Creamos entre 1 y 2 reportes por día en los últimos 14 días (días 1 a 13 atrás)
    for (let daysAgo = 13; daysAgo >= 1; daysAgo--) {
      // 70% de probabilidad de tener 1 o 2 reportes ese día
      const countForDay = (daysAgo % 2 === 0 || daysAgo % 3 === 0) ? 2 : 1;

      for (let j = 0; j < countForDay; j++) {
        const pastDate = new Date(now);
        pastDate.setDate(now.getDate() - daysAgo);
        pastDate.setHours(8 + (j * 6) + Math.floor(Math.random() * 4), Math.floor(Math.random() * 59));

        const preset = SIMULATION_PRESETS[(daysAgo + j) % SIMULATION_PRESETS.length];
        const sector = COMUNA_8_SECTORS[(daysAgo * 2 + j) % COMUNA_8_SECTORS.length];

        const pastISO = pastDate.toISOString();
        const payload = {
          uid: 'usr_simulacion_historica',
          autorNombre: 'Monitoreo Comunal Comuna 8',
          autorEmail: 'historico.comuna8@securityurban.medellin.gov.co',
          titulo: preset.titulo,
          categoria: preset.categoria,
          descripcion: `${preset.descripcion} [Sector: ${sector.name}]`,
          sector: sector.name,
          direccion: `${preset.direccionTemplate}, ${sector.name}`,
          ubicacion: {
            lat: Number((sector.coordinates.lat + (Math.random() - 0.5) * 0.002).toFixed(5)),
            lng: Number((sector.coordinates.lng + (Math.random() - 0.5) * 0.002).toFixed(5)),
          },
          nivelPrioridad: preset.nivelPrioridad,
          estado: 'aceptado' as const,
          origen: 'simulacion' as const,
          fechaCreacionISO: pastISO,
          fechaCreacionFormateada: formatDate(pastISO),
          fechaRevisionISO: pastISO,
          revisadoPor: 'Mando Central Comuna 8 (Histórico)',
        };

        await addDoc(reportsCol, payload);
      }
    }

    localStorage.setItem(HISTORICAL_SEEDED_KEY, 'true');
    console.log('[Security Urban :: Simulación] ✔ Histórico de 14 días completado con éxito.');
  } catch (err) {
    console.warn('[Security Urban :: Simulación] Fallo opcional al sembrar histórico:', err);
  }
}

/**
 * Elimina todos los reportes simulados de Firestore con un solo llamado,
 * dejando el sistema 100% "limpio" con únicamente reportes reales creados por usuarios.
 */
export async function cleanupAllSimulatedReports(): Promise<number> {
  try {
    const reportsCol = collection(db, 'reportes');
    const q = query(reportsCol, where('origen', '==', 'simulacion'));
    const snap = await getDocs(q);

    let deletedCount = 0;
    for (const docSnap of snap.docs) {
      await deleteDoc(doc(db, 'reportes', docSnap.id));
      deletedCount++;
    }

    localStorage.removeItem(HISTORICAL_SEEDED_KEY);
    localStorage.removeItem(LAST_SIM_TIMESTAMP_KEY);
    console.log(`[Security Urban :: Simulación] Limpieza completada: ${deletedCount} reportes simulados eliminados.`);
    return deletedCount;
  } catch (err) {
    console.error('[Security Urban :: Simulación] Error al limpiar reportes simulados:', err);
    throw err;
  }
}

/**
 * Inicializador principal del servicio de simulación:
 * - Ejecuta siembra histórica si es requerida.
 * - Inicia el temporizador periódico (setInterval) cada 3.5 minutos.
 * - En cada tick, con probabilidad controlada del 60%, genera un reporte pre-verificado.
 */
export function initActivitySimulation(): () => void {
  if (!isDemoModeActive()) {
    console.log('[Security Urban :: Simulación] DEMO_MODE desactivado.');
    return () => {};
  }

  console.log('[Security Urban :: Simulación] Iniciando generador automático de actividad (intervalo: cada 3.5m, probabilidad: 60%)...');

  // Siembra histórica en segundo plano
  seedHistoricalSimulatedReportsIfEmpty().catch(() => {});

  // Programar intervalo regular
  const intervalId = setInterval(async () => {
    if (!isDemoModeActive()) return;

    // Probabilidad controlada del 60%
    const roll = Math.random();
    if (roll <= SIMULATION_PROBABILITY) {
      console.log(`[Security Urban :: Simulación] Ciclo ejecutado (probabilidad cumplida: ${(roll * 100).toFixed(1)}% <= ${(SIMULATION_PROBABILITY * 100)}%). Generando reporte...`);
      await generateSimulatedIncidentReport(false);
    } else {
      console.log(`[Security Urban :: Simulación] Ciclo omitido por variabilidad estadística (probabilidad: ${(roll * 100).toFixed(1)}% > ${(SIMULATION_PROBABILITY * 100)}%).`);
    }
  }, SIMULATION_CHECK_INTERVAL_MS);

  return () => {
    clearInterval(intervalId);
    console.log('[Security Urban :: Simulación] Temporizador de simulación detenido.');
  };
}
