'use client';

import { Download, FileText, FileType2 } from 'lucide-react';
import type { TailorFileDto } from '../lib/types';
import { downloadBase64File } from '../lib/download';

/**
 * Botón de descarga de un documento generado.
 *
 * Antes mostraba el nombre de archivo crudo y había que LEERLO entero para
 * saber qué era. Ahora el formato se reconoce por color e icono antes de leer,
 * y el texto dice qué documento es ("CV" / "Carta"), que es lo que se busca.
 *
 * CÓMO ENCAJAN LOS COLORES CON EL TEMA: el sistema "Señal" tiene UN acento
 * (emerald) para lo accionable. Meter rojo y azul como colores planos competiría
 * con él. En vez de eso reusamos la receta translúcida de `chip-accent` —fondo
 * al 10%, borde al 20%, texto al 100%— cambiando solo el matiz. Y como el
 * acento ya cambia de tono según el tema (emerald-600 en claro, emerald-400 en
 * oscuro, para mantener el contraste), estos hacen lo mismo: red-600/red-400 y
 * blue-600/blue-400. Así el color identifica el formato sin salirse del sistema
 * ni robarle protagonismo al acento.
 */

const STYLES = {
  pdf: {
    Icon: FileText,
    label: 'PDF',
    className:
      'bg-red-500/10 text-red-600 ring-red-500/20 hover:bg-red-500/15 dark:text-red-400',
  },
  docx: {
    Icon: FileType2,
    label: 'DOCX',
    className:
      'bg-blue-500/10 text-blue-600 ring-blue-500/20 hover:bg-blue-500/15 dark:text-blue-400',
  },
} as const;

/** El MIME es el dato fiable del formato; el filename es solo una sugerencia. */
function formatOf(mimeType: string): keyof typeof STYLES {
  return mimeType === 'application/pdf' ? 'pdf' : 'docx';
}

export function DownloadButton({ file }: { file: TailorFileDto }) {
  const { Icon, label, className } = STYLES[formatOf(file.mimeType)];
  // `kind` viene de la API (no se adivina leyendo el nombre del archivo).
  const document = file.kind === 'cv' ? 'CV' : 'Carta';

  return (
    <button
      type="button"
      onClick={() => downloadBase64File(file)}
      // El nombre completo sigue disponible al pasar el ratón, sin ocupar sitio.
      title={file.filename}
      aria-label={`Descargar ${document} en ${label}`}
      className={`group inline-flex items-center gap-2 rounded-full py-2 pl-3 pr-3.5 text-sm font-medium ring-1 transition ${className}`}
    >
      <Icon size={16} className="shrink-0" />
      <span>{document}</span>
      <span className="font-mono text-[11px] opacity-70">{label}</span>
      {/* La flecha solo aparece al apuntar: mantiene el botón limpio y confirma
          que la acción es descargar, no abrir. */}
      <Download
        size={13}
        className="-ml-1 shrink-0 opacity-0 transition group-hover:opacity-100"
      />
    </button>
  );
}
