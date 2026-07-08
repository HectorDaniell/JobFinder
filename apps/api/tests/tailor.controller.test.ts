import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TailorDocuments, type TailorResult } from '@jobfinder/core';
import { TailorController } from '../src/tailor/tailor.controller';
import type { TailorRequestDto } from '../src/tailor/tailor.schema';

/**
 * Tests unitarios del TailorController: mockeamos el caso de uso TailorDocuments
 * (no se llama a Claude ni se generan documentos reales). Verificamos las dos
 * responsabilidades del controlador: armar el Job manual y serializar la
 * respuesta a base64.
 */

const tailorResult: TailorResult = {
  cv: { content: '# CV', bullets: ['Lideré X'], keywords: ['Node.js'] },
  coverLetter: 'Estimado equipo...',
  files: [
    // bytes [37,80,68,70] = "%PDF" -> base64 "JVBERg=="
    { filename: 'cv.pdf', mimeType: 'application/pdf', bytes: new Uint8Array([37, 80, 68, 70]) },
  ],
};

const requestDto: TailorRequestDto = {
  job: {
    title: 'Backend Engineer',
    company: 'Acme',
    description: 'We need Node.js and PostgreSQL',
  },
  lang: 'es',
  formats: ['pdf'],
};

let tailor: TailorDocuments;

beforeEach(() => {
  tailor = { execute: vi.fn().mockResolvedValue(tailorResult) } as unknown as TailorDocuments;
});

describe('TailorController', () => {
  it('arma un Job manual (sourceId manual, defaults unknown) y ejecuta el caso de uso', async () => {
    const controller = new TailorController(tailor);

    await controller.run('p-1', requestDto);

    expect(tailor.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        profileId: 'p-1',
        lang: 'es',
        formats: ['pdf'],
        job: expect.objectContaining({
          title: 'Backend Engineer',
          company: 'Acme',
          description: 'We need Node.js and PostgreSQL',
          sourceId: 'manual',
          modality: 'unknown', // no vino en el body -> default
          seniority: 'unknown',
        }),
      })
    );
  });

  it('respeta modality y seniority cuando vienen en el body', async () => {
    const controller = new TailorController(tailor);

    await controller.run('p-1', {
      ...requestDto,
      job: { ...requestDto.job, modality: 'remote', seniority: 'senior' },
    });

    expect(tailor.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        job: expect.objectContaining({ modality: 'remote', seniority: 'senior' }),
      })
    );
  });

  it('devuelve el preview en texto y los archivos en base64', async () => {
    const controller = new TailorController(tailor);

    const result = await controller.run('p-1', requestDto);

    expect(result.cv).toEqual(tailorResult.cv);
    expect(result.coverLetter).toBe('Estimado equipo...');
    expect(result.files).toEqual([
      { filename: 'cv.pdf', mimeType: 'application/pdf', base64: 'JVBERg==' },
    ]);
  });
});
