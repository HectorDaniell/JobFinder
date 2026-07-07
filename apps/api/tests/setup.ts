import 'reflect-metadata';

/**
 * Setup global de los tests de la API (se ejecuta antes de cada archivo).
 *
 * 1) reflect-metadata: polyfill que los decoradores de Nest (@Catch,
 *    @Controller, …) usan al cargarse.
 * 2) DATABASE_URL ficticia: el barrel de @jobfinder/db carga el singleton `db`,
 *    que EXIGE DATABASE_URL al importarse (lanza si falta). Como los tests
 *    unitarios mockean los repositorios, basta una URL ficticia: postgres-js
 *    conecta de forma lazy, así que nunca se abre una conexión real.
 */
process.env.DATABASE_URL ??= 'postgres://user:pass@localhost:5432/jobfinder_test';
