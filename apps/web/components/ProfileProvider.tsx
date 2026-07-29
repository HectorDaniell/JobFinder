'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

/**
 * CONTEXT DE PERFIL — el único estado global de cliente de la app (junto al
 * theme, que va por CSS y no necesita React).
 *
 * Publica a todo el árbol: el profileId activo (persistido en localStorage),
 * un flag `ready` (ver abajo por qué es necesario) y las dos operaciones para
 * cambiarlo. Cualquier página/componente lo lee con useProfile(), sin props.
 */

interface ProfileContextValue {
  /** El id del perfil activo, o null si aún no se creó uno. */
  profileId: string | null;
  /** false durante el primer render (aún no pudimos leer localStorage). */
  ready: boolean;
  setProfileId: (id: string) => void;
  clearProfile: () => void;
}

// La "frecuencia": existe, pero no emite nada por sí sola. El null del inicio
// es el valor que vería quien escuche SIN un Provider arriba (lo detectamos
// en useProfile para fallar con un mensaje claro).
const ProfileContext = createContext<ProfileContextValue | null>(null);

const STORAGE_KEY = 'jobfinder.profileId';

/** La "antena": envuelve el árbol en layout.tsx y emite el valor. */
export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profileId, setId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // localStorage NO existe en el servidor: solo podemos leerlo después de
  // montar en el navegador. Por eso el primer render sale con null y este
  // efecto lo corrige (y marca ready) ya en el cliente.
  useEffect(() => {
    setId(localStorage.getItem(STORAGE_KEY));
    setReady(true);
  }, []);

  // useMemo: emitir el MISMO objeto mientras nada cambie. Sin esto, cada
  // render del Provider crearía un objeto nuevo ({} !== {}) y re-renderizaría
  // a TODOS los consumidores aunque el contenido fuera idéntico.
  const value = useMemo<ProfileContextValue>(
    () => ({
      profileId,
      ready,
      setProfileId: (id: string) => {
        localStorage.setItem(STORAGE_KEY, id); // persistir (sobrevive refresh)
        setId(id); // avisar a React (re-render de los consumidores)
      },
      clearProfile: () => {
        localStorage.removeItem(STORAGE_KEY);
        setId(null);
      },
    }),
    [profileId, ready]
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

/**
 * La "radio": hook personalizado que sintoniza el canal. Encapsula useContext
 * y hace cumplir la invariante "solo se usa bajo un Provider" — si alguien lo
 * llama fuera, falla ruidoso y con instrucciones, no con un undefined críptico.
 */
export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) {
    throw new Error('useProfile debe usarse dentro de <ProfileProvider> (ver app/layout.tsx)');
  }
  return ctx;
}
