# JobFinder — PRD (Documento de Requisitos de Producto)

> Estado: **Planificación / Diseño** · Versión 0.1 · Fecha 2026-06-22
> Documento técnico complementario: [ARQUITECTURA.md](./ARQUITECTURA.md)

---

## 1. Visión y problema

Postular a muchas vacantes y recibir siempre el *"gracias, pero no"* no es un problema de
**volumen**: es un problema de **match, adaptación y medición**. Los ATS y reclutadores
penalizan las postulaciones genéricas, y sin datos de qué funciona, el error se repite a escala.

**JobFinder** es una herramienta **personal** que centraliza las vacantes que ya llegan al
correo y a las bolsas de empleo, las prioriza por afinidad real con el perfil, **adapta el CV y
la carta de presentación a fondo solo para las mejores**, y mide los resultados para mejorar el
*targeting* con el tiempo.

No es un bot de postulación masiva. Es un **copiloto de búsqueda de empleo de alta señal**.

## 2. Principio rector

> **Maximizar la tasa de respuesta por postulación, no el número de postulaciones.**

Tres consecuencias de diseño que atraviesan todo el producto:

1. **Calidad sobre volumen** — embudo que descarta barato y adapta caro solo el top.
2. **Legal y sostenible** — solo canales legítimos (correo + APIs oficiales). Nunca scraping de
   LinkedIn/Indeed ni auto-submit que arriesgue baneo. El resto, modo asistido.
3. **Todo se mide** — cada postulación es un dato. Las métricas cierran el bucle de mejora.

## 3. Objetivos y métricas de éxito (KPIs)

| Objetivo | Métrica | Meta inicial |
|---|---|---|
| Subir la tasa de respuesta | % de postulaciones con respuesta (no automática) | Duplicar el baseline actual |
| Conseguir más entrevistas | Entrevistas / 100 postulaciones | Tendencia creciente mes a mes |
| Reducir esfuerzo por vacante | Minutos desde "vacante detectada" → "paquete listo" | < 5 min |
| Enfocar el esfuerzo | % de postulaciones solo a vacantes con score alto | > 80% |
| Aprender qué funciona | Nº de hipótesis validadas (keyword/versión CV/rol) | ≥ 1 por mes |

> El **baseline** se mide en la Fase 1 cargando el histórico reciente de postulaciones.

## 4. Usuario / persona

- **Único usuario** (tú): perfil técnico, busca empleo activamente, bilingüe (ES/EN).
- Recibe **a diario** alertas de vacantes en una **cuenta Gmail dedicada** (distinta a la
  personal/de trabajo).
- Tiene **CV optimizado en ES e EN** (hoy en un documento) y cuentas en varias plataformas.
- Prioriza **no arriesgar sus cuentas** (sin baneos) por encima de la automatización total.

> El modelo de datos se diseña *multi-usuario-ready* (ver ARQUITECTURA §15), pero el alcance
> actual es de un solo usuario, local-first.

## 5. Alcance

### Dentro de alcance (MVP → v1)
- Perfil maestro estructurado + **banco de bullets** etiquetado por skill (ES/EN).
- Ingesta de vacantes desde **Gmail** (alertas) y **APIs oficiales** de bolsas.
- Normalización a un esquema único + **deduplicación**.
- **Embudo de matching híbrido por capas** (reglas → embeddings → LLM).
- **Adaptación de CV y carta** a fondo para el top, con guardrails anti-invención (ES/EN).
- Generación de documentos **ATS-friendly** (PDF y DOCX).
- **Postulación** automática solo por **correo** y **ATS con API**; resto **asistido**.
- **Tracking/CRM** de postulaciones + analítica + recordatorios de seguimiento.
- **Bucle de aprendizaje** que correlaciona resultados con features.

### Fuera de alcance (explícito)
- ❌ Scraping de LinkedIn/Indeed o cualquier sitio que lo prohíba en sus ToS.
- ❌ Auto-submit en "Easy Apply" / formularios que violen ToS (riesgo de baneo).
- ❌ Autorelleno por automatización de navegador (Playwright) como canal de envío.
- ❌ Inventar experiencia, títulos o métricas en CV/carta.
- ❌ Multi-tenant / SaaS público (se deja preparado, no se construye ahora).

