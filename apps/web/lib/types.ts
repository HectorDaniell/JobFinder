/**
 * TIPOS DE CABLE (wire types) — la forma del JSON que viaja por HTTP.
 *
 * NO son las entidades de core: las clases no cruzan HTTP. JSON.stringify
 * descarta los métodos (updatePreferences, getText…) y convierte los Date en
 * strings ISO. Estos DTOs describen lo que REALMENTE llega al navegador.
 *
 * Lo que sí reutilizamos de core son sus tipos PUROS (solo datos, sin métodos
 * ni fechas): Preferences, TailoredCv, DocFormat… — una sola fuente de verdad
 * para el vocabulario del dominio.
 */

import type {
  Preferences,
  TailoredCv,
  DocFormat,
  JobModality,
  JobSeniority,
  Bullet,
} from '@jobfinder/core';

// Re-export para que las páginas importen todo de un solo lugar (lib/).
export type { Preferences, TailoredCv, DocFormat, JobModality, JobSeniority };

/** Categoría del bullet, derivada de la entidad (indexed access type):
 *  si core cambia la unión, este tipo se actualiza solo. */
export type BulletCategory = Bullet['category'];

// ---------- respuestas (lo que la API devuelve) ----------

export interface ProfileDto {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  links: { github?: string; linkedin?: string; portfolio?: string };
  summaryEs: string;
  summaryEn: string;
  preferences: Preferences;
  createdAt: string; // ISO — JSON no tiene Date
  updatedAt: string;
}

export interface BulletDto {
  id: string;
  profileId: string;
  textEs: string;
  textEn: string;
  skills: string[];
  category: BulletCategory;
  sourceRole?: string;
  metrics?: Record<string, string | number>;
  createdAt: string;
  updatedAt: string;
}

export interface TailorFileDto {
  filename: string;
  mimeType: string;
  base64: string; // los bytes del PDF/DOCX, serializados para viajar en JSON
}

export interface TailorResponseDto {
  cv: TailoredCv;
  coverLetter: string;
  files: TailorFileDto[];
}

// ---------- entradas (lo que la web envía; espejo de los schemas Zod de la API) ----------

export interface CreateProfileInput {
  fullName: string;
  email: string;
  phone?: string;
  links?: { github?: string; linkedin?: string; portfolio?: string };
  summaryEs: string;
  summaryEn: string;
  preferences: Preferences;
}

export interface CreateBulletInput {
  textEs: string;
  textEn: string;
  skills: string[];
  category: BulletCategory;
  sourceRole?: string;
  metrics?: Record<string, string | number>;
}

export type UpdateBulletInput = Partial<CreateBulletInput>;

export interface TailorJobInput {
  title: string;
  company: string;
  description: string;
  location?: string;
  url?: string;
  modality?: JobModality;
  seniority?: JobSeniority;
}

export interface TailorInput {
  job: TailorJobInput;
  lang: 'es' | 'en';
  formats: DocFormat[];
}
