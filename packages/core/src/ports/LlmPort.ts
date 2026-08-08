/**
 * Port: abstraction for LLM reasoning operations.
 * Implementations are in packages/llm (e.g., Claude adapter)
 */

import { Job } from '../domain/entities/Job';
import { Profile } from '../domain/entities/Profile';
import { JobScore } from '../domain/value-objects/JobScore';
import type { BulletCategory } from '../domain/entities/Bullet';

export interface ExtractedJob {
  title: string;
  company: string;
  location?: string;
  description: string;
  url: string;
  externalId: string;
}

/**
 * A bullet Claude selected and reformulated, still traceable to its ORIGIN:
 * every field but `text` comes from the real bank bullet it matched (resolved
 * by the anti-fabrication guardrail, ADR-0023), never invented.
 *
 * `experienceId` is never empty: every bank bullet belongs to a container (a
 * job, a project, or a degree — see Experience). `documents` groups the
 * rendered CV into blocks by that container instead of printing a flat list.
 */
export interface TailoredBullet {
  text: string;
  category: BulletCategory;
  experienceId: string;
  /** The bank bullet's curated skill tags. Source of the CV's skills line. */
  skills: string[];
}

export interface TailoredCv {
  content: string; // Markdown or structured data
  bullets: TailoredBullet[];
  keywords: string[];
}

export interface LlmPort {
  /**
   * Extract job postings from unstructured email/text.
   * Layer 1: cheap operation (use cheaper model like Haiku).
   */
  extractJobs(rawText: string): Promise<ExtractedJob[]>;

  /**
   * Score a job match against the candidate profile.
   * Layer 3: reasoning operation (use Sonnet/Opus, only on top candidates).
   */
  scoreJob(job: Job, profile: Profile): Promise<JobScore>;

  /**
   * Tailor the CV for a specific job.
   * Layer 4: generation (use Sonnet/Opus).
   * Must use only bullets from profile.bullets (no invention).
   */
  tailorCv(job: Job, profile: Profile, lang: 'es' | 'en'): Promise<TailoredCv>;

  /**
   * Generate a cover letter for a specific job.
   * Layer 4: generation (use Sonnet/Opus).
   */
  tailorCoverLetter(job: Job, profile: Profile, lang: 'es' | 'en'): Promise<string>;
}
