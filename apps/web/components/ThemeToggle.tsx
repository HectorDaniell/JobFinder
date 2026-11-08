'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

/**
 * Botón de tema. El tema real ya lo aplicó el script inline del layout (antes de
 * pintar, para evitar el parpadeo de tema equivocado); aquí solo LEEMOS el estado
 * inicial al montar y lo alternamos: toggle de la clase `dark` en <html> +
 * persistencia en localStorage.
 *
 * Es un Client Component ('use client') porque usa estado y eventos del navegador.
 */
export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  }

  return (
    <button
      onClick={toggle}
      aria-label="Cambiar tema"
      className="rounded-full p-2 text-muted transition hover:bg-zinc-900/5 hover:text-fg dark:hover:bg-white/10"
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
