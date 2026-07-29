'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { api, ApiError } from '../../lib/api';
import type { CreateProfileInput } from '../../lib/types';
import { useProfile } from '../../components/ProfileProvider';
import { PreferencesFields } from '../../components/PreferencesFields';
import { Input, Textarea } from '../../components/ui/fields';

/**
 * /setup — alta del perfil en 3 pasos.
 *
 * El wizard es el caso legítimo del patrón stepper: proceso LINEAL, largo y que
 * se hace una vez. `step` es solo estado de UI; el formulario entero vive en un
 * único objeto de estado (más simple que 12 useState sueltos).
 *
 * La validación del cliente es cortesía de UX (habilita/deshabilita el botón);
 * la AUTORIDAD es la API: si rechaza algo, usamos el `field` del ApiError para
 * saltar al paso correcto y marcar el campo exacto en rojo.
 */

const STEPS = ['Datos básicos', 'Resúmenes', 'Preferencias'] as const;

/** A qué paso pertenece cada campo que la API puede rechazar. */
const FIELD_STEP: Record<string, number> = {
  fullName: 0,
  email: 0,
  phone: 0,
  links: 0,
  summaryEs: 1,
  summaryEn: 1,
  preferences: 2,
};

const EMPTY: CreateProfileInput = {
  fullName: '',
  email: '',
  phone: '',
  links: {},
  summaryEs: '',
  summaryEn: '',
  preferences: {
    targetRoles: [],
    minSeniority: 'mid',
    preferredLocations: [],
    modality: 'any',
    languages: ['es', 'en'],
    dealBreakers: [],
  },
};

