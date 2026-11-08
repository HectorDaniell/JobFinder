/**
 * Fechas de CV: solo importan mes y año.
 *
 * OJO con la zona horaria: las fechas se guardan a medianoche UTC, así que hay
 * que leerlas con los getters UTC. Con los getters locales, en UTC-5 (Perú) una
 * fecha de abril se mostraría como marzo — el mismo error que evitamos en el
 * backend al parsearlas.
 */

const MONTHS_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** ISO -> "2025-04", el valor que espera un <input type="month">. */
export function toMonthValue(iso?: string | null): string {
  return iso ? iso.slice(0, 7) : '';
}

/** ISO -> "abr 2025". */
export function formatMonth(iso: string): string {
  const d = new Date(iso);
  return `${MONTHS_ES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** "abr 2025 – Actualidad" o "ago 2023 – mar 2024". */
export function formatPeriod(startIso: string, endIso?: string | null): string {
  return `${formatMonth(startIso)} – ${endIso ? formatMonth(endIso) : 'Actualidad'}`;
}
