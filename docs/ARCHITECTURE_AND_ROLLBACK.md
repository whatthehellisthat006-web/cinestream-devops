# CineStream — Architecture, Version Déployée & Procédure de Rollback

**Projet de fin de module DevOps (L3 DSI — ISET)**  
**Dépôt GitHub :** https://github.com/whatthehellisthat006-web/cinestream-devops

---

## 1. Architecture Globale

CineStream est une plateforme web de location et streaming vidéo conteneurisée en 3 services isolés sur un réseau Docker privé (`cinestream-net` / `cinestream-staging-net`) :

```
  Navigateur (http://localhost:4200)
          │
          ▼
  ┌──────────────────────────────────────────────────────┐
  │  frontend (Nginx unprivileged :8080, user: nginx)    │
  │  - Sert le bundle Angular 22                         │
  │  - Reverse-proxy /api/*  ──►  http://backend:8081    │
  └──────────────────────────┬───────────────────────────┘
                             │ (nom de service Docker)
                             ▼
  ┌──────────────────────────────────────────────────────┐
  │  backend (Spring Boot 3.2.5 / Java 17, user: appuser)│
  │  - API REST + JWT + Actuator (/actuator/health,info) │
  │  - Démarre uniquement quand db est "healthy"         │
  └──────────────────────────┬───────────────────────────┘
                             │ jdbc:mysql://db:3306/cinestream_db
                             ▼
  ┌──────────────────────────────────────────────────────┐
  │  db (mysql:8.0.40 — port 3306 NON exposé à l'hôte)   │
  │  - Volume persistant : cinestream_db_data            │
  │  - Initialisation auto : schema.sql + data.sql       │
  └──────────────────────────────────────────────────────┘
```

**Points clés de sécurité et qualité :**
- Aucune image `:latest` (tags explicites partout : `mysql:8.0.40`, `maven:3.9.9-eclipse-temurin-17-alpine`, `eclipse-temurin:17-jre-alpine`, `node:24.15.0-alpine`, `nginxinc/nginx-unprivileged:1.27-alpine`).
- Conteneurs applicatifs exécutés avec des **utilisateurs non-root** (`appuser` UID 100 et `nginx` UID 101).
- Port MySQL **non publié** à l'extérieur ; connexion uniquement par le nom de service `db`.
- Aucun secret versionné dans Git (variables externalisées via `.env.example`, `.env` ignoré dans `.gitignore`).
- Pipeline CI GitHub Actions sur chaque Pull Request : script Bash `scripts/validate.sh`, tests JUnit 5 en **matrice Java 17 et Java 21**, rapports Surefire en artefacts, build Docker conditionné par `needs: test`, et **protection de la branche `main`**.

---

## 2. Version Déployée (Images Immuables GHCR)

Chaque tag Git sémantique (`vX.Y.Z`) déclenche automatiquement `.github/workflows/release.yml`, qui vérifie que le tag n'existe pas déjà dans GHCR (immutabilité), publie les deux images et exécute un déploiement staging + contrôle de santé :

- **Version courante (stable) :** `v1.1.0`
  - `ghcr.io/whatthehellisthat006-web/cinestream-backend:v1.1.0`
  - `ghcr.io/whatthehellisthat006-web/cinestream-frontend:v1.1.0`
  - Nouveauté : exposition de `/actuator/info` affichant la version déployée (`"version": "v1.1.0"`).
- **Version précédente (repli) :** `v1.0.0`
  - `ghcr.io/whatthehellisthat006-web/cinestream-backend:v1.0.0`
  - `ghcr.io/whatthehellisthat006-web/cinestream-frontend:v1.0.0`

**Vérification post-déploiement :**
```bash
curl http://localhost:8081/actuator/health   # Attendu : {"status":"UP"}
curl http://localhost:8081/actuator/info     # Attendu : {"app":{"name":"CineStream","version":"v1.1.0"}}
```

---

## 3. Procédure de Rollback (Retour vers `v1.0.0`)

Le staging utilise `docker-compose.staging.yml` (aucune directive `build:`), qui déploie uniquement des images pré-publiées et immuables depuis GHCR, tout en conservant le volume persistant `cinestream_staging_db_data` intact.

1. **Lancer le rollback en une commande :**
   ```bash
   bash scripts/deploy-staging.sh v1.0.0
   ```
   *(Le script télécharge les images immuables `v1.0.0`, remplace uniquement `backend` et `frontend` sans toucher à `db`, puis attend que `/actuator/health` réponde `UP` et que le frontend réponde sur le port `4200`.)*

2. **Vérifier le retour effectif à `v1.0.0` :**
   ```bash
   APP_VERSION=v1.0.0 docker compose -f docker-compose.staging.yml ps
   curl http://localhost:8081/actuator/health
   ```
   Les conteneurs affichent les images `:v1.0.0` à l'état **`healthy`** et les données MySQL sont préservées.
