# JobFinder — Guía de instalación y setup

> Última actualización: 2026-07-31 · Arquitectura: Node + TypeScript + Docker + Postgres

---

## ⚡ Quick Start (después del primer setup)

Ya hiciste el setup inicial? Aquí está el flujo rápido día a día:

```bash
# 1. Levanta BD + Redis
docker compose up -d

# 2. Levanta las 3 apps (en 3 terminales distintas)
pnpm run dev:api       # Terminal 1
pnpm run dev:worker    # Terminal 2
pnpm run dev:web       # Terminal 3

# 3. Abre http://localhost:3000 en el navegador
```

**Al terminar el día:**
```bash
docker compose down    # Apaga BD + Redis (datos se guardan)
```

Eso es todo. Mañana repites los 2 primeros pasos.

---

## 1. Requisitos previos

### Obligatorio

- **Docker Desktop** (incluye Docker Engine + Docker Compose)
  - Windows: https://www.docker.com/products/docker-desktop (elige Windows Native)
  - Instalas, inicias la app, y listo. Toma ~5 min la primera vez.
  
- **Node.js 22 LTS**
  - https://nodejs.org (descarga LTS)
  - Verifica: `node --version` y `npm --version` en la terminal.

- **pnpm** (gestor de paquetes)
  - `npm install -g pnpm`
  - Verifica: `pnpm --version`

### Opcionales

- **DBeaver Community** o **TablePlus** (cliente visual de Postgres)
  - Para inspeccionar datos sin terminal. Recomendado para aprender.
- **Git** (para clonar el repo, pero si tienes este archivo ya lo tienes).

---

## 2. Instalación paso a paso

### 2.1 Clonar el repositorio (si no lo has hecho)

```bash
git clone <url-del-repo> jobfinder
cd jobfinder
```

### 2.2 Instalar dependencias

```bash
pnpm install
```

Esto descarga todas las librerías que el proyecto necesita (NestJS, Next.js, Drizzle, etc.).
Toma 3–5 minutos la primera vez. Es seguro hacer esto múltiples veces.

### 2.3 Crear el archivo `.env` en la raíz del proyecto

Copia el contenido de abajo en un archivo llamado `.env` en la carpeta `jobfinder/`:

```bash
# ============ DATABASE ============
# OJO: puerto 5433, no 5432 — el contenedor se publica en 5433 para no chocar
# con otros Postgres de tu máquina (ver docker-compose.yml).
DATABASE_URL="postgresql://jobfinder:localdev@localhost:5433/jobfinder"

# ============ REDIS ============
REDIS_URL="redis://localhost:6379"

# ============ ANTHROPIC (LLM RAZONAMIENTO) ============
ANTHROPIC_API_KEY="sk-ant-v4-..." # Tu API key de Anthropic (https://console.anthropic.com)
# Desarrollo sin créditos: sustituye SOLO la llamada a Claude por un doble local.
# El resto (perfil, bullets, PDF/DOCX) sigue siendo real. Ver docs/adr/0022.
USE_FAKE_LLM="false"

# ============ VOYAGE AI (EMBEDDINGS) ============
VOYAGE_API_KEY="pa-..." # Tu API key de Voyage (https://www.voyageai.com)

# ============ GOOGLE OAuth (Gmail + Docs) ============
# Necesita configuración en Google Cloud Console; ver sección 3.3
GOOGLE_CLIENT_ID="xxxxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-xxxxx"
GOOGLE_REDIRECT_URI="http://localhost:3000/auth/callback" # Durante desarrollo local

# ============ APP CONFIG ============
NODE_ENV="development"
API_PORT=3001
FRONTEND_PORT=3000

# ============ MONEDA Y PRESUPUESTO LLM (opcional) ============
LLM_DAILY_BUDGET_USD=5 # Corte automático de llamadas LLM si se excede por día
```

**Importante:**
- **No commites el `.env` a Git** (ya está en `.gitignore`).
- Los valores son ejemplos; reemplaza con tus keys reales.
- Si una API key falta, esa funcionalidad se desactiva (con log de aviso), pero la app sigue corriendo.

---

## 3. Obtener las API keys

