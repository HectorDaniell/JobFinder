'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2, Mail, Phone } from 'lucide-react';
import { api, ApiError } from '../../lib/api';
import type { ProfileDto, Preferences } from '../../lib/types';
import { useProfile } from '../../components/ProfileProvider';
import { PreferencesFields } from '../../components/PreferencesFields';

/**
 * /profile — ver el perfil y editar las PREFERENCIAS.
 *
 * Solo preferencias porque es lo único que la API permite actualizar
 * (PATCH /profiles/:id, Sprint 4): la UI es honesta con el backend en vez de
 * ofrecer campos que no se pueden guardar.
 */
export default function ProfilePage() {
  const router = useRouter();
  const { profileId, ready, clearProfile } = useProfile();

  const [profile, setProfile] = useState<ProfileDto | null>(null);
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // useCallback: si el efecto depende de clearProfile, esta función debe ser
  // estable entre renders (viene memoizada del Context) para no re-disparar.
  const handleMissing = useCallback(() => {
    clearProfile(); // el id guardado ya no existe en la BD: limpiar y reconfigurar
    router.replace('/setup');
  }, [clearProfile, router]);

  useEffect(() => {
    if (!ready) return;
    if (!profileId) {
      router.replace('/setup');
      return;
    }

    // `cancelled` evita actualizar estado si el componente se desmonta antes de
    // que responda la petición (o si el efecto se re-dispara): sin esto,
    // respuestas viejas podrían pisar datos nuevos.
    let cancelled = false;

    api
      .getProfile(profileId)
      .then((p) => {
        if (cancelled) return;
        setProfile(p);
        setPrefs(p.preferences);
      })
      .catch((e) => {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 404) return handleMissing();
        setError(e instanceof ApiError ? e.message : 'Error inesperado');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [ready, profileId, router, handleMissing]);

  async function save() {
    if (!profileId || !prefs) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await api.updatePreferences(profileId, prefs);
      setProfile(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500); // el aviso se desvanece solo
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return handleMissing();
      setError(e instanceof ApiError ? e.message : 'Error inesperado');
    } finally {
      setSaving(false);
    }
  }

  if (!ready || loading) {
    return (
      <main className="mx-auto max-w-2xl px-6 pt-36">
        <Loader2 className="animate-spin text-muted" size={20} />
      </main>
    );
  }

  if (!profile || !prefs) {
    return (
      <main className="mx-auto max-w-2xl px-6 pt-36">
        <p className="text-sm text-red-500 dark:text-red-400">{error ?? 'No se pudo cargar.'}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-6 pb-24 pt-32">
      <h1 className="text-3xl font-bold tracking-tight">{profile.fullName}</h1>

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
        <span className="inline-flex items-center gap-1.5">
          <Mail size={14} /> {profile.email}
        </span>
        {profile.phone && (
          <span className="inline-flex items-center gap-1.5">
            <Phone size={14} /> {profile.phone}
          </span>
        )}
      </div>

      {Object.entries(profile.links ?? {}).length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {Object.entries(profile.links).map(([k, url]) => (
            <a
              key={k}
              href={url}
              target="_blank"
              rel="noreferrer noopener"
              className="chip-accent font-mono hover:opacity-80"
            >
              {k}
            </a>
          ))}
        </div>
      )}

      <section className="card mt-8 p-6 sm:p-8">
        <h2 className="text-sm font-medium text-muted">Resumen (ES)</h2>
        <p className="mt-1.5 text-sm leading-relaxed">{profile.summaryEs}</p>
        <h2 className="mt-5 text-sm font-medium text-muted">Summary (EN)</h2>
        <p className="mt-1.5 text-sm leading-relaxed">{profile.summaryEn}</p>
      </section>

      <section className="card mt-6 p-6 sm:p-8">
        <h2 className="mb-6 text-lg font-semibold tracking-tight">Preferencias de empleo</h2>
        <PreferencesFields value={prefs} onChange={setPrefs} />

        {error && (
          <div className="mt-6 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-500 ring-1 ring-red-500/20 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            className="btn-primary inline-flex items-center gap-2 disabled:opacity-40"
            onClick={save}
            disabled={saving || prefs.targetRoles.length === 0 || prefs.languages.length === 0}
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            {saving ? 'Guardando…' : 'Guardar preferencias'}
          </button>
          {saved && (
            <span className="inline-flex items-center gap-1 text-sm text-accent">
              <Check size={16} /> Guardado
            </span>
          )}
        </div>
      </section>
    </main>
  );
}
