# JobFinder — Cómo funciona, de punta a punta

Guía visual del recorrido completo: desde que haces clic en el navegador hasta que
se descarga un PDF. Complementa a [ARQUITECTURA.md](./ARQUITECTURA.md) (el diseño)
con el **flujo real** de la Fase 1.

---

## 1. El mapa: quién habla con quién

```mermaid
flowchart TB
    U([👤 Tú])

    subgraph NAV["🌐 Navegador"]
        WEB["<b>apps/web</b> · Next.js<br/>pantallas + estado de UI"]
    end

    subgraph SRV["🖥️ Tu máquina (Node)"]
        API["<b>apps/api</b> · NestJS + Fastify<br/>valida · orquesta · traduce errores"]
        CORE["<b>packages/core</b><br/>entidades · puertos · casos de uso"]
        DB_P["<b>packages/db</b><br/>Drizzle"]
        LLM_P["<b>packages/llm</b><br/>Claude + guardrails"]
        DOC_P["<b>packages/documents</b><br/>PDF · DOCX"]
    end

    subgraph EXT["☁️ Fuera"]
        PG[("PostgreSQL<br/>:5433")]
        CLAUDE["API de Anthropic"]
    end

    U -->|clics| WEB
    WEB <-->|"HTTP + JSON<br/>(CORS)"| API
    API --> CORE
    API --> DB_P
    CORE -.->|puertos| LLM_P
    CORE -.->|puertos| DOC_P
    DB_P --> PG
    LLM_P --> CLAUDE

    style CORE fill:#065f46,stroke:#34d399,color:#fff
    style U fill:#1e293b,color:#fff
```

**La clave:** `core` está en el centro y **no conoce a nadie**. Los demás dependen
de él, nunca al revés. Las flechas punteadas son *puertos*: `core` define el
contrato (`LlmPort`, `DocumentPort`) y los packages lo implementan.

---

## 2. El flujo estrella: generar un CV adaptado

Lo que ocurre al pulsar **"Generar CV y carta"**:

```mermaid
sequenceDiagram
    autonumber
    participant U as 👤 Tú
    participant W as apps/web
    participant P as ZodValidationPipe
    participant C as TailorController
    participant UC as TailorDocuments<br/>(core)
    participant DB as ProfileRepository
    participant L as ClaudeAdapter
    participant D as DocumentAdapter
    participant F as DomainExceptionFilter

    U->>W: pega la oferta y pulsa Generar
    W->>C: POST /profiles/:id/tailor
    Note over W,C: lib/api.ts — el único sitio que habla HTTP

    C->>P: el body pasa primero por el pipe
    alt datos inválidos
        P-->>F: ValidationError (400)
        F-->>W: { error: { code, message, field } }
        W-->>U: marca el input exacto en rojo
    end

    P->>C: dto ya validado y tipado
    C->>C: buildJob() — arma un Job "manual"
    C->>UC: execute({ profileId, job, lang, formats })

    UC->>DB: findById(profileId)
    alt no existe
        DB-->>F: NotFoundError (404)
    end
    DB-->>UC: Profile

    par en paralelo (ahorra ~la mitad del tiempo)
        UC->>L: tailorCv(job, profile, lang)
        L-->>UC: TailoredCv
    and
        UC->>L: tailorCoverLetter(job, profile, lang)
        L-->>UC: texto de la carta
    end
    Note over L: selecciona bullets REALES del banco<br/>guardrails: nunca inventa

    loop por cada formato (pdf, docx)
        UC->>D: generateCv(...) y generateCoverLetter(...)
        D-->>UC: DocumentArtifact { bytes, mimeType, filename }
    end

    UC-->>C: { cv, coverLetter, files }
    C->>C: bytes → base64 (JSON no transporta binario)
    C-->>W: 200 + JSON
    W-->>U: preview en tabs + botones de descarga
```

### Y al pulsar "descargar": el camino inverso

```mermaid
flowchart LR
    A["base64<br/><i>(string en el JSON)</i>"] -->|atob| B["binary string"]
    B -->|charCodeAt| C["Uint8Array<br/><i>bytes reales</i>"]
    C -->|new Blob| D["Blob<br/><i>+ mimeType</i>"]
    D -->|createObjectURL| E["blob: URL"]
    E -->|"&lt;a download&gt;"| F["📄 archivo en tu disco"]
```

Es el **espejo exacto** de lo que hizo la API: `Buffer.from(bytes).toString('base64')`.

---

## 3. Las dos formas de usar los packages

No todos los endpoints tienen la misma forma, y la diferencia importa:

