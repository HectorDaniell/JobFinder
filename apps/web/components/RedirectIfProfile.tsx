'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useProfile } from './ProfileProvider';

/**
 * GUARDA de la landing: si ya hay perfil, la home del día a día es /tailor.
 *
 * Componente "solo efecto": no pinta nada (return null); existe para ejecutar
 * la redirección en el navegador (localStorage manda, así que no puede
 * decidirse en el servidor). router.replace (no .push): sustituye la entrada
 * en el historial para que "atrás" no te rebote a la landing en bucle.
 */
export function RedirectIfProfile() {
  const { profileId, ready } = useProfile();
  const router = useRouter();

  useEffect(() => {
    if (ready && profileId) {
      router.replace('/tailor');
    }
  }, [ready, profileId, router]);

  return null;
}
