import Link from 'next/link';
import { ThemeToggle } from './ThemeToggle';

const links = [
  { href: '/tailor', label: 'Tailor' },
  { href: '/bullets', label: 'Bullets' },
  { href: '/profile', label: 'Perfil' },
];

/**
 * Header flotante: geometría Mainline (píldora centrada, despegada del borde) +
 * material Protocol (translúcido con blur, vía la clase `.glass`).
 *
 * Es un Server Component: no tiene interactividad propia. La única parte
 * interactiva —el toggle de tema— es su propio Client Component.
 */
export function Header() {
  return (
    <header className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <nav className="glass flex w-[min(92%,760px)] items-center justify-between rounded-full py-2.5 pl-5 pr-2.5">
        {/* En pantallas estrechas el logo se abrevia a "JF" para dejar sitio a
            los enlaces: son la ÚNICA navegación, así que nunca se ocultan. */}
        <Link href="/" className="shrink-0 font-semibold tracking-tight">
          <span className="sm:hidden">
            J<span className="text-accent">F</span>
          </span>
          <span className="hidden sm:inline">
            Job<span className="text-accent">Finder</span>
          </span>
        </Link>

        <div className="flex items-center gap-0.5 sm:gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-full px-2 py-1.5 text-sm text-muted transition hover:text-fg sm:px-3"
            >
              {l.label}
            </Link>
          ))}
        </div>

        <ThemeToggle />
      </nav>
    </header>
  );
}
