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
import { Bullet, NotFoundError } from '@jobfinder/core';
import { BulletRepository, ProfileRepository } from '@jobfinder/db';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  CreateBulletSchema,
  UpdateBulletSchema,
  type CreateBulletDto,
  type UpdateBulletDto,
} from './bullet.schema';

/**
 * CRUD de Bullets, anidados bajo un perfil: /profiles/:profileId/bullets.
 *
 * Como en Profile, el controlador habla directo con el repositorio (CRUD sin
 * caso de uso) y solo lanza errores de dominio (NotFoundError -> 404), que el
 * DomainExceptionFilter traduce.
 *
 * El profileId de la URL NO es decorativo: se usa para verificar PERTENENCIA
 * (getOwned), de modo que no se pueda leer/editar/borrar un bullet de otro
 * perfil pasando una URL cruzada. Necesita dos repos: BulletRepository para
 * operar y ProfileRepository para validar que el perfil existe al crear.
 */
@Controller('profiles/:profileId/bullets')
export class BulletsController {
  constructor(
    @Inject(BulletRepository) private readonly bullets: BulletRepository,
    @Inject(ProfileRepository) private readonly profiles: ProfileRepository
  ) {}

  @Post()
  async create(
    @Param('profileId') profileId: string,
    @Body(new ZodValidationPipe(CreateBulletSchema)) dto: CreateBulletDto
  ): Promise<Bullet> {
    // El bullet requiere un perfil existente (FK). Lo verificamos para dar 404
    // limpio en vez de dejar reventar la foreign key como 500.
    const profile = await this.profiles.findById(profileId);
    if (!profile) throw new NotFoundError('Profile', profileId);

    const now = new Date();
    const bullet = new Bullet({
      ...dto,
      id: randomUUID(),
      profileId,
      createdAt: now,
      updatedAt: now,
    });

    return this.bullets.create(bullet);
  }

  @Get()
  async findByProfile(@Param('profileId') profileId: string): Promise<Bullet[]> {
    return this.bullets.findByProfileId(profileId);
  }

  @Get(':id')
  async findOne(
    @Param('profileId') profileId: string,
    @Param('id') id: string
  ): Promise<Bullet> {
    return this.getOwned(profileId, id);
  }

  @Patch(':id')
  async update(
    @Param('profileId') profileId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateBulletSchema)) dto: UpdateBulletDto
  ): Promise<Bullet> {
    const existing = await this.getOwned(profileId, id);

    // update() del repo recibe la entidad COMPLETA: partimos del bullet
    // existente y sobreescribimos solo los campos que llegaron en el PATCH.
    const updated = new Bullet({
      ...existing,
      ...dto,
      updatedAt: new Date(),
    });

    return this.bullets.update(updated);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @Param('profileId') profileId: string,
    @Param('id') id: string
  ): Promise<void> {
    await this.getOwned(profileId, id); // 404 si no existe o no pertenece
    await this.bullets.delete(id);
  }

  /**
   * Carga un bullet y verifica que pertenece al perfil de la URL. Centraliza la
   * comprobación existencia + pertenencia -> 404 ante cualquier fallo.
   */
  private async getOwned(profileId: string, id: string): Promise<Bullet> {
    const bullet = await this.bullets.findById(id);
    if (!bullet || bullet.profileId !== profileId) {
      throw new NotFoundError('Bullet', id);
    }
    return bullet;
  }
}
