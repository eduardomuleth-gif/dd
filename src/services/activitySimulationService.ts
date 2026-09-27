import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from './firebaseAuth';
import { IncidentReport, ReportPriority, IncidentCategory } from '../types/report';
import { REPORTS_COLLECTION } from './reportService';
import {
  DEMO_MODE,
  SIMULATION_CHECK_INTERVAL_MS,
  SIMULATION_PROBABILITY,
  MIN_INTERVAL_BETWEEN_SIMULATED_REPORTS_MS,
  MAX_SIMULATED_REPORTS_24H,
  SIMULATION_STORAGE_KEYS,
} from '../config/simulation';

// =======================================================================
// COMBINACIONES COHERENTES DE INCIDENTES PARA COMUNA 8 (6-8 PREDEFINIDAS)
// =======================================================================
interface IncidentTemplate {
  categoria: IncidentCategory;
  titulo: string;
  descripcion: string;
  nivelPrioridad: ReportPriority;
}

const PREDEFINED_INCIDENTS: IncidentTemplate[] = [
  {
    categoria: 'Sujeto sospechoso',
    titulo: 'Sujeto no identificado en zona restringida',
    descripcion: 'Individuo en actitud sospechosa merodeando accesos peatonales y corredores residenciales sin justificación.',
    nivelPrioridad: 'media',
  },
  {
    categoria: 'Robo o hurto',
    titulo: 'Intento de hurto a transeúnte en paradero',
    descripcion: 'Reporte de intimidación a transeúnte en las proximidades del paradero de transporte público.',
    nivelPrioridad: 'alta',
  },
  {
    categoria: 'Falla de luminaria / Alumbrado público',
    titulo: 'Falla total de luminaria en escalinata principal',
    descripcion: 'Punto ciego de iluminación en tramo de gradas peatonales, dificultando el tránsito seguro en horario nocturno.',
    nivelPrioridad: 'baja',
  },
  {
    categoria: 'Perturbación a la tranquilidad / Riña',
    titulo: 'Perturbación al orden y riña menor en vía pública',
    descripcion: 'Discusión acalorada entre particulares en espacio público con alteración de la tranquilidad barrial.',
    nivelPrioridad: 'media',
  },
  {
    categoria: 'Accidente de tránsito',
    titulo: 'Colisión leve entre motocicleta y vehículo particular',
    descripcion: 'Incidente vial en cruce empinado con reducción momentánea de calzada; sin personas lesionadas de gravedad.',
    nivelPrioridad: 'media',
  },
  {
    categoria: 'Vía u obstáculo peligroso',
    titulo: 'Obstáculo peligroso en calzada por deslizamiento menor',
    descripcion: 'Acumulación de sedimentos y piedras sueltas sobre curva pronunciada que afecta la adherencia vehicular.',
    nivelPrioridad: 'media',
  },
  {
    categoria: 'Consumo o venta de sustancias',
    titulo: 'Presencia sospechosa recurrente en parque comunitario',
    descripcion: 'Comunidad alerta sobre grupos de personas congregadas en zonas oscuras del parque barrial.',
    nivelPrioridad: 'media',
  },
  {
    categoria: 'Emergencia médica en vía pública',
    titulo: 'Asistencia requerida por caída de transeúnte en gradas',
    descripcion: 'Adulto mayor requiere apoyo de primeros auxilios tras tropezar en sendero peatonal húmedo.',
    nivelPrioridad: 'alta',
  },
];

// =======================================================================
// 18 SECTORES DE LA COMUNA 8 CON COORDENADAS GPS OFICIALES
// =======================================================================
interface SectorInfo {
  name: string;
  lat: number;
  lng: number;
}

