/**
 * Planes y precios de la sección "Precios" (L4k, decisión 007).
 *
 * ED: este es el ÚNICO archivo que hay que tocar para publicar precios.
 *  - `price`: precio mensual en pesos colombianos, como número entero y sin puntos
 *    ni signos (ej.: 49000). La web lo formatea sola (49.000) y lo muestra con la
 *    unidad "COP / mes".
 *  - `priceAnnual`: precio por año, solo si ofreces plan anual. Si al menos un plan
 *    lo tiene, aparece el selector Mensual / Anual; si todos están en null, no.
 *  - Con `null` la web muestra "Por definir con los primeros negocios" (sin cifra,
 *    sin dígitos animados y sin selector de periodo).
 *  - `stats`: los límites del plan. Con `value: null` la fila no se publica; si
 *    ningún stat tiene valor, el bloque entero no aparece.
 *
 * Textos de .claude/dev/contenido/landing.md ("Precios"). La estructura de 3 planes
 * es una propuesta provisional del Storyteller que Ed confirma o cambia.
 * Ítems que el contenido deja pendientes y NO se publican hasta confirmarlos:
 *  - Varias sedes: "Una misma tarjeta para tus clientes en todas tus sedes" (el MVP
 *    no confirma multi-sede) y "Más cajeros en el panel" (falta cuántos).
 *  - Todos los límites de sedes, cajeros y soporte.
 */

/** L4m: 'naranja' marca el plan destacado; los demás usan secundarios apagados. */
export type PlanAccent = 'naranja' | 'ambar' | 'salvia';

export interface PlanStat {
  label: string;
  /** null = pendiente: no se publica. */
  value: string | null;
}

export interface Plan {
  id: string;
  name: string;
  /** "Para quién" (≤ 60 caracteres). */
  forWho: string;
  accent: PlanAccent;
  /** Etiqueta destacada; null si no lleva. */
  badge: string | null;
  /** Precio mensual en COP; null = "Por definir con los primeros negocios". */
  price: number | null;
  /** Precio anual en COP; null = sin plan anual. */
  priceAnnual: number | null;
  stats: PlanStat[];
  features: string[];
  /** Solo anclas que existen en la página. */
  cta: { label: string; href: '#piloto' | '#pruebalo' };
}

export const PRICE_UNIT = { month: 'COP / mes', year: 'COP / año' } as const;
export const PRICE_TBD = 'Por definir con los primeros negocios';

export const plans: Plan[] = [
  {
    id: 'piloto',
    name: 'Piloto',
    forWho: 'Los primeros negocios que arman esto con nosotros',
    accent: 'naranja',
    badge: 'Para empezar',
    price: null,
    priceAnnual: null,
    stats: [
      { label: 'Sedes', value: null },
      { label: 'Cajeros', value: null },
      { label: 'Soporte', value: null },
    ],
    features: [
      'Tarjeta de fidelidad en Apple Wallet y Google Wallet',
      'Reglas a tu medida: por compra, por monto o sellos',
      'App de escaneo en el navegador, sin instalar nada',
      'Canje de recompensas en caja',
      'Panel con tus clientes y cajeros',
      'La marca de tu negocio en la tarjeta',
    ],
    cta: { label: 'Dejar mi email', href: '#piloto' },
  },
  {
    id: 'un-local',
    name: 'Un local',
    forWho: 'Un negocio con una sola sede y pocos cajeros',
    accent: 'ambar',
    badge: null,
    price: null,
    priceAnnual: null,
    stats: [
      // "1" está por confirmar en el contenido: no se publica todavía.
      { label: 'Sedes', value: null },
      { label: 'Cajeros', value: null },
      { label: 'Soporte', value: null },
    ],
    features: [
      'Tarjeta de fidelidad en Apple Wallet y Google Wallet',
      'Reglas a tu medida: por compra, por monto o sellos',
      'App de escaneo en el navegador',
      'Canje de recompensas en caja',
      'Panel con tus clientes y cajeros',
    ],
    cta: { label: 'Ver cómo quedaría mi tarjeta', href: '#pruebalo' },
  },
  {
    id: 'varias-sedes',
    name: 'Varias sedes',
    forWho: 'Negocios con varias sedes o varias cajas',
    accent: 'salvia',
    badge: null,
    price: null,
    priceAnnual: null,
    stats: [
      { label: 'Sedes', value: null },
      { label: 'Cajeros', value: null },
      { label: 'Soporte', value: null },
    ],
    features: ['Todo lo de "Un local"', 'Cada cajero con su propio acceso'],
    cta: { label: 'Contarnos mi caso', href: '#piloto' },
  },
];

const cop = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });

/** 49000 → "49.000" (sin signo; la unidad "COP / mes" va aparte). */
export const formatCOP = (value: number): string => cop.format(value);
