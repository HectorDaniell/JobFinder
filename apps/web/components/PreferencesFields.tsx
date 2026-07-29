'use client';

import type { Preferences } from '../lib/types';
import { Input, Select, CheckboxGroup } from './ui/fields';
import { TagInput } from './ui/TagInput';

/**
 * Campos de PREFERENCIAS de empleo. Se usa en dos sitios —el paso 3 de /setup y
 * la edición en /profile—, que es exactamente lo que la API permite actualizar
 * (PATCH /profiles/:id). Un solo componente, sin duplicar la lógica del form.
 *
 * Es "controlado" igual que las primitivas: recibe el objeto entero y notifica
 * el objeto entero modificado. No guarda nada.
 */

// Las opciones replican las uniones de PreferenceSchema (core). Si core cambia
// la unión, TypeScript falla aquí: el `satisfies` ata cada value al tipo real.
const SENIORITY = [
  { value: 'junior', label: 'Junior' },
  { value: 'mid', label: 'Mid' },
  { value: 'senior', label: 'Senior' },
  { value: 'lead', label: 'Lead' },
  { value: 'any', label: 'Cualquiera' },
] as const satisfies readonly { value: Preferences['minSeniority']; label: string }[];

const MODALITY = [
  { value: 'remote', label: 'Remoto' },
  { value: 'hybrid', label: 'Híbrido' },
  { value: 'onsite', label: 'Presencial' },
  { value: 'any', label: 'Cualquiera' },
] as const satisfies readonly { value: Preferences['modality']; label: string }[];

const LANGUAGES = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'Inglés' },
] as const satisfies readonly { value: Preferences['languages'][number]; label: string }[];

export function PreferencesFields({
  value,
  onChange,
}: {
  value: Preferences;
  onChange: (next: Preferences) => void;
}) {
  /** Actualiza UNA clave devolviendo un objeto nuevo (inmutabilidad: React
   *  detecta el cambio por identidad, así que nunca mutamos el original). */
  function set<K extends keyof Preferences>(key: K, v: Preferences[K]) {
    onChange({ ...value, [key]: v });
  }

  return (
    <div className="space-y-5">
      <TagInput
        label="Roles objetivo"
        required
        values={value.targetRoles}
        onChange={(v) => set('targetRoles', v)}
        placeholder="Backend Engineer, Full Stack…"
        hint="Escribe y pulsa Enter para añadir cada rol."
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Select
          label="Seniority mínimo"
          value={value.minSeniority}
          onChange={(v) => set('minSeniority', v)}
          options={SENIORITY}
        />
        <Select
          label="Modalidad"
          value={value.modality}
          onChange={(v) => set('modality', v)}
          options={MODALITY}
        />
      </div>

      <TagInput
        label="Ubicaciones preferidas"
        values={value.preferredLocations}
        onChange={(v) => set('preferredLocations', v)}
        placeholder="Remote, Lima, Madrid…"
      />

      <CheckboxGroup
        label="Idiomas"
        required
        values={value.languages}
        onChange={(v) => set('languages', v)}
        options={LANGUAGES}
        hint="Idiomas en los que puedes postular."
      />

      <Input
        label="Salario mínimo (opcional)"
        type="number"
        value={value.minSalary?.toString() ?? ''}
        // El input siempre da string; el schema espera number | undefined.
        // Vacío -> undefined (el campo es opcional), no 0.
        onChange={(v) => set('minSalary', v === '' ? undefined : Number(v))}
        placeholder="3000"
      />

      <TagInput
        label="Deal-breakers"
        values={value.dealBreakers}
        onChange={(v) => set('dealBreakers', v)}
        placeholder="Presencial obligatorio, guardias 24/7…"
        hint="Condiciones que descartan una vacante automáticamente."
      />
    </div>
  );
}
