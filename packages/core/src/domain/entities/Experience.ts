/**
 * A container that gives bullets their context: a job, a personal/academic
 * project, or a degree. Without this, a CV is just a flat list of achievements —
 * a recruiter cannot tell WHERE or WHEN anything happened.
 *
 * The three kinds share the same shape on purpose: all of them organize a
 * candidate's timeline, all of them title an achievement, and all of them group
 * bullets under a heading with a period. Modeling them as one entity means the
 * CV renders all three with the same code, and a bullet is never left orphaned
 * with nowhere to belong — every bullet MUST point to a container (see Bullet).
 *
 * `organization`/`title` are reinterpreted per kind (the UI labels them
 * accordingly), rather than adding kind-specific fields, because doing so would
 * fragment the very code path this unification exists to share:
 *   - job:       organization = employer,            title = role
 *   - project:   organization = context (optional),  title = project name
 *   - education: organization = institution,          title = degree
 */

export type ExperienceKind = 'job' | 'project' | 'education';

export class Experience {
  readonly id: string;
  readonly profileId: string;
  readonly kind: ExperienceKind;
  readonly organization: string;
  readonly title: string;
  readonly location?: string;
  /** Only meaningful for `kind: 'project'`. */
  readonly url?: string;
  /** First day of the starting month; only month/year are meaningful on a CV. */
  readonly startDate: Date;
  /** Undefined means it's ongoing ("Present"). */
  readonly endDate?: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(data: {
    id: string;
    profileId: string;
    kind: ExperienceKind;
    organization: string;
    title: string;
    location?: string;
    url?: string;
    startDate: Date;
    endDate?: Date;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = data.id;
    this.profileId = data.profileId;
    this.kind = data.kind;
    this.organization = data.organization;
    this.title = data.title;
    this.location = data.location;
    this.url = data.url;
    this.startDate = data.startDate;
    this.endDate = data.endDate;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  /** Still ongoing (current job, project without a wrap date, etc). */
  get isCurrent(): boolean {
    return this.endDate === undefined;
  }

  /**
   * Orders containers the way a CV does: most recent first. Ongoing ones come
   * before finished ones; ties break by start date. Applies across kinds, but
   * is used PER SECTION (jobs sorted among jobs, projects among projects): a CV
   * doesn't interleave a job and a degree in the same list.
   *
   * Static so it can be passed straight to `Array.prototype.sort`.
   */
  static byMostRecent(a: Experience, b: Experience): number {
    if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1;
    const end = (b.endDate?.getTime() ?? 0) - (a.endDate?.getTime() ?? 0);
    if (end !== 0) return end;
    return b.startDate.getTime() - a.startDate.getTime();
  }
}
