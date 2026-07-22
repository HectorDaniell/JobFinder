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
        <Link href="/" className="font-semibold tracking-tight">
          Job<span className="text-accent">Finder</span>
        </Link>

        <div className="hidden items-center gap-1 sm:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-full px-3 py-1.5 text-sm text-muted transition hover:text-fg"
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
