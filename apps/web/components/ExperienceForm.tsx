'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { ExperienceDto, ExperienceKind, CreateExperienceInput } from '../lib/types';
import { toMonthValue } from '../lib/dates';
import { Input, Select } from './ui/fields';

const KIND_OPTIONS = [
  { value: 'job', label: 'Empleo' },
  { value: 'project', label: 'Proyecto' },
  { value: 'education', label: 'Educación' },
] as const satisfies readonly { value: ExperienceKind; label: string }[];

/**
 * `organization`/`title` significan algo distinto según el tipo — mismo par de
 * campos, reinterpretado (ver Experience en @jobfinder/core). Esta tabla es lo
 * único que cambia entre un formulario de empleo, uno de proyecto y uno de
 * educación; el resto del formulario es idéntico.
 */
const FIELD_LABELS: Record<
  ExperienceKind,
  { organization: string; orgPlaceholder: string; title: string; titlePlaceholder: string }
> = {
  job: {
    organization: 'Empresa',
    orgPlaceholder: 'Fluyez',
    title: 'Rol',
    titlePlaceholder: 'Fullstack Developer',
  },
  project: {
    organization: 'Contexto',
    orgPlaceholder: 'Proyecto personal',
    title: 'Nombre del proyecto',
    titlePlaceholder: 'JobFinder',
  },
  education: {
    organization: 'Institución',
    orgPlaceholder: 'Universidad Católica de Santa María',
    title: 'Título obtenido',
    titlePlaceholder: 'Ingeniería de Sistemas',
  },
};

/**
 * Formulario de un contenedor (empleo, proyecto o educación), compartido por
 * crear y editar (si llega `initial`, precarga). Igual que BulletForm, el
 * borrador es estado LOCAL: nadie más lo necesita hasta el submit.
 *
 * `kind` decide las ETIQUETAS de organization/title, y es inmutable tras crear:
 * el selector solo aparece al dar de alta (ver ADR-0028 — cambiar de tipo no es
 * una edición, es borrar y crear otro).
 *
 * "Sigue en curso" no es un campo aparte: es la ausencia de fecha de fin. Un
 * booleano separado podría contradecir a la fecha (marcado como actual Y con
 * fecha de fin); así ese estado imposible no se puede ni representar.
 */
export function ExperienceForm({
  initial,
  saving,
  onSubmit,
  onCancel,
}: {
  initial?: ExperienceDto;
  saving: boolean;
  onSubmit: (input: CreateExperienceInput) => void;
  onCancel: () => void;
}) {
  const [kind, setKind] = useState<ExperienceKind>(initial?.kind ?? 'job');
  const [organization, setOrganization] = useState(initial?.organization ?? '');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [location, setLocation] = useState(initial?.location ?? '');
  const [url, setUrl] = useState(initial?.url ?? '');
  const [startDate, setStartDate] = useState(toMonthValue(initial?.startDate));
  const [endDate, setEndDate] = useState(toMonthValue(initial?.endDate));
  const [isCurrent, setIsCurrent] = useState(initial ? !initial.endDate : true);

  const labels = FIELD_LABELS[kind];
  const canSubmit =
    organization.trim() !== '' &&
    title.trim() !== '' &&
    startDate !== '' &&
    (isCurrent || endDate !== '');

  return (
    <div className="space-y-5">
      {!initial && (
        <Select
          label="Tipo"
          value={kind}
          onChange={setKind}
          options={KIND_OPTIONS}
          hint="No se puede cambiar después de crearlo."
        />
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label={labels.organization}
          required
          value={organization}
          onChange={setOrganization}
          placeholder={labels.orgPlaceholder}
        />
        <Input
          label={labels.title}
          required
          value={title}
          onChange={setTitle}
          placeholder={labels.titlePlaceholder}
        />
      </div>

      {kind === 'job' && (
        <Input
          label="Ubicación (opcional)"
          value={location}
          onChange={setLocation}
          placeholder="Arequipa, Perú · Remoto"
        />
      )}

      {kind === 'project' && (
        <Input
          label="URL (opcional)"
          value={url}
          onChange={setUrl}
          placeholder="https://github.com/tu-usuario/proyecto"
        />
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="Inicio"
          required
          type="month"
          value={startDate}
          onChange={setStartDate}
          hint="Solo mes y año: es lo que se ve en un CV."
        />
        {!isCurrent && (
          <Input label="Fin" required type="month" value={endDate} onChange={setEndDate} />
        )}
      </div>

      <label className="flex cursor-pointer items-center gap-2.5 text-sm">
        <input
          type="checkbox"
          checked={isCurrent}
          onChange={(e) => {
            setIsCurrent(e.target.checked);
            if (e.target.checked) setEndDate(''); // marcar "en curso" borra la fecha de fin
          }}
          className="h-4 w-4 accent-accent"
        />
        Sigue en curso
      </label>

      <div className="flex items-center justify-end gap-3 pt-1">
        <button type="button" className="btn-ghost" onClick={onCancel} disabled={saving}>
          Cancelar
        </button>
        <button
          type="button"
          className="btn-primary inline-flex items-center gap-2 disabled:opacity-40"
          onClick={() =>
            onSubmit({
              kind,
              organization: organization.trim(),
              title: title.trim(),
              location: kind === 'job' ? location.trim() || undefined : undefined,
              url: kind === 'project' ? url.trim() || undefined : undefined,
              startDate,
              // null (no undefined) para que el PATCH sepa BORRAR la fecha de fin:
              // ausente significaría "no tocar" y seguiría marcado como cerrado.
              endDate: isCurrent ? null : endDate,
            })
          }
          disabled={!canSubmit || saving}
        >
          {saving && <Loader2 size={16} className="animate-spin" />}
          {initial ? 'Guardar cambios' : 'Añadir'}
        </button>
      </div>
    </div>
  );
}
