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
} from '@nestjs/common';
import { Profile, ConflictError, NotFoundError } from '@jobfinder/core';
import { ProfileRepository } from '@jobfinder/db';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  CreateProfileSchema,
  UpdateProfileSchema,
  type CreateProfileDto,
  type UpdateProfileDto,
} from './profile.schemas';

/**
 * CRUD de Profile.
 *
 * El controlador habla DIRECTO con el repositorio: es un paso simple
 * (validar -> repo -> responder), sin orquestación que justifique un caso de
 * uso. Solo lanza errores de dominio (ConflictError, NotFoundError); el
 * DomainExceptionFilter global los traduce a 409/404. La validación de entrada
 * la hace el ZodValidationPipe, aplicado POR RUTA con su schema.
 *
 * El repo se inyecta por constructor (Nest lo resuelve vía InfraModule, que lo
 * exporta como provider).
 */
@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profiles: ProfileRepository) {}

  @Post()
  async create(
    @Body(new ZodValidationPipe(CreateProfileSchema)) dto: CreateProfileDto
  ): Promise<Profile> {
    // El email es único: comprobamos aquí para responder 409 limpio, en vez de
    // dejar reventar el constraint UNIQUE de Postgres como 500.
    const existing = await this.profiles.findByEmail(dto.email);
    if (existing) {
      throw new ConflictError(`Email already registered: ${dto.email}`);
    }

    // El repo espera un Profile con id ya puesto -> lo generamos nosotros. Los
    // timestamps reales los fija la BD, pero el constructor de la entidad los
    // exige, así que pasamos `now` para satisfacer el tipo.
    const now = new Date();
    const profile = new Profile({
      ...dto,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    });

    return this.profiles.create(profile);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Profile> {
    const profile = await this.profiles.findById(id);
    if (!profile) throw new NotFoundError('Profile', id);
    return profile;
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateProfileSchema)) dto: UpdateProfileDto
  ): Promise<Profile> {
    // updatePreferences lanza un Error genérico si el id no existe; nos
    // adelantamos con findById para responder 404 (NotFoundError) de forma
    // consistente con el resto de la API.
    const existing = await this.profiles.findById(id);
    if (!existing) throw new NotFoundError('Profile', id);

    return this.profiles.updatePreferences(id, dto.preferences);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string): Promise<void> {
    // `delete` es idempotente en el repo (no falla si el id no existe) -> 204.
    await this.profiles.delete(id);
  }
}
