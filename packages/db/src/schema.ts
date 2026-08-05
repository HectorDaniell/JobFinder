import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

/**
 * Database schema for JobFinder.
 * Uses Drizzle ORM + pgvector for semantic search.
 */

// ============ Profile ============
export const profile = pgTable('profile', {
  id: uuid('id').defaultRandom().primaryKey(),
  fullName: text('full_name').notNull(),
  email: text('email').notNull().unique(),
  phone: text('phone'),
  links: jsonb('links'), // { github?, linkedin?, portfolio? }
  summaryEs: text('summary_es').notNull(),
  summaryEn: text('summary_en').notNull(),
  preferences: jsonb('preferences').notNull(), // Preferences JSON
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============ Experience (a job held: gives bullets their context) ============
export const experience = pgTable(
  'experience',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    profileId: uuid('profile_id')
      .notNull()
      .references(() => profile.id, { onDelete: 'cascade' }),
    company: text('company').notNull(),
    role: text('role').notNull(),
    location: text('location'),
    startDate: timestamp('start_date').notNull(),
    endDate: timestamp('end_date'), // null = still working here
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    profileIdIdx: index('experience_profile_id_idx').on(table.profileId),
  })
);

// ============ Bullet (resume bullets/achievements) ============
export const bullet = pgTable(
  'bullet',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    profileId: uuid('profile_id')
      .notNull()
      .references(() => profile.id, { onDelete: 'cascade' }),
    // Nullable: project and education bullets belong to no employer. On delete
    // we only unlink (SET NULL) — losing a job must never delete the achievement.
    experienceId: uuid('experience_id').references(() => experience.id, {
      onDelete: 'set null',
    }),
    textEs: text('text_es').notNull(),
    textEn: text('text_en').notNull(),
    skills: text('skills').array(), // Array of skill tags
    category: text('category').notNull(), // 'experience' | 'achievement' | 'project' | 'education'
    sourceRole: text('source_role'),
    metrics: jsonb('metrics'), // { metric_name: value }
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    profileIdIdx: index('bullet_profile_id_idx').on(table.profileId),
  })
);

// ============ Source (job source config) ============
export const source = pgTable('source', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().unique(), // 'gmail', 'getonboard', 'remotive', etc.
  kind: text('kind').notNull(), // 'email' | 'api' | 'rss'
  config: jsonb('config'), // Source-specific config (API key, query, etc.)
  enabled: text('enabled').default('true'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============ Job (normalized job posting) ============
export const job = pgTable(
  'job',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sourceId: uuid('source_id')
      .notNull()
      .references(() => source.id, { onDelete: 'cascade' }),
    externalId: text('external_id').notNull(), // ID at the source
    title: text('title').notNull(),
    company: text('company').notNull(),
    location: text('location'),
    modality: text('modality').default('unknown'), // 'remote' | 'hybrid' | 'onsite'
    seniority: text('seniority').default('unknown'), // 'junior' | 'mid' | 'senior' | 'lead'
    description: text('description').notNull(),
    url: text('url').notNull(),
    postedAt: timestamp('posted_at'),
    salary: jsonb('salary'), // { min?, max?, currency? }
    raw: jsonb('raw'), // Raw data from source
    dedupHash: text('dedup_hash').notNull(), // For identifying duplicates
    ingestedAt: timestamp('ingested_at').defaultNow().notNull(),
  },
  (table) => ({
    sourceIdIdx: index('job_source_id_idx').on(table.sourceId),
    dedupHashIdx: uniqueIndex('job_dedup_hash_idx').on(table.dedupHash),
  })
);

// ============ JobScore (matching evaluation) ============
export const jobScore = pgTable(
  'job_score',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    jobId: uuid('job_id')
      .notNull()
      .references(() => job.id, { onDelete: 'cascade' }),
    layer: text('layer').notNull(), // 'rules' | 'embedding' | 'llm'
    score: text('score').notNull(), // 0–100
    decision: text('decision').notNull(), // 'apply' | 'maybe' | 'skip'
    reasoning: text('reasoning'),
    missingKeywords: text('missing_keywords').array(),
    gapAnalysis: text('gap_analysis'),
    model: text('model'), // LLM model if layer='llm'
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    jobIdIdx: index('job_score_job_id_idx').on(table.jobId),
  })
);

// ============ Document (generated CV/cover letter) ============
export const document = pgTable(
  'document',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    jobId: uuid('job_id')
      .notNull()
      .references(() => job.id, { onDelete: 'cascade' }),
    type: text('type').notNull(), // 'cv' | 'cover'
    lang: text('lang').notNull(), // 'es' | 'en'
    content: jsonb('content'), // Structured content (to be serialized)
    filePath: text('file_path'), // Local path to PDF/DOCX
    version: text('version').default('1'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    jobIdIdx: index('document_job_id_idx').on(table.jobId),
  })
);

// ============ Application (postulation record) ============
export const application = pgTable(
  'application',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    jobId: uuid('job_id')
      .notNull()
      .references(() => job.id, { onDelete: 'cascade' }),
    channel: text('channel').notNull(), // 'email' | 'greenhouse' | 'lever' | 'assisted'
    status: text('status').default('prepared'), // 'prepared' | 'submitted' | 'acknowledged' | ...
    cvDocumentId: uuid('cv_document_id').references(() => document.id),
    coverDocumentId: uuid('cover_document_id').references(() => document.id),
    answers: jsonb('answers'), // Answers to form questions if any
    submittedAt: timestamp('submitted_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    jobIdIdx: index('application_job_id_idx').on(table.jobId),
    statusIdx: index('application_status_idx').on(table.status),
  })
);

// ============ ApplicationEvent (timeline of application state changes) ============
export const applicationEvent = pgTable(
  'application_event',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    applicationId: uuid('application_id')
      .notNull()
      .references(() => application.id, { onDelete: 'cascade' }),
    type: text('type').notNull(), // 'submitted', 'rejected', 'interview', etc.
    payload: jsonb('payload'), // Event metadata
    occurredAt: timestamp('occurred_at').defaultNow().notNull(),
  },
  (table) => ({
    applicationIdIdx: index('application_event_application_id_idx').on(table.applicationId),
  })
);

// ============ LlmUsage (cost tracking) ============
export const llmUsage = pgTable(
  'llm_usage',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    op: text('op').notNull(), // 'extract' | 'score' | 'tailor_cv' | 'tailor_cover'
    model: text('model').notNull(), // 'haiku' | 'sonnet' | 'opus'
    inputTokens: text('input_tokens'),
    outputTokens: text('output_tokens'),
    costEstimate: text('cost_estimate'), // USD
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    createdAtIdx: index('llm_usage_created_at_idx').on(table.createdAt),
  })
);
