'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Download, FileText, Loader2, Sparkles } from 'lucide-react';
import { api, ApiError } from '../../lib/api';
import { downloadBase64File } from '../../lib/download';
import type { DocFormat, TailorInput, TailorResponseDto } from '../../lib/types';
import { useProfile } from '../../components/ProfileProvider';
import { Input, Textarea, Select, CheckboxGroup } from '../../components/ui/fields';

const LANGS = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'Inglés' },
] as const;

const MODALITIES = [
  { value: 'unknown', label: 'Sin especificar' },
  { value: 'remote', label: 'Remoto' },
  { value: 'hybrid', label: 'Híbrido' },
  { value: 'onsite', label: 'Presencial' },
] as const;

const SENIORITIES = [
  { value: 'unknown', label: 'Sin especificar' },
  { value: 'junior', label: 'Junior' },
  { value: 'mid', label: 'Mid' },
  { value: 'senior', label: 'Senior' },
  { value: 'lead', label: 'Lead' },
] as const;

const FORMATS = [
  { value: 'pdf', label: 'PDF' },
  { value: 'docx', label: 'DOCX' },
] as const satisfies readonly { value: DocFormat; label: string }[];

const EMPTY: TailorInput = {
  job: {
    title: '',
    company: '',
    description: '',
    location: '',
    url: '',
    modality: 'unknown',
    seniority: 'unknown',
  },
  lang: 'es',
  formats: ['pdf', 'docx'],
};

/**
 * /tailor — la pantalla por la que existe el producto.
 *
 * Pegas una oferta, y el backend (TailorDocuments) adapta CV + carta con el LLM
 * y los convierte en PDF/DOCX. Aquí solo: recoger la oferta, mostrar el preview
 * y devolver los bytes al usuario (base64 -> archivo, ver lib/download.ts).
 *
 * ToS-safe por diseño: la oferta se PEGA a mano; no hay scraping.
 */
