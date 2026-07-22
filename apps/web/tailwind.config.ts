import type { Config } from 'tailwindcss';

/**
 * Config de Tailwind — dirección "Señal".
 *
 * - darkMode 'class': el tema se controla poniendo/quitando la clase `dark` en
 *   <html> (no por preferencia del sistema directamente), para tener un toggle.
 * - content: qué archivos escanea Tailwind para saber qué utilidades generar.
 * - colors: mapeados a variables CSS en formato canal (ver globals.css) con
 *   `<alpha-value>` para soportar opacidad (bg-accent/10, ring-accent/20…).
 */
export default {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--bg) / <alpha-value>)',
        fg: 'rgb(var(--fg) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        'accent-fg': 'rgb(var(--accent-fg) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;
