import { RedirectIfProfile } from '../components/RedirectIfProfile';

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6">
      {/* Con perfil ya creado, la home real es /tailor (guarda de navegación). */}
      <RedirectIfProfile />
      {/* Glow decorativo — permitido aquí: es un hero (regla de decoración de Señal). */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/3 -z-10 h-[38rem] w-[38rem] -translate-x-1/2 rounded-full bg-gradient-to-tr from-emerald-500/25 via-teal-500/10 to-cyan-400/10 blur-3xl"
      />

      <div className="max-w-2xl text-center">
        <span className="chip-accent font-mono">high-signal job search</span>

        <h1 className="mt-6 text-5xl font-bold tracking-tight sm:text-6xl">
          Job<span className="text-accent">Finder</span>
        </h1>

        <p className="mt-5 text-lg text-muted">
          Tu copiloto personal de búsqueda de empleo. Pega una oferta y genera un CV
          y una carta adaptados —sin inventar nada—, listos en PDF y DOCX.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <a href="/setup" className="btn-primary">
            Configura tu perfil
          </a>
          <a
            href="/tailor"
            className="rounded-full px-4 py-2 text-sm font-medium text-muted ring-1 ring-zinc-900/10 transition hover:text-fg dark:ring-white/10"
          >
            Ir al tailoring
          </a>
        </div>
      </div>
    </main>
  );
}
