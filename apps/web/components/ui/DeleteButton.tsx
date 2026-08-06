'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';

/**
 * Borrado en DOS clics (sin confirm() nativo): el primero "arma" el botón, el
 * segundo confirma. Salir del foco lo desarma. Suficiente fricción para evitar
 * accidentes sin ensuciar la UI con un modal.
 */
export function DeleteButton({
  onConfirm,
  label = 'Borrar',
}: {
  onConfirm: () => void;
  label?: string;
}) {
  const [armed, setArmed] = useState(false);

  if (!armed) {
    return (
      <button
        type="button"
        aria-label={label}
        className="rounded-full p-2 text-muted transition hover:bg-red-500/10 hover:text-red-500"
        onClick={() => setArmed(true)}
      >
        <Trash2 size={16} />
      </button>
    );
  }

  return (
    <button
      type="button"
      className="rounded-full bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-500 ring-1 ring-red-500/30 transition hover:bg-red-500/20 dark:text-red-400"
      onClick={onConfirm}
      onBlur={() => setArmed(false)}
      autoFocus
    >
      ¿Borrar?
    </button>
  );
}
