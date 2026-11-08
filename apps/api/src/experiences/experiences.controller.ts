import { randomUUID } from 'node:crypto';
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  HttpCode,
  Inject,
} from '@nestjs/common';
import { Experience, NotFoundError, ValidationError } from '@jobfinder/core';
import { ExperienceRepository, ProfileRepository } from '@jobfinder/db';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  CreateExperienceSchema,
  UpdateExperienceSchema,
  type CreateExperienceDto,
  type UpdateExperienceDto,
} from './experience.schemas';

/**
 * CRUD de contenedores (empleos, proyectos y educación), anidados bajo el
 * perfil. `kind` no cambia tras crear el contenedor — ver UpdateExperienceSchema.
 *
 * Mismo patrón que Bullets: el profileId de la URL verifica PERTENENCIA
 * (getOwned), el controlador habla directo con el repositorio y solo lanza
 * errores de dominio.
 */
@Controller('profiles/:profileId/experiences')
export class ExperiencesController {
  constructor(
    @Inject(ExperienceRepository) private readonly experiences: ExperienceRepository,
    @Inject(ProfileRepository) private readonly profiles: ProfileRepository
  ) {}

  @Post()
  async create(
    @Param('profileId') profileId: string,
    @Body(new ZodValidationPipe(CreateExperienceSchema)) dto: CreateExperienceDto
  ): Promise<Experience> {
    const profile = await this.profiles.findById(profileId);
    if (!profile) throw new NotFoundError('Profile', profileId);

    const now = new Date();
    return this.experiences.create(
      new Experience({
        ...dto,
        endDate: dto.endDate ?? undefined, // null (del JSON) -> undefined (sigue ahí)
        id: randomUUID(),
        profileId,
        createdAt: now,
        updatedAt: now,
      })
    );
  }

  @Get()
  async findByProfile(@Param('profileId') profileId: string): Promise<Experience[]> {
    return this.experiences.findByProfileId(profileId); // ya vienen en orden de CV
  }

  @Get(':id')
  async findOne(
    @Param('profileId') profileId: string,
    @Param('id') id: string
  ): Promise<Experience> {
    return this.getOwned(profileId, id);
  }

  @Patch(':id')
  async update(
    @Param('profileId') profileId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateExperienceSchema)) dto: UpdateExperienceDto
  ): Promise<Experience> {
    const existing = await this.getOwned(profileId, id);

    // endDate tiene TRES estados distintos y hay que respetarlos:
    //   ausente  -> no tocar          null -> limpiarlo (volvió a ser el actual)
    //   fecha    -> asignarla
    const endDate = dto.endDate === undefined ? existing.endDate : (dto.endDate ?? undefined);
    const startDate = dto.startDate ?? existing.startDate;

    // El refine del schema no puede validar esto: en un PATCH cada fecha puede
    // venir de la petición o de lo ya guardado. Se comprueba sobre la mezcla.
    if (endDate && endDate < startDate) {
      throw new ValidationError('La fecha de fin no puede ser anterior a la de inicio', 'endDate');
    }

    return this.experiences.update(
      new Experience({ ...existing, ...dto, startDate, endDate, updatedAt: new Date() })
    );
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @Param('profileId') profileId: string,
    @Param('id') id: string
  ): Promise<void> {
    await this.getOwned(profileId, id);
    // Borra EN CASCADA sus bullets: ya no pueden quedar huérfanos, porque
    // experience_id es obligatorio (ver ADR-0028). El front avisa antes de
    // borrar un contenedor que todavía tenga bullets.
    await this.experiences.delete(id);
  }

  /** Carga la experiencia y verifica que pertenezca al perfil de la URL. */
  private async getOwned(profileId: string, id: string): Promise<Experience> {
    const experience = await this.experiences.findById(id);
    if (!experience || experience.profileId !== profileId) {
      throw new NotFoundError('Experience', id);
    }
    return experience;
  }
}
