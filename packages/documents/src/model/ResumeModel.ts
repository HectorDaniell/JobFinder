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
  projects: string;
  education: string;
}

/**
 * Un bloque titulado con sus bullets debajo. Las tres secciones con contenido
 * agrupado —experiencia, proyectos y formación— comparten esta forma, así que
 * los exporters dibujan las tres con la MISMA función.
 *
 * Todo llega ya formateado (el período como "abr 2025 – Actualidad"): los
 * exporters solo dibujan texto, nunca deciden idioma ni formato de fecha.
 */
export interface ResumeGroup {
  /** Negrita: "Fullstack Developer — Fluyez", "JobFinder — Proyecto personal". */
  heading: string;
  /** Línea secundaria en gris: el período (y la URL, si es un proyecto que la tiene). */
  meta: string;
  /** Puede venir vacío: un contenedor entra al CV aunque el LLM no eligiera
   *  ningún logro suyo para esta vacante (ver buildResumeModel). */
  bullets: string[];
}

/**
 * Representación neutral al formato de un CV.
 * - summary: párrafo de texto libre (resumen profesional del Profile)
 * - skills: lista (viene de TailoredCv.keywords)
 * - experience / projects / education: un bloque por CONTENEDOR de ese `kind`
 *   (ver Experience en core), con los bullets que el LLM seleccionó para él
 *   debajo — vacío si no seleccionó ninguno.
 */
export interface ResumeModel {
  header: ResumeHeader;
  labels: ResumeLabels;
  summary: string;
  skills: string[];
  experience: ResumeGroup[];
  projects: ResumeGroup[];
  education: ResumeGroup[];
}
