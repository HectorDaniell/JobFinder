# ADR-0023: Contención en vez de Jaccard para el guardrail anti-invención

> Estado: **Aceptado** · Fecha: 2026-08-04 · Reemplaza la métrica elegida en el Sprint 2

## Contexto

El guardrail anti-invención (`BulletOriginValidator`) comprueba que cada bullet
devuelto por el LLM provenga del banco autorizado del perfil. Se implementó con
**similitud Jaccard** de tokens: `|A ∩ B| / |A ∪ B|`, umbral 0.5.

En la **primera ejecución real contra Claude** (no cubierta por los tests, que
usaban reformulaciones muy cercanas al original) rechazó cuatro bullets
legítimos con similitudes del 39–44%. Uno de ellos era casi idéntico a su
original, con solo una coma de diferencia.

La causa es de fondo: **Jaccard es simétrico**. Penaliza que los textos tengan
distinta longitud o vocabulario — exactamente lo que produce una reformulación.
Y el prompt le PIDE a Claude que reformule. La métrica peleaba contra la
instrucción del sistema.

Medido con bullets reales:

| Caso | Jaccard | Contención |
|---|---|---|
| Reformulaciones legítimas | 40–73% | 63–85% |
| Bullet inventado | 0% | 0% |

Con umbral 0.5, Jaccard corta **dentro** del rango legítimo.

## Decisión

Usar el **coeficiente de solapamiento (contención)**: `|A ∩ B| / min(|A|, |B|)`,
manteniendo el umbral 0.5.

La pregunta correcta no es *"¿se parecen?"* (simétrica) sino *"¿esto SALE de
aquello?"* (direccional). Al dividir por el conjunto más pequeño, comprimir o
ampliar el texto no penaliza; lo que se mide es cuánto vocabulario compartido se
conserva.

Como la contención puede inflarse con textos muy cortos (pocos tokens, todos
coincidentes), se sube el mínimo por bullet en el schema de salida de 10 a **40
caracteres**: un logro de CV es una frase, no un fragmento.

## Alternativas descartadas

- **Bajar el umbral de Jaccard a ~0.35**: dejaría pasar reformulaciones, pero
  estrecha el margen frente a invenciones reales; trata el síntoma, no la causa.
- **Quitar el guardrail**: es la garantía central del producto (RF-17: nunca
  inventar datos). No es negociable.
- **Embeddings (similitud coseno)**: más preciso y ya previsto para la Fase 2,
  pero añade una llamada de red y coste por validación. La contención resuelve
  el problema hoy sin dependencias.

## Consecuencias

- Las reformulaciones legítimas dejan de rechazarse; las invenciones se siguen
  detectando con margen amplio (0% frente al umbral del 50%).
- La interfaz de `BulletOriginValidator.validate` **no cambia**: sustituir esto
  por embeddings en la Fase 2 sigue siendo un cambio interno.
- Se añadió un test de regresión con una reformulación libre (el caso real que
  falló), además del que ya existía con una reformulación cercana.
- Lección: los tests usaban un caso demasiado favorable. Un guardrail hay que
  probarlo cerca de su frontera, no solo en el centro de cada lado.
