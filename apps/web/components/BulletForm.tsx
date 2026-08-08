'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import type {
  BulletDto,
  CreateBulletInput,
  BulletCategory,
  ExperienceDto,
  ExperienceKind,
} from '../lib/types';
import { formatPeriod } from '../lib/dates';
import { Textarea, Select } from './ui/fields';
import { TagInput } from './ui/TagInput';

export const CATEGORY_OPTIONS = [
  { value: 'experience', label: 'Experiencia' },
  { value: 'achievement', label: 'Logro' },
] as const satisfies readonly { value: BulletCategory; label: string }[];

/** Orden en que aparecen en el desplegable — el mismo de las secciones del CV. */
const KIND_ORDER: ExperienceKind[] = ['job', 'project', 'education'];
const KIND_LABEL: Record<ExperienceKind, string> = {
  job: 'Empleo',
  project: 'Proyecto',
  education: 'Educación',
};

/**
 * Formulario de bullet, compartido por CREAR y EDITAR (si llega `initial`, es
 * edición y precarga los valores).
 *
 * Contraste didáctico con /setup: allá el estado del formulario vive en la
 * PÁGINA porque el wizard lo comparte entre 3 pasos; aquí el borrador es LOCAL
 * al formulario — nadie más lo necesita hasta el submit. Regla: el estado, lo
 * más local posible.
 *
 * `experienceId` es OBLIGATORIO: todo bullet pertenece a un contenedor (empleo,
 * proyecto o educación) — ya no existe la opción "sin empleo" que había antes
 * (era un `sourceRole` de texto libre haciendo ese trabajo; ahora lo hace el
 * contenedor real, ver ADR-0028).
 *
 * `metrics` (Record clave→valor) se omite de la UI en Fase 1: la API lo acepta
 * pero un editor clave/valor no aporta aún frente a lo que complica.
 */
export function BulletForm({
  initial,
  experiences,
  saving,
  onSubmit,
  onCancel,
}: {
  initial?: BulletDto;
  experiences: ExperienceDto[];
  saving: boolean;
  onSubmit: (input: CreateBulletInput) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Omit<CreateBulletInput, 'experienceId'> & { experienceId: string }>({
    experienceId: initial?.experienceId ?? '',
    textEs: initial?.textEs ?? '',
    textEn: initial?.textEn ?? '',
    skills: initial?.skills ?? [],
    category: initial?.category ?? 'experience',
  });

  const experienceOptions = [...experiences]
    .sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind))
    .map((e) => ({
      value: e.id,
      label: `[${KIND_LABEL[e.kind]}] ${e.title}${
        e.organization !== e.title ? ` — ${e.organization}` : ''
      } · ${formatPeriod(e.startDate, e.endDate)}`,
    }));

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const canSubmit =
    form.textEs.trim() !== '' && form.textEn.trim() !== '' && form.experienceId !== '';

  return (
    <div className="space-y-5">
      <Textarea
        label="Texto (español)"
        required
        rows={3}
        value={form.textEs}
        onChange={(v) => set('textEs', v)}
        placeholder="Lideré la migración de un monolito a microservicios, reduciendo el tiempo de despliegue en 70%."
        hint="Un logro concreto y medible. El LLM lo reformula, nunca lo inventa."
      />
      <Textarea
        label="Text (English)"
        required
        rows={3}
        value={form.textEn}
        onChange={(v) => set('textEn', v)}
        placeholder="Led the migration from a monolith to microservices, cutting deploy time by 70%."
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Select
          label="Categoría"
          value={form.category}
          onChange={(v) => set('category', v)}
          options={CATEGORY_OPTIONS}
        />

        {experiences.length === 0 ? (
          <div className="flex flex-col justify-end">
            <span className="label">¿Dónde ocurrió?</span>
            <p className="rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-700 ring-1 ring-amber-500/20 dark:text-amber-400">
              Necesitas al menos un{' '}
              <Link href="/experiences" className="underline">
                empleo, proyecto o estudio
              </Link>{' '}
              antes de añadir un bullet.
            </p>
          </div>
        ) : (
          <Select
            label="¿Dónde ocurrió?"
            required
            value={form.experienceId}
            onChange={(v) => set('experienceId', v)}
            options={[{ value: '', label: 'Selecciona uno…' }, ...experienceOptions]}
            hint="Agrupa este logro bajo el contenedor y las fechas correctas."
          />
        )}
      </div>

      <TagInput
        label="Skills"
        values={form.skills}
        onChange={(v) => set('skills', v)}
        placeholder="Node.js, PostgreSQL, Docker…"
        hint="Etiquetas para el matching; escribe y pulsa Enter."
      />

      <div className="flex items-center justify-end gap-3 pt-1">
        <button type="button" className="btn-ghost" onClick={onCancel} disabled={saving}>
          Cancelar
        </button>
        <button
          type="button"
          className="btn-primary inline-flex items-center gap-2 disabled:opacity-40"
          onClick={() => onSubmit(form as CreateBulletInput)}
          disabled={!canSubmit || saving}
        >
          {saving && <Loader2 size={16} className="animate-spin" />}
          {initial ? 'Guardar cambios' : 'Añadir bullet'}
        </button>
      </div>
    </div>
  );
}
