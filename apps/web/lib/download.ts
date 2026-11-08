import type { TailorFileDto } from './types';

/**
 * Descarga un archivo que llegó en base64 dentro del JSON.
 *
 * Es el REVERSO de lo que hizo la API: allá `Buffer.from(bytes).toString('base64')`
 * convirtió los bytes del PDF/DOCX en texto para que cupieran en JSON; aquí los
 * devolvemos a bytes y los entregamos al navegador como archivo.
 *
 * La cadena completa:
 *   base64 (string)
 *     → atob()        decodifica a una "binary string": 1 carácter = 1 byte
 *     → Uint8Array    los bytes de verdad (charCodeAt de cada carácter)
 *     → Blob          un archivo en memoria, con su MIME type
 *     → object URL    una URL temporal (blob:…) que apunta a ese Blob
 *     → <a download>  un enlace que se pulsa solo para disparar la descarga
 */
export function downloadBase64File(file: TailorFileDto): void {
  const binary = atob(file.base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  const blob = new Blob([bytes], { type: file.mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = file.filename; // el atributo `download` fuerza descarga, no navegación
  link.click();

  // Liberar la memoria del Blob: el object URL la retiene hasta revocarlo.
  URL.revokeObjectURL(url);
}