export default function SetupPage() {
  const router = useRouter();
  const { profileId, ready, setProfileId } = useProfile();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<CreateProfileInput>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  // useRef guarda un valor entre renders SIN provocar re-render (a diferencia de
  // useState). Lo usamos como bandera: al crear el perfil escribimos el Context,
  // y eso dispararía la guarda de abajo pisando nuestra navegación a /bullets.
  const justCreated = useRef(false);

  // Guarda: el modelo es un perfil por usuario; si ya existe, se edita en /profile.
  // (No aplica justo después de crearlo: ahí mandamos a cargar bullets.)
  useEffect(() => {
    if (ready && profileId && !justCreated.current) router.replace('/profile');
  }, [ready, profileId, router]);

  /** Actualiza una clave del formulario sin mutar el objeto anterior. */
  function set<K extends keyof CreateProfileInput>(key: K, value: CreateProfileInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  /** ¿Están completos los campos obligatorios del paso actual? */
  const canAdvance =
    step === 0
      ? form.fullName.trim() !== '' && form.email.trim() !== ''
      : step === 1
        ? form.summaryEs.trim() !== '' && form.summaryEn.trim() !== ''
        : form.preferences.targetRoles.length > 0 && form.preferences.languages.length > 0;

  /** El error solo se pinta en el campo al que apunta (primer segmento de `field`). */
  const errorFor = (field: string) =>
    error?.field?.split('.')[0] === field ? error.message : undefined;

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      // Limpiamos los opcionales vacíos: la API valida `phone` como string y
      // los links como URL; "" fallaría la validación en vez de omitirse.
      const payload: CreateProfileInput = {
        ...form,
        phone: form.phone?.trim() || undefined,
        links: Object.fromEntries(
          Object.entries(form.links ?? {}).filter(([, v]) => v && v.trim() !== '')
        ),
      };

      const profile = await api.createProfile(payload);
      justCreated.current = true; // desactiva la guarda para este caso
      setProfileId(profile.id); // ← la primera escritura real del Context
      router.push('/bullets'); // siguiente paso natural: cargar el banco de bullets
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e);
        // Si el campo rechazado vive en un paso anterior, volvemos allí para
        // que el usuario VEA el error en vez de quedarse sin saber qué pasó.
        const target = FIELD_STEP[e.field?.split('.')[0] ?? ''];
        if (target !== undefined && target !== step) setStep(target);
      } else {
        setError(new ApiError(0, 'UNKNOWN', 'Ocurrió un error inesperado.'));
      }
    } finally {
      setSubmitting(false);
    }
  }

  // Evita el flash mientras se decide la guarda (salvo tras crear: ahí ya
  // estamos navegando a /bullets y no queremos parpadeo en blanco).
  if (!ready || (profileId && !justCreated.current)) return null;

  return (
    <main className="mx-auto max-w-2xl px-6 pb-24 pt-32">
      <h1 className="text-3xl font-bold tracking-tight">Configura tu perfil</h1>
      <p className="mt-2 text-muted">
        Es la base de todo: con esto adaptaremos tu CV a cada vacante.
      </p>

      {/* Indicador de pasos */}
      <ol className="mt-8 flex items-center gap-2" aria-label="Progreso">
        {STEPS.map((label, i) => {
          const done = i < step;
          const current = i === step;
          return (
            <li key={label} className="flex flex-1 items-center gap-2">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium ring-1 transition ${
                  done || current
                    ? 'bg-accent/10 text-accent ring-accent/30'
                    : 'text-muted ring-zinc-900/10 dark:ring-white/10'
                }`}
              >
                {done ? <Check size={14} /> : i + 1}
              </span>
              <span
                className={`hidden text-sm sm:block ${current ? 'font-medium' : 'text-muted'}`}
              >
                {label}
              </span>
              {i < STEPS.length - 1 && (
                <span className="h-px flex-1 bg-zinc-900/10 dark:bg-white/10" />
              )}
            </li>
          );
        })}
      </ol>

      <div className="card mt-8 p-6 sm:p-8">
        {step === 0 && (
          <div className="space-y-5">
            <Input
              label="Nombre completo"
              required
              value={form.fullName}
              onChange={(v) => set('fullName', v)}
              placeholder="Ana Pérez"
              error={errorFor('fullName')}
            />
            <Input
              label="Email"
              required
              type="email"
              value={form.email}
              onChange={(v) => set('email', v)}
              placeholder="ana@example.com"
              error={errorFor('email')}
            />
            <Input
              label="Teléfono (opcional)"
              value={form.phone ?? ''}
              onChange={(v) => set('phone', v)}
              placeholder="+51 999 999 999"
              error={errorFor('phone')}
            />
            <div className="grid gap-5 sm:grid-cols-3">
              {(['github', 'linkedin', 'portfolio'] as const).map((k) => (
                <Input
                  key={k}
                  label={k[0].toUpperCase() + k.slice(1)}
                  value={form.links?.[k] ?? ''}
                  onChange={(v) => set('links', { ...form.links, [k]: v })}
                  placeholder="https://…"
                  error={errorFor('links')}
                />
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <Textarea
              label="Resumen profesional (español)"
              required
              rows={5}
              value={form.summaryEs}
              onChange={(v) => set('summaryEs', v)}
              placeholder="Ingeniera backend con 5 años de experiencia en…"
              error={errorFor('summaryEs')}
              hint="2–4 líneas. Es el encabezado de tu CV; el LLM lo adapta a cada vacante."
            />
            <Textarea
              label="Professional summary (English)"
              required
              rows={5}
              value={form.summaryEn}
              onChange={(v) => set('summaryEn', v)}
              placeholder="Backend engineer with 5 years of experience in…"
              error={errorFor('summaryEn')}
            />
          </div>
        )}

        {step === 2 && (
          <>
            <PreferencesFields
              value={form.preferences}
              onChange={(v) => set('preferences', v)}
            />
            {errorFor('preferences') && (
              <p className="mt-4 text-xs text-red-500 dark:text-red-400">
                {errorFor('preferences')}
              </p>
            )}
          </>
        )}

        {/* Errores que no apuntan a un campo concreto (409, red caída…) */}
        {error && !error.field && (
          <div className="mt-6 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-500 ring-1 ring-red-500/20 dark:text-red-400">
            {error.message}
          </div>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          className="btn-ghost inline-flex items-center gap-1"
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 0 || submitting}
        >
          <ChevronLeft size={16} /> Atrás
        </button>

        {step < STEPS.length - 1 ? (
          <button
            type="button"
            className="btn-primary inline-flex items-center gap-1 disabled:opacity-40"
            onClick={() => setStep((s) => s + 1)}
            disabled={!canAdvance}
          >
            Continuar <ChevronRight size={16} />
          </button>
        ) : (
          <button
            type="button"
            className="btn-primary inline-flex items-center gap-2 disabled:opacity-40"
            onClick={handleSubmit}
            disabled={!canAdvance || submitting}
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {submitting ? 'Creando…' : 'Crear perfil'}
          </button>
        )}
      </div>
    </main>
  );
}