const COMUNA_8_SECTORS_DATA: SectorInfo[] = [
  { name: 'Sucre', lat: 6.2458, lng: -75.5562 },
  { name: 'San Miguel', lat: 6.2505, lng: -75.5535 },
  { name: 'Villatina', lat: 6.2435, lng: -75.5410 },
  { name: 'El Pinal', lat: 6.2475, lng: -75.5385 },
  { name: 'Villa Liliam', lat: 6.2405, lng: -75.5390 },
  { name: 'Llanaditas', lat: 6.2542, lng: -75.5380 },
  { name: 'La Ladera', lat: 6.2515, lng: -75.5480 },
  { name: 'Villa Turbay', lat: 6.2370, lng: -75.5345 },
  { name: 'La Sierra', lat: 6.2340, lng: -75.5320 },
  { name: 'Trece de Noviembre', lat: 6.2460, lng: -75.5340 },
  { name: 'La Libertad', lat: 6.2400, lng: -75.5305 },
  { name: 'La Mansión', lat: 6.2530, lng: -75.5580 },
  { name: 'Las Estancias', lat: 6.2385, lng: -75.5360 },
  { name: 'San Antonio de Prado', lat: 6.1850, lng: -75.6560 },
  { name: 'El Pesebre', lat: 6.2730, lng: -75.5980 },
  { name: 'La América', lat: 6.2530, lng: -75.6020 },
  { name: 'Villa Hermosa (Centro)', lat: 6.2558, lng: -75.5512 },
  { name: 'Parque Biblioteca León de Greiff (La Ladera)', lat: 6.2520, lng: -75.5460 },
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
 * Obtiene la marca de tiempo del último reporte simulado registrado
 */
function getLastSimulatedTimestamp(): number {
  try {
    const stored = localStorage.getItem(SIMULATION_STORAGE_KEYS.LAST_SIMULATED_AT);
    return stored ? parseInt(stored, 10) : 0;
  } catch {
    return 0;
  }
}

/**
 * Registra la marca de tiempo del reporte simulado
 */
function recordSimulatedTimestamp(ts: number): void {
  try {
    localStorage.setItem(SIMULATION_STORAGE_KEYS.LAST_SIMULATED_AT, ts.toString());
  } catch {}
}

/**
 * Genera un reporte aleatorio pero coherente
 */
function generateRandomIncidentPayload(customDate?: Date) {
  const incident = PREDEFINED_INCIDENTS[Math.floor(Math.random() * PREDEFINED_INCIDENTS.length)];
  const sector = COMUNA_8_SECTORS_DATA[Math.floor(Math.random() * COMUNA_8_SECTORS_DATA.length)];
  
  // Agregar una pequeña variación en coordenadas (dentro de ~50 metros)
  const latOffset = (Math.random() - 0.5) * 0.0008;
  const lngOffset = (Math.random() - 0.5) * 0.0008;

  const dateObj = customDate || new Date();
  const dateISO = dateObj.toISOString();

  return {
    uid: 'sim_robot_comuna8',
    autorNombre: 'Red Barrial Comuna 8 (Alerta Ciudadana)',
    autorEmail: 'simulacion.alerta@securityurban.gov.co',
    titulo: incident.titulo,
    categoria: incident.categoria,
    descripcion: incident.descripcion,
    sector: sector.name,
    direccion: `Sector ${sector.name}, Comuna 8`,
    ubicacion: {
      lat: Number((sector.lat + latOffset).toFixed(6)),
      lng: Number((sector.lng + lngOffset).toFixed(6)),
    },
    nivelPrioridad: incident.nivelPrioridad,
    estado: 'aceptado' as const, // Aceptado directamente por simulación de verificación
    origen: 'simulacion' as const, // Marcador requerido para diferenciar internamente
    fechaCreacionISO: dateISO,
    fechaCreacionFormateada: formatDate(dateISO),
    fechaRevisionISO: dateISO,
    revisadoPor: 'Administrador Comunal (Verificación Rápida)',
  };
}

/**
 * Control de saturación: Limita el total de reportes simulados en Firestore (máximo 15-20 en las últimas 24h)
 * y elimina los más antiguos para evitar inflar la base de datos.
 */
async function enforceSaturationLimits(): Promise<void> {
  try {
    const colRef = collection(db, REPORTS_COLLECTION);
    const q = query(
      colRef,
      where('origen', '==', 'simulacion')
    );

    const snapshot = await getDocs(q);
    const docs = snapshot.docs;

    // Si excede el límite máximo (18), eliminar los más antiguos
    if (docs.length >= MAX_SIMULATED_REPORTS_24H) {
      console.log(`[Security Urban :: Simulación] Límite de saturación alcanzado (${docs.length}/${MAX_SIMULATED_REPORTS_24H}). Podando reportes simulados antiguos...`);
      
      // Ordenar por fechaCreacionISO ascendente (el más viejo primero)
      const sorted = docs.sort((a, b) => {
        const dateA = a.data().fechaCreacionISO || '';
        const dateB = b.data().fechaCreacionISO || '';
        return dateA.localeCompare(dateB);
      });

      // Eliminar el exceso
      const toDelete = sorted.slice(0, docs.length - MAX_SIMULATED_REPORTS_24H + 1);
      for (const d of toDelete) {
        await deleteDoc(d.ref);
        console.log('[Security Urban :: Simulación] Poda preventiva de reporte antiguo:', d.id);
      }
    }
  } catch (err) {
    console.warn('[Security Urban :: Simulación] Advertencia al podar límite de saturación:', err);
  }
}

/**
 * Crea un único reporte simulado en Firestore cumpliendo todas las reglas
 */
export async function createSimulatedReport(): Promise<boolean> {
  if (!DEMO_MODE) {
    return false;
  }

  const now = Date.now();
  const lastAt = getLastSimulatedTimestamp();

  // Control de saturación temporal: Mínimo 5 minutos entre reportes
  if (now - lastAt < MIN_INTERVAL_BETWEEN_SIMULATED_REPORTS_MS) {
    const remainingSec = Math.ceil((MIN_INTERVAL_BETWEEN_SIMULATED_REPORTS_MS - (now - lastAt)) / 1000);
    console.log(`[Security Urban :: Simulación] Límite de saturación activo: faltan ${remainingSec}s para permitir nuevo reporte simulado.`);
    return false;
  }

  try {
    // 1. Purgar exceso si ya se alcanzó el tope de 18 reportes en 24h
    await enforceSaturationLimits();

    // 2. Generar el payload del reporte
    const payload = generateRandomIncidentPayload();

    console.log('[Security Urban :: Simulación] ⚡ Generando reporte simulado:', {
      titulo: payload.titulo,
      categoria: payload.categoria,
      sector: payload.sector,
      estado: payload.estado,
      origen: payload.origen,
    });

    // 3. Escribir en Firestore
    const colRef = collection(db, REPORTS_COLLECTION);
    const docRef = await addDoc(colRef, payload);

    // 4. Actualizar marca temporal para el intervalo de control
    recordSimulatedTimestamp(now);

    // 5. Disparar evento para notificación visual en vivo (toast y animación de campana)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('security_urban_new_simulated_report', {
          detail: {
            id: docRef.id,
            ...payload,
          },
        })
      );
    }

    return true;
  } catch (err) {
    console.warn('[Security Urban :: Simulación] Error al crear reporte simulado en Firestore:', err);
    return false;
  }
}

