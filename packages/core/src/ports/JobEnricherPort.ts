import { Job } from '../domain/entities/Job';

/**
 * Port: abstraction for resolving the full description of an already-discovered
 * job. This is the ENRICHMENT side of ingestion (ADR-0029).
 *
 * Implementations form a CASCADE that degrades, tried in order until one
 * answers: the company's public ATS (Greenhouse, Lever, Ashby…), the company's
 * own careers page via its `JobPosting` JSON-LD, and finally the description the
 * user captured from the page they were already looking at. Each step is
 * independent and may decline, so a job is never lost — the worst case is the
 * flow Phase 1 already supports.
 *
 * There is deliberately no `canHandle`: whether an enricher applies usually
 * depends on state it would have to look up anyway (is this company's ATS token
 * cached? does this URL belong to us?), so asking is not cheaper than trying.
 * Returning null IS the "not mine" answer.
 */

export interface EnrichmentResult {
  /** The job description. An enricher that cannot produce one returns null. */
  description: string;
  /**
   * Fields the enricher resolved better than discovery did. An ATS knows the
   * real posting date and salary band; an alert email usually does not.
   */
  salary?: { min?: number; max?: number; currency?: string };
  postedAt?: Date;
  /**
   * The canonical application URL, when the enricher found one better than the
   * tracking link discovery came with. Often the ATS form the "Apply" button
   * would have redirected to anyway.
   */
  applyUrl?: string;
}

export interface JobEnricherPort {
  /**
   * Identifies which cascade step resolved a job. Not decoration: the hit rate
   * per step is the measurement that tells us whether the ATS shortcut is
   * carrying its weight for this user's actual search (ADR-0029).
   */
  readonly name: string;

  /**
   * Resolve the description, or return null if this enricher cannot.
   * Returning null is normal and expected — it just moves the job to the next
   * step of the cascade.
   */
  enrich(job: Job): Promise<EnrichmentResult | null>;
}
