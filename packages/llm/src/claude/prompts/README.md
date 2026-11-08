# Claude Prompts — Versionado y Mantenimiento

## Estructura

Cada prompt es un archivo `.txt` que contiene:
1. **SYSTEM MESSAGE** — El role/contexto para Claude
2. **USER MESSAGE** — El mensaje específico del usuario (con placeholders)
3. **PARAMETERS** — temperature, max_tokens, etc.

## Prompts actuales

### `tailor-cv.txt` (v1.0)
**Propósito:** Seleccionar y reformular bullets del banco para alinearse con un JD.

**Variables placeholder:**
- `{JD_TEXT}` → Descripción de la vacante (full text)
- `{FULL_NAME}` → Nombre del candidato
- `{SUMMARY}` → Resumen del perfil en el idioma solicitado
- `{BULLETS_NUMBERED_LIST}` → Bullets numerados, solo en el idioma solicitado

**Salida esperada:** JSON con `selected_bullets`, `keywords`, `reasoning_summary`.

**Decisiones clave:**
- **Temperature 0.3**: Determinístico. Queremos SIEMPRE la mejor selección.
- **max_tokens 1000**: Lo mínimo para un JSON respuesta.
- **Enfasis CRÍTICO**: "NEVER invent" se menciona 4 veces para asegurar.

### `tailor-cover.txt` (v1.0)
**Propósito:** Generar una carta de presentación personalizada.

**Variables placeholder:**
- `{JD_TEXT}` → Descripción de la vacante
- `{FULL_NAME}` → Nombre candidato
- `{SUMMARY}` → Resumen del perfil
- `{BULLETS_SUMMARY}` → Resumen de skills/logros clave
- `{LANG}` → Idioma (es, en)

**Salida esperada:** Plain text (no JSON), carta de 250-400 palabras.

**Decisiones clave:**
- **Temperature 0.8**: Más creativa. Queremos tono natural, no mecánico.
- **max_tokens 1500**: Suficiente para una carta bien escrita.
- **Enfasis**: "Professional but warm", "Specific", "Confident".

---

## ¿Cómo cambiar un prompt?

### Paso 1: Hacer cambios en el archivo `.txt`
```
tailor-cv.txt  (v1.0)
↓
Editas el contenido...
↓
GUARDAR COMO: tailor-cv-v1.1.txt  (nuevo archivo, NO sobrescribir)
```

### Paso 2: Actualizar este README
Agrega una entrada a "CHANGELOG":

```markdown
## CHANGELOG

### v1.1 (2026-06-25)
- **Change**: Aumentado max_tokens de 1000 a 1200
- **Reason**: Algunos outputs se cortaban
- **Impact**: Costo +10%, pero better quality

### v1.0 (2026-06-24)
- Initial version
```

### Paso 3: Actualizar `claude/client.ts`
En la función que carga el prompt, especificar qué versión usar:

```typescript
const prompt = loadPromptFile('tailor-cv-v1.1.txt'); // ← cambiar versión
```

### Paso 4: Testear
- Correr tests con fixtures
- Verificar que output sigue siendo JSON válido
- Si cambias temperature, reevaluar determinismo

---

## Cómo probar prompts sin compilar

1. **Copiar prompt** de aquí
2. **Abrir Claude en navegador** (claude.ai)
3. **Pegar el prompt** con datos de prueba (fixtures)
4. **Evaluar la salida** en tiempo real
5. **Iterar** sin esperar a compilación

---

## Variables de entorno

Si un prompt necesita variables de .env (ej: presupuesto máximo):

```
{ENV_MAX_DAILY_BUDGET}  ← placeholder para .env
```

En el código:
```typescript
const prompt = loadPromptFile('tailor-cv.txt')
  .replace('{ENV_MAX_DAILY_BUDGET}', process.env.MAX_DAILY_BUDGET!);
```

---

## Mejores prácticas

1. **Versión siempre** — Nunca sobrescribas, siempre crea v1.1, v1.2, etc.
2. **Documenta cambios** — ¿Qué cambió? ¿Por qué? ¿Qué impacto?
3. **Testea antes** — Prueba con datos reales antes de rollout
4. **Preserva negativos** — Si algo funcionaba, NO lo saques sin razón
5. **Mide impacto** — Cambiaste temperature? Loguea tokens nuevos y compara costo

---

## Errores comunes

❌ **No hacer:**
```
tailor-cv.txt (cambio directo)
→ Sobrescriba versión anterior
→ No puedes volver atrás
```

✅ **Hacer:**
```
tailor-cv-v1.1.txt (new file)
→ Viejo v1.0 queda intacto
→ Puedes rollback fácil
```

---

## Roadmap de prompts (Futuro)

### Fase 2: `extract-jobs.txt`
Parsear emails y extraer vacantes. Usará Haiku (más barato).

### Fase 3: `score-job.txt`
Evaluar match entre perfil y vacante con rúbrica. Usará Sonnet.

### Fase 4: `feedback-summary.txt`
Generar feedback basado en resultados. Usará Sonnet.