/**
 * Si la base de datos está fresca o tiene pocos reportes históricos,
 * precarga una distribución realista en los últimos 14 días para que
 * "Semana actual" y "Semana anterior" muestren variación de inmediato en el gráfico.
 */
export async function seedHistoricalTrendIfEmpty(): Promise<void> {
  if (!DEMO_MODE) return;

  try {
    const colRef = collection(db, REPORTS_COLLECTION);
    const q = query(
      colRef,
      where('origen', '==', 'simulacion')
    );
    const snap = await getDocs(q);

    // Si ya hay al menos 8 reportes simulados, no sembrar
    if (snap.size >= 8) {
      console.log(`[Security Urban :: Simulación] Datos de demostración ya presentes (${snap.size} reportes simulados).`);
      return;
    }

    console.log('[Security Urban :: Simulación] 🚀 Inicializando reportes históricos para el gráfico de 7 días (Semana actual y anterior)...');

    const now = new Date();
    // Distribución representativa para los últimos 13 días (1 a 2 incidentes en días seleccionados)
    // Permite que la semana anterior (días -7 a -13) y la semana actual (días 0 a -6) tengan variación
    const dayOffsets = [
      { daysAgo: 12, count: 2 },
      { daysAgo: 10, count: 1 },
      { daysAgo: 9, count: 2 },
      { daysAgo: 8, count: 1 },
      { daysAgo: 7, count: 2 }, // Semana anterior
      { daysAgo: 6, count: 1 }, // Inicio semana actual
      { daysAgo: 5, count: 2 },
      { daysAgo: 4, count: 1 },
      { daysAgo: 3, count: 2 },
      { daysAgo: 2, count: 1 },
      { daysAgo: 1, count: 2 }, // Ayer
    ];

    for (const item of dayOffsets) {
      for (let i = 0; i < item.count; i++) {
        const targetDate = new Date(now);
        targetDate.setDate(now.getDate() - item.daysAgo);
        // Distribuir en horas realistas de la tarde/noche
        targetDate.setHours(10 + Math.floor(Math.random() * 11), Math.floor(Math.random() * 59));

        const payload = generateRandomIncidentPayload(targetDate);
        await addDoc(colRef, payload);
      }
    }

    console.log('[Security Urban :: Simulación] ✔ Reportes históricos sembrados con éxito.');
  } catch (err) {
    console.warn('[Security Urban :: Simulación] Advertencia al sembrar datos históricos:', err);
  }
}