### 3.1 Anthropic (Claude)

1. Ve a https://console.anthropic.com
2. Crea una cuenta o inicia sesión.
3. En el menu lateral, **API Keys** → **Create Key**.
4. Copia la key (comienza con `sk-ant-`) y pégala en `ANTHROPIC_API_KEY` en el `.env`.
5. Activa **billing** en la consola (para que tengas saldo para llamadas).

**Costo:** pagas por tokens usados (muy barato con el embudo). ~$0.30/mes a escala de prueba.

### 3.2 Voyage AI (embeddings)

1. Ve a https://www.voyageai.com
2. Crea una cuenta (soporta Google login).
3. Dashboard → **API Keys** → **Create New API Key**.
4. Copia y pega en `VOYAGE_API_KEY`.
5. Ten $10 de crédito gratis iniciales.

**Costo:** $0.02 por 1M tokens de entrada. A ~100 vacantes/mes, ~$0.50/mes.

### 3.3 Google OAuth (Gmail + Google Docs)

Este es el más largo porque Google requiere verificación. **Dos opciones:**

#### Opción A — Testing / Desarrollo local (rápido, sin verificación)

**Si solo lo usas tú en tu máquina:**

1. Ve a https://console.cloud.google.com
2. Crea un nuevo proyecto (p. ej. "JobFinder").
3. Busca **APIs de Google** y **habilita:**
   - Gmail API
   - Google Docs API
   - Google Drive API
4. En **Credenciales**, crea un **OAuth 2.0 ID de cliente** → tipo **Web application**.
5. URIs autorizados:
   - `http://localhost:3000`
   - `http://localhost:3000/auth/callback`
6. Descarga el JSON → copia `client_id` y `client_secret` al `.env`.
7. En **Pantalla de consentimiento OAuth**, añádete como usuario de prueba (tú mismo).

**Esto permite que TÚ uses la app localmente sin que Google exija verificación.** Es el setup para desarrollo.

#### Opción B — Producción multi-usuario (largo, requiere verificación de Google)

**Si quieres abrirlo a terceros después:**

Necesitarás una auditoría de seguridad de terceros (caro, ~$1000–5000) y verificación de Google (puede tardar semanas). **No lo hagas ahora.** Lo dejas para la Fase 5 (multi-tenant).

---

## 4. Levantar la aplicación

### 4.1 Iniciar Docker (base de datos + Redis)

```bash
docker compose up -d
```

Verifica que corre:
```bash
docker compose ps
```

Deberías ver tres contenedores:
```
NAME            STATUS
jobfinder-db    Up ...
jobfinder-redis Up ...
```

> Si algo falla, revisa que **Docker Desktop esté abierto** y corriendo.

### 4.2 Crear la base de datos y aplicar migraciones (SOLO LA PRIMERA VEZ)

```bash
pnpm run migrate
```

Esto crea las tablas (job, profile, bullet, etc.) en Postgres. **Salida esperada:**
```
✓ Migration completed: 0001_create_tables.sql
```

**Importante:** Ejecuta esto **UNA SOLA VEZ**. Los días siguientes, ya no lo necesitas (las tablas ya existen).

Solo vuelves a ejecutarlo si:
- Borraste la BD: `docker compose down -v`
- Hay nuevas migraciones en el repositorio (alguien escribió cambios al schema)

### 4.3 Levantar las apps (dos opciones)

#### Opción A — Tres terminales (recomendado para desarrollo)

**Terminal 1 — Backend (API):**
```bash
pnpm run dev:api
```
Espera hasta ver:
```
[Nest] ... - 06/22/2026, 10:30:00 AM     LOG [NestFactory] Application successfully started
[Nest] ... Listening on port 3001
```

**Terminal 2 — Background processor (Worker):**
```bash
pnpm run dev:worker
```
Espera hasta ver:
```
[Worker] Starting job processor...
[Worker] Connected to Redis
```

**Terminal 3 — Frontend (Web):**
```bash
pnpm run dev:web
```
Espera hasta ver:
```
Ready in 2.5s
```

Luego abre tu navegador en: **http://localhost:3000**

**Ventajas:** Logs separados por app, hot-reload en cada una, fácil de debuguear.

