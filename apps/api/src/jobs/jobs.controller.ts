import { Controller, Get, Post, Param, Query, Body, HttpCode, Inject } from '@nestjs/common';
import {
  IngestJobs,
  NotFoundError,
  ValidationError,
  Job,
  type IngestReport,
} from '@jobfinder/core';
import { JobRepository } from '@jobfinder/db';
import {
  GmailSource,
  LinkedInJobParser,
  GlassdoorJobParser,
  EmailAlertSource,
} from '@jobfinder/sources';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { IngestEmailRequestSchema, type IngestEmailRequestDto } from './jobs.schemas';

@Controller('jobs')
export class JobsController {
  constructor(
    @Inject(JobRepository) private readonly jobRepo: JobRepository,
    @Inject(IngestJobs) private readonly ingestJobs: IngestJobs
  ) {}

  /**
   * GET /jobs — Lista las vacantes recientes descubiertas y almacenadas en el sistema.
   */
  @Get()
  async getRecent(@Query('limit') limitQuery?: string): Promise<Job[]> {
    const limit = limitQuery ? parseInt(limitQuery, 10) : 50;
    const safeLimit = isNaN(limit) || limit < 1 ? 50 : Math.min(limit, 100);
    return this.jobRepo.findRecent(safeLimit);
  }

  /**
   * GET /jobs/:id — Obtiene el detalle de una vacante por su ID.
   */
  @Get(':id')
  async getById(@Param('id') id: string): Promise<Job> {
    const job = await this.jobRepo.findById(id);
    if (!job) {
      throw new NotFoundError('Job', id);
    }
    return job;
  }

  /**
   * POST /jobs/ingest/email — Dispara el descubrimiento e ingesta de vacantes delgadas
   * desde alertas de correo (LinkedIn, Glassdoor) usando la cuenta Gmail configurada.
   */
  @Post('ingest/email')
  @HttpCode(200)
  async ingestFromEmail(
    @Body(new ZodValidationPipe(IngestEmailRequestSchema)) dto: IngestEmailRequestDto
  ): Promise<IngestReport> {
    const clientId = process.env.GMAIL_CLIENT_ID;
    const clientSecret = process.env.GMAIL_CLIENT_SECRET;
    const refreshToken = process.env.GMAIL_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !refreshToken) {
      throw new ValidationError(
        'Gmail credentials not configured in environment (GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN)'
      );
    }

    const gmailReader = new GmailSource({
      clientId,
      clientSecret,
      refreshToken,
    });

    const parsers = [new LinkedInJobParser(), new GlassdoorJobParser()];
    const alertSource = new EmailAlertSource(gmailReader, parsers, {
      query: dto.query,
    });

    // Si no se indica fecha, por defecto se sincronizan los últimos 7 días
    const since = dto.since
      ? new Date(dto.since)
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    return this.ingestJobs.execute({
      source: alertSource,
      since,
    });
  }
}
