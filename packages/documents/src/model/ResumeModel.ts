/**
 * MODELO INTERMEDIO DEL CV (neutral al formato)
 *
 * Representa "QUÉ contiene el CV" de forma independiente a PDF/DOCX.
 * Lo construye UNA sola vez `buildResumeModel` y lo consumen TODOS los
 * exporters. Así la lógica de "qué va en el CV" no se duplica por formato.
 *
 * NO es una entidad del dominio: no tiene id, ni comportamiento, ni reglas
 * de negocio. Es un DTO interno de este package (por eso vive aquí y no en
 * core). Ver la discusión "Entidad vs DTO" del Sprint 3.
 */

/** Un enlace con etiqueta para el encabezado (GitHub, LinkedIn, …). */
export interface ResumeLink {
  label: string;
  url: string;
}

/** Bloque de contacto en la parte superior del CV. */
export interface ResumeHeader {
  fullName: string;
  email: string;
  phone?: string;
  links: ResumeLink[];
}

/**
 * Títulos de sección, YA localizados por el mapper.
 * Los exporters nunca tocan el idioma: reciben los textos finales.
 */
export interface ResumeLabels {
  summary: string;
  skills: string;
  experience: string;
}

/**
 * Representación neutral al formato de un CV.
 * - summary: párrafo de texto libre (resumen profesional del Profile)
 * - skills: lista (viene de TailoredCv.keywords)
 * - experience: bullets ya adaptados (viene de TailoredCv.bullets)
 */
export interface ResumeModel {
  header: ResumeHeader;
  labels: ResumeLabels;
  summary: string;
  skills: string[];
  experience: string[];
}
