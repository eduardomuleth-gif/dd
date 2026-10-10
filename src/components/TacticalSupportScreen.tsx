/// <reference types="@types/google.maps" />

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { importLibrary } from '@googlemaps/js-api-loader';
import { ensureGoogleMapsInitialized } from '../config/maps';
import { useSmoothMapUsability, MapUsabilityOverlay } from './MapUsabilityOverlay';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  ArrowLeft,
  MapPin,
  Navigation,
  Clock,
  Phone,
  PhoneCall,
  AlertTriangle,
  CheckCircle2,
  Flame,
  Ambulance,
  Building2,
  Info,
  Crosshair,
  Compass,
  Search,
  Copy,
  Check,
  Car,
  Footprints,
  TrainFront,
  CloudRain,
  Home,
  Lock,
  Users,
  HeartPulse,
  HelpCircle,
  Eye,
  Siren,
  Sparkles,
  Layers,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export interface TacticalSupportScreenProps {
  onNavigateHome?: () => void;
  onNavigateDashboard?: () => void;
}

export type AuthorityCategory = 'all' | 'police' | 'emergency_fire' | 'health_ambulance' | 'citizen_lines';

export interface AuthorityContactCard {
  id: string;
  name: string;
  entity: string;
  category: Exclude<AuthorityCategory, 'all'>;
  categoryLabel: string;
  primaryPhone: string;
  secondaryPhone?: string;
  dialNumber: string;
  address?: string;
  schedule: string;
  description: string;
  isUrgent?: boolean;
  coordinates?: { lat: number; lng: number };
}

export interface MobilityRecommendationCard {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  accentColor: 'blue' | 'emerald' | 'amber' | 'cyan';
  iconType: 'pedestrian' | 'transit' | 'vehicle' | 'weather';
  tips: string[];
  keyCorridors: string;
}

export interface CitizenPrecautionCard {
  id: string;
  title: string;
  category: string;
  accentColor: 'red' | 'purple' | 'emerald' | 'amber';
  iconType: 'street' | 'home' | 'digital' | 'community';
  precautions: string[];
  emergencyReminder: string;
}

