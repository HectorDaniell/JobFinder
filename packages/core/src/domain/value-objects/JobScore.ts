/**
 * The result of scoring a job (layer 3 of the funnel: LLM evaluation).
 * Immutable value object.
 */

export type ApplyDecision = 'apply' | 'maybe' | 'skip';

export class JobScore {
  readonly jobId: string;
  readonly layer: 'rules' | 'embedding' | 'llm';
  readonly score: number; // 0–100
  readonly decision: ApplyDecision;
  readonly reasoning: string;
  readonly missingKeywords: string[];
  readonly gapAnalysis: string;
  readonly model?: string; // Which LLM model generated this (if layer === 'llm')
  readonly createdAt: Date;

  constructor(data: {
    jobId: string;
    layer: 'rules' | 'embedding' | 'llm';
    score: number;
    decision: ApplyDecision;
    reasoning: string;
    missingKeywords: string[];
    gapAnalysis: string;
    model?: string;
    createdAt: Date;
  }) {
    if (data.score < 0 || data.score > 100) {
      throw new Error('Score must be between 0 and 100');
    }
    this.jobId = data.jobId;
    this.layer = data.layer;
    this.score = data.score;
    this.decision = data.decision;
    this.reasoning = data.reasoning;
    this.missingKeywords = data.missingKeywords;
    this.gapAnalysis = data.gapAnalysis;
    this.model = data.model;
    this.createdAt = data.createdAt;
  }

  static filterDecision(decision: ApplyDecision): boolean {
    return decision !== 'skip';
  }

  static sortByScore(a: JobScore, b: JobScore): number {
    return b.score - a.score;
  }
}
