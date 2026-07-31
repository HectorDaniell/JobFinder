'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { BulletDto, CreateBulletInput, BulletCategory } from '../lib/types';
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
  saving,
  onSubmit,
  onCancel,
}: {
  initial?: BulletDto;
  saving: boolean;
  onSubmit: (input: CreateBulletInput) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<CreateBulletInput>({
    textEs: initial?.textEs ?? '',
    textEn: initial?.textEn ?? '',
    skills: initial?.skills ?? [],
    category: initial?.category ?? 'experience',
    sourceRole: initial?.sourceRole ?? '',
  });

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
        <Input
          label="Rol de origen (opcional)"
          value={form.sourceRole ?? ''}
          onChange={(v) => set('sourceRole', v)}
          placeholder="Backend Developer @ Acme"
          hint="Dónde ocurrió este logro."
        />
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
