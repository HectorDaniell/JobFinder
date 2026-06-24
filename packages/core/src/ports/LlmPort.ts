/**
 * Port: abstraction for LLM reasoning operations.
 * Implementations are in packages/llm (e.g., Claude adapter)
 */

import { Job } from '../domain/entities/Job';
import { Profile } from '../domain/entities/Profile';
import { JobScore } from '../domain/value-objects/JobScore';

export interface ExtractedJob {
  title: string;
  company: string;
  location?: string;
  description: string;
  url: string;
  externalId: string;
}

export interface TailoredCv {
  content: string; // Markdown or structured data
  bullets: string[];
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
