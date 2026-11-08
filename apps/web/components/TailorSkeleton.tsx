/**
 * Estado de carga de /tailor: la sección de resultado, pero en hueco.
 *
 * POR QUÉ UN SKELETON Y NO UNA BARRA DE PROGRESO: el backend lanza las dos
 * llamadas a Claude EN PARALELO dentro de un único POST, así que el navegador
 * no tiene forma de saber por dónde va — cualquier porcentaje sería inventado, y
 * una barra clavada al 90% se siente peor que ninguna. El skeleton no promete
 * progreso: promete FORMA. Al reservar el sitio exacto de lo que viene, la
 * llegada del resultado no da un salto de layout y la espera se percibe corta.
 *
 * La barra de arriba es INDETERMINADA (se desliza en bucle, sin porcentaje):
 * comunica "sigue trabajando" sin afirmar cuánto falta.
 *
 * No es interactivo, así que es un Server Component: no lleva 'use client'.
 */

/** Un bloque gris que late. `w` va suelto para variar el ancho de cada línea. */
function Bar({ className = '' }: { className?: string }) {
  return <div className={`h-3 rounded-full bg-fg/10 ${className}`} />;
}

export function TailorSkeleton() {
  return (
    // aria-busy + role status: un lector de pantalla anuncia que se está
    // trabajando en vez de leer una maraña de divs vacíos.
    <section className="mt-10" role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">Generando tu CV y tu carta…</span>

      {/* Barra indeterminada */}
      <div className="h-0.5 w-full overflow-hidden rounded-full bg-fg/10">
        <div className="h-full w-1/3 animate-indeterminate rounded-full bg-accent" />
      </div>

      <div aria-hidden className="animate-pulse">
        {/* Cabecera + botones de descarga */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <Bar className="h-5 w-40" />
            <Bar className="w-56" />
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-28 rounded-full bg-fg/10" />
            <div className="h-9 w-28 rounded-full bg-fg/10" />
          </div>
        </div>

        {/* Pestañas */}
        <div className="mt-6 flex gap-6 border-b border-zinc-900/10 pb-3 dark:border-white/10">
          <Bar className="w-24" />
          <Bar className="w-16" />
        </div>

        {/* Cuerpo: el resumen, luego los bullets, luego los chips de skills.
            Los anchos desiguales imitan texto real; todos iguales se leen como
            una tabla y delatan el placeholder. */}
        <div className="card mt-6 space-y-6 p-6 sm:p-8">
          <div className="space-y-2.5">
            <Bar className="w-full" />
            <Bar className="w-11/12" />
            <Bar className="w-4/5" />
          </div>

          <div className="space-y-3">
            <Bar className="w-32" />
            {['w-full', 'w-10/12', 'w-11/12', 'w-9/12'].map((w) => (
              <div key={w} className="flex gap-2.5">
                <div className="mt-0.5 h-3 w-3 shrink-0 rounded-sm bg-fg/10" />
                <Bar className={w} />
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <Bar className="w-28" />
            <div className="flex flex-wrap gap-1.5">
              {['w-16', 'w-20', 'w-14', 'w-24', 'w-16', 'w-20'].map((w, i) => (
                <div key={i} className={`h-6 rounded-full bg-fg/10 ${w}`} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