/**
 * Inicia el temporizador periódico de simulación de actividad.
 * - Intervalo: cada 3.5 minutos (dentro del rango 3-5 minutos)
 * - Probabilidad: 60% por ciclo
 * - Límite de saturación: mínimo 5 minutos entre reportes
 * - Límite total: máximo 18 reportes en 24h
 * Retorna función de limpieza (cleanup).
 */
export function startActivitySimulation(): () => void {
  if (!DEMO_MODE) {
    console.log('[Security Urban :: Simulación] DEMO_MODE desactivado. Sistema operando exclusivamente con reportes reales de usuarios.');
    return () => {};
  }

  console.log('[Security Urban :: Simulación] Invocando motor de actividad comunitaria simulada (Demo Escolar).');
  
  // Precarga histórica para alimentar el gráfico de tendencias de 7 días
  seedHistoricalTrendIfEmpty().catch((err) => {
    console.warn('[Security Urban :: Simulación] Error en siembra histórica inicial:', err);
  });

  // Temporizador cada 3.5 minutos
  const intervalId = setInterval(async () => {
    if (!DEMO_MODE) {
      clearInterval(intervalId);
      return;
    }

    // Probabilidad controlada del 60% (no el 100% para evitar predictibilidad)
    const roll = Math.random();
    if (roll > SIMULATION_PROBABILITY) {
      console.log(`[Security Urban :: Simulación] Ciclo completado sin disparo (probabilidad 40% inactivo, valor: ${roll.toFixed(2)}).`);
      return;
    }

    console.log(`[Security Urban :: Simulación] Probabilidad exitosa (${(SIMULATION_PROBABILITY * 100)}%). Evaluando creación de reporte...`);
    await createSimulatedReport();
  }, SIMULATION_CHECK_INTERVAL_MS);

  // Retornar función de limpieza
  return () => {
    console.log('[Security Urban :: Simulación] Deteniendo generador de reportes simulados.');
    clearInterval(intervalId);
  };
}
