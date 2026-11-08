/**
 * Carga las variables de entorno del `.env` de la RAÍZ del monorepo ANTES que
 * cualquier otro módulo. Se importa como primera línea de main.ts (side-effect)
 * porque `@jobfinder/db` lee `DATABASE_URL` en cuanto se importa.
 *
 * __dirname apunta a apps/api/{dist|src}; el .env está tres niveles arriba.
 */
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../../../.env') });
