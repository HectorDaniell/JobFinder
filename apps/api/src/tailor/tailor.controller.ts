import { randomUUID } from 'node:crypto';
import { Controller, Post, Param, Body } from '@nestjs/common';
import { Job, TailorDocuments, type TailorResult } from '@jobfinder/core';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { TailorRequestSchema, type TailorRequestDto } from './tailor.schema';

/** Un archivo generado, listo para transportar por JSON (binario -> base64). */
interface TailorFileResponse {
  filename: string;
  mimeType: string;
  base64: string;
}

/** Respuesta del endpoint: preview en texto + los archivos en base64. */
interface TailorResponse {
  cv: TailorResult['cv'];
  coverLetter: string;
  files: TailorFileResponse[];
}

/**
 * POST /profiles/:profileId/tailor — el endpoint estrella.
 *
 * A diferencia del CRUD, aquí SÍ usamos un caso de uso: TailorDocuments (core)
 * orquesta perfil + LLM + documentos. El controlador solo (1) arma el Job
 * manual desde el body y (2) traduce el resultado a HTTP. Los errores de
 * dominio (NotFound, sin bullets, rate limit, timeout…) los mapea el
 * DomainExceptionFilter, así que aquí no hace falta try/catch.
 */
@Controller('profiles/:profileId/tailor')
export class TailorController {
  constructor(private readonly tailor: TailorDocuments) {}

  @Post()
  async run(
    @Param('profileId') profileId: string,
    @Body(new ZodValidationPipe(TailorRequestSchema)) dto: TailorRequestDto
  ): Promise<TailorResponse> {
    const job = this.buildJob(dto.job);
    const result = await this.tailor.execute({
      profileId,
      job,
      lang: dto.lang,
      formats: dto.formats,
    });
    return this.toResponse(result);
  }

  /**
   * Construye una entidad Job desde lo que el usuario pegó. El body trae lo
   * esencial; los campos que la entidad exige pero no vienen del usuario los
   * rellenamos como "entrada manual" (sourceId 'manual', timestamps = ahora,
   * modality/seniority 'unknown' si no se indican).
   */
  private buildJob(input: TailorRequestDto['job']): Job {
    const now = new Date();
    return new Job({
      id: randomUUID(),
      sourceId: 'manual',
      externalId: randomUUID(),
      title: input.title,
      company: input.company,
      location: input.location,
      modality: input.modality ?? 'unknown',
      seniority: input.seniority ?? 'unknown',
      description: input.description,
      url: input.url ?? '',
      postedAt: now,
      raw: {},
      dedupHash: Job.generateDedupHash(input.company, input.title, input.location ?? ''),
      ingestedAt: now,
    });
  }

  /**
   * Traduce el resultado del caso de uso a la respuesta HTTP. Los bytes de cada
   * archivo se serializan a base64 porque JSON no transporta binario; el front
   * los decodifica para descargar. Devolvemos también cv/coverLetter en texto
   * para el preview.
   */
  private toResponse(result: TailorResult): TailorResponse {
    return {
      cv: result.cv,
      coverLetter: result.coverLetter,
      files: result.files.map((f) => ({
        filename: f.filename,
        mimeType: f.mimeType,
        base64: Buffer.from(f.bytes).toString('base64'),
      })),
    };
  }
}
