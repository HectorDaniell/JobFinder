'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Briefcase, Loader2, MapPin, Pencil, Plus } from 'lucide-react';
import { api, ApiError } from '../../lib/api';
import type { ExperienceDto, CreateExperienceInput, BulletDto } from '../../lib/types';
import { formatPeriod } from '../../lib/dates';
import { useProfile } from '../../components/ProfileProvider';
import { ExperienceForm } from '../../components/ExperienceForm';
import { DeleteButton } from '../../components/ui/DeleteButton';

/**
 * /experiences — los empleos que dan contexto a los bullets.
 *
 * Sin esto el CV sería una lista plana de logros, sin decir dónde ni cuándo
 * ocurrieron. Cargamos también los bullets para mostrar cuántos cuelgan de cada
 * empleo: es el dato que hace entender para qué sirve esta pantalla.
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
      // Insertamos y reordenamos como en un CV (el actual primero, luego por fecha).
      setItems((prev) => sortForCv([...(prev ?? []), created]));
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
      setItems((prev) => sortForCv((prev ?? []).map((e) => (e.id === id ? updated : e))));
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
      setItems((prev) => (prev ?? []).filter((e) => e.id !== id));
      // Los bullets siguen existiendo, pero ya sin empleo: lo reflejamos en local.
      setBullets((prev) =>
        prev.map((b) => (b.experienceId === id ? { ...b, experienceId: undefined } : b))
      );
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
          <h1 className="text-3xl font-bold tracking-tight">Tu experiencia</h1>
          <p className="mt-2 text-muted">
            {items.length === 0
              ? 'Los empleos donde ocurrieron tus logros.'
              : `${items.length} ${items.length === 1 ? 'empleo' : 'empleos'} · así se agrupará tu CV.`}
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
            <Plus size={16} /> Añadir empleo
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
          <h2 className="mb-5 text-lg font-semibold tracking-tight">Nuevo empleo</h2>
          <ExperienceForm
            saving={saving}
            onSubmit={handleCreate}
            onCancel={() => setCreating(false)}
          />
        </div>
      )}

      {items.length === 0 && !creating && (
        <div className="card mt-8 p-8 text-center">
          <p className="font-medium">Aún no has añadido empleos</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Un CV necesita decir <em>dónde</em> y <em>cuándo</em> ocurrió cada logro. Añade
            tus empleos y luego asigna cada bullet al suyo.
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

      <ul className="mt-6 space-y-4">
        {items.map((exp) => {
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
                      {exp.role} <span className="text-muted">—</span> {exp.company}
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
                      aria-label="Editar empleo"
                      className="rounded-full p-2 text-muted transition hover:bg-zinc-900/5 hover:text-fg dark:hover:bg-white/10"
                      onClick={() => {
                        setEditingId(exp.id);
                        setCreating(false);
                      }}
                    >
                      <Pencil size={16} />
                    </button>
                    <DeleteButton onConfirm={() => handleDelete(exp.id)} label="Borrar empleo" />
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {items.length > 0 && (
        <p className="mt-6 text-xs text-muted">
          Borrar un empleo no borra sus bullets: quedan sin asignar y puedes moverlos a otro.
        </p>
      )}
    </main>
  );
}

/** Orden de CV: el empleo actual primero, luego por fecha descendente. */
function sortForCv(list: ExperienceDto[]): ExperienceDto[] {
  return [...list].sort((a, b) => {
    if (!a.endDate !== !b.endDate) return a.endDate ? 1 : -1;
    const end = (b.endDate ?? '').localeCompare(a.endDate ?? '');
    return end !== 0 ? end : b.startDate.localeCompare(a.startDate);
  });
}
