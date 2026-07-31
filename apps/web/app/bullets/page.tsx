'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { api, ApiError } from '../../lib/api';
import type { BulletDto, CreateBulletInput } from '../../lib/types';
import { useProfile } from '../../components/ProfileProvider';
import { BulletForm, CATEGORY_OPTIONS } from '../../components/BulletForm';

const CATEGORY_LABEL = Object.fromEntries(
  CATEGORY_OPTIONS.map((o) => [o.value, o.label])
) as Record<BulletDto['category'], string>;

/**
 * /bullets — el banco de bullets: la materia prima del tailoring (el LLM
 * SELECCIONA de aquí; nunca inventa).
 *
 * Tras cada mutación sincronizamos la lista LOCALMENTE con lo que devuelve la
 * API (append/replace/filter) en vez de re-fetchear todo: menos peticiones,
 * UI instantánea, y la respuesta del servidor sigue siendo la fuente de verdad
 * del elemento tocado.
 */
export default function BulletsPage() {
  const router = useRouter();
  const { profileId, ready } = useProfile();

  const [bullets, setBullets] = useState<BulletDto[] | null>(null); // null = cargando
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false); // ¿formulario de alta visible?
  const [editingId, setEditingId] = useState<string | null>(null); // ¿qué card está en edición?
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!profileId) {
      router.replace('/setup');
      return;
    }
    let cancelled = false;
    api
      .listBullets(profileId)
      .then((list) => !cancelled && setBullets(list))
      .catch((e) => !cancelled && setError(e instanceof ApiError ? e.message : 'Error inesperado'))
      .finally(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [ready, profileId, router]);

  async function handleCreate(input: CreateBulletInput) {
    if (!profileId) return;
    setSaving(true);
    setError(null);
    try {
      const created = await api.createBullet(profileId, input);
      setBullets((prev) => [...(prev ?? []), created]);
      setCreating(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Error inesperado');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(id: string, input: CreateBulletInput) {
    if (!profileId) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await api.updateBullet(profileId, id, input);
      setBullets((prev) => (prev ?? []).map((b) => (b.id === id ? updated : b)));
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
      await api.deleteBullet(profileId, id);
      setBullets((prev) => (prev ?? []).filter((b) => b.id !== id));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Error inesperado');
    }
  }

  if (!ready || bullets === null) {
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
          <h1 className="text-3xl font-bold tracking-tight">Tu banco de bullets</h1>
          <p className="mt-2 text-muted">
            {bullets.length === 0
              ? 'La materia prima de tu CV adaptado.'
              : `${bullets.length} ${bullets.length === 1 ? 'bullet' : 'bullets'} en el banco.`}
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
            <Plus size={16} /> Añadir bullet
          </button>
        )}
      </div>

      {error && (
        <div className="mt-6 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-500 ring-1 ring-red-500/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Formulario de alta */}
      {creating && (
        <div className="card mt-6 p-6">
          <h2 className="mb-5 text-lg font-semibold tracking-tight">Nuevo bullet</h2>
          <BulletForm
            saving={saving}
            onSubmit={handleCreate}
            onCancel={() => setCreating(false)}
          />
        </div>
      )}

      {/* Estado vacío que GUÍA (regla UX de Señal) */}
      {bullets.length === 0 && !creating && (
        <div className="card mt-8 p-8 text-center">
          <p className="font-medium">Tu banco está vacío</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Un bullet es un logro o experiencia concreta (&ldquo;Lideré X y conseguí
            Y&rdquo;). Al adaptar tu CV, el LLM <em>selecciona y reformula</em> los más
            relevantes para cada vacante — nunca inventa. Cuantos más tengas, mejor el
            resultado.
          </p>
          <button
            type="button"
            className="btn-primary mt-6 inline-flex items-center gap-1.5"
            onClick={() => setCreating(true)}
          >
            <Plus size={16} /> Crea el primero
          </button>
        </div>
      )}

      {/* La lista: cada card muestra o edita (inline) según editingId */}
      <ul className="mt-6 space-y-4">
        {bullets.map((b) => (
          <li key={b.id} className="card p-5">
            {editingId === b.id ? (
              <BulletForm
                initial={b}
                saving={saving}
                onSubmit={(input) => handleUpdate(b.id, input)}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] uppercase tracking-widest text-muted">
                      {CATEGORY_LABEL[b.category]}
                    </span>
                    {b.sourceRole && (
                      <span className="text-xs text-muted">· {b.sourceRole}</span>
                    )}
                  </div>
                  <p className="mt-2 text-sm leading-relaxed">{b.textEs}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{b.textEn}</p>
                  {b.skills.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {b.skills.map((s) => (
                        <span key={s} className="chip-accent font-mono">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    aria-label="Editar bullet"
                    className="rounded-full p-2 text-muted transition hover:bg-zinc-900/5 hover:text-fg dark:hover:bg-white/10"
                    onClick={() => {
                      setEditingId(b.id);
                      setCreating(false);
                    }}
                  >
                    <Pencil size={16} />
                  </button>
                  <DeleteButton onConfirm={() => handleDelete(b.id)} />
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}

/**
 * Borrado en DOS clics (sin confirm() nativo): el primero "arma" el botón, el
 * segundo confirma. Salir del foco lo desarma. Suficiente fricción para evitar
 * accidentes sin ensuciar la UI con un modal.
 */
function DeleteButton({ onConfirm }: { onConfirm: () => void }) {
  const [armed, setArmed] = useState(false);

  if (!armed) {
    return (
      <button
        type="button"
        aria-label="Borrar bullet"
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