## 6. Requisitos funcionales (RF)

### Módulo: Perfil y preferencias
- **RF-01** El sistema almacena un perfil maestro (datos de contacto, resúmenes ES/EN, enlaces).
- **RF-02** El sistema gestiona un **banco de bullets** con texto ES/EN, skills, categoría y métricas.
- **RF-03** El usuario configura **preferencias duras**: roles objetivo, seniority, ubicación,
  modalidad (remoto/híbrido/presencial), idioma, salario mínimo y *deal-breakers*.
- **RF-04** El usuario importa el CV existente (Google Docs/Drive o archivo) para poblar el perfil.

### Módulo: Ingesta
- **RF-05** El sistema lee, vía Gmail API (OAuth), los correos de alertas de empleo.
- **RF-06** El sistema extrae vacantes de los correos (título, empresa, enlace, descripción, etc.),
  con extracción robusta (LLM) tolerante a cambios de formato por remitente.
- **RF-07** El sistema consulta **APIs oficiales** de bolsas configuradas y trae vacantes.
- **RF-08** La ingesta corre de forma **programada** (p. ej. diaria) y bajo demanda.

### Módulo: Normalización
- **RF-09** Toda vacante se normaliza a un **esquema `Job` único**.
- **RF-10** El sistema **deduplica** vacantes equivalentes provenientes de varias fuentes.

### Módulo: Matching (embudo híbrido)
- **RF-11** **Capa 1 (reglas)**: descarta vacantes que no cumplen preferencias duras.
- **RF-12** **Capa 2 (embeddings)**: ordena por similitud semántica perfil↔vacante y toma top N.
- **RF-13** **Capa 3 (LLM)**: evalúa el top N con rúbrica → score, gaps, keywords faltantes y
  decisión (`apply` / `maybe` / `skip`) con justificación.
- **RF-14** El usuario revisa el ranking y puede forzar/descartar vacantes manualmente.

### Módulo: Adaptación de documentos
- **RF-15** Para vacantes `apply`, el sistema genera **CV adaptado** (reordena/reformula bullets
  reales, alinea keywords del JD) en el idioma de la vacante.
- **RF-16** El sistema genera una **carta de presentación** adaptada.
- **RF-17** Guardrails: el contenido nunca inventa hechos; solo selecciona/reformula los reales.
- **RF-18** Exporta documentos **ATS-friendly** en **PDF** y **DOCX**.

### Módulo: Postulación
- **RF-19** Para vacantes con **correo de aplicación**, el sistema redacta el correo con adjuntos
  y crea un **borrador en Gmail** (por defecto) o lo envía si el usuario lo habilita.
- **RF-20** Para **ATS con API** (p. ej. Greenhouse/Lever donde esté disponible), el sistema
  postula vía API.
- **RF-21** Para el resto (LinkedIn Easy Apply, Indeed, formularios propios), **modo asistido**:
  el sistema prepara el paquete + checklist y abre el enlace; el usuario aplica.
- **RF-22** Toda postulación (asistida o automática) se **registra** con su canal.

### Módulo: Tracking / Analítica
- **RF-23** El sistema mantiene el **estado** de cada postulación (preparada, enviada, acuse,
  rechazo, entrevista, oferta, etc.) con su línea de tiempo de eventos.
- **RF-24** El sistema detecta respuestas (incl. rechazos automáticos) leyendo el correo y
  actualiza estados.
- **RF-25** El sistema genera **recordatorios de seguimiento**.
- **RF-26** Dashboards: tasa de respuesta por **fuente**, **tipo de rol** y **versión de CV**.

### Módulo: Aprendizaje
- **RF-27** El sistema correlaciona resultados (respuesta/entrevista) con features (keywords,
  versión de CV, seniority, fuente) y sugiere ajustes de *targeting*.

