/**
 * A single achievement/experience entry in the candidate's resume.
 * Stored in multiple languages and tagged with skills.
 * The LLM will select and reformat bullets from this bank when adapting CV.
 */

/**
 * `experience` = a day-to-day duty or responsibility; `achievement` = a
 * standout, quantifiable result. This is an editorial distinction, independent
 * of WHERE the bullet belongs — that's the container's job (see Experience).
 * There used to be `project`/`education` variants too, but those only ever
 * duplicated the container's `kind`; a bullet under a project container no
 * longer needs to also claim `category: 'project'`.
 */
export type BulletCategory = 'experience' | 'achievement';

export class Bullet {
  readonly id: string;
  readonly profileId: string;
  readonly textEs: string;
  readonly textEn: string;
  readonly skills: string[];
  readonly category: BulletCategory;
  /** The container this happened under — a job, a project, or a degree.
   *  Every bullet belongs to exactly one; there is no "loose" bullet. */
  readonly experienceId: string;
  readonly metrics?: Record<string, string | number>;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(data: {
    id: string;
    profileId: string;
    textEs: string;
    textEn: string;
    skills: string[];
    category: BulletCategory;
    experienceId: string;
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