// 1. DIRECTORIO OFICIAL DE AUTORIDADES Y LÍNEAS DE ATENCIÓN EN MEDELLÍN Y COMUNA 8
export const MEDELLIN_AUTHORITIES_DIRECTORY: AuthorityContactCard[] = [
  // Emergencias y Bomberos
  {
    id: 'auth-123-medellin',
    name: 'Línea Única de Emergencias 123 Medellín (SIES-M)',
    entity: 'Alcaldía de Medellín • Secretaría de Seguridad',
    category: 'emergency_fire',
    categoryLabel: 'Emergencias 24/7',
    primaryPhone: '123',
    dialNumber: '123',
    address: 'Centro Automático de Despacho (CAD) Medellín',
    schedule: '24 horas / 7 días (Gratuita desde fijo y celular)',
    description:
      'Canal centralizado que articula Policía Nacional, Cuerpo Oficial de Bomberos, Atención Prehospitalaria (Salud), Tránsito y DAGRD ante cualquier urgencia en Medellín.',
    isUrgent: true,
  },
  {
    id: 'auth-bomberos-medellin',
    name: 'Cuerpo Oficial de Bomberos de Medellín y DAGRD',
    entity: 'Departamento Administrativo de Gestión del Riesgo (DAGRD)',
    category: 'emergency_fire',
    categoryLabel: 'Bomberos y Rescate',
    primaryPhone: '119',
    secondaryPhone: '(604) 385 55 55 Ext. 9247',
    dialNumber: '119',
    address: 'Estación Libertadores: Cra. 57 #41-15 / Campo Valdés: Cl. 77 #49-30',
    schedule: 'Atención de emergencias 24/7',
    description:
      'Atención inmediata de incendios estructurales o forestales, rescate vehicular, fugas de gas, colapsos estructurales y deslizamientos en zonas de ladera.',
    isUrgent: true,
    coordinates: { lat: 6.2441, lng: -75.5752 },
  },
  {
    id: 'auth-defensa-civil',
    name: 'Defensa Civil Colombiana — Seccional Antioquia',
    entity: 'Organismo de Socorro y Atención Humanitaria',
    category: 'emergency_fire',
    categoryLabel: 'Socorro y Desastres',
    primaryPhone: '144',
    secondaryPhone: '(604) 216 58 10',
    dialNumber: '144',
    address: 'Cl. 54 #42-35, Sector Boston / Centro, Medellín',
    schedule: '24 horas en emergencias',
    description:
      'Apoyo en búsqueda y rescate, evacuaciones preventivas por crecientes de quebradas (Santa Elena, La Castro, La Aguadita) y asistencia comunitaria.',
    coordinates: { lat: 6.2468, lng: -75.5592 },
  },
  {
    id: 'auth-epm-urgencias',
    name: 'EPM — Urgencias por Fugas de Gas, Energía y Acueducto',
    entity: 'Empresas Públicas de Medellín',
    category: 'emergency_fire',
    categoryLabel: 'Servicios y Riesgo Físico',
    primaryPhone: '(604) 44 44 115',
    secondaryPhone: '01 8000 415 115',
    dialNumber: '6044444115',
    address: 'Cobertura en los 18 sectores de la Comuna 8',
    schedule: 'Atención técnica 24/7',
    description:
      'Reporte urgente de fugas de gas domiciliario, caída de redes o cables eléctricos en vía pública, daños en hidrantes y luminarias de alumbrado público.',
  },

  // Policía Nacional y CAIs Comuna 8
  {
    id: 'auth-policia-meval',
    name: 'Policía Nacional — Patrullas de Cuadrante (MEVAL)',
    entity: 'Policía Metropolitana del Valle de Aburrá',
    category: 'police',
    categoryLabel: 'Policía Nacional',
    primaryPhone: '112',
    secondaryPhone: '(604) 590 31 08',
    dialNumber: '112',
    address: 'Comando Metropolitano / Red de Cuadrantes Medellín',
    schedule: 'Patrullaje y vigilancia 24/7',
    description:
      'Despacho de patrullas motorizadas del Modelo Nacional de Vigilancia Comunitaria por Cuadrantes para prevención del delito, riñas y alteraciones del orden.',
    isUrgent: true,
  },
  {
    id: 'auth-estacion-villa-hermosa',
    name: 'Estación de Policía Villa Hermosa (Comuna 8)',
    entity: 'Policía Nacional • Comando Comuna 8',
    category: 'police',
    categoryLabel: 'Estación Principal C8',
    primaryPhone: '(604) 291 27 86',
    secondaryPhone: '123',
    dialNumber: '6042912786',
    address: 'Cra. 40 #64-35, Villa Hermosa, Medellín',
    schedule: 'Atención ciudadana 24/7',
    description:
      'Estación base de mando policial para los 18 sectores de la Comuna 8. Coordina los cuadrantes de Villa Hermosa, La Mansión, San Miguel, La Ladera y Llanaditas.',
    coordinates: { lat: 6.2558, lng: -75.5504 },
  },
  {
    id: 'auth-cai-villa-hermosa',
    name: 'CAI Villa Hermosa — Policía Nacional',
    entity: 'Centro de Atención Inmediata • Cuadrante Norte C8',
    category: 'police',
    categoryLabel: 'CAI Policial',
    primaryPhone: '(604) 254 19 42',
    secondaryPhone: '123',
    dialNumber: '6042541942',
    address: 'Cl. 65 #39-20, Parque de Villa Hermosa, Medellín',
    schedule: '24 horas',
    description:
      'Punto de vigilancia y reacción inmediata para el Parque de Villa Hermosa, corredor de la Carrera 40, Los Mangos, Batallón Girardot y San Miguel.',
    coordinates: { lat: 6.2571, lng: -75.5492 },
  },
  {
    id: 'auth-cai-enciso',
    name: 'CAI Enciso — Policía Nacional',
    entity: 'Centro de Atención Inmediata • Cuadrante Central C8',
    category: 'police',
    categoryLabel: 'CAI Policial',
    primaryPhone: '(604) 221 45 18',
    secondaryPhone: '123',
    dialNumber: '6042214518',
    address: 'Cra. 30 #56-42, Barrio Enciso, Medellín',
    schedule: '24 horas',
    description:
      'Cobertura directa para los sectores de Enciso, Sucre, El Pinal, Loyola y el corredor vial de la Calle 56 y Calle 58.',
    coordinates: { lat: 6.2428, lng: -75.5471 },
  },
  {
    id: 'auth-cai-las-estancias',
    name: 'CAI Las Estancias / San Antonio',
    entity: 'Centro de Atención Inmediata • Cuadrante Oriental C8',
    category: 'police',
    categoryLabel: 'CAI Policial',
    primaryPhone: '(604) 222 10 95',
    secondaryPhone: '123',
    dialNumber: '6042221095',
    address: 'Cl. 56 #24-10, Las Estancias, Medellín',
    schedule: '24 horas',
    description:
      'Vigilancia de los sectores orientales de la Comuna 8: Las Estancias, San Antonio, Villatina, 13 de Noviembre, La Libertad y Villa Lilliam.',
    coordinates: { lat: 6.2405, lng: -75.5398 },
  },
  {
    id: 'auth-gaula-policia',
    name: 'GAULA Policía Nacional — Antiextorsión y Secuestro',
    entity: 'Grupo de Acción Unificada por la Libertad Personal',
    category: 'police',
    categoryLabel: 'Línea Especializada',
    primaryPhone: '165',
    secondaryPhone: '(604) 590 31 08',
    dialNumber: '165',
    address: 'Atención confidencial en Medellín y área metropolitana',
    schedule: '24 horas (Línea gratuita nacional)',
    description:
      '"Yo no pago, yo denuncio". Orientación inmediata y confidencial ante llamadas extorsivas, estafas carcelarias o amenazas contra comerciantes y residentes.',
    isUrgent: true,
  },

  // Ambulancias y Salud
  {
    id: 'auth-ambulancias-crue',
    name: 'Ambulancias y Atención Prehospitalaria (CRUE / APH)',
    entity: 'Secretaría de Salud de Medellín',
    category: 'health_ambulance',
    categoryLabel: 'Ambulancias 24/7',
    primaryPhone: '125',
    secondaryPhone: '123',
    dialNumber: '125',
    address: 'Despacho Médico de Emergencias Medellín',
    schedule: '24 horas / 7 días',
    description:
      'Coordinación de ambulancias medicalizadas y básicas para accidentes de tránsito, urgencias vitales, paros cardiorrespiratorios y traslados prioritarios.',
    isUrgent: true,
  },
  {
    id: 'auth-metrosalud-villa-hermosa',
    name: 'Centro de Salud Metrosalud Villa Hermosa',
    entity: 'ESE Metrosalud • Red Pública de Medellín',
    category: 'health_ambulance',
    categoryLabel: 'Centro de Salud C8',
    primaryPhone: '(604) 511 75 05',
    secondaryPhone: '123',
    dialNumber: '6045117505',
    address: 'Cra. 40 #65-15, Villa Hermosa, Medellín',
    schedule: 'Lunes a Sábado (Urgencias vía 123 / Unidad Hospitalaria)',
    description:
      'Punto de atención médica primaria, vacunación, prioritaria y enlace con la red hospitalaria pública para residentes de Villa Hermosa y sectores aledaños.',
    coordinates: { lat: 6.2562, lng: -75.5488 },
  },
  {
    id: 'auth-metrosalud-enciso',
    name: 'Centro de Salud Metrosalud Enciso y Sol de Oriente',
    entity: 'ESE Metrosalud • Red Pública Comuna 8',
    category: 'health_ambulance',
    categoryLabel: 'Centro de Salud C8',
    primaryPhone: '(604) 511 75 05',
    secondaryPhone: '(604) 385 55 55',
    dialNumber: '6045117505',
    address: 'Enciso: Cra. 31 #57-23 / Sol de Oriente: Cra. 18C #56H-25',
    schedule: 'Atención prioritaria y consulta',
    description:
      'Cobertura de salud pública para las familias de Enciso, Sucre, 13 de Noviembre, Sol de Oriente, Villatina y Llanaditas.',
    coordinates: { lat: 6.2447, lng: -75.5469 },
  },
  {
    id: 'auth-hospital-general',
    name: 'Hospital General de Medellín (Urgencias Alta Complejidad)',
    entity: 'Hospital Público de Referencia en Medellín',
    category: 'health_ambulance',
    categoryLabel: 'Hospital 24/7',
    primaryPhone: '(604) 384 73 00',
    secondaryPhone: '123',
    dialNumber: '6043847300',
    address: 'Cra. 48 #32-102, El Perpetuo Socorro, Medellín',
    schedule: 'Urgencias 24 horas',
    description:
      'Centro hospitalario de tercer nivel de atención de trauma, urgencias médicas, quirúrgicas, pediátricas y maternas para toda la ciudad.',
    coordinates: { lat: 6.2343, lng: -75.5714 },
  },
  {
    id: 'auth-cruz-roja',
    name: 'Cruz Roja Colombiana — Seccional Antioquia',
    entity: 'Asistencia Médica, Ambulancias y Banco de Sangre',
    category: 'health_ambulance',
    categoryLabel: 'Cruz Roja',
    primaryPhone: '132',
    secondaryPhone: '(604) 350 53 00',
    dialNumber: '132',
    address: 'Av. Guayabal Cra. 52 #25-310, Medellín',
    schedule: 'Urgencias y apoyo 24/7',
    description:
      'Servicio de ambulancias, primeros auxilios, atención prehospitalaria y apoyo psicosocial en emergencias comunitarias.',
  },

  // Líneas de Atención y Orientación Ciudadana en Medellín
  {
    id: 'auth-linea-amiga',
    name: 'Línea Amiga Salud Mental Medellín',
    entity: 'Secretaría de Salud • Alcaldía de Medellín',
    category: 'citizen_lines',
    categoryLabel: 'Salud Mental 24/7',
    primaryPhone: '(604) 444 44 48',
    secondaryPhone: 'WhatsApp: 300 723 1123',
    dialNumber: '6044444448',
    address: 'Escucha activa y orientación psicológica gratuita',
    schedule: '24 horas / 7 días',
    description:
      'Atención profesional gratuita e inmediata en crisis emocionales, salud mental, prevención del suicidio, convivencia familiar y orientación en adicciones.',
  },
  {
    id: 'auth-123-mujer',
    name: 'Agencia Mujer / Línea 123 Mujer Metropolitana y Línea 155',
    entity: 'Secretaría de las Mujeres • Alcaldía de Medellín',
    category: 'citizen_lines',
    categoryLabel: 'Protección a la Mujer',
    primaryPhone: '155',
    secondaryPhone: '123 (Opción Agencia Mujer)',
    dialNumber: '155',
    address: 'Atención jurídica, psicológica y hogares de acogida',
    schedule: '24 horas / 7 días',
    description:
      'Asistencia inmediata, protección y acompañamiento legal y psicosocial para mujeres víctimas de violencia intrafamiliar, física, psicológica o sexual.',
    isUrgent: true,
  },
  {
    id: 'auth-secretaria-movilidad',
    name: 'Secretaría de Movilidad de Medellín (Agentes de Tránsito)',
    entity: 'Alcaldía de Medellín • Tránsito y Transporte',
    category: 'citizen_lines',
    categoryLabel: 'Movilidad y Tránsito',
    primaryPhone: '(604) 445 77 77',
    secondaryPhone: '123',
    dialNumber: '6044457777',
    address: 'Cra. 64C #72-58, Caribe, Medellín',
    schedule: 'Emergencias viales 24/7',
    description:
      'Reporte de accidentes de tránsito con lesionados o solo daños, semáforos fuera de servicio, cierres viales y obstrucción de vías públicas.',
  },
  {
    id: 'auth-fiscalia-icbf',
    name: 'Fiscalía General (Denuncias 122) e ICBF (Protección Infantil 141)',
    entity: 'Justicia y Protección de Derechos Fundamentales',
    category: 'citizen_lines',
    categoryLabel: 'Denuncias e Infancia',
    primaryPhone: '122',
    secondaryPhone: 'ICBF Línea 141',
    dialNumber: '122',
    address: 'Centro de Atención Penal Integral a Víctimas (CAPIV) Medellín',
    schedule: 'Atención nacional 24/7',
    description:
      'Línea 122 para recepción de denuncias por hurto, lesiones o delitos; Línea 141 del ICBF para reportar vulneración de derechos de niños, niñas y adolescentes.',
  },
];

