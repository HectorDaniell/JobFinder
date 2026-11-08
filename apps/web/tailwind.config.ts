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
      // Barra de carga INDETERMINADA: un segmento cruza el carril en bucle. Sin
      // porcentaje, porque el front no puede saber cuánto le falta a Claude
      // (ver TailorSkeleton). El recorrido va de -100% a 300% porque el
      // segmento mide 1/3 del carril: así entra y sale del todo por los bordes.
      keyframes: {
        indeterminate: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(300%)' },
        },
      },
      animation: {
        indeterminate: 'indeterminate 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
