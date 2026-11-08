import { customType } from 'drizzle-orm/pg-core';

/**
 * COLUMNA `jsonb` PROPIA — evita la doble codificación.
 *
 * La `jsonb` de serie de Drizzle hace `JSON.stringify(value)` antes de entregar
 * el valor al driver. Con `postgres.js` eso sobra: el driver YA serializa los
 * objetos que van a una columna json/jsonb. El valor acaba convertido a texto
 * dos veces, y Postgres guarda —correctamente— una CADENA que contiene JSON,
 * en vez del objeto.
 *
 * A simple vista no falla nada, porque el camino de vuelta es simétrico
 * (Drizzle hace `JSON.parse` al leer). El destrozo solo se ve desde SQL:
 *
 *     jsonb_typeof(preferences)  ->  'string'   (debería ser 'object')
 *     preferences->>'modality'   ->  NULL       (no se puede consultar)
 *
 * Eso inutiliza cualquier filtro en SQL y cualquier índice GIN — justo lo que
 * necesita la Capa 1 del embudo de matching (RF-11), que existe para descartar
 * vacantes barato con un WHERE en vez de traérselo todo a memoria.
 *
 * Este tipo declara el MISMO `jsonb` en SQL, pero entrega el valor tal cual y
 * deja que serialice solo el driver. No hace falta `fromDriver`: postgres.js ya
 * devuelve el jsonb parseado como objeto JS. Ver ADR-0024.
 */
export const jsonb = customType<{ data: unknown; driverData: unknown }>({
  dataType() {
    return 'jsonb';
  },
  toDriver(value) {
    return value;
  },
});
