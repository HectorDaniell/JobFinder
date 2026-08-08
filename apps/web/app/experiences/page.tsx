'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Briefcase, ExternalLink, Loader2, MapPin, Pencil, Plus } from 'lucide-react';
import { api, ApiError } from '../../lib/api';
import type { ExperienceDto, ExperienceKind, CreateExperienceInput, BulletDto } from '../../lib/types';
import { formatPeriod } from '../../lib/dates';
import { useProfile } from '../../components/ProfileProvider';
import { ExperienceForm } from '../../components/ExperienceForm';
import { DeleteButton } from '../../components/ui/DeleteButton';

/** Una sección por `kind`, en el mismo orden en que aparecen en el CV. */
const SECTIONS: { kind: ExperienceKind; title: string; empty: string; addLabel: string }[] = [
  { kind: 'job', title: 'Empleos', empty: 'ningún empleo todavía', addLabel: 'Añadir empleo' },
  { kind: 'project', title: 'Proyectos', empty: 'ningún proyecto todavía', addLabel: 'Añadir proyecto' },
  { kind: 'education', title: 'Educación', empty: 'nada de formación todavía', addLabel: 'Añadir formación' },
];

/**
 * /experiences — tu trayectoria: empleos, proyectos y formación.
 *
 * Sin esto el CV sería una lista plana de logros, sin decir dónde ni cuándo
 * ocurrieron. Cargamos también los bullets para mostrar cuántos cuelgan de cada
 * contenedor: es el dato que hace entender para qué sirve esta pantalla, y que
 * recuerda que el banco puede tener MÁS de lo que cabe en un solo CV.
 */