// 2. RECOMENDACIONES SOBRE MOVILIDAD URBANA Y BARRIAL
export const MOBILITY_RECOMMENDATIONS: MobilityRecommendationCard[] = [
  {
    id: 'mob-pedestrian',
    title: 'Movilidad Peatonal y Corredores Iluminados',
    subtitle: 'Tránsito a pie por barrios y laderas de la Comuna 8',
    badge: 'PEATONES',
    accentColor: 'emerald',
    iconType: 'pedestrian',
    keyCorridors: 'Cra. 40 (Villa Hermosa), Cl. 58 (Enciso), Eje Tranvía Ayacucho y Parques Biblioteca',
    tips: [
      'Prioriza siempre corredores viales principales con iluminación LED activa y flujo comercial constante, especialmente después de las 7:30 p.m.',
      'En sectores con escaleras, senderos peatonales o callejones de alta pendiente, camina con calzado de buen agarre y evita usar el celular mientras desciendes.',
      'Identifica los Puntos Seguros a lo largo de tu recorrido (CAIs de Policía, estaciones de Metrocable, centros de salud y colegios) para acudir en caso de requerir apoyo.',
      'Si regresas tarde a casa, procura coordinar acompañamiento vecinal o caminar en grupo desde las estaciones del Tranvía o paradas de bus.',
    ],
  },
  {
    id: 'mob-public-transit',
    title: 'Transporte Público: Metro, Tranvía, Metrocable y Buses',
    subtitle: 'Uso seguro del Sistema Integrado en el centro-oriente de Medellín',
    badge: 'TRANSPORTE PÚBLICO',
    accentColor: 'blue',
    iconType: 'transit',
    keyCorridors: 'Tranvía (Bicentenario, Loyola, Alejandro Echavarría, Oriente) • Metrocables Línea H y Línea M',
    tips: [
      'Ten lista tu tarjeta Cívica antes de llegar al torniquete y guarda tus objetos personales en los bolsillos delanteros o bolso cerrado al frente.',
      'Recuerda los horarios habituales del Sistema Metro y Metrocables (4:30 a.m. a 11:00 p.m. lunes a sábado; domingos y festivos desde las 5:00 a.m. hasta las 10:00 p.m.).',
      'Espera las rutas de buses integrados y colectivos de Villa Hermosa, Enciso, Caicedo y Las Estancias únicamente en paraderos autorizados e iluminados.',
      'Si tomas taxi o transporte por aplicación en horas nocturnas, verifica las placas del vehículo antes de abordar y comparte tu ubicación en tiempo real con un familiar.',
    ],
  },
  {
    id: 'mob-vehicles-bikes',
    title: 'Conductores, Motociclistas y Ciclistas',
    subtitle: 'Prevención vial en vías de pendiente pronunciada y cruces barriales',
    badge: 'VEHÍCULOS Y MOTOS',
    accentColor: 'amber',
    iconType: 'vehicle',
    keyCorridors: 'Vía Las Palmas, Calle 58, Carrera 39/40, Vía a Santa Elena y conectores hacia Llanaditas',
    tips: [
      'En las laderas de la Comuna 8 (Llanaditas, 13 de Noviembre, Villatina, Las Estancias), utiliza cambios bajos (primera o segunda marcha) en descensos pronunciados para evitar el sobrecalentamiento de frenos.',
      'Reduce la velocidad a máximo 30 km/h en zonas residenciales, entornos de colegios (I.E. Villa Hermosa, Ceballos Ángeles, Sol de Oriente) y parques barriales.',
      'No estaciones vehículos ni motocicletas obstruyendo vías estrechas: las máquinas de Bomberos y ambulancias requieren al menos 3.5 metros libres para ingresar en emergencias.',
      'Mantén las puertas con seguro y las ventanillas a media altura al detenerte en semáforos de baja congestión en horario nocturno.',
    ],
  },
  {
    id: 'mob-rain-hillsides',
    title: 'Movilidad en Temporada de Lluvias y Laderas',
    subtitle: 'Precauciones ante lluvias fuertes, quebradas y deslizamientos',
    badge: 'PREVENCIÓN CLIMÁTICA',
    accentColor: 'cyan',
    iconType: 'weather',
    keyCorridors: 'Cuencas de las quebradas Santa Elena, La Castro, La Gallinaza, La Aguadita y El Ahorcado',
    tips: [
      'Durante aguaceros intensos, evita transitar por puentes peatonales bajos o bordes de quebradas si observas aumento repentino del caudal o cambio en el color del agua.',
      'Con pavimento húmedo, duplica la distancia de frenado en motocicletas y automóviles; las pendientes con pintura vial o tapas metálicas se vuelven altamente deslizantes.',
      'Si observas caída de tierra, rocas, postes inclinados o agrietamientos en la vía, aléjate del sector de inmediato y repórtalo a la línea 123 (DAGRD) y en la plataforma.',
      'Evita resguardarte de tormentas eléctricas debajo de árboles altos o estructuras metálicas aisladas.',
    ],
  },
];

