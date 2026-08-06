'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { ExperienceDto, CreateExperienceInput } from '../lib/types';
import { toMonthValue } from '../lib/dates';
import { Input } from './ui/fields';

/**
 * Formulario de empleo, compartido por crear y editar (si llega `initial`,
 * precarga). Igual que BulletForm, el borrador es estado LOCAL: nadie más lo
 * necesita hasta el submit.
 *
 * "Sigo trabajando aquí" no es un campo aparte: es la ausencia de fecha de fin.
 * Un booleano separado podría contradecir a la fecha (marcado como actual Y con
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
  const [company, setCompany] = useState(initial?.company ?? '');
  const [role, setRole] = useState(initial?.role ?? '');
  const [location, setLocation] = useState(initial?.location ?? '');
  const [startDate, setStartDate] = useState(toMonthValue(initial?.startDate));
  const [endDate, setEndDate] = useState(toMonthValue(initial?.endDate));
  const [isCurrent, setIsCurrent] = useState(initial ? !initial.endDate : true);

  const canSubmit =
    company.trim() !== '' && role.trim() !== '' && startDate !== '' && (isCurrent || endDate !== '');

  return (
    <div className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="Empresa"
          required
          value={company}
          onChange={setCompany}
          placeholder="Fluyez"
        />
        <Input
          label="Puesto"
          required
          value={role}
          onChange={setRole}
          placeholder="Fullstack Developer"
        />
      </div>

      <Input
        label="Ubicación (opcional)"
        value={location}
        onChange={setLocation}
        placeholder="Arequipa, Perú · Remoto"
      />

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
            if (e.target.checked) setEndDate(''); // marcar "actual" borra la fecha de fin
          }}
          className="h-4 w-4 accent-accent"
        />
        Sigo trabajando aquí
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
              company: company.trim(),
              role: role.trim(),
              location: location.trim() || undefined,
              startDate,
              // null (no undefined) para que el PATCH sepa BORRAR la fecha de fin:
              // ausente significaría "no tocar" y el empleo seguiría cerrado.
              endDate: isCurrent ? null : endDate,
            })
          }
          disabled={!canSubmit || saving}
        >
          {saving && <Loader2 size={16} className="animate-spin" />}
          {initial ? 'Guardar cambios' : 'Añadir empleo'}
        </button>
      </div>
    </div>
  );
}
