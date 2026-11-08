'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

/**
 * TAG INPUT — editar un array de strings (roles, ubicaciones, deal-breakers).
 *
 * Estado MIXTO, y la distinción importa:
 *  - `values` (la lista real) es del PADRE: es el dato del formulario.
 *  - `draft` (lo que se está tecleando) es LOCAL: nadie más necesita verlo
 *    hasta que se confirma con Enter. Estado local = el más simple que sirve.
 */
export function TagInput({
  label,
  values,
  onChange,
  placeholder,
  hint,
  error,
  required,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  hint?: string;
  error?: string;
  required?: boolean;
}) {
  const [draft, setDraft] = useState('');

  function add() {
    const v = draft.trim();
    setDraft('');
    if (!v || values.includes(v)) return; // ignora vacíos y duplicados
    onChange([...values, v]);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      // Sin esto, Enter ENVIARÍA el formulario en vez de añadir la etiqueta.
      e.preventDefault();
      add();
    } else if (e.key === 'Backspace' && draft === '' && values.length > 0) {
      onChange(values.slice(0, -1)); // borrar la última con Backspace en vacío
    }
  }

  return (
    <div>
      <span className="label">
        {label}
        {required && <span className="text-accent"> *</span>}
      </span>

      <div className={`input flex flex-wrap items-center gap-1.5 ${error ? 'input-error' : ''}`}>
        {values.map((v) => (
          <span key={v} className="chip-accent gap-1 py-0.5">
            {v}
            <button
              type="button"
              onClick={() => onChange(values.filter((x) => x !== v))}
              aria-label={`Quitar ${v}`}
              className="transition hover:opacity-60"
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          className="min-w-[8rem] flex-1 bg-transparent py-0.5 text-sm placeholder:text-muted/60 focus:outline-none"
          value={draft}
          placeholder={values.length === 0 ? placeholder : ''}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={add} // no perder lo tecleado al salir del campo
        />
      </div>

      {error ? (
        <span className="mt-1.5 block text-xs text-red-500 dark:text-red-400">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-xs text-muted">{hint}</span>
      ) : null}
    </div>
  );
}
