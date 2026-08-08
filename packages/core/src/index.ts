// Entities
export { Profile, PreferenceSchema, type Preferences } from './domain/entities/Profile';
export { Bullet, type BulletCategory } from './domain/entities/Bullet';
export { Experience, type ExperienceKind } from './domain/entities/Experience';
export { Job, type JobSeniority, type JobModality } from './domain/entities/Job';

// Value Objects
export { JobScore, type ApplyDecision } from './domain/value-objects/JobScore';

// Ports
export {
  type JobSourcePort,
  type RawJob,
} from './ports/JobSourcePort';
export {
  type LlmPort,
  type ExtractedJob,
  type TailoredCv,
  type TailoredBullet,
} from './ports/LlmPort';
export { type EmbedderPort } from './ports/EmbedderPort';
export {
  type DocumentPort,
  type DocumentArtifact,
  type DocFormat,
} from './ports/DocumentPort';

// Errors
export {
  DomainError,
  ValidationError,
  NotFoundError,
  ConflictError,
  UnauthorizedError,
} from './errors/DomainError';

// Use cases
export {
  TailorDocuments,
  type ProfileProvider,
  type ExperienceProvider,
  type BulletProvider,
  type TailorInput,
  type TailorResult,
} from './use-cases/TailorDocuments';
