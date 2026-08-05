/**
 * A single achievement/experience entry in the candidate's resume.
 * Stored in multiple languages and tagged with skills.
 * The LLM will select and reformat bullets from this bank when adapting CV.
 */

export class Bullet {
  readonly id: string;
  readonly profileId: string;
  readonly textEs: string;
  readonly textEn: string;
  readonly skills: string[];
  readonly category: 'experience' | 'achievement' | 'project' | 'education';
  /** The job this happened at. Undefined for personal projects and education. */
  readonly experienceId?: string;
  readonly sourceRole?: string; // Free-text context, for bullets with no linked experience
  readonly metrics?: Record<string, string | number>;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(data: {
    id: string;
    profileId: string;
    textEs: string;
    textEn: string;
    skills: string[];
    category: 'experience' | 'achievement' | 'project' | 'education';
    experienceId?: string;
    sourceRole?: string;
    metrics?: Record<string, string | number>;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = data.id;
    this.profileId = data.profileId;
    this.textEs = data.textEs;
    this.textEn = data.textEn;
    this.skills = data.skills;
    this.category = data.category;
    this.experienceId = data.experienceId;
    this.sourceRole = data.sourceRole;
    this.metrics = data.metrics;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  matchesSkills(requiredSkills: string[]): number {
    const matched = this.skills.filter((skill) =>
      requiredSkills.some((req) => req.toLowerCase().includes(skill.toLowerCase()))
    );
    return matched.length / Math.max(requiredSkills.length, 1);
  }

  getText(lang: 'es' | 'en'): string {
    return lang === 'es' ? this.textEs : this.textEn;
  }
}