// 3. CONSEJOS PRÁCTICOS Y PRECAUCIONES PARA EL CIUDADANO
export const CITIZEN_PRECAUTIONS: CitizenPrecautionCard[] = [
  {
    id: 'prec-street',
    title: 'Autocuidado en el Espacio Público y Comercio',
    category: 'PRECAUCIÓN EN CALLE',
    accentColor: 'red',
    iconType: 'street',
    emergencyReminder: 'Ante robo o persona sospechosa: Llama al 123 o acude al CAI más cercano.',
    precautions: [
      'Mantén atención plena en tu entorno (conciencia situacional): evita caminar con audífonos a alto volumen que te impidan escuchar motocicletas o alertas alrededor.',
      'Al retirar dinero en cajeros automáticos o corresponsales bancarios del barrio, verifica que no haya objetos extraños en la ranura y solicita acompañamiento policial gratuito si manejas sumas altas.',
      'Lleva únicamente los documentos y tarjetas necesarias; activa el bloqueo biométrico y de pantalla en tu teléfono celular.',
      'Si notas que alguien te sigue, cambia de acera, ingresa a un establecimiento comercial concurrido o dirígete directamente hacia un CAI o estación del Tranvía.',
    ],
  },
  {
    id: 'prec-home',
    title: 'Seguridad en el Hogar y Convivencia Vecinal',
    category: 'HOGAR Y BARRIO',
    accentColor: 'emerald',
    iconType: 'home',
    emergencyReminder: 'Emergencias de servicios públicos o gas: EPM (604) 44 44 115.',
    precautions: [
      'Antes de abrir la puerta a supuestos técnicos de servicios públicos o domiciliarios no solicitados, exige carné oficial y confirma la visita con la entidad.',
      'Asegura puertas, balcones y ventanas del primer y segundo piso al salir de casa o durante la noche, aun si te ausentas por pocos minutos.',
      'No arrojes basuras, colchones ni escombros a los canales de aguas lluvias ni a las quebradas del sector: su obstrucción provoca inundaciones y deslizamientos.',
      'Conoce a tus vecinos colindantes y mantén a la mano el número telefónico del cuadrante policial asignado a tu barrio.',
    ],
  },
  {
    id: 'prec-digital',
    title: 'Prevención de Estafas, Fraudes y Extorsión',
    category: 'SEGURIDAD DIGITAL Y PERSONAL',
    accentColor: 'purple',
    iconType: 'digital',
    emergencyReminder: 'Línea gratuita antiextorsión GAULA: 165 ("Yo no pago, yo denuncio").',
    precautions: [
      'Ninguna entidad bancaria, alcaldía ni operador de telefonía solicita códigos de verificación enviados por SMS o WhatsApp. Nunca los compartas.',
      'Si recibes llamadas donde fingen ser un familiar detenido o accidentado exigiendo giros de dinero inmediatos, cuelga, verifica directamente con tu familiar y reporta al 165.',
      'Desconfía de enlaces recibidos por mensajes de texto sobre supuestos subsidios, comparendos de tránsito o paquetes retenidos.',
      'Para compras o ventas acordadas por redes sociales, cita siempre al comprador en lugares públicos vigilados o frente a un CAI de la Policía.',
    ],
  },
  {
    id: 'prec-community',
    title: 'Participación Comunitaria y Uso Responsable de Alertas',
    category: 'RED CIUDADANA COMUNA 8',
    accentColor: 'amber',
    iconType: 'community',
    emergencyReminder: 'Usa Security Urban para reportes preventivos y el 123 para urgencias vitales.',
    precautions: [
      'Al reportar un incidente en la plataforma, incluye datos verificables: sector exacto, dirección o punto de referencia claro y descripción objetiva de lo sucedido.',
      'Evita difundir cadenas de audio o rumores no confirmados que generen pánico innecesario en la comunidad.',
      'Reporta oportunamente luminarias apagadas, semáforos dañados o pérdidas en la malla vial para prevenir accidentes y mejorar la seguridad ambiental del barrio.',
      'Promueve la resolución pacífica de conflictos vecinales a través de las Casas de Justicia y Comisarías de Familia de la Comuna 8.',
    ],
  },
];

// 4. PROTOCOLO PASO A PASO ANTE UNA EMERGENCIA
export const EMERGENCY_ACTION_STEPS = [
  {
    step: '01',
    title: 'Proteger y Evaluar el Entorno',
    description:
      'Conserva la calma. Aléjate de peligros inmediatos (fuego, cables caídos, deslizamientos o riñas) y ubícate en un sitio seguro e iluminado antes de actuar.',
  },
  {
    step: '02',
    title: 'Llamar de Inmediato a la Línea 123',
    description:
      'Indica claramente al operador: qué ocurre, dirección exacta con barrio de la Comuna 8, un punto de referencia visible y cuántas personas requieren ayuda.',
  },
  {
    step: '03',
    title: 'Despejar Accesos y Orientar Unidades',
    description:
      'En calles estrechas o pasajes barriales, facilita el paso de la patrulla, ambulancia o máquina de bomberos y haz señales visibles a la unidad al llegar.',
  },
  {
    step: '04',
    title: 'Registrar Alerta Preventiva Comunitaria',
    description:
      'Una vez contactadas las autoridades, registra el reporte en Security Urban para que los vecinos del sector tomen precauciones al transitar por la zona.',
  },
];

