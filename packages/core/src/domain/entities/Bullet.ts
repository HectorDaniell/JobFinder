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
  readonly sourceRole?: string; // The role/context where this bullet was originally used
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
