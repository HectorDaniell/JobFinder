/**
 * Copia los prompts (.txt) de src a dist tras compilar.
 *
 * `tsc` solo emite JavaScript: los assets que no son código (nuestros .txt) se
 * quedan en src. Como el bundle compilado resuelve la carpeta de prompts con
 * `__dirname` —que en ejecución apunta a dist/claude—, sin esta copia falla con
 * ENOENT en la primera llamada al LLM.
 *
 * Ver ADR-0012 (prompts como archivos .txt versionados).
 */
const { cpSync, existsSync, readdirSync } = require('node:fs');
const { join } = require('node:path');

const src = join(__dirname, '..', 'src', 'claude', 'prompts');
const dest = join(__dirname, '..', 'dist', 'claude', 'prompts');

if (!existsSync(src)) {
  console.error(`[copy-prompts] no existe el origen: ${src}`);
  process.exit(1);
}

// Solo .txt: el README de la carpeta es documentación, no hace falta en dist.
cpSync(src, dest, {
  recursive: true,
  filter: (from) => !from.endsWith('.md'),
});

const copiados = readdirSync(dest).filter((f) => f.endsWith('.txt'));
if (copiados.length === 0) {
  console.error('[copy-prompts] no se copió ningún .txt');
  process.exit(1);
}
console.log(`[copy-prompts] ${copiados.length} prompts -> dist (${copiados.join(', ')})`);
