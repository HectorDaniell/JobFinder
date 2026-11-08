/**
 * Formatea el período de una experiencia para el CV: "abr 2025 – Actualidad".
 *
 * Función PURA, localizada ES/EN (el CV puede generarse en cualquiera de los
 * dos). Lee con los getters UTC porque las fechas se guardan a medianoche UTC
 * (ver ADR de Experience): con los getters locales, en UTC-5 abril se leería
 * como marzo — el mismo error que ya evitamos en la API y en la web.
 */

const MONTHS: Record<'es' | 'en', readonly string[]> = {
  es: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

const PRESENT: Record<'es' | 'en', string> = { es: 'Actualidad', en: 'Present' };

function formatMonth(date: Date, lang: 'es' | 'en'): string {
  return `${MONTHS[lang][date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

export function formatPeriod(startDate: Date, endDate: Date | undefined, lang: 'es' | 'en'): string {
  const end = endDate ? formatMonth(endDate, lang) : PRESENT[lang];
  return `${formatMonth(startDate, lang)} – ${end}`;
}
