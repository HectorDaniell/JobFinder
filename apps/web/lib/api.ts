/**
 * CLIENTE DE LA API — el único lugar de la web que sabe hablar HTTP.
 *
 * Las páginas llaman funciones tipadas (api.createProfile(...)) y reciben DTOs
 * o un ApiError; nunca tocan fetch ni URLs. Si mañana cambia la base URL, un
 * header de auth o el formato de error, se toca SOLO este archivo.
 *
 * ApiError es el espejo cliente de DomainError (backend): mismo lenguaje
 * (code, message, field?) de punta a punta. La UI decide qué hacer por `code`
 * (p. ej. PROFILE_HAS_NO_BULLETS -> link a /bullets) y usa `field` para marcar
 * el input exacto que falló.
 */

import type {
  ProfileDto,
  BulletDto,
  TailorResponseDto,
  CreateProfileInput,
  CreateBulletInput,
  UpdateBulletInput,
  TailorInput,
  Preferences,
} from './types';

/** Inyectada por Next en build (prefijo NEXT_PUBLIC_ = visible al navegador). */
const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export class ApiError extends Error {
  constructor(
    readonly status: number, // HTTP: 400, 404, 409, 422, 429…  (0 = sin conexión)
    readonly code: string, //   estable, para decidir en código: 'NOT_FOUND', 'CONFLICT'…
    message: string, //         legible, para mostrar al usuario
    readonly field?: string //  qué campo falló (solo errores de validación)
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Envoltorio único sobre fetch. Maneja los tres gotchas del cable:
 *  1. fetch NO lanza en 4xx/5xx (solo en fallo de red) -> convertimos manualmente
 *     todo !res.ok en un ApiError leyendo el formato { error: { code, … } }.
 *  2. 204 No Content no trae body -> no intentar parsear JSON.
 *  3. Caída de red/API apagada -> TypeError de fetch -> ApiError status 0.
 */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'No se pudo conectar con la API. ¿Está encendida?');
  }

  if (res.status === 204) return undefined as T;

  if (!res.ok) {
    // Formato de nuestro DomainExceptionFilter: { error: { code, message, field? } }.
    // El try protege contra errores que no vengan de él (p. ej. HTML de un proxy).
    let code = 'UNKNOWN';
    let message = `Error HTTP ${res.status}`;
    let field: string | undefined;
    try {
      const body = (await res.json()) as { error?: { code?: string; message?: string; field?: string } };
      code = body.error?.code ?? code;
      message = body.error?.message ?? message;
      field = body.error?.field;
    } catch {
      /* body no-JSON: nos quedamos con los defaults */
    }
    throw new ApiError(res.status, code, message, field);
  }

  return res.json() as Promise<T>;
}

export const api = {
  // ---- Profile ----
  createProfile: (input: CreateProfileInput) =>
    request<ProfileDto>('/profiles', { method: 'POST', body: JSON.stringify(input) }),

  getProfile: (id: string) => request<ProfileDto>(`/profiles/${encodeURIComponent(id)}`),

  updatePreferences: (id: string, preferences: Preferences) =>
    request<ProfileDto>(`/profiles/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ preferences }),
    }),

  deleteProfile: (id: string) =>
    request<void>(`/profiles/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  // ---- Bullets (anidados bajo el perfil) ----
  listBullets: (profileId: string) =>
    request<BulletDto[]>(`/profiles/${encodeURIComponent(profileId)}/bullets`),

  createBullet: (profileId: string, input: CreateBulletInput) =>
    request<BulletDto>(`/profiles/${encodeURIComponent(profileId)}/bullets`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  updateBullet: (profileId: string, bulletId: string, input: UpdateBulletInput) =>
    request<BulletDto>(
      `/profiles/${encodeURIComponent(profileId)}/bullets/${encodeURIComponent(bulletId)}`,
      { method: 'PATCH', body: JSON.stringify(input) }
    ),

  deleteBullet: (profileId: string, bulletId: string) =>
    request<void>(
      `/profiles/${encodeURIComponent(profileId)}/bullets/${encodeURIComponent(bulletId)}`,
      { method: 'DELETE' }
    ),

  // ---- Tailor (la estrella) ----
  tailor: (profileId: string, input: TailorInput) =>
    request<TailorResponseDto>(`/profiles/${encodeURIComponent(profileId)}/tailor`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
};