#### Opción B — Una terminal, paralelo

```bash
pnpm run dev
```

Esto levanta las 3 apps en paralelo en una sola terminal.

**Ventajas:** Una sola terminal.
**Desventajas:** Logs mezclados, difícil de debuguear.

---

## 5. Verificación de que todo corre

Una vez levantados los tres procesos (api, worker, web), verifica:

### 5.1 Frontend

- Abre http://localhost:3000 en el navegador.
- Deberías ver la página de inicio (aunque esté vacía sin datos).

### 5.2 API

```bash
curl http://localhost:3001/health
```

Respuesta esperada:
```json
{"status":"ok","timestamp":"2026-06-22T..."}
```

### 5.3 Base de datos

Abre **DBeaver** (si lo instalaste) y conecta a Postgres:
- Host: `localhost`
- Port: `5433`
- Database: `jobfinder`
- User: `jobfinder`
- Password: `localdev`

Verás las tablas creadas (job, profile, bullet, etc.).

Alternativa sin cliente GUI:
```bash
docker exec -it jobfinder-db psql -U jobfinder -d jobfinder -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public';"
```

---

## 6. Estructura del `.env` en detalle

| Variable | Qué es | Obligatoria | Cómo obtenerla |
|---|---|---|---|
| `DATABASE_URL` | Conexión a Postgres | ✅ Sí (default corre) | Generada automáticamente por Docker |
| `REDIS_URL` | Conexión a Redis | ✅ Sí (default corre) | Generada automáticamente por Docker |
| `ANTHROPIC_API_KEY` | API key de Claude | ✅ Sí (para usar LLM) | https://console.anthropic.com |
| `VOYAGE_API_KEY` | API key de embeddings | ✅ Sí (para matching) | https://www.voyageai.com |
| `GOOGLE_CLIENT_ID` | OAuth de Google | ✅ Sí (para Gmail/Docs) | Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Secret de OAuth | ✅ Sí | Google Cloud Console |
| `GOOGLE_REDIRECT_URI` | Callback OAuth | ✅ Sí | Siempre `http://localhost:3000/auth/callback` en dev |
| `NODE_ENV` | Entorno | ⚠️ Recomendado | `development` en local |
| `API_PORT` | Puerto backend | ⚠️ Opcional | Default `3001` |
| `FRONTEND_PORT` | Puerto frontend | ⚠️ Opcional | Default `3000` |
| `LLM_DAILY_BUDGET_USD` | Presupuesto diario | ⚠️ Opcional | Default `10` (USD) |

---

## 7. Backup y restauración de la BD (para cambiar de máquina)

### Hacer un backup

```bash
# Genera un archivo .sql con toda la BD
docker exec jobfinder-db pg_dump -U jobfinder jobfinder > backup_jobfinder.sql
```

Guarda el archivo `backup_jobfinder.sql` en un lugar seguro (o en el repo, si quieres).

### Restaurar en otra máquina

1. Clonas el repo en la otra máquina.
2. `pnpm install`
3. Levantas Docker: `docker compose up -d`
4. Aplicas el backup:
   ```bash
   docker exec -i jobfinder-db psql -U jobfinder jobfinder < backup_jobfinder.sql
   ```
5. Levantas los procesos como en la sección 4.

**Listo.** Tu BD, datos y todo, están en la otra máquina idénticos.

---

## 8. Troubleshooting

### "Docker command not found"

Docker no está instalado o no inició. Abre la app **Docker Desktop** manualmente y espera a que diga "Docker is running".

### "Cannot connect to database"

```bash
docker compose logs db
```

Ve si Postgres levantó sin errores. Si falló, puede ser que otro proceso tenga el puerto 5433
ocupado. Si el error aparece solo al usar la app (y no al arrancar), revisa que `DATABASE_URL`
apunte al **5433**: `postgres-js` conecta de forma perezosa, así que un puerto mal puesto no
falla al arrancar, sino en la primera consulta. Intenta:
```bash
docker compose down
docker volume rm jobfinder_pgdata  # Borra los datos (solo si quieres empezar limpio)
docker compose up -d
```

