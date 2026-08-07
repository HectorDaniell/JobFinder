# ADR-0027 — Las habilidades salen de los tags curados, no del LLM

**Estado:** Aceptado · **Fecha:** 2026-08-06

## Contexto

La sección de habilidades del CV se llenaba con `TailoredCv.keywords`, que el
prompt le pide a Claude extraer leyendo la oferta ("extract 8-12 important
keywords that the candidate covers").

En un CV real generado con el perfil del usuario, esa sección salió así:

> React, TypeScript, APIs REST, **componentización, arquitectura frontend, estado
> global, validación y seguridad, flujos asíncronos, separación de capas, buenas
> prácticas, integración de servicios**

Las tres primeras funcionan; el resto no. Una sección de habilidades de un CV
espera **nombres de tecnología**, no frases descriptivas. Un ATS que busca "React"
o "PostgreSQL" no encuentra nada en "separación de capas", y a un lector humano le
sugiere relleno.

El problema es de fuente, no de prompt: se le estaba pidiendo al modelo que
*generara* una lista que el usuario **ya tiene curada**. Cada bullet del banco
lleva sus `skills` etiquetadas a mano (`React`, `NestJS`, `PostgreSQL`, `C#`,
`Vue.js`…), que es exactamente la forma que se quiere.

## Decisión

La línea de habilidades se construye desde las `skills` de los bullets que el LLM
**seleccionó**, no desde sus keywords. Así la sección respalda exactamente lo que
el CV afirma, y su contenido es 100% del usuario.

Orden, de mayor a menor prioridad:

1. Las que aparecen **literalmente en la oferta** (relevancia para esa vacante).
2. Las que sostienen **más bullets** (centralidad en el perfil).
3. A igualdad, el **orden de aparición en el CV** — que es la prioridad que les
   dio el LLM al ordenar los bullets.

Se recortan a 15. El desempate por orden de aparición es deliberado: con desempate
alfabético, el recorte dependía de la inicial y se colaban skills irrelevantes
solo por empezar por A.

Los duplicados que solo difieren en mayúsculas se colapsan (`Wordpress` /
`WordPress`), conservando la primera grafía. Si ningún bullet tuviera tags, se
conservan las keywords del LLM: mejor eso que un CV sin sección de habilidades.

Para que esto sea posible, `TailoredBullet` arrastra las `skills` del bullet real
emparejado, igual que ya arrastra `category`, `experienceId` y `sourceRole`.

## Alternativas descartadas

- **Arreglarlo en el prompt** ("devuelve solo nombres de tecnología"). Sigue
  dependiendo de que el modelo obedezca, cuando el dato correcto ya existe en la
  base. Pedirle a un LLM que reproduzca datos que ya tienes es gastar dinero para
  añadir incertidumbre.
- **Usar todas las skills del banco.** Listaría tecnologías que el CV no
  respalda, porque sus bullets no fueron seleccionados.
- **Mezclar keywords del LLM con tags curados.** Reintroduce las frases por la
  puerta de atrás y hace el resultado impredecible.
- **Normalizar los casi-duplicados** (`API Rest` / `APIs REST`, `Custom Plugin` /
  `Custom Plugins`, `Rendimiento` / `Performance`). Haría falta lematizar en dos
  idiomas y correría el riesgo de fusionar tecnologías distintas. Es vocabulario
  del usuario: se limpia desde `/bullets`.

## Consecuencias

**A favor**

- La sección tiene la forma que espera un ATS y un lector humano.
- Cero invención: las habilidades son texto que escribió el usuario, no salida
  del modelo.
- El orden sigue siendo sensible a la vacante, sin depender del LLM para ello.

**En contra**

- La calidad de la sección pasa a depender de que el usuario mantenga sus tags
  ordenados. Los duplicados y las mezclas ES/EN se ven en el resultado.
- Las `keywords` del LLM se siguen calculando y pagando, pero solo se usan como
  reserva. Podrían quitarse del prompt para ahorrar tokens; se mantienen de
  momento porque son la red de seguridad de un banco sin tags.
- El tope de 15 es un número elegido a ojo, sin datos de uso todavía.