```mermaid
flowchart TB
    subgraph SIMPLE["CRUD simple — sin orquestación"]
        direction LR
        C1[Controller] -->|"llama directo"| R1[(Repository)]
    end

    subgraph COMPLEJO["Operación compleja — con orquestación"]
        direction LR
        C2[Controller] --> UC[TailorDocuments<br/><i>caso de uso en core</i>]
        UC --> R2[(Repository)]
        UC --> LLM[LlmPort]
        UC --> DOC[DocumentPort]
    end
```

| | Cuándo | Ejemplo |
|---|---|---|
| **Sin caso de uso** | validar → repo → responder | `POST /profiles`, CRUD de bullets |
| **Con caso de uso** | coordinar varios puertos + reglas de negocio | `POST /tailor` |

Un "service" que solo reenvía al repositorio es una capa vacía. Por eso el CRUD
llama al repositorio directamente, y solo el tailoring tiene caso de uso — que
además vive en `core`, para que mañana el `worker` pueda reutilizarlo.

---

## 4. El viaje de un error (lo que hace la app predecible)

Un error nace en el dominio y llega al usuario como una **acción**, no como un 500:

```mermaid
flowchart LR
    A["ClaudeAdapter<br/>banco vacío"] -->|throw| B["ProfileHasNoBulletsError<br/><i>extiende DomainError</i><br/>statusCode 422"]
    B --> C{{"DomainExceptionFilter<br/><i>@Catch(DomainError)</i>"}}
    C -->|"HTTP 422"| D["{ error: { code:<br/>'PROFILE_HAS_NO_BULLETS' } }"]
    D --> E["ApiError<br/><i>espejo en el cliente</i>"]
    E --> F["Panel: 'Tu banco está vacío'<br/>+ botón → /bullets"]

    style B fill:#7f1d1d,color:#fff
    style F fill:#065f46,color:#fff
```

El mismo mecanismo cubre: `400` validación (marca el campo), `404` no encontrado,
`409` email duplicado, `429` rate limit, `504` timeout. **Un solo filtro** para
todos, porque cada error ya trae su `statusCode` y su `code` desde `core`.

---

## 5. Las pantallas y sus guardas

```mermaid
flowchart TD
    START(["/"]) --> Q{¿hay profileId<br/>en localStorage?}
    Q -->|no| SETUP["/setup<br/>wizard 3 pasos"]
    Q -->|sí| TAILOR["/tailor<br/>★ home del día a día"]

    SETUP -->|"POST /profiles<br/>+ guarda el id"| BULLETS["/bullets<br/>banco de logros"]
    BULLETS --> TAILOR
    TAILOR -->|"sin bullets (422)"| BULLETS
    TAILOR --> DL["📄 PDF + DOCX"]

    NAV["Header: Tailor · Bullets · Perfil"] -.-> TAILOR
    NAV -.-> BULLETS
    NAV -.-> PROFILE["/profile<br/>ver + editar preferencias"]

    style TAILOR fill:#065f46,color:#fff
    style DL fill:#1e293b,color:#fff
```

`/setup` no está en el menú: solo se llega si no hay perfil. Las guardas viven en
cada pantalla y dependen del `profileId` (Context + localStorage).

---

## 6. Dónde vive cada tipo de estado (frontend)

```mermaid
flowchart TB
    subgraph S["🗄️ Estado de servidor"]
        S1["perfil · bullets · resultado del tailor<br/><i>fuente de verdad: PostgreSQL</i><br/>se pide con lib/api.ts, no se duplica"]
    end
    subgraph G["🌍 Global de cliente"]
        G1["profileId → Context + localStorage<br/>tema → clase CSS en &lt;html&gt;"]
    end
    subgraph L["🧩 Local de UI"]
        L1["borrador de formulario · tab activo · 'cargando'<br/><i>useState donde se usa</i>"]
    end
```

Sin Redux: la app tiene exactamente **dos** datos globales de cliente. El tema ni
siquiera pasa por React — cambia una clase y la cascada CSS repinta todo.

---

## 7. Qué está construido y qué no

```mermaid
flowchart LR
    F1["① Fuentes<br/>Gmail · APIs"]:::todo --> F2["② Normalización<br/>+ dedup"]:::todo
    F2 --> F3["③ Matching<br/>reglas→embeddings→LLM"]:::todo
    F3 --> F4["④ Tailoring<br/>CV + carta"]:::done
    F4 --> F5["⑤ Revisión<br/>la UI"]:::done
    F5 --> F6["⑥ Postulación<br/>borrador Gmail · ATS"]:::todo
    F6 --> F7["⑦ Tracking<br/>+ aprendizaje"]:::todo

    classDef done fill:#065f46,stroke:#34d399,color:#fff
    classDef todo fill:#27272a,stroke:#52525b,color:#a1a1aa
```

En la Fase 1 las etapas ① a ③ se sustituyen por **pegar la oferta a mano**: es el
flujo real de esta fase, no un atajo de pruebas. La Fase 2 construye la ingesta
para que las vacantes lleguen solas.