## 7. Requisitos no funcionales (RNF)

- **RNF-01 Seguridad/Privacidad** — OAuth2 para Google (sin contraseñas); tokens y secretos
  cifrados en reposo; datos personales **local-first**; minimizar PII enviada al LLM.
- **RNF-02 Costo** — uso de LLM por niveles (Haiku→Sonnet→Opus), *prompt caching* y embudo para
  contener gasto; presupuesto diario con corte.
- **RNF-03 Rendimiento** — ingesta diaria de cientos de vacantes sin intervención; preparación de
  un paquete en < 5 min.
- **RNF-04 Escalabilidad** — añadir una fuente nueva = implementar una interfaz, sin tocar el core
  (open/closed); workers escalables horizontalmente.
- **RNF-05 Mantenibilidad** — arquitectura hexagonal, TypeScript estricto, pruebas, lint/format.
- **RNF-06 Observabilidad** — logs estructurados, métricas de negocio y de uso/costo de LLM.
- **RNF-07 Robustez** — el parsing de correos no debe romperse ante cambios de formato (LLM +
  validación con esquemas + pruebas por remitente).
- **RNF-08 Cumplimiento** — respetar ToS de cada plataforma; canales de envío solo legítimos.

## 8. Decisiones de producto tomadas

| # | Decisión | Elección | Implicación |
|---|---|---|---|
| D1 | Estrategia | **Híbrido por capas** | Embudo: filtrar masivo barato, adaptar a fondo el top. |
| D2 | Automatización de envío | **Email + APIs oficiales** | Auto solo en canales legítimos; resto asistido. Cero baneos. |
| D3 | Stack | **Node + TypeScript** | Monorepo TS, NestJS, Drizzle/Postgres, BullMQ, Claude. |
| D4 | Arranque | **Doc de arquitectura primero** | Diseño end-to-end antes de codear. |

## 9. Riesgos de producto y mitigaciones

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Términos de APIs cambian | Rotura de fuentes | Adapters aislados + verificación de términos al integrar. |
| Parsing de correos frágil | Vacantes perdidas | Extracción con LLM + validación Zod + pruebas por remitente. |
| Cobertura de envío por API limitada | Menos auto-postulación | Modo asistido como fallback de primera clase. |
| Costo LLM | Gasto inesperado | Embudo + modelos por nivel + caché + presupuesto con corte. |
| Sobreadaptación / keyword stuffing | Suena artificial | Guardrails de tono + revisión humana opcional. |

## 10. Roadmap por fases

> Cada fase entrega valor por sí sola. Orden por ROI y riesgo.

### Fase 1 — Perfil + Adaptación (mayor ROI, cero riesgo)
- Perfil maestro + banco de bullets (importar CV ES/EN).
- Generar CV + carta adaptados a un **JD pegado a mano**.
- Exportar PDF/DOCX ATS-friendly.
- Cargar histórico de postulaciones para fijar el **baseline**.
- **Criterio de aceptación**: dado un JD, el sistema produce CV+carta adaptados y descargables en
  ambos formatos, sin inventar datos.

### Fase 2 — Ingesta + Normalización + Matching
- Conexión Gmail + 1–2 APIs de bolsas.
- Normalización + dedup + embudo (reglas → embeddings → LLM).
- Bandeja priorizada de vacantes.
- **Criterio**: tras la ingesta diaria, el usuario ve un ranking con score y justificación.

### Fase 3 — Postulación asistida + Tracking + Analítica
- Borradores de correo / postulación por API / paquetes asistidos.
- CRM de postulaciones + detección de respuestas + recordatorios.
- Dashboards de tasa de respuesta.
- **Criterio**: cada postulación queda trazada y medible; el dashboard muestra tasas por fuente/rol/CV.

### Fase 4 — Aprendizaje + más fuentes
- Correlación resultados↔features y sugerencias de *targeting*.
- Nuevos adapters de fuentes/ATS.
- **Criterio**: el sistema sugiere al menos un ajuste accionable basado en datos propios.
