/**
 * A job posting normalized from any source (email, API, etc.)
 * Contains raw metadata and a dedup hash for identifying duplicates.
 *
 * A Job may be THIN: discovered but without its description yet. That is a
 * legitimate state, not an error — job alert emails are notifications (a card
 * plus a tracking link), so discovery and enrichment are two separate stages
 * (ADR-0029). Funnel layer 1 runs entirely on the thin metadata below, and only
 * the survivors are worth the cost of fetching a description.
 */

export type JobSeniority = 'junior' | 'mid' | 'senior' | 'lead' | 'unknown';
export type JobModality = 'remote' | 'hybrid' | 'onsite' | 'unknown';

/**
 * - `thin`        — discovered, not enriched yet. Layer 1 can still judge it.
 * - `enriched`    — has its description; ready for layers 2–4.
 * - `unavailable` — the whole cascade ran and none of its steps resolved it.
 *                   Distinguishing this from `thin` is what stops us retrying
 *                   a dead end on every scheduled run.
 */
export type EnrichmentStatus = 'thin' | 'enriched' | 'unavailable';

export class Job {
  readonly id: string;
  readonly sourceId: string; // Reference to the source this came from
  readonly externalId: string; // Unique ID at the source
  readonly title: string;
  readonly company: string;
  readonly location?: string;
  readonly modality: JobModality;
  readonly seniority: JobSeniority;
  /** Absent while the job is still thin. See `enrichmentStatus`. */
  readonly description?: string;
  readonly url: string;
  readonly postedAt: Date;
  readonly salary?: { min?: number; max?: number; currency?: string };
  readonly raw: Record<string, unknown>; // Raw data from source (for debugging)
  readonly dedupHash: string; // Hash to identify duplicates across sources
  readonly embedding?: number[]; // pgvector: embedding of description
  /**
   * Set once the enrichment cascade has run to exhaustion without resolving a
   * description. Stored rather than derived because "never tried" and "tried
   * and failed" look identical from the outside — both simply lack a description.
   */
  readonly enrichmentFailed: boolean;
  /** Which cascade step resolved it, for measuring the hit rate (ADR-0029). */
  readonly enrichedBy?: string;
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
    description?: string;
    url: string;
    postedAt: Date;
    salary?: { min?: number; max?: number; currency?: string };
    raw: Record<string, unknown>;
    dedupHash: string;
    embedding?: number[];
    enrichmentFailed?: boolean;
    enrichedBy?: string;
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
    this.enrichmentFailed = data.enrichmentFailed ?? false;
    this.enrichedBy = data.enrichedBy;
    this.ingestedAt = data.ingestedAt;
  }

  /**
   * Derived, never stored: "enriched but with no description" is a state that
   * cannot be represented at all, the same way an Experience cannot be both
   * current and have an end date.
   */
  get enrichmentStatus(): EnrichmentStatus {
    if (this.description) return 'enriched';
    return this.enrichmentFailed ? 'unavailable' : 'thin';
  }

  /** Has the text that layers 2–4 need to reason about. */
  get isEnriched(): boolean {
    return this.enrichmentStatus === 'enriched';
  }

  /** Still worth putting through the enrichment cascade. */
  get needsEnrichment(): boolean {
    return this.enrichmentStatus === 'thin';
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
