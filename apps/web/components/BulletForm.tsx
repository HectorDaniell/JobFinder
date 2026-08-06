'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import type {
  BulletDto,
  CreateBulletInput,
  BulletCategory,
  ExperienceDto,
} from '../lib/types';
import { formatPeriod } from '../lib/dates';
import { Textarea, Input, Select } from './ui/fields';
import { TagInput } from './ui/TagInput';

export const CATEGORY_OPTIONS = [
  { value: 'experience', label: 'Experiencia' },
  { value: 'achievement', label: 'Logro' },
  { value: 'project', label: 'Proyecto' },
  { value: 'education', label: 'Educación' },
] as const satisfies readonly { value: BulletCategory; label: string }[];

/**
 * Formulario de bullet, compartido por CREAR y EDITAR (si llega `initial`, es
 * edición y precarga los valores).
 *
 * Contraste didáctico con /setup: allá el estado del formulario vive en la
 * PÁGINA porque el wizard lo comparte entre 3 pasos; aquí el borrador es LOCAL
 * al formulario — nadie más lo necesita hasta el submit. Regla: el estado, lo
 * más local posible.
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
  const [form, setForm] = useState<CreateBulletInput>({
    experienceId: initial?.experienceId ?? null,
    textEs: initial?.textEs ?? '',
    textEn: initial?.textEn ?? '',
    skills: initial?.skills ?? [],
    category: initial?.category ?? 'experience',
    sourceRole: initial?.sourceRole ?? '',
  });

  // '' representa "sin empleo": un <select> solo maneja strings, y ese caso es
  // legítimo (proyectos personales, educación).
  const experienceOptions = [
    { value: '', label: 'Sin empleo — proyecto o educación' },
    ...experiences.map((e) => ({
      value: e.id,
      label: `${e.role} — ${e.company} · ${formatPeriod(e.startDate, e.endDate)}`,
    })),
  ];

  function set<K extends keyof CreateBulletInput>(key: K, value: CreateBulletInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const canSubmit = form.textEs.trim() !== '' && form.textEn.trim() !== '';

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
        <Select
          label="¿Dónde ocurrió?"
          value={form.experienceId ?? ''}
          onChange={(v) => set('experienceId', v || null)}
          options={experienceOptions}
          hint={
            experiences.length === 0
              ? 'Añade tus empleos para agrupar el CV por empresa.'
              : 'Agrupa este logro bajo la empresa y fechas correctas.'
          }
        />
      </div>

      {/* Sin empleo asignado, `sourceRole` es lo único que da contexto
          (una tesis, un proyecto personal). Con empleo, sobra: la empresa y las
          fechas ya salen de la experiencia. */}
      {!form.experienceId && (
        <Input
          label="Contexto (opcional)"
          value={form.sourceRole ?? ''}
          onChange={(v) => set('sourceRole', v)}
          placeholder="Proyecto de tesis — Ingeniería de Sistemas"
          hint="Solo para logros que no pertenecen a un empleo."
        />
      )}

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
          onClick={() =>
            onSubmit({ ...form, sourceRole: form.sourceRole?.trim() || undefined })
          }
          disabled={!canSubmit || saving}
        >
          {saving && <Loader2 size={16} className="animate-spin" />}
          {initial ? 'Guardar cambios' : 'Añadir bullet'}
        </button>
      </div>
    </div>
  );
}
