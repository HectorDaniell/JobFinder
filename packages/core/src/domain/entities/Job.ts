/**
 * A job posting normalized from any source (email, API, etc.)
 * Contains raw metadata and a dedup hash for identifying duplicates.
 */

export type JobSeniority = 'junior' | 'mid' | 'senior' | 'lead' | 'unknown';
export type JobModality = 'remote' | 'hybrid' | 'onsite' | 'unknown';

export class Job {
  readonly id: string;
  readonly sourceId: string; // Reference to the source this came from
  readonly externalId: string; // Unique ID at the source
  readonly title: string;
  readonly company: string;
  readonly location?: string;
  readonly modality: JobModality;
  readonly seniority: JobSeniority;
  readonly description: string;
  readonly url: string;
  readonly postedAt: Date;
  readonly salary?: { min?: number; max?: number; currency?: string };
  readonly raw: Record<string, unknown>; // Raw data from source (for debugging)
  readonly dedupHash: string; // Hash to identify duplicates across sources
  readonly embedding?: number[]; // pgvector: embedding of description
  readonly ingestedAt: Date;

  constructor(data: {
    id: string;
    sourceId: string;
    externalId: string;
    title: string;
    company: string;
    location?: string;
    modality: JobModality;
    seniority: JobSeniority;
    description: string;
    url: string;
    postedAt: Date;
    salary?: { min?: number; max?: number; currency?: string };
    raw: Record<string, unknown>;
    dedupHash: string;
    embedding?: number[];
    ingestedAt: Date;
  }) {
    this.id = data.id;
    this.sourceId = data.sourceId;
    this.externalId = data.externalId;
    this.title = data.title;
    this.company = data.company;
    this.location = data.location;
    this.modality = data.modality;
    this.seniority = data.seniority;
    this.description = data.description;
    this.url = data.url;
    this.postedAt = data.postedAt;
    this.salary = data.salary;
    this.raw = data.raw;
    this.dedupHash = data.dedupHash;
    this.embedding = data.embedding;
    this.ingestedAt = data.ingestedAt;
  }

  static generateDedupHash(company: string, title: string, location: string): string {
    // Normalize: lowercase, trim, remove extra spaces
    const normalized = [company, title, location]
      .map((s) => s.toLowerCase().trim().replace(/\s+/g, ' '))
      .join('|');
    // Simple hash (in production, use crypto.createHash)
    return normalized;
  }
}
