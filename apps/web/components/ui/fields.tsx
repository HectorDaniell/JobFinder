'use client';

import { ChevronDown } from 'lucide-react';

/**
 * PRIMITIVAS DE FORMULARIO — componentes CONTROLADOS.
 *
 * "Controlado" = el input NO guarda su propio texto; lo recibe por `value` y
 * avisa de cada cambio por `onChange`. La fuente de verdad es el estado de
 * React, no el DOM. Ventaja: el estado siempre refleja lo que se ve, y podemos
 * validar/transformar/deshabilitar en función de él.
 *
 * Estas primitivas no tienen estado propio: solo pintan y notifican. Toda la
 * lógica vive en la página que las orquesta.
 */

interface FieldShell {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
}

/** Etiqueta + campo + (pista | error). Comparte layout entre todas las primitivas. */
function Shell({
  label,
  hint,
  error,
  required,
  children,
}: FieldShell & { children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label">
        {label}
        {required && <span className="text-accent"> *</span>}
      </span>
      {children}
      {error ? (
        <span className="mt-1.5 block text-xs text-red-500 dark:text-red-400">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-xs text-muted">{hint}</span>
      ) : null}
    </label>
  );
}

export function Input({
  value,
  onChange,
  type = 'text',
  placeholder,
  ...shell
}: FieldShell & {
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <Shell {...shell}>
      <input
        className={`input ${shell.error ? 'input-error' : ''}`}
        type={type}
        value={value}
        placeholder={placeholder}
        // e.target.value = lo que el usuario acaba de teclear. Lo mandamos
        // hacia arriba; el padre actualiza el estado y vuelve por `value`.
        onChange={(e) => onChange(e.target.value)}
      />
    </Shell>
  );
}

export function Textarea({
  value,
  onChange,
  rows = 4,
  placeholder,
  ...shell
}: FieldShell & {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <Shell {...shell}>
      <textarea
        className={`input resize-y ${shell.error ? 'input-error' : ''}`}
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </Shell>
  );
}

/**
 * Select genérico: <T extends string> ata el tipo de las opciones al del valor,
 * así TypeScript sabe que onChange('remote') es válido y onChange('foo') no.
 */
export function Select<T extends string>({
  value,
  onChange,
  options,
  ...shell
}: FieldShell & {
  value: T;
  onChange: (value: T) => void;
  options: readonly { value: T; label: string }[];
}) {
  return (
    <Shell {...shell}>
      <div className="relative">
        <select
          className={`input appearance-none pr-9 ${shell.error ? 'input-error' : ''}`}
          value={value}
          // El value del DOM siempre es string: lo devolvemos al tipo T con un
          // cast, seguro porque las opciones vienen de la misma unión.
          onChange={(e) => onChange(e.target.value as T)}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
        />
      </div>
    </Shell>
  );
}

/** Grupo de casillas para seleccionar varios valores de una lista cerrada. */
export function CheckboxGroup<T extends string>({
  values,
  onChange,
  options,
  ...shell
}: FieldShell & {
  values: T[];
  onChange: (values: T[]) => void;
  options: readonly { value: T; label: string }[];
}) {
  function toggle(v: T) {
    onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v]);
  }

  return (
    <div>
      <span className="label">
        {shell.label}
        {shell.required && <span className="text-accent"> *</span>}
      </span>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const active = values.includes(o.value);
          return (
            <button
              key={o.value}
              type="button" // sin esto, dentro de un <form> un <button> ENVÍA el formulario
              onClick={() => toggle(o.value)}
              aria-pressed={active}
              className={
                active
                  ? 'chip-accent'
                  : 'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium text-muted ring-1 ring-zinc-900/10 transition hover:text-fg dark:ring-white/10'
              }
            >
              {o.label}
            </button>
          );
        })}
      </div>
      {shell.error ? (
        <span className="mt-1.5 block text-xs text-red-500 dark:text-red-400">{shell.error}</span>
      ) : shell.hint ? (
        <span className="mt-1.5 block text-xs text-muted">{shell.hint}</span>
      ) : null}
    </div>
  );
}