### "ANTHROPIC_API_KEY is missing"

La app arranca pero los features que usan Claude no funcionan. Agregá la key al `.env` y reinicia el API:
```bash
# Ctrl+C en la terminal de api
pnpm run dev:api
```

### "Port 3000 is already in use"

Otro proceso ocupa el puerto. O cambiás en el `.env`:
```bash
FRONTEND_PORT=3001  # Usa otro puerto
```

O matas el proceso:
```bash
# En Windows (PowerShell):
Get-Process | Where-Object { $_.Port -eq 3000 }  # Identifica
Stop-Process -Id <PID> -Force

# En Mac/Linux:
lsof -i :3000 | grep LISTEN | awk '{print $2}' | xargs kill
```

### "Migration failed"

```bash
docker compose logs db
pnpm run migrate --verbose
```

Si la BD está corrupta, borrá y empezá de nuevo:
```bash
docker compose down
docker volume rm jobfinder_pgdata
docker compose up -d
pnpm run migrate
```

---

## 9. Cómo levantar las apps durante desarrollo

### Lo recomendado durante sprints 1–5:

```bash
# Levanta solo BD + Redis en Docker
docker compose up -d

# Levanta las 3 apps en tu máquina (en 3 terminales):
# Terminal 1:
pnpm run dev:api

# Terminal 2:
pnpm run dev:worker

# Terminal 3:
pnpm run dev:web
```

**Ventajas:**
- ✅ Hot-reload: cambias código, se recarga automático
- ✅ Logs separados (fácil de debuguear)
- ✅ Rápido en desarrollo

### Alternativa: Todo en paralelo (una terminal)

```bash
docker compose up -d
pnpm run dev   # Levanta API + Worker + Web juntas
```

**Desventajas:** Logs mezclados, difícil de debuguear.

### Para producción: Todo en Docker

```bash
docker compose -f docker-compose.prod.yml up
```

(Se configurará más adelante cuando sea necesario desplegar.)

---

## 10. Próximos pasos después del setup

1. ✅ Verificar que todo corre (sección 5).
2. ✅ Leer [PRD.md](./PRD.md) para entender el plan.
3. ✅ Leer [ARQUITECTURA.md](./ARQUITECTURA.md) para entender el diseño.
4. 🚀 **Usar la app** (la Fase 1 ya está construida):
   - http://localhost:3000 → crea tu perfil (3 pasos).
   - Carga tu banco de bullets.
   - Pega una oferta en la pantalla *Tailor* → descarga el CV y la carta en PDF/DOCX.
   - Sin `ANTHROPIC_API_KEY`, pon `USE_FAKE_LLM="true"` para recorrer el flujo
     igualmente (los documentos generados son reales).
5. 📈 Ver [PROGRESS.md](./PROGRESS.md) para el estado y lo que viene (Fase 2: ingesta).

> Nota: el **worker** todavía es un esqueleto (se usará en la Fase 2 para la ingesta
> programada). Para la Fase 1 basta con `dev:api` y `dev:web`.

---

## 11. Notas de seguridad

- **Nunca commitees `.env` a Git.** Está en `.gitignore`; si lo ves en el historio, es un error.
- **Usa contraseñas fuertes para Google OAuth** y **limita scopes** al mínimo (Gmail, Docs, Drive; no `admin`).
- **Activa billing en Anthropic y Voyage**, pero **establece alertas** para controlar gasto.
- **En producción (si la abres al público)**, usa Postgres gestionado (p. ej. AWS RDS) y secrets en un vault (p. ej. AWS Secrets Manager, HashiCorp Vault).

---

## 12. Soporte

Si algo no funciona:

1. Revisa que **Docker Desktop esté abierto**.
2. Revisa que **Node 22 LTS y pnpm estén instalados**.
3. Revisa que **todas las API keys estén en el `.env`** (sin espacios extras).
4. Revisa los logs: `docker compose logs -f` para DB/Redis, `pnpm run dev:api` etc. para app logs.
5. Si sigue sin funcionar, borra todo y empezá limpio:
   ```bash
   docker compose down -v   # -v borra volúmenes
   pnpm install
   pnpm run migrate
   ```