export default function TailorPage() {
  const router = useRouter();
  const { profileId, ready } = useProfile();

  const [form, setForm] = useState<TailorInput>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TailorResponseDto | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [tab, setTab] = useState<'cv' | 'letter'>('cv');

  useEffect(() => {
    if (ready && !profileId) router.replace('/setup');
  }, [ready, profileId, router]);

  function setJob<K extends keyof TailorInput['job']>(key: K, value: TailorInput['job'][K]) {
    setForm((prev) => ({ ...prev, job: { ...prev.job, [key]: value } }));
  }

  const canSubmit =
    form.job.title.trim() !== '' &&
    form.job.company.trim() !== '' &&
    form.job.description.trim() !== '' &&
    form.formats.length > 0;

  async function generate() {
    if (!profileId) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      // Los opcionales vacíos se omiten: la API valida `url` como URL, y ""
      // fallaría la validación en vez de tratarse como "no informado".
      const payload: TailorInput = {
        ...form,
        job: {
          ...form.job,
          location: form.job.location?.trim() || undefined,
          url: form.job.url?.trim() || undefined,
        },
      };
      setResult(await api.tailor(profileId, payload));
      setTab('cv');
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError(0, 'UNKNOWN', 'Error inesperado.'));
    } finally {
      setLoading(false);
    }
  }

  if (!ready || !profileId) return null;

  return (
    <main className="relative mx-auto max-w-3xl px-6 pb-24 pt-32">
      <h1 className="text-3xl font-bold tracking-tight">Adapta tu CV</h1>
      <p className="mt-2 text-muted">
        Pega la oferta y genera un CV y una carta a medida —solo con tus logros reales.
      </p>

      {/* ---------------- Formulario ---------------- */}
      <section className="card mt-8 p-6 sm:p-8">
        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            label="Puesto"
            required
            value={form.job.title}
            onChange={(v) => setJob('title', v)}
            placeholder="Senior Backend Engineer"
          />
          <Input
            label="Empresa"
            required
            value={form.job.company}
            onChange={(v) => setJob('company', v)}
            placeholder="Acme"
          />
        </div>

        <div className="mt-5">
          <Textarea
            label="Descripción de la oferta"
            required
            rows={10}
            value={form.job.description}
            onChange={(v) => setJob('description', v)}
            placeholder="Pega aquí el texto completo de la oferta…"
            hint="Cuanto más completa, mejor alineará el LLM tus bullets y las keywords."
          />
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <Input
            label="Ubicación (opcional)"
            value={form.job.location ?? ''}
            onChange={(v) => setJob('location', v)}
            placeholder="Remote · Madrid"
          />
          <Input
            label="URL de la oferta (opcional)"
            value={form.job.url ?? ''}
            onChange={(v) => setJob('url', v)}
            placeholder="https://…"
          />
          <Select
            label="Modalidad"
            value={form.job.modality ?? 'unknown'}
            onChange={(v) => setJob('modality', v)}
            options={MODALITIES}
          />
          <Select
            label="Seniority"
            value={form.job.seniority ?? 'unknown'}
            onChange={(v) => setJob('seniority', v)}
            options={SENIORITIES}
          />
        </div>

        <div className="mt-6 grid items-start gap-5 sm:grid-cols-2">
          <Select
            label="Idioma de los documentos"
            value={form.lang}
            onChange={(v) => setForm((prev) => ({ ...prev, lang: v }))}
            options={LANGS}
          />
          <CheckboxGroup
            label="Formatos"
            required
            values={form.formats}
            onChange={(v) => setForm((prev) => ({ ...prev, formats: v }))}
            options={FORMATS}
          />
        </div>

        <div className="mt-7 flex justify-end">
          <button
            type="button"
            className="btn-primary inline-flex items-center gap-2 disabled:opacity-40"
            onClick={generate}
            disabled={!canSubmit || loading}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {loading ? 'Generando…' : 'Generar CV y carta'}
          </button>
        </div>

        {loading && (
          <p className="mt-4 text-right text-xs text-muted">
            Adaptando el contenido y creando los archivos. Suele tardar unos segundos.
          </p>
        )}
      </section>

      {/* ---------------- Errores con acción ---------------- */}
      {error && <ErrorPanel error={error} />}

      {/* ---------------- Resultado ---------------- */}
      {result && (
        <section className="relative mt-10">
          {/* Glow permitido: el resultado es un "momento" (regla de Señal). */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-16 left-1/2 -z-10 h-72 w-[34rem] -translate-x-1/2 rounded-full bg-gradient-to-tr from-emerald-500/20 via-teal-500/10 to-cyan-400/10 blur-3xl"
          />

          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-xl font-semibold tracking-tight">Tus documentos</h2>
            <div className="flex flex-wrap gap-2">
              {result.files.map((f) => (
                <button
                  key={f.filename}
                  type="button"
                  className="btn-ghost inline-flex items-center gap-1.5"
                  onClick={() => downloadBase64File(f)}
                >
                  <Download size={14} />
                  <span className="font-mono text-xs">{f.filename}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tabs: variación DENTRO de una pantalla (no navegación) */}
          <div className="mt-6 flex gap-1 border-b border-zinc-900/10 dark:border-white/10">
            {(
              [
                ['cv', 'CV adaptado'],
                ['letter', 'Carta'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`-mb-px border-b-2 px-4 py-2 text-sm transition ${
                  tab === key
                    ? 'border-accent font-medium text-accent'
                    : 'border-transparent text-muted hover:text-fg'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="card mt-6 p-6 sm:p-8">
            {tab === 'cv' ? (
              <>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {result.cv.content}
                </p>

                <h3 className="mt-6 text-sm font-medium text-muted">Bullets seleccionados</h3>
                <ul className="mt-2 space-y-2">
                  {result.cv.bullets.map((b, i) => (
                    <li key={i} className="flex gap-2.5 text-sm leading-relaxed">
                      <FileText size={14} className="mt-1 shrink-0 text-accent" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>

                {result.cv.keywords.length > 0 && (
                  <>
                    <h3 className="mt-6 text-sm font-medium text-muted">Keywords alineadas</h3>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {result.cv.keywords.map((k) => (
                        <span key={k} className="chip-accent font-mono">
                          {k}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {result.coverLetter}
              </p>
            )}
          </div>
        </section>
      )}
    </main>
  );
}

/**
 * Traduce el `code` del error de dominio en un mensaje accionable. Aquí se
 * cobra el contrato de errores tipados del backend: cada caso sabe qué ofrecer.
 */
function ErrorPanel({ error }: { error: ApiError }) {
  if (error.code === 'PROFILE_HAS_NO_BULLETS') {
    return (
      <div className="card mt-8 p-6 text-center">
        <p className="font-medium">Tu banco de bullets está vacío</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">
          El CV se arma seleccionando tus logros reales, así que necesitas al menos uno
          antes de adaptar.
        </p>
        <Link href="/bullets" className="btn-primary mt-5 inline-block">
          Añadir bullets
        </Link>
      </div>
    );
  }

  const hint =
    error.code === 'INVALID_ANTHROPIC_KEY'
      ? 'Falta configurar ANTHROPIC_API_KEY en el servidor.'
      : error.code === 'LLM_RATE_LIMIT' || error.code === 'LLM_TIMEOUT'
        ? 'El modelo está saturado o tardó demasiado. Vuelve a intentarlo en un momento.'
        : null;

  return (
    <div className="mt-8 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-500 ring-1 ring-red-500/20 dark:text-red-400">
      <p>{error.message}</p>
      {hint && <p className="mt-1 opacity-80">{hint}</p>}
    </div>
  );
}