export default function ExperiencesPage() {
  const router = useRouter();
  const { profileId, ready } = useProfile();

  const [items, setItems] = useState<ExperienceDto[] | null>(null);
  const [bullets, setBullets] = useState<BulletDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!profileId) {
      router.replace('/setup');
      return;
    }
    let cancelled = false;
    Promise.all([api.listExperiences(profileId), api.listBullets(profileId)])
      .then(([exp, bl]) => {
        if (cancelled) return;
        setItems(exp);
        setBullets(bl);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof ApiError ? e.message : 'Error inesperado');
      });
    return () => {
      cancelled = true;
    };
  }, [ready, profileId, router]);

  const countFor = (experienceId: string) =>
    bullets.filter((b) => b.experienceId === experienceId).length;

  async function handleCreate(input: CreateExperienceInput) {
    if (!profileId) return;
    setSaving(true);
    setError(null);
    try {
      const created = await api.createExperience(profileId, input);
      setItems((prev) => [...(prev ?? []), created]);
      setCreating(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Error inesperado');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(id: string, input: CreateExperienceInput) {
    if (!profileId) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await api.updateExperience(profileId, id, input);
      setItems((prev) => (prev ?? []).map((e) => (e.id === id ? updated : e)));
      setEditingId(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Error inesperado');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!profileId) return;
    setError(null);
    try {
      await api.deleteExperience(profileId, id);
      // Borra EN CASCADA sus bullets (ver ADR-0028): un contenedor sin dueño no
      // tiene sentido, así que reflejamos ambos borrados en el estado local.
      const gone = new Set(bullets.filter((b) => b.experienceId === id).map((b) => b.id));
      setItems((prev) => (prev ?? []).filter((e) => e.id !== id));
      setBullets((prev) => prev.filter((b) => !gone.has(b.id)));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Error inesperado');
    }
  }

  if (!ready || items === null) {
    return (
      <main className="mx-auto max-w-3xl px-6 pt-36">
        {error ? (
          <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
        ) : (
          <Loader2 className="animate-spin text-muted" size={20} />
        )}
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 pb-24 pt-32">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tu trayectoria</h1>
          <p className="mt-2 text-muted">
            {items.length === 0
              ? 'Empleos, proyectos y estudios: así se estructura tu CV.'
              : `${items.length} ${items.length === 1 ? 'elemento' : 'elementos'} · así se agrupará tu CV.`}
          </p>
        </div>
        {!creating && (
          <button
            type="button"
            className="btn-primary inline-flex items-center gap-1.5"
            onClick={() => {
              setCreating(true);
              setEditingId(null);
            }}
          >
            <Plus size={16} /> Añadir
          </button>
        )}
      </div>

      {error && (
        <div className="mt-6 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-500 ring-1 ring-red-500/20 dark:text-red-400">
          {error}
        </div>
      )}

      {creating && (
        <div className="card mt-6 p-6">
          <h2 className="mb-5 text-lg font-semibold tracking-tight">Nuevo elemento</h2>
          <ExperienceForm saving={saving} onSubmit={handleCreate} onCancel={() => setCreating(false)} />
        </div>
      )}

      {items.length === 0 && !creating && (
        <div className="card mt-8 p-8 text-center">
          <p className="font-medium">Aún no has añadido nada a tu trayectoria</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Un CV necesita decir <em>dónde</em> y <em>cuándo</em> ocurrió cada logro. Añade tus
            empleos, proyectos y estudios, y luego asigna cada bullet al suyo.
          </p>
          <button
            type="button"
            className="btn-primary mt-6 inline-flex items-center gap-1.5"
            onClick={() => setCreating(true)}
          >
            <Plus size={16} /> Añadir el primero
          </button>
        </div>
      )}

      {/* Una sección por tipo, en el mismo orden en que salen en el CV. Con al
          menos un elemento en total, cada sección se muestra siempre —incluida
          vacía— para recordar que el banco puede tener más de lo que cabe en
          un solo CV (no solo empleos). */}
      {items.length > 0 && (
        <div className="mt-8 space-y-10">
          {SECTIONS.map(({ kind, title, empty }) => {
            const group = [...items]
              .filter((e) => e.kind === kind)
              .sort((a, b) => {
                if (!a.endDate !== !b.endDate) return a.endDate ? 1 : -1;
                const end = (b.endDate ?? '').localeCompare(a.endDate ?? '');
                return end !== 0 ? end : b.startDate.localeCompare(a.startDate);
              });

            return (
              <section key={kind}>
                <h2 className="text-sm font-medium uppercase tracking-wide text-muted">{title}</h2>

                {group.length === 0 ? (
                  <p className="mt-3 text-sm text-muted">
                    Aún no hay {empty}.{' '}
                    <button
                      type="button"
                      className="text-accent hover:underline"
                      onClick={() => {
                        setCreating(true);
                        setEditingId(null);
                      }}
                    >
                      Añadir
                    </button>
                  </p>
                ) : (
                  <ul className="mt-3 space-y-4">
                    {group.map((exp) => {
                      const linked = countFor(exp.id);
                      return (
                        <li key={exp.id} className="card p-5">
                          {editingId === exp.id ? (
                            <ExperienceForm
                              initial={exp}
                              saving={saving}
                              onSubmit={(input) => handleUpdate(exp.id, input)}
                              onCancel={() => setEditingId(null)}
                            />
                          ) : (
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <p className="font-medium">
                                  {exp.title}
                                  {exp.organization !== exp.title && (
                                    <>
                                      <span className="text-muted"> — </span>
                                      {exp.organization}
                                    </>
                                  )}
                                </p>
                                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                                  <span className="font-mono text-xs">
                                    {formatPeriod(exp.startDate, exp.endDate)}
                                  </span>
                                  {exp.location && (
                                    <span className="inline-flex items-center gap-1">
                                      <MapPin size={12} /> {exp.location}
                                    </span>
                                  )}
                                  {exp.url && (
                                    <a
                                      href={exp.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 text-accent hover:underline"
                                    >
                                      <ExternalLink size={12} /> {exp.url}
                                    </a>
                                  )}
                                </div>
                                <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted">
                                  <Briefcase size={12} />
                                  {linked === 0 ? (
                                    <>
                                      Sin bullets ·{' '}
                                      <Link href="/bullets" className="text-accent hover:underline">
                                        asignar
                                      </Link>
                                    </>
                                  ) : (
                                    `${linked} ${linked === 1 ? 'bullet asignado' : 'bullets asignados'}`
                                  )}
                                </p>
                              </div>
                              <div className="flex shrink-0 items-center gap-1">
                                <button
                                  type="button"
                                  aria-label="Editar"
                                  className="rounded-full p-2 text-muted transition hover:bg-zinc-900/5 hover:text-fg dark:hover:bg-white/10"
                                  onClick={() => {
                                    setEditingId(exp.id);
                                    setCreating(false);
                                  }}
                                >
                                  <Pencil size={16} />
                                </button>
                                <DeleteButton
                                  onConfirm={() => handleDelete(exp.id)}
                                  label={
                                    linked > 0
                                      ? `Borrar (borra también ${linked} ${linked === 1 ? 'bullet' : 'bullets'})`
                                      : 'Borrar'
                                  }
                                />
                              </div>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}

      {items.length > 0 && (
        <p className="mt-10 text-xs text-muted">
          Borrar un empleo, proyecto o título borra también sus bullets — no pueden quedar sin dueño.
        </p>
      )}
    </main>
  );
}
