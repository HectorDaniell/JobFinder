import { z } from 'zod';

/**
 * Master profile: the user's professional identity and preferences.
 * Everything the system knows about the candidate.
 */

export const PreferenceSchema = z.object({
  targetRoles: z.array(z.string()).min(1),
  minSeniority: z.enum(['junior', 'mid', 'senior', 'lead', 'any']),
  preferredLocations: z.array(z.string()),
  modality: z.enum(['remote', 'hybrid', 'onsite', 'any']),
  languages: z.array(z.enum(['es', 'en'])).min(1),
  minSalary: z.number().positive().optional(),
  dealBreakers: z.array(z.string()),
});

export type Preferences = z.infer<typeof PreferenceSchema>;

export class Profile {
  readonly id: string;
  readonly fullName: string;
  readonly email: string;
  readonly phone?: string;
  readonly links: { github?: string; linkedin?: string; portfolio?: string };
  readonly summaryEs: string;
  readonly summaryEn: string;
  readonly preferences: Preferences;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(data: {
    id: string;
    fullName: string;
    email: string;
    phone?: string;
    links?: { github?: string; linkedin?: string; portfolio?: string };
    summaryEs: string;
    summaryEn: string;
    preferences: Preferences;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = data.id;
    this.fullName = data.fullName;
    this.email = data.email;
    this.phone = data.phone;
    this.links = data.links ?? {};
    this.summaryEs = data.summaryEs;
    this.summaryEn = data.summaryEn;
    this.preferences = data.preferences;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  updatePreferences(prefs: Preferences): Profile {
    return new Profile({
      ...this,
      preferences: prefs,
      updatedAt: new Date(),
    });
  }
}
