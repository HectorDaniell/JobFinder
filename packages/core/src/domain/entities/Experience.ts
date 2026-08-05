/**
 * A job the candidate held: the container that gives bullets their context.
 *
 * Without this, a CV is just a flat list of achievements — a recruiter cannot
 * tell WHERE or WHEN anything happened. Bullets link here optionally: those from
 * personal projects or education belong to no employer.
 */

export class Experience {
  readonly id: string;
  readonly profileId: string;
  readonly company: string;
  readonly role: string;
  readonly location?: string;
  /** First day of the starting month; only month/year are meaningful on a CV. */
  readonly startDate: Date;
  /** Undefined means the job is ongoing ("Present"). */
  readonly endDate?: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(data: {
    id: string;
    profileId: string;
    company: string;
    role: string;
    location?: string;
    startDate: Date;
    endDate?: Date;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = data.id;
    this.profileId = data.profileId;
    this.company = data.company;
    this.role = data.role;
    this.location = data.location;
    this.startDate = data.startDate;
    this.endDate = data.endDate;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  /** Still working here. */
  get isCurrent(): boolean {
    return this.endDate === undefined;
  }

  /**
   * Orders experiences the way a CV does: most recent first. Ongoing jobs come
   * before finished ones; ties break by start date.
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