const DARK_HUD_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0f172a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#cbd5e1' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#0f172a' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#334155' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1e293b' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#020617' }] },
];

export const TacticalSupportScreen: React.FC<TacticalSupportScreenProps> = ({
  onNavigateHome,
}) => {
  const { theme, colors } = useTheme();
  const isDark = theme === 'dark';

  // Active Section Filter ('all' shows all sections cleanly; or user can focus on a specific section)
  const [activeSectionTab, setActiveSectionTab] = useState<'all' | 'authorities' | 'mobility' | 'precautions' | 'map'>('all');

  // Authority directory filters
  const [authorityCategory, setAuthorityCategory] = useState<AuthorityCategory>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeCallNotice, setActiveCallNotice] = useState<{ name: string; phone: string } | null>(null);

  // Interactive Map for Physical Emergency Stations (CAIs, Hospitals, Fire Stations)
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const [mapLoaded, setMapLoaded] = useState<boolean>(false);
  const [selectedMapStation, setSelectedMapStation] = useState<AuthorityContactCard | null>(null);

  // Filtered Authorities based on category and search query
  const filteredAuthorities = useMemo(() => {
    return MEDELLIN_AUTHORITIES_DIRECTORY.filter((item) => {
      const matchesCategory = authorityCategory === 'all' || item.category === authorityCategory;
      if (!matchesCategory) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        item.name.toLowerCase().includes(q) ||
        item.entity.toLowerCase().includes(q) ||
        item.categoryLabel.toLowerCase().includes(q) ||
        item.primaryPhone.toLowerCase().includes(q) ||
        (item.address && item.address.toLowerCase().includes(q)) ||
        item.description.toLowerCase().includes(q)
      );
    });
  }, [authorityCategory, searchQuery]);

  // Physical stations with coordinates for the map
  const mapStations = useMemo(() => {
    return MEDELLIN_AUTHORITIES_DIRECTORY.filter((item) => Boolean(item.coordinates));
  }, []);

  // Copy phone number helper
  const handleCopyPhone = (id: string, phone: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(phone).catch(() => {});
    }
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId((prev) => (prev === id ? null : prev));
    }, 2000);
  };

  // Trigger phone call + visual feedback for desktop/iframe
  const handleTriggerCall = (name: string, phone: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(phone).catch(() => {});
    }
    setActiveCallNotice({ name, phone });
    setTimeout(() => {
      setActiveCallNotice((prev) => (prev?.phone === phone ? null : prev));
    }, 4500);
  };

  // Initialize Map of Emergency Stations in Medellín / Comuna 8
  useEffect(() => {
    let isCancelled = false;

    async function initStationsMap() {
      if (!mapContainerRef.current) return;

      try {
        ensureGoogleMapsInitialized();

        const { Map } = (await importLibrary('maps')) as google.maps.MapsLibrary;
        const { ColorScheme } = (await importLibrary('core')) as google.maps.CoreLibrary;
        const { AdvancedMarkerElement } = (await importLibrary('marker')) as google.maps.MarkerLibrary;

        if (isCancelled || !mapContainerRef.current) return;

        const map = new Map(mapContainerRef.current, {
          center: { lat: 6.2478, lng: -75.5525 },
          zoom: 13,
          mapId: 'DEMO_MAP_ID',
          colorScheme: ColorScheme.DARK,
          styles: DARK_HUD_MAP_STYLES,
          disableDefaultUI: false,
          zoomControl: false,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          scrollwheel: false,
          gestureHandling: 'cooperative',
          backgroundColor: '#0c1017',
          // @ts-ignore
          internalUsageAttributionIds: ['gmp_mcp_codeassist_v1_aistudio'],
        });

        mapInstanceRef.current = map;

        // Render markers for physical stations
        markersRef.current.forEach((m) => (m.map = null));
        markersRef.current = [];

        const bounds = new google.maps.LatLngBounds();

        mapStations.forEach((st) => {
          if (!st.coordinates) return;
          bounds.extend(st.coordinates);

          const pinDiv = document.createElement('div');
          pinDiv.className = 'cursor-pointer transition-transform hover:scale-110 flex flex-col items-center';

          const badgeClass =
            st.category === 'police'
              ? 'bg-blue-600 border-blue-300 text-white'
              : st.category === 'health_ambulance'
              ? 'bg-emerald-600 border-emerald-300 text-white'
              : 'bg-amber-600 border-amber-300 text-white';

          const emoji =
            st.category === 'police' ? '👮' : st.category === 'health_ambulance' ? '🚑' : '🚒';

          pinDiv.innerHTML = `
            <div class="px-2.5 py-1 rounded-full text-[11px] font-mono font-bold border-2 shadow-lg flex items-center gap-1.5 ${badgeClass}">
              <span>${emoji}</span>
              <span class="max-w-[140px] truncate">${st.name.split('—')[0].trim()}</span>
            </div>
            <div class="w-2 h-2 bg-white rotate-45 -mt-1 shadow"></div>
          `;

          const marker = new AdvancedMarkerElement({
            map,
            position: st.coordinates,
            title: `${st.name} • Tel: ${st.primaryPhone}`,
            content: pinDiv,
          });

          marker.addListener('click', () => {
            setSelectedMapStation(st);
            map.panTo(st.coordinates!);
            map.setZoom(16);
          });

          markersRef.current.push(marker);
        });

        map.fitBounds(bounds, { top: 55, bottom: 55, left: 55, right: 55 });
        setMapLoaded(true);
      } catch (err) {
        console.warn('[Security Urban :: TacticalSupport] Error cargando mapa de estaciones:', err);
      }
    }

    initStationsMap();

    return () => {
      isCancelled = true;
    };
  }, [mapStations]);

  // Unified Smooth Map Usability (Scroll page by default, Ctrl/Cmd + wheel smooth zoom, smooth +/- buttons, 2-finger mobile)
  const {
    zoomLevel: smoothZoomLevel,
    isHintHighlighted,
    isCtrlZooming,
    handleZoomIn,
    handleZoomOut,
    smoothZoomTo,
  } = useSmoothMapUsability({
    mapContainerRef,
    mapInstanceRef,
    mapLoaded,
    initialZoom: 13,
  });

  const handleLocateOnMap = (card: AuthorityContactCard) => {
    if (!card.coordinates) return;
    setSelectedMapStation(card);
    if (activeSectionTab !== 'all' && activeSectionTab !== 'map') {
      setActiveSectionTab('all');
    }
    setTimeout(() => {
      mapContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (mapInstanceRef.current && card.coordinates) {
        mapInstanceRef.current.panTo(card.coordinates);
        smoothZoomTo(16);
      }
    }, 100);
  };

  return (
    <div
      className={`w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 flex flex-col gap-6 transition-colors duration-200 ${colors.canvasText}`}
    >
      {/* 1. HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-sm">
        <div className="flex items-start sm:items-center gap-3.5">
          {onNavigateHome && (
            <button
              type="button"
              onClick={onNavigateHome}
              className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-center shrink-0 ${
                isDark
                  ? 'bg-slate-950 border-slate-800 hover:bg-slate-800 text-slate-300'
                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
              }`}
              title="Volver al inicio"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <div className="w-11 h-11 rounded-2xl bg-red-600 text-white flex items-center justify-center shadow-sm shrink-0">
            <ShieldAlert className="w-6 h-6 stroke-[2]" />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold font-['Rajdhani'] tracking-wide uppercase text-slate-900 dark:text-white">
                Apoyo Táctico y Guía de Protección Ciudadana
              </h1>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-red-600/10 border border-red-500/25 text-red-600 dark:text-red-400 font-semibold">
                MEDELLÍN • COMUNA 8
              </span>
            </div>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 mt-1 leading-relaxed font-normal max-w-[68ch]">
              Directorio verificado de autoridades (Policía, emergencias, bomberos, ambulancias y líneas de atención), recomendaciones de movilidad y consejos prácticos de prevención.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end md:self-center shrink-0">
          <a
            href="tel:123"
            id="btn-call-123"
            onClick={() => handleTriggerCall('Línea Única de Emergencias Medellín', '123')}
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm flex items-center gap-2 shadow-sm transition cursor-pointer"
          >
            <PhoneCall className="w-4 h-4" />
            <span>Llamar Línea 123</span>
          </a>
        </div>
      </div>

      {/* 2. LÍNEAS DE EMERGENCIA INMEDIATA 24/7 (4 Tarjetas Destacadas de Marcación Rápida) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            id: 'quick-123',
            number: '123',
            title: 'Emergencias Medellín',
            subtitle: 'Línea Única SIES-M 24/7',
            desc: 'Policía, Bomberos, Salud, Tránsito y Gestión del Riesgo (DAGRD).',
            icon: <Siren className="w-5 h-5 text-red-500" />,
            badgeClass: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/25',
            btnClass: 'bg-red-600 hover:bg-red-700 text-white',
          },
          {
            id: 'quick-112',
            number: '112',
            title: 'Policía Nacional',
            subtitle: 'Patrullas y Cuadrantes C8',
            desc: 'Vigilancia comunitaria, CAI Villa Hermosa, CAI Enciso y CAI Las Estancias.',
            icon: <Shield className="w-5 h-5 text-blue-500" />,
            badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25',
            btnClass: 'bg-blue-600 hover:bg-blue-700 text-white',
          },
          {
            id: 'quick-119',
            number: '119',
            title: 'Bomberos Medellín',
            subtitle: 'Incendios, Rescate y DAGRD',
            desc: 'Incendios, rescate vehicular, fugas de gas y emergencias por lluvias.',
            icon: <Flame className="w-5 h-5 text-amber-500" />,
            badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25',
            btnClass: 'bg-amber-600 hover:bg-amber-700 text-white',
          },
          {
            id: 'quick-125',
            number: '125',
            title: 'Ambulancias y Salud',
            subtitle: 'Urgencias Médicas APH / CRUE',
            desc: 'Atención prehospitalaria, traslados de urgencia, heridos y trauma.',
            icon: <Ambulance className="w-5 h-5 text-emerald-500" />,
            badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25',
            btnClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
          },
        ].map((q) => (
          <div
            key={q.id}
            className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-sm flex flex-col justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition"
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800">
                    {q.icon}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold font-['Rajdhani'] text-slate-900 dark:text-white leading-tight">
                      {q.title}
                    </h2>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {q.subtitle}
                    </span>
                  </div>
                </div>
                <span
                  className={`text-lg font-extrabold font-['Rajdhani'] tabular-nums px-2.5 py-0.5 rounded-xl border ${q.badgeClass}`}
                >
                  {q.number}
                </span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-2.5 leading-relaxed">
                {q.desc}
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2.5 border-t border-slate-100 dark:border-slate-800/80">
              <a
                href={`tel:${q.number}`}
                className={`flex-1 min-h-[42px] py-2 px-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs ${q.btnClass}`}
              >
                <Phone className="w-4 h-4 shrink-0" />
                <span className="tabular-nums">Llamar al {q.number}</span>
              </a>
              <button
                type="button"
                onClick={() => handleCopyPhone(q.id, q.number)}
                className="min-h-[42px] min-w-[42px] px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-mono font-semibold flex items-center justify-center gap-1 transition cursor-pointer"
                title="Copiar número"
                aria-label={`Copiar número ${q.number}`}
              >
                {copiedId === q.id ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-xs text-emerald-500">Copiado</span>
                  </>
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 3. BARRA DE NAVEGACIÓN DE SECCIONES */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'all', label: 'Toda la Información', icon: <Sparkles className="w-3.5 h-3.5" /> },
            { id: 'authorities', label: 'Autoridades y Líneas en Medellín', icon: <PhoneCall className="w-3.5 h-3.5" /> },
            { id: 'mobility', label: 'Recomendaciones de Movilidad', icon: <Car className="w-3.5 h-3.5" /> },
            { id: 'precautions', label: 'Consejos y Precauciones', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
            { id: 'map', label: 'Mapa de Estaciones y CAIs', icon: <MapPin className="w-3.5 h-3.5" /> },
          ].map((tab) => {
            const active = activeSectionTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSectionTab(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  active
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 px-2 hidden xl:inline">
          Guía preventiva e informativa para la ciudadanía
        </span>
      </div>

      {/* =====================================================================
          SECCIÓN A: DIRECTORIO DE AUTORIDADES Y LÍNEAS DE ATENCIÓN EN MEDELLÍN
         ===================================================================== */}
      {(activeSectionTab === 'all' || activeSectionTab === 'authorities') && (
        <section className="flex flex-col gap-4">
          <div className="p-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-sm flex flex-col gap-4">
            {/* Header & Search/Category Filters */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <PhoneCall className="w-5 h-5 text-red-500" />
                  <h2 className="text-lg sm:text-xl font-black font-['Rajdhani'] uppercase tracking-wide text-slate-900 dark:text-white">
                    Directorio de Autoridades y Líneas de Atención en Medellín
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-0.5">
                  Contactos directos de Policía Nacional, CAIs de la Comuna 8, Bomberos, Ambulancias, Hospitales y Líneas Especializadas.
                </p>
              </div>

              {/* Search Input */}
              <div className="relative w-full lg:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar CAI, hospital, bomberos, línea..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl text-xs border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: 'all', label: `Todas las entidades (${MEDELLIN_AUTHORITIES_DIRECTORY.length})`, icon: <Layers className="w-3.5 h-3.5 shrink-0" /> },
                { id: 'police', label: 'Policía y CAIs Comuna 8', icon: <Shield className="w-3.5 h-3.5 shrink-0 text-blue-500" /> },
                { id: 'emergency_fire', label: 'Emergencias, Bomberos y DAGRD', icon: <Flame className="w-3.5 h-3.5 shrink-0 text-amber-500" /> },
                { id: 'health_ambulance', label: 'Ambulancias, Salud y Hospitales', icon: <Ambulance className="w-3.5 h-3.5 shrink-0 text-emerald-500" /> },
                { id: 'citizen_lines', label: 'Líneas de Atención en Medellín', icon: <PhoneCall className="w-3.5 h-3.5 shrink-0 text-purple-500" /> },
              ].map((cat) => {
                const isSelected = authorityCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setAuthorityCategory(cat.id as AuthorityCategory)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer inline-flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 border-slate-900 dark:border-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-400'
                    }`}
                  >
                    <span aria-hidden="true">{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Authority Cards Grid */}
            {filteredAuthorities.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                No se encontraron líneas o autoridades que coincidan con "{searchQuery}".
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {filteredAuthorities.map((item) => {
                  const categoryColor =
                    item.category === 'police'
                      ? 'border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                      : item.category === 'emergency_fire'
                      ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                      : item.category === 'health_ambulance'
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                      : 'border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-400';

                  return (
                    <div
                      key={item.id}
                      className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70 flex flex-col justify-between gap-3 hover:border-slate-400 dark:hover:border-slate-700 transition shadow-2xs"
                    >
                      <div className="flex flex-col gap-2">
                        {/* Top row: Category Badge & Schedule */}
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md border ${categoryColor}`}
                          >
                            {item.categoryLabel}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-emerald-500" />
                            <span>{item.schedule.split('(')[0].trim()}</span>
                          </span>
                        </div>

                        {/* Title & Entity */}
                        <div>
                          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white leading-snug">
                            {item.name}
                          </h3>
                          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                            {item.entity}
                          </p>
                        </div>

                        {/* Description */}
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                          {item.description}
                        </p>

                        {/* Address if available */}
                        {item.address && (
                          <div className="flex items-start gap-1.5 text-[11px] text-slate-600 dark:text-slate-400 pt-1">
                            <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                            <span>{item.address}</span>
                          </div>
                        )}
                      </div>

                      {/* Bottom Phone Numbers & Action Buttons */}
                      <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800/80 flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800">
                          <div className="min-w-0">
                            <span className="text-[10px] font-mono text-slate-400 uppercase block">
                              Línea de Contacto
                            </span>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-black font-mono text-slate-900 dark:text-white">
                                {item.primaryPhone}
                              </span>
                              {item.secondaryPhone && (
                                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                                  • {item.secondaryPhone}
                                </span>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleCopyPhone(item.id, item.primaryPhone)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
                            title="Copiar número telefónico"
                          >
                            {copiedId === item.id ? (
                              <Check className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <a
                            href={`tel:${item.dialNumber}`}
                            onClick={() => handleTriggerCall(item.name, item.primaryPhone)}
                            className="flex-1 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-red-600 dark:hover:bg-red-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            <span>Llamar ({item.primaryPhone})</span>
                          </a>

                          {item.coordinates && (
                            <button
                              type="button"
                              onClick={() => handleLocateOnMap(item)}
                              className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-blue-500 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1 transition cursor-pointer shrink-0"
                              title="Ver ubicación en el mapa inferior"
                            >
                              <Eye className="w-3.5 h-3.5 text-blue-500" />
                              <span>Ver en mapa</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* =====================================================================
          SECCIÓN B: RECOMENDACIONES SOBRE MOVILIDAD SEGURA EN MEDELLÍN Y C8
         ===================================================================== */}
      {(activeSectionTab === 'all' || activeSectionTab === 'mobility') && (
        <section className="flex flex-col gap-4">
          <div className="p-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-sm flex flex-col gap-4">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-3.5">
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-cyan-500" />
                <h2 className="text-lg sm:text-xl font-black font-['Rajdhani'] uppercase tracking-wide text-slate-900 dark:text-white">
                  Recomendaciones de Movilidad y Tránsito Seguro
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-0.5">
                Pautas prácticas para desplazarte a pie, en transporte público, vehículo o motocicleta por la Comuna 8 y el área metropolitana de Medellín.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {MOBILITY_RECOMMENDATIONS.map((card) => {
                const iconEl =
                  card.iconType === 'pedestrian' ? (
                    <Footprints className="w-5 h-5 text-emerald-500" />
                  ) : card.iconType === 'transit' ? (
                    <TrainFront className="w-5 h-5 text-blue-500" />
                  ) : card.iconType === 'vehicle' ? (
                    <Car className="w-5 h-5 text-amber-500" />
                  ) : (
                    <CloudRain className="w-5 h-5 text-cyan-500" />
                  );

                const badgeStyle =
                  card.accentColor === 'emerald'
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                    : card.accentColor === 'blue'
                    ? 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30'
                    : card.accentColor === 'amber'
                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30'
                    : 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border-cyan-500/30';

                return (
                  <div
                    key={card.id}
                    className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70 flex flex-col justify-between gap-3.5"
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                            {iconEl}
                          </div>
                          <div>
                            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                              {card.title}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {card.subtitle}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border shrink-0 ${badgeStyle}`}
                        >
                          {card.badge}
                        </span>
                      </div>

                      <ul className="flex flex-col gap-2 mt-1">
                        {card.tips.map((tip, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300 leading-relaxed"
                          >
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-300 flex items-center gap-2">
                      <Navigation className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                      <span className="truncate">
                        <strong>Corredores clave:</strong> {card.keyCorridors}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* =====================================================================
          SECCIÓN C: CONSEJOS PRÁCTICOS, PRECAUCIONES Y PROTOCOLO DE EMERGENCIA
         ===================================================================== */}
      {(activeSectionTab === 'all' || activeSectionTab === 'precautions') && (
        <section className="flex flex-col gap-4">
          {/* Protocolo en 4 pasos ante una Emergencia */}
          <div className="p-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-sm flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3.5">
              <div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  <h2 className="text-lg sm:text-xl font-black font-['Rajdhani'] uppercase tracking-wide text-slate-900 dark:text-white">
                    Protocolo Ciudadano de Actuación ante Emergencias
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-0.5">
                  Sigue estos 4 pasos fundamentales cuando presencies o enfrentes una situación de riesgo en tu sector.
                </p>
              </div>
              <span className="text-[11px] font-mono font-bold px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 self-start sm:self-center">
                PASO A PASO PREVENTIVO
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {EMERGENCY_ACTION_STEPS.map((item) => (
                <div
                  key={item.step}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/70 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-extrabold px-2.5 py-0.5 rounded-lg bg-red-600 text-white">
                      PASO {item.step}
                    </span>
                    <ShieldCheck className="w-4 h-4 text-slate-400" />
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mt-1">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Tarjetas de Consejos Prácticos y Precauciones Ciudadanas */}
          <div className="p-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-sm flex flex-col gap-4">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-3.5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                <h2 className="text-lg sm:text-xl font-black font-['Rajdhani'] uppercase tracking-wide text-slate-900 dark:text-white">
                  Consejos Prácticos y Precauciones para el Ciudadano
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-0.5">
                Medidas preventivas para proteger tu integridad, tu hogar, tu economía y la convivencia en los barrios de Medellín.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {CITIZEN_PRECAUTIONS.map((card) => {
                const iconEl =
                  card.iconType === 'street' ? (
                    <Shield className="w-5 h-5 text-red-500" />
                  ) : card.iconType === 'home' ? (
                    <Home className="w-5 h-5 text-emerald-500" />
                  ) : card.iconType === 'digital' ? (
                    <Lock className="w-5 h-5 text-purple-500" />
                  ) : (
                    <Users className="w-5 h-5 text-amber-500" />
                  );

                return (
                  <div
                    key={card.id}
                    className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70 flex flex-col justify-between gap-3.5"
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                            {iconEl}
                          </div>
                          <div>
                            <span className="text-[10px] font-mono font-bold uppercase text-red-600 dark:text-red-400 block">
                              {card.category}
                            </span>
                            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                              {card.title}
                            </h3>
                          </div>
                        </div>
                      </div>

                      <ul className="flex flex-col gap-2">
                        {card.precautions.map((p, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300 leading-relaxed"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 mt-1.5" />
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                      <Info className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>{card.emergencyReminder}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* =====================================================================
          SECCIÓN D: MAPA INTERACTIVO DE UNIDADES Y ESTACIONES DE EMERGENCIA
         ===================================================================== */}
      <section
        className={
          activeSectionTab === 'all' || activeSectionTab === 'map'
            ? 'flex flex-col gap-4'
            : 'hidden'
        }
      >
          <div className="p-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-sm flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3.5">
              <div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-500" />
                  <h2 className="text-lg sm:text-xl font-black font-['Rajdhani'] uppercase tracking-wide text-slate-900 dark:text-white">
                    Mapa de CAIs, Centros de Salud y Estaciones de Socorro
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-0.5">
                  Haz clic sobre cualquier marcador en el mapa para consultar su dirección y línea telefónica directa.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {mapStations.slice(0, 4).map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => handleLocateOnMap(st)}
                    className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:border-blue-500 text-[11px] font-bold text-slate-700 dark:text-slate-200 cursor-pointer transition"
                  >
                    {st.name.split('—')[0].trim()}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative w-full h-[420px] sm:h-[480px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950">
              <div ref={mapContainerRef} className="w-full h-full" />

              {!mapLoaded && (
                <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center gap-2 text-white">
                  <div className="w-7 h-7 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
                  <span className="text-xs font-mono text-slate-400">
                    Cargando ubicación de estaciones en Google Maps...
                  </span>
                </div>
              )}

              {/* Unified Map Usability Overlay: "Usa Ctrl + rueda para hacer zoom" + Smooth + / - Controls */}
              <MapUsabilityOverlay
                zoomLevel={smoothZoomLevel}
                isHintHighlighted={isHintHighlighted}
                isCtrlZooming={isCtrlZooming}
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
                onResetCenter={() => {
                  if (mapInstanceRef.current) {
                    mapInstanceRef.current.panTo({ lat: 6.2478, lng: -75.5525 });
                    smoothZoomTo(13.5);
                  }
                }}
                resetTitle="Centrar en estaciones de emergencia"
                noticePosition="bottom-center"
              />

              {/* Selected Station Floating Card on Map */}
              {selectedMapStation && (
                <div className="absolute bottom-14 left-4 right-4 sm:right-auto sm:w-96 z-20 p-4 rounded-2xl bg-slate-950/95 border-2 border-blue-500/80 text-white shadow-2xl backdrop-blur-md flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono uppercase font-bold text-blue-400 block">
                        {selectedMapStation.categoryLabel}
                      </span>
                      <h4 className="text-sm font-extrabold text-white">
                        {selectedMapStation.name}
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedMapStation(null)}
                      className="text-xs text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800 cursor-pointer"
                    >
                      Cerrar
                    </button>
                  </div>
                  {selectedMapStation.address && (
                    <p className="text-xs text-slate-300 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0" aria-hidden="true" />
                      <span>{selectedMapStation.address}</span>
                    </p>
                  )}
                  <p className="text-[11px] text-slate-400 leading-snug">
                    {selectedMapStation.description}
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <a
                      href={`tel:${selectedMapStation.dialNumber}`}
                      className="flex-1 py-2 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Llamar ({selectedMapStation.primaryPhone})</span>
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
      </section>

      {/* Notificación visual al presionar Llamar (útil en escritorio / vista previa) */}
      {activeCallNotice && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm p-4 rounded-2xl bg-slate-950/95 border-2 border-emerald-500 text-white shadow-2xl flex items-start gap-3 animate-fadeIn">
          <div className="p-2 rounded-xl bg-emerald-600/20 text-emerald-400 shrink-0">
            <PhoneCall className="w-5 h-5 animate-bounce" />
          </div>
          <div className="text-xs">
            <span className="font-mono text-[10px] text-emerald-400 uppercase font-bold block">
              Línea de Atención Seleccionada
            </span>
            <p className="font-bold text-white mt-0.5">{activeCallNotice.name}</p>
            <p className="text-slate-300 mt-1">
              Número: <strong className="font-mono text-emerald-300">{activeCallNotice.phone}</strong> (copiado al portapapeles)
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
