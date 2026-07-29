'use client';

import Link from 'next/link';
import { useProfile } from '../../components/ProfileProvider';

/**
 * /tailor — por ahora un placeholder que DEMUESTRA el consumo del Context:
 * lee el perfil activo con useProfile() (sin recibir ni una prop) y decide
 * qué mostrar. La pantalla real llega en el Paso 6.
 */
export default function TailorPage() {
  const { profileId, ready } = useProfile();

  // Antes de leer localStorage no sabemos si hay perfil: no pintar ninguna de
  // las dos variantes evita el "flash" de la equivocada.
  if (!ready) return null;

  return (
    <main className="mx-auto max-w-3xl px-6 pt-36">
      <h1 className="text-3xl font-bold tracking-tight">Tailor</h1>

      {profileId ? (
        <p className="mt-6 text-muted">
          Perfil activo: <span className="chip-accent">{profileId}</span>
        </p>
      ) : (
        <div className="card mt-6 p-6">
          <p className="text-muted">
            Aún no tienes un perfil. Es el primer paso para generar tu CV adaptado.
          </p>
          <Link href="/setup" className="btn-primary mt-4 inline-block">
            Configura tu perfil
          </Link>
        </div>
      )}

      <p className="mt-10 font-mono text-xs text-muted">
        [ pantalla en construcción — Paso 6 del Sprint 5 ]
      </p>
    </main>
  );
}
