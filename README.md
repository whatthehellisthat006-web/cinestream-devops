# CineStream — DevOps Pipeline & Infrastructure

Containerized full-stack Video-on-Demand (VOD) streaming platform (**Angular 22** + **Spring Boot 3.2.5 / Java 17** + **MySQL 8.0**) equipped with an end-to-end DevOps lifecycle: Git workflow, Bash validation, Docker multi-stage builds, Docker Compose orchestration, GitHub Actions CI/CD (Java 17 & 21 matrix), immutable GHCR releases (`vX.Y.Z`), staging deployment, healthchecks, and verifiable rollback.

---

## Quick Start (One Command)

Prerequisites: **Docker Desktop** running.

```bash
docker compose up -d
```

Wait ~30 seconds on first boot (MySQL automatically initializes `cinestream_db` with 15 tables and 32 movies/series), then open:

- **Application (Frontend):** http://localhost:4200
- **Backend Healthcheck:** http://localhost:8081/actuator/health
- **Backend Version Info:** http://localhost:8081/actuator/info

**Demo accounts (seeded automatically):**
- Admin: `admin@cinestream.com` / `Admin123!`
- User: `user@cinestream.com` / `User123!`

To stop the stack (preserving database data in the named volume):
```bash
docker compose down
```

---

## Architecture Overview

| Service | Image / Base | User | Port | Healthcheck |
|---|---|---|---|---|
| **db** | `mysql:8.0.40` | `mysql` | Internal only (`3306` **not** published) | `mysqladmin ping` |
| **backend** | `eclipse-temurin:17-jre-alpine` (built with `maven:3.9.9-eclipse-temurin-17-alpine`) | `appuser` (non-root) | `8081:8081` | `GET /actuator/health` |
| **frontend** | `nginxinc/nginx-unprivileged:1.27-alpine` (built with `node:24.15.0-alpine`) | `nginx` (non-root) | `4200:8080` | `GET http://127.0.0.1:8080/` |

- All containers communicate on an isolated bridge network (`cinestream-net`).
- `backend` connects to MySQL via the Compose service name **`db`** (`jdbc:mysql://db:3306/cinestream_db`) and only starts once `db` is `healthy`.
- `frontend` (Nginx) serves the Angular SPA and reverse-proxies `/api/*` to `http://backend:8081/api/*`.
- Database state persists in the named Docker volume `cinestream_db_data`.
- Secrets are externalized via environment variables (see `.env.example`; `.env` is gitignored).

---

## Validation & Automated Tests (Atelier 2)

Run the Bash control script (returns exit code `0` on success, `1` on failure):

```bash
bash scripts/validate.sh
```

It checks required project files, Git/secrets hygiene, `frontend/package.json` validity, and executes the backend JUnit 5 test suite (`mvn test`).

---

## CI/CD Pipelines (GitHub Actions — Atelier 5)

1. **Continuous Integration ([`.github/workflows/ci.yml`](.github/workflows/ci.yml))** — triggered on every Pull Request to `main`:
   - Runs `scripts/validate.sh` and Maven unit tests across a **Java 17 & Java 21 matrix**.
   - Uploads Maven Surefire XML test reports as downloadable workflow artifacts (`if: always()`).
   - Builds backend and frontend Docker images **only after** tests pass (`needs: test`).
   - Protected `main` branch prevents merging if any check fails.
2. **Release & Staging Auto-Deploy ([`.github/workflows/release.yml`](.github/workflows/release.yml))** — triggered on semantic tags `vX.Y.Z`:
   - Enforces **immutability** (fails if `vX.Y.Z` already exists in GHCR).
   - Publishes `ghcr.io/whatthehellisthat006-web/cinestream-backend:vX.Y.Z` and `cinestream-frontend:vX.Y.Z`.
   - Automatically deploys the published tag to staging (`docker-compose.staging.yml`) and verifies `/actuator/health` and frontend HTTP status.

---

## Staging Deployment & Rollback

Staging uses [docker-compose.staging.yml](docker-compose.staging.yml) with **pre-published immutable GHCR images only** (no `build:` section):

```bash
# Deploy v1.1.0 from GHCR and verify health
bash scripts/deploy-staging.sh v1.1.0
curl http://localhost:8081/actuator/info

# Roll back to v1.0.0 (no rebuild, persistent DB untouched)
bash scripts/deploy-staging.sh v1.0.0
```

See [docs/ARCHITECTURE_AND_ROLLBACK.md](docs/ARCHITECTURE_AND_ROLLBACK.md) for the complete 1-page architecture, deployed version, and rollback sheet.
